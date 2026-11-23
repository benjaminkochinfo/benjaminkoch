---
title: "17 million lines, four checks, one certificate: the Riemann proof and the dull machinery behind it"
dek: "The Lean and Mathlib communities say an AI-assisted proof of the Riemann Hypothesis is correct. The story worth telling is how they know."
desk: tech
format: note
charts: []
sources:
  - {n: 1, title: "Lean verification of the Riemann Hypothesis", publisher: "Lean and Mathlib communities", url: "https://leanprover-community.github.io/blog/posts/riemann-hypothesis/", date: "21 Nov 2026"}
  - {n: 2, title: "Fortlaufende Nachrichten vom 22. November 2026", publisher: "Deutschlandfunk", url: "https://www.deutschlandfunk.de/nachrichten-index-40734.html", date: "22 Nov 2026"}
watch:
  - "The mathematical community's work to explain the new ideas in the proof, which the Lean statement says it looks forward to [1]."
comment: "A genius persuades. A checker certifies. Civilisation runs on the second."
---
On 20 November Levent Alpöge released a proof of the Riemann Hypothesis as a Lean library of 17 million lines of code, and on Saturday the Lean and Mathlib communities, endorsed by the Lean FRO and the Mathlib Initiative, said they had "full confidence" that it is correct [1]. Deutschlandfunk describes Alpöge as an Anthropic researcher who says he solved the problem with artificial intelligence, and quotes the mathematician Christian Blohmann calling it above all PR [2]. Whatever you think of the claim's size, look first at the procedure.

The statement lists four criteria [1]. First, the theorem being proved is Mathlib's own vetted statement of the hypothesis, not a convenient variant. Second, the library compiles: dozens of people reproduced the same raw proof export. Third, the code proves that exact statement, which the community confirmed with two independent comparison tools after isolating the statement in a file that imports only Mathlib. Fourth, the exported proof passed several proof checkers, including Lean's own kernel and independent checkers written in different programming languages, run on an inert export "out of reach of hypothetical malicious code" [1].

That last phrase is the best sentence in the whole affair. It assumes nothing about the good faith of the author or the machine. It builds a process in which good faith is unnecessary.

What is not settled is understanding. The statement itself looks forward to "all the activity in the mathematical community that will help explain the new ideas" [1]. A proof nobody can yet read is still a proof; it is not yet knowledge you can teach. That gap, between verified and understood, is where the next few years of human work sit.

For you, the lesson travels well beyond mathematics. When a system produces something you cannot check by reading, do not ask whether to trust it. Ask what the checker is, who runs it, and whether it would catch a lie.
