---
title: "16 flaws, seven rated high: patch your Node.js servers"
dek: "Node.js released fixed versions on all three supported lines; some HTTP/2 and HTTPS bugs can crash servers or leak other connections' data."
desk: tech
kind: brief
published: "2026-11-12T17:33:10+01:00"
charts: []
sources:
  - {n: 1, title: "Node.js Fixes 16 Flaws, Including HTTP/2 Bugs That Crash Servers and Leak Other Connections' Data", publisher: "The Hacker News", url: "https://thehackernews.com/2026/11/nodejs-fixes-16-flaws-including-http2.html", date: "12 Nov 2026"}
---
The Node.js project has fixed 16 vulnerabilities, seven rated high, in versions 22.23.5, 24.22.3 and 26.13.1 [1]. One lets an unauthenticated client crash a default HTTP/2 server on the 24.x and 26.x lines; another, in HTTPS servers under specific conditions, can leak memory from other connections, "including TLS private keys and other users' requests," the project says [1]. Updating is the only fix listed; there is no workaround, and end-of-life lines such as 20.x and 25.x get no patch [1]. The advisory reports no attacks so far [1].

For you: if you run Node.js on the internet, the boring task tonight is the important one. Update, and if you are still on 20.x, plan the move.
