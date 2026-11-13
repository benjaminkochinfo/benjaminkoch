---
title: "Under 1% of workspaces, one vendor down the chain: Notion's Fireworks lesson"
dek: "A breach at an AI inference provider reached Notion AI chat transcripts. The fix is not a new tool. It is an old habit: know who holds your data, and rotate what you pasted."
desk: tech
format: note
charts: []
sources:
  - {n: 1, title: "Fireworks AI incident (security advisory, updated 13 Nov 2026)", publisher: "Notion", url: "https://www.notion.com/security/advisories/security-incident-involving-a-third-party-ai-vendor", date: "13 Nov 2026"}
  - {n: 2, title: "Notion says Fireworks breach exposed customer AI chat transcripts", publisher: "BleepingComputer", url: "https://www.bleepingcomputer.com/news/security/notion-says-fireworks-breach-exposed-customer-ai-chat-transcripts/", date: "12 Nov 2026"}
watch:
  - "Notion says its investigation is ongoing and it will contact any further affected workspaces directly [1]."
  - "Fireworks AI's own incident updates, which Notion points customers to for the wider picture [1]."
comment: "The cloud has no back office. It has somebody else's back office."
---
Notion was not breached. That is the point. The company says attackers got into Fireworks AI, an inference provider it used, and the data they reached included Notion AI chat transcripts used for a feature called Insights, affecting fewer than 1% of Notion workspaces [1][2].

The timeline is a lesson in how slowly certainty arrives. On 2 November Fireworks told Notion that a small dataset had been accessed and it looked like synthetic test data [1]. Notion disconnected from Fireworks by the morning of 3 November and deleted its data there on 4 November [1]. On 6 November Fireworks said customer data might be involved after all; on 8 November it confirmed the final dataset, and on 9 November Notion contacted affected customers [1]. On 11 November Notion revoked exposed Notion API keys found in those messages, and on 12 November it reported other companies' API keys found there to the vendors that issued them [1].

**What was in the box.** For most affected workspaces the transcripts were "unattributable", Notion says: not labelled with author or workspace, and without tool-call results [1]. But a chat transcript is whatever people typed into it. Notion's own advice is to treat the data as exposed and, if passwords, API keys or other credentials were pasted into Notion AI in that period, to rotate them [1]. Insights is switched off, and Notion no longer serves open-weight models through Fireworks [1].

**The dull machinery.** Every AI feature you switch on adds a name to a list you probably have not read: the subprocessors. That list, not the demo, decides where your words travel. The useful response is not panic about AI but the procurement habit companies already apply to payroll providers: ask who handles the data, how long they keep it, and how fast they will tell you when something goes wrong.

**For you.** Never paste a secret into a chat box, however clever the box. If you did, rotating a key takes five minutes. Waiting for the next advisory takes longer.
