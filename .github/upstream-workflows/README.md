# Archived upstream workflows

Preserved for provenance from Streamyfin v0.55.2. GitHub does not execute workflows
in this directory. They include upstream release, EAS, store submission, translation,
notification and scheduled automation assumptions and must not be copied back unchanged.

The active workflows run source checks, Swift core tests and Android integration
compilation. They do not package/publish installation files, upload to stores, use
signing credentials or contact upstream integrations. A passing Swift core job is
not a full iOS app build; compilation does not establish device behavior.
