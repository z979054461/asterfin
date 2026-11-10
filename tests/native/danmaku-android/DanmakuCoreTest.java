import expo.modules.mpvplayer.danmaku.DanmakuCore;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.io.*;
import java.util.zip.GZIPOutputStream;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicInteger;

public class DanmakuCoreTest {
    static int passed;
    interface Check { void run() throws Exception; }
    static void check(boolean ok) { if(!ok)throw new AssertionError(); passed++; }
    static void rejects(Check action) throws Exception { try { action.run(); } catch(Exception expected) { passed++; return; } throw new AssertionError("accepted invalid input"); }
    static byte[] xml(String text) { return text.getBytes(StandardCharsets.UTF_8); }
    static String d(double t,int mode,String text) { return "<d p='"+t+","+mode+",25,16777215'>"+text+"</d>"; }
    public static void main(String[] args) throws Exception {
        DanmakuCore.Clock clock=new DanmakuCore.Clock();
        clock.sample(100,false);check(clock.position()==null);
        clock.ready();clock.restart(clock.epoch(),9.0,true);check(clock.position()==null);
        long load=clock.requestLoad();
        clock.ready();clock.startFile();clock.restart(load,9.0,true);check(clock.position()==null); // not issued
        clock.endFile();check(clock.epoch()==load); // old stop END cannot erase load request
        clock.issue(load);clock.ready();clock.restart(load,9.0,true);check(clock.position()==null); // no boundary
        clock.seekBoundary();clock.restart(load,9.0,true);check(clock.position()==null); // wrong boundary
        clock.startFile();clock.restart(load,10.0,false);check(clock.position()==null); // renderer still seeking
        clock.restart(load,Double.NaN,true);check(clock.position()==null);
        clock.restart(load,-1.0,true);check(clock.position()==null);
        clock.restart(load,10.0,true);check(clock.position()==10);
        clock.sample(11,true);check(clock.position()==10); // paused/buffer freeze
        long seek=clock.requestSeek();check(clock.position()==null);
        clock.ready();clock.seekBoundary();clock.restart(seek,50.0,true);check(clock.position()==null); // before issue
        clock.issue(seek);clock.startFile();clock.restart(seek,50.0,true);check(clock.position()==null); // wrong boundary
        clock.seekBoundary();clock.restart(seek,50.0,false);check(clock.position()==null);
        clock.restart(seek,70.0,true);check(clock.position()==70); // paused seek snapshot
        clock.sample(71,true);check(clock.position()==70);
        clock.sample(72,false);check(clock.position()==72);
        long stale=clock.requestSeek();clock.issue(stale);clock.seekBoundary();
        long latest=clock.requestSeek();clock.issue(stale);clock.seekBoundary();clock.restart(stale,80.0,true);check(clock.position()==null);
        clock.ready();clock.restart(latest,80.0,true);check(clock.position()==null); // latest unissued
        clock.issue(latest);clock.restart(latest,80.0,true);check(clock.position()==null); // latest boundary still required
        clock.seekBoundary();clock.restart(latest,90.0,true);check(clock.position()==90);
        long firstLoad=clock.requestLoad();clock.issue(firstLoad);clock.startFile();
        long secondLoad=clock.requestLoad();clock.endFile();clock.issue(firstLoad);clock.startFile();clock.restart(firstLoad,91.0,true);check(clock.position()==null);
        clock.issue(secondLoad);clock.restart(secondLoad,91.0,true);check(clock.position()==null);
        clock.startFile();clock.restart(secondLoad,100.0,true);check(clock.position()==100);
        clock.seekBoundary();check(clock.position()==null); // native/external seek
        clock.restart(clock.epoch(),110.0,true);check(clock.position()==110);
        clock.invalidate();clock.ready();clock.restart(clock.epoch(),120.0,true);check(clock.position()==null); // stop stays closed
        clock.endFile();check(clock.position()==null);
        check(DanmakuCore.endpoint("https://example.org/jellyfin/","ab-12").toString().equals("https://example.org/jellyfin/api/danmu/ab-12/raw"));
        for(String base:new String[]{"https://u:p@example.org","https://example.org/?token=x","https://example.org/#x","file:///tmp/test","https:///absent"}) rejects(()->DanmakuCore.endpoint(base,"id"));
        rejects(()->DanmakuCore.endpoint("https://example.org","../id"));
        String family="👩‍👩‍👧‍👦";
        check(DanmakuCore.parse(xml("<i>"+d(1,1,family)+"</i>")).get(0).text.equals(family));
        String shaping="a\u200Cb\uFE0Fc";
        check(DanmakuCore.parse(xml("<i>"+d(1,1,shaping)+"</i>")).get(0).text.equals(shaping));
        String simple="<i>"+d(1,1,"BOM 世界")+"</i>";
        check(DanmakuCore.parse(xml("\uFEFF"+simple)).size()==1);
        check(DanmakuCore.parse(xml("\uFEFF<?xml version='1.0' encoding='UTF-8'?>"+simple)).size()==1);
        check(DanmakuCore.parse(xml("<?xml version='1.0' encoding='utf-8'?>"+simple)).size()==1);
        rejects(()->DanmakuCore.parse(xml("<?xml version='1.0' encoding='ISO-8859-1'?>"+simple)));
        rejects(()->DanmakuCore.parse(xml("\uFEFF<?xml version='1.0' encoding='UTF-16'?>"+simple)));
        rejects(()->DanmakuCore.parse(simple.getBytes(StandardCharsets.UTF_16)));
        List<DanmakuCore.Entry> e=DanmakuCore.parse(xml("<i>"+d(2,5,"世界 &amp; 😀")+d(0,1,"first")+d(1,4,"bottom")+d(1,7,"skip")+"<d p='bad'>bad</d></i>"));
        check(e.size()==3 && e.get(0).time==0 && e.get(2).text.equals("世界 & 😀"));
        rejects(()->DanmakuCore.parse(xml("<!DOCTYPE i [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><i>&x;</i>")));
        rejects(()->DanmakuCore.parse(new byte[]{(byte)0xc3,0x28}));
        rejects(()->DanmakuCore.parse(xml("<i><a><b><c><d><e><f><g><h/></g></f></e></d></c></b></a></i>")));
        rejects(()->DanmakuCore.parse(xml("<i>"+d(1,1,"x".repeat(301))+"</i>")));
        check(DanmakuCore.parse(xml("<i>"+d(1,1,"😀".repeat(300))+"</i>")).size()==1);
        rejects(()->DanmakuCore.parse(xml("<i>"+d(1,1,"x").repeat(20001)+"</i>")));
        rejects(()->DanmakuCore.parse(new byte[DanmakuCore.MAX_BYTES+1]));
        rejects(()->DanmakuCore.parse(xml("<i>"+d(1,1,"<b>nested</b>")+"</i>")));
        rejects(()->DanmakuCore.parse(xml("<i>")));
        StringBuilder dense=new StringBuilder("<i>"); for(int i=0;i<1000;i++)dense.append(d(i*.1,i%3==0?5:i%3==1?1:4,"mixed 世界")); dense.append("</i>");
        List<DanmakuCore.Cue> plan=DanmakuCore.plan(DanmakuCore.parse(xml(dense.toString())),5,8,s->123f);
        double[] end=new double[5]; Arrays.fill(end,-1);
        for(DanmakuCore.Cue c:plan) { check(c.entry.time>=end[c.lane]); check(c.width==123f); check(c.entry.mode==5?c.lane==0:c.entry.mode==4?c.lane==4:c.lane>0&&c.lane<4); end[c.lane]=c.entry.time+8; }
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0); AtomicInteger redirected=new AtomicInteger();
        byte[] payload=xml("<i>"+d(1,1,"transport")+"</i>");
        server.createContext("/prefix/api/danmu/id/raw",ex->{check("test-secret".equals(ex.getRequestHeaders().getFirst("X-Emby-Token"))); ex.sendResponseHeaders(200,payload.length); ex.getResponseBody().write(payload); ex.close();});
        server.createContext("/redirect",ex->{ex.getResponseHeaders().set("Location","/target");ex.sendResponseHeaders(302,-1);ex.close();});
        server.createContext("/target",ex->{redirected.incrementAndGet();ex.sendResponseHeaders(200,-1);ex.close();});
        server.createContext("/gzip",ex->{ByteArrayOutputStream out=new ByteArrayOutputStream();try(GZIPOutputStream gz=new GZIPOutputStream(out)){gz.write(payload);}byte[] b=out.toByteArray();ex.getResponseHeaders().set("Content-Encoding","gzip");ex.sendResponseHeaders(200,b.length);ex.getResponseBody().write(b);ex.close();});
        server.createContext("/bomb",ex->{ByteArrayOutputStream out=new ByteArrayOutputStream();try(GZIPOutputStream gz=new GZIPOutputStream(out)){gz.write(new byte[DanmakuCore.MAX_BYTES+1]);}byte[] b=out.toByteArray();ex.getResponseHeaders().set("Content-Encoding","gzip");ex.sendResponseHeaders(200,b.length);ex.getResponseBody().write(b);ex.close();});
        server.start(); String base="http://127.0.0.1:"+server.getAddress().getPort();
        try {
            check(new DanmakuCore.Request().run(DanmakuCore.endpoint(base+"/prefix","id"),Collections.singletonMap("X-Emby-Token","test-secret")).size()==1);
            rejects(()->new DanmakuCore.Request().run(new java.net.URL(base+"/redirect"),Collections.emptyMap())); check(redirected.get()==0);
            check(new DanmakuCore.Request().run(new java.net.URL(base+"/gzip"),Collections.emptyMap()).size()==1);
            rejects(()->new DanmakuCore.Request().run(new java.net.URL(base+"/bomb"),Collections.emptyMap()));
            DanmakuCore.Request cancelled=new DanmakuCore.Request();cancelled.cancel();rejects(()->cancelled.run(new java.net.URL(base+"/target"),Collections.emptyMap()));check(redirected.get()==0);
        } finally { server.stop(0); }
        System.out.println("PASS: "+passed+" assertions (production Java core; local synthetic HTTP only)");
    }
}
