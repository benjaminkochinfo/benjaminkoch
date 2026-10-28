---
title: "155 answers that belonged to someone else"
dek: "Cloudflare has published how one AI model on its platform returned other customers' data for two weeks. The cause was a number it knew about and did not check."
desk: tech
kind: short
published: "2026-10-28T06:30:08+01:00"
sources:
  - {n: 1, title: "Cross-request KV cache exposure in the GLM-5.3 Workers AI model, and our remediation with SGLang", publisher: "Cloudflare Blog", url: "https://blog.cloudflare.com/kv-cache-exposure-remediation/", date: "26 Oct 2026"}
---
Between 27 August and 9 September, a small number of customers using the GLM-5.3 model on Cloudflare's Workers AI received responses containing data from other customers' requests, the company disclosed on Monday [1]. In total 155 responses were affected, all to prompts longer than 681,280 tokens [1].

The cause was two faults stacked together. Cloudflare had configured the model with a context window of 1,048,576 tokens, but the memory pool on its prefill machines held only 681,280; "we were aware of this mismatch before launch," it writes, but tests returned successful responses [1]. Then a bug in SGLang, the open-source engine it uses, let over-length requests run instead of failing, so the reply was built partly from memory pages still holding earlier users' prompts [1]. Desk arithmetic: the pool was about 65% of the advertised window.

A security researcher reported it through Cloudflare's bug-bounty programme on 8 September; the model was taken offline within 40 minutes of an incident being declared and restored the same day [1]. Cloudflare says it found no evidence of deliberate exploitation and that no other model was affected [1]. The pool now holds about 2.04 million tokens, and the engine fix is upstream in SGLang v0.5.22, which Cloudflare urges other operators to install [1].

The admission to keep is the one about testing: "we only validated HTTP response codes and engine performance at long contexts, without validating model output and coherence" [1]. A green light on a dashboard is a claim. Reading the answer is the check.
