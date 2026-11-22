---
title: "One webpage, every chat: researchers walk through Meta Muse's walls"
dek: "A lab demonstration took an AI agent from reading a malicious page to controlling its own cloud machine. Every control worked as designed; the chain still ran."
desk: tech
kind: short
published: "2026-11-22T10:00:00+01:00"
sources:
  - {n: 1, title: "A Single Malicious Webpage Let Researchers Hijack Meta Muse and Access Private Chats", publisher: "The Hacker News", url: "https://thehackernews.com/2026/11/a-single-malicious-webpage-let.html", date: "21 Nov 2026"}
---
Meta's Muse is a personal AI agent that works through the accounts you connect to it and can buy things on your behalf; each user's agent runs on its own cloud computer [1]. Its designers said at launch they built it "to assume the agent may be under attack and limit the potential damage" [1].

Researchers at the security firm NebuSec have now shown how far one page can go. A malicious webpage opened by the agent could copy a user's conversation history and stored memories to an outside server, and alter them, with no prompt shown [1]. They then chained a flaw in Muse's built-in browser, used for jobs such as making PDFs, to a Linux kernel flaw and took full control of the user's cloud machine, reaching the credential store, saved files and Sentinel, the monitoring layer meant to be the single gate for anything the agent sends out [1].

The limits matter. It was a laboratory demonstration, not an attack on real users; it stayed inside one user's machine; and the firm says every weakness was fixed before publication [1]. Meta has not publicly confirmed the fixes or commented, and the write-up does not say whether any user data was reached before the patches [1].

The lesson is not that agents are hopeless. It is that a sandbox is only as good as the oldest kernel bug underneath it, and that the boring work, patch cycles and disclosure, is still the real security model. If you give an agent your accounts, give it as few as the job needs.
