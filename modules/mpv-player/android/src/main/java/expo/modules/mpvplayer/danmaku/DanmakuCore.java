package expo.modules.mpvplayer.danmaku;

import java.io.*;
import java.net.*;
import java.nio.*;
import java.nio.charset.*;
import java.util.*;
import java.util.zip.GZIPInputStream;
import javax.xml.parsers.SAXParserFactory;
import org.xml.sax.*;
import org.xml.sax.helpers.DefaultHandler;

/** Dependency-free, bounded transport/parser. Never logs server data or credentials. */
public final class DanmakuCore {
    public static final int MAX_BYTES = 8 * 1024 * 1024, MAX_RECORDS = 20000;
    /** Epoch-fenced media samples: no elapsed-time extrapolation or optimistic seeks. */
    public static final class Clock {
        private enum Pending { NONE, LOAD, SEEK }
        private long epoch;
        private boolean ready, active, issued, boundary;
        private Pending pending=Pending.NONE;
        private Double position;
        public synchronized long epoch() { return epoch; }
        public synchronized Double position() { return position; }
        public synchronized void invalidate() {
            epoch++; ready=false; active=false; issued=false; boundary=false;
            pending=Pending.NONE; position=null;
        }
        public synchronized long requestLoad() { return request(Pending.LOAD); }
        public synchronized long requestSeek() { return request(Pending.SEEK); }
        private long request(Pending operation) { invalidate(); pending=operation; return epoch; }
        public synchronized void issue(long expected) { if(expected==epoch && pending!=Pending.NONE)issued=true; }
        public synchronized void startFile() {
            if(pending==Pending.LOAD && issued)boundary=true;
            else if(pending==Pending.NONE && active) {
                request(Pending.LOAD); issued=true; boundary=true;
            }
        }
        public synchronized void seekBoundary() {
            if(pending==Pending.SEEK && issued)boundary=true;
            else if(pending==Pending.NONE && active) {
                request(Pending.SEEK); issued=true; boundary=true;
            }
        }
        // FILE_LOADED alone must not open a pending operation's gate. The raw
        // restart sample and renderer seeking=false are the readiness evidence.
        public synchronized void ready() { if(active && pending==Pending.NONE)ready=true; }
        public synchronized void endFile() {
            // load() stops the previous file before issuing loadfile. Its END
            // must not erase the newer request or command-issued epoch.
            if(pending==Pending.LOAD) { position=null; ready=false; return; }
            invalidate();
        }
        public synchronized void restart(long expected, Double sample, boolean notSeeking) {
            if(expected!=epoch || !notSeeking || !valid(sample))return;
            if(pending!=Pending.NONE && !(issued && boundary))return;
            if(pending==Pending.NONE && !active)return;
            pending=Pending.NONE; issued=false; boundary=false;
            active=true; ready=true; position=sample;
        }
        public synchronized void sample(double value, boolean frozen) {
            if(active && pending==Pending.NONE && ready && valid(value) && (position==null || !frozen))position=value;
        }
        private boolean valid(Double value) { return value!=null && Double.isFinite(value) && value>=0; }
    }
    public static final class Entry {
        public final double time; public final int mode, color; public final String text;
        Entry(double t, int m, int c, String s) { time=t; mode=m; color=c; text=s; }
    }
    public static URL endpoint(String base, String item) throws Exception {
        URI u = new URI(base);
        if (!("https".equals(u.getScheme()) || "http".equals(u.getScheme())) ||
            u.getHost()==null || u.getRawUserInfo()!=null || u.getRawQuery()!=null ||
            u.getRawFragment()!=null || !item.matches("[A-Za-z0-9_-]+")) throw new IOException("invalid endpoint");
        return new URL(base.replaceAll("/+$", "") + "/api/danmu/" + item + "/raw");
    }
    public static final class Request {
        private volatile boolean cancelled;
        private volatile HttpURLConnection connection;
        public void cancel() { cancelled=true; HttpURLConnection c=connection; if(c!=null)c.disconnect(); }
        public List<Entry> run(URL url, Map<String,String> headers) throws Exception {
            final long deadline=System.nanoTime()+15000000000L;
            HttpURLConnection c=(HttpURLConnection)url.openConnection(); connection=c;
            try {
                check(deadline); c.setInstanceFollowRedirects(false); c.setConnectTimeout(15000); c.setReadTimeout(15000);
                c.setUseCaches(false);
                for(Map.Entry<String,String> h:headers.entrySet()) {
                    if(!h.getKey().matches("[!#$%&'*+.^_`|~0-9A-Za-z-]+") || h.getValue().contains("\r") || h.getValue().contains("\n")) throw new IOException("invalid header");
                    if(!Arrays.asList("host","connection","content-length","accept-encoding").contains(h.getKey().toLowerCase(Locale.ROOT))) c.setRequestProperty(h.getKey(),h.getValue());
                }
                c.setRequestProperty("Accept-Encoding","gzip");
                int status=c.getResponseCode();
                if(status!=200) throw new IOException(status==401||status==403 ? "auth" : status==404 ? "unavailable" : "error");
                InputStream raw=c.getInputStream();
                String encoding=c.getContentEncoding();
                if(encoding!=null && !encoding.equalsIgnoreCase("gzip") && !encoding.equalsIgnoreCase("identity")) throw new IOException("encoding");
                try(InputStream in="gzip".equalsIgnoreCase(encoding)?new GZIPInputStream(raw):raw; ByteArrayOutputStream out=new ByteArrayOutputStream()) {
                    byte[] b=new byte[8192]; int n;
                    while((n=in.read(b))!=-1) { check(deadline); if(out.size()+n>MAX_BYTES)throw new IOException("size"); out.write(b,0,n); }
                    check(deadline); List<Entry> result=parse(out.toByteArray()); check(deadline); return result;
                }
            } finally { c.disconnect(); connection=null; }
        }
        private void check(long deadline) throws IOException { if(cancelled || Thread.currentThread().isInterrupted() || System.nanoTime()>deadline)throw new IOException("cancelled"); }
    }
    public static List<Entry> parse(byte[] bytes) throws Exception {
        if(bytes.length>MAX_BYTES)throw new IOException("size");
        String xml=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
        if(xml.startsWith("\uFEFF"))xml=xml.substring(1);
        if(xml.startsWith("<?xml")) {
            int end=xml.indexOf("?>");
            if(end<0)throw new IOException("declaration");
            java.util.regex.Matcher encoding=java.util.regex.Pattern.compile("encoding\\s*=\\s*[\"']([^\"']+)[\"']", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(xml.substring(0,end));
            if(encoding.find() && !encoding.group(1).equalsIgnoreCase("utf-8"))throw new IOException("encoding");
        }
        // UTF-8 decoded before this guard; no encoding declaration can bypass it.
        if(xml.contains("<!DOCTYPE") || xml.contains("<!ENTITY"))throw new IOException("doctype");
        List<Entry> entries=new ArrayList<>(); SAXParserFactory f=SAXParserFactory.newInstance();
        f.setNamespaceAware(false); f.setValidating(false);
        XMLReader reader=f.newSAXParser().getXMLReader();
        reader.setEntityResolver((publicId,systemId)->{throw new SAXException("entity");});
        reader.setContentHandler(new DefaultHandler() {
            int depth=0,count=0; String p=null; StringBuilder text;
            public void startElement(String uri,String local,String name,Attributes a)throws SAXException {
                if(++depth>8 || Thread.currentThread().isInterrupted())throw new SAXException("depth/cancelled");
                if(text!=null)throw new SAXException("nested comment");
                if(name.equals("d")) { if(++count>MAX_RECORDS)throw new SAXException("records"); p=a.getValue("p"); text=new StringBuilder(); }
            }
            public void characters(char[] ch,int start,int length)throws SAXException {
                if(text!=null) { if(text.length()+length>600)throw new SAXException("text length"); text.append(ch,start,length); }
            }
            public void endElement(String uri,String local,String name)throws SAXException {
                if(name.equals("d") && text!=null) {
                    String s=text.toString().trim(); if(s.codePointCount(0,s.length())>300)throw new SAXException("text length");
                    if(p!=null)try { String[] parts=p.split(","); double t=Double.parseDouble(parts[0]); int m=Integer.parseInt(parts[1]),c=Integer.parseInt(parts[3]);
                        if(Double.isFinite(t)&&t>=0&&(m==1||m==4||m==5)&&c>=0&&c<=0xffffff&&!s.isEmpty())entries.add(new Entry(t,m,c,s.replaceAll("[\\p{Cc}]","")));
                    }catch(RuntimeException ignored) { /* Malformed individual records do not poison valid records. */ }
                    p=null; text=null;
                } depth--;
            }
        });
        reader.setErrorHandler(new DefaultHandler(){ public void error(SAXParseException e)throws SAXException{throw e;} public void fatalError(SAXParseException e)throws SAXException{throw e;} });
        reader.parse(new InputSource(new StringReader(xml))); entries.sort(Comparator.comparingDouble(e->e.time)); return entries;
    }
    public static final class Cue {
        public final Entry entry; public final float width; public final int lane;
        Cue(Entry e,float w,int l){entry=e;width=w;lane=l;}
    }
    public interface Measure { float width(String text); }
    /** Conservative reservation: one comment per lane per lifetime, hence no overtaking. */
    public static List<Cue> plan(List<Entry> entries, int lanes, double duration, Measure measure) {
        double[] free=new double[lanes]; Arrays.fill(free,-1); List<Cue> cues=new ArrayList<>();
        for(Entry e:entries) {
            if(Thread.currentThread().isInterrupted())throw new java.util.concurrent.CancellationException();
            // Separate top/bottom fixed regions from scrolling lanes. Small budgets omit fixed modes.
            int from=e.mode==5?0:e.mode==4?lanes-1:(lanes>=3?1:0);
            int to=e.mode==5?1:e.mode==4?lanes:(lanes>=3?lanes-1:lanes);
            if(lanes<3 && e.mode!=1)continue;
            for(int l=from;l<to;l++)if(e.time>=free[l]) { cues.add(new Cue(e,measure.width(e.text),l)); free[l]=e.time+duration; break; }
        } return cues;
    }
}
