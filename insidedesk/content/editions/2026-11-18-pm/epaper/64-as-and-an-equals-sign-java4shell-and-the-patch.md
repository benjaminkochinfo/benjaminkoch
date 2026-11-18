---
title: "64 A's and an equals sign: Java4Shell and the patch that has to find the Java you forgot"
dek: "A flaw in Java's Base64 decoder can let an attacker run code without logging in. CISA says patch now. The hard part is the inventory."
desk: tech
kind: short
published: "2026-11-18T17:30:04+01:00"
sources:
  - {n: 1, title: "Critical Java Vulnerability Requires Immediate Patching", publisher: "CISA", url: "https://www.cisa.gov/news-events/alerts/2026/11/17/critical-java-vulnerability-requires-immediate-patching", date: "17 Nov 2026"}
  - {n: 2, title: "Oracle reveals fix-this-ASAP-grade Java4Shell bug that allows attacks on many third-party apps", publisher: "The Register", url: "https://www.theregister.com/security/2026/11/18/oracle-reveals-fix-this-asap-grade-java4shell-bug-that-allows-attacks-on-many-third-party-apps/5310661", date: "18 Nov 2026, 05:33 CET"}
---
The US Cybersecurity and Infrastructure Security Agency has told organisations to patch CVE-2026-114938, nicknamed "Java4Shell", straight away [1]. It is a memory-corruption flaw in the Base64 decoder of the x86-64 HotSpot Java virtual machine; specially crafted input can crash the JVM and allow unauthenticated remote code execution [1].

The researchers at Calif, who found it, say the corruption can be triggered by "just 64 A characters followed by a single =" and rate it 9.2 out of 10 [2]. They report that Keycloak, Jira, Confluence, Jenkins, Kafka Broker and Elasticsearch are susceptible [2]. Cisco's Talos says it affects OpenJDK 17.0.6 and later on x86-64 processors with AVX-512 VBMI enabled, and that it has not yet seen exploitation in the wild [2]. Calif says it spent about $200 of AI tokens finding it [2].

Oracle's fixes came in a November update of 655 patches, 62 rated critical [2]. CISA's first instruction is the unglamorous one: find every JDK and Java runtime, including those bundled inside other software, container images and appliances, because they "may not appear as separate entries in software inventories" [1]. Where patching must wait, it suggests limiting Base64 input size and unauthenticated access [1].

The lesson is older than the bug. You cannot patch what is not on the list. The best defence this week is a complete asset register, kept by someone with time to keep it.
