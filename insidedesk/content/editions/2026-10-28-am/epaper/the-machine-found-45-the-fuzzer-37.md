---
title: "The machine found 45, the fuzzer 37"
dek: "Google's Project Zero compared an AI bug hunter with a classic fuzzer on Chrome's JavaScript engine. The overlap is the interesting number."
desk: tech
kind: brief
published: "2026-10-28T06:30:08+01:00"
sources:
  - {n: 1, title: "Fuzzers vs. AI: Comparing Fuzzilli and BigSleep on JavaScript Engines", publisher: "Google Project Zero (Samuel Groß)", url: "https://projectzero.google/2026/10/fuzzing-v-AI.html", date: "27 Oct 2026"}
---
From April to September, BigSleep, Google's AI-based bug-finding system, found 45 actionable vulnerabilities in V8, Chrome's JavaScript engine; Fuzzilli, a conventional fuzzer, found 37, Project Zero reports [1]. Only about 25% of them overlapped, 20 out of 81 [1]. In a separate experiment on 112 older Fuzzilli bugs, BigSleep rediscovered about 62%, which puts the theoretical overlap at roughly 60% [1]. Bugs that were hard for the fuzzer were also more likely to be hard for the agent [1]. Project Zero's recommendation is plain: vendors should run both [1]. The headline wants a winner. The ledger shows two tools that catch different things, which is the best argument for keeping both on the payroll.
