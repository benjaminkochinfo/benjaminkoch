---
title: "Amazon stops counting tokens and starts counting launches"
dek: "A memo calls token usage a \"deeply flawed\" measure of AI adoption. The fix is the oldest metric in engineering: did the thing ship, and does it work?"
desk: tech
format: note
charts: []
sources:
  - {n: 1, title: "Amazon's anti-tokenmaxxing memo says engineers should be pickier about using AI", publisher: "CNBC", url: "https://www.cnbc.com/2026/10/27/amazon-ai-coding-tokenmaxxing.html", date: "27 Oct 2026, 19:41 CET"}
  - {n: 2, title: "CNBC TEC Summit live updates: How the enterprise is adopting AI successfully", publisher: "CNBC", url: "https://www.cnbc.com/2026/10/28/cnbc-technology-summit-live-updates.html", date: "28 Oct 2026, 16:19 CET"}
watch:
  - "Whether other large employers publish similar guidance on how they measure AI use, now that Amazon has posted its memo on its website [1]."
  - "How companies report AI returns in the coming earnings calls: launches and changes in production, or tokens consumed [1][2]."
comment: "Whatever you reward, you get more of. Reward tokens and you get tokens."
---
Every bureaucracy learns the same lesson eventually: the moment a measure becomes a target, people start producing the measure. Amazon has now written it down for the age of AI. In a memo to engineers, circulated internally in September and posted on its website on Tuesday, the company called token usage, the rate of adoption of AI tools, and the number of code changes or reviews "deeply flawed" ways of measuring how teams use AI, CNBC reports [1]. Such metrics can lead to higher costs and too much complexity, the memo says [1].

**The leaderboard that taught the lesson.** Tokens are the units of text an AI model processes and generates, and they are what the bill is counted in. In May, Amazon shut down an internal leaderboard after discovering that employees were "tokenmaxxing", using AI as much as possible with little regard for output, to climb the ranks [1]. The company has not capped employees' token use, a spokesperson said [1]. It has not told staff to ignore the numbers either: token usage and code generation should be weighed "with care and judgment" alongside other data [1]. "We believe that it is best to measure, and be measured by, long-term outcomes," the memo says [1].

**The unglamorous replacement.** Marc Brooker, a vice president and distinguished engineer at Amazon Web Services, told CNBC that the company looks at "feature velocity": how many launches, and how many successful changes in production [1]. The line from the memo worth pinning above a desk is shorter: "If your work does not benefit from current AI tooling, that is a finding, not a failing" [1]. An engineer who can explain where AI does not yet help, it adds, "is demonstrating the judgement we are asking for" [1].

**The same point, from the stage.** At CNBC's Technology Executive Council Summit in New York on Wednesday, Publicis Sapient's chief executive, Nigel Vaz, put it as a light bulb. Paying for tokens is like paying for three watts, he said; what you want to know is whether the bulb turns on, "because what I care about is paying you for a unit of work" [2].

This is good news dressed as a correction. Every useful technology goes through a phase in which people measure how much of it they use, and then a phase in which they measure what it did. The second phase is duller, and it is where the productivity actually shows up: in launches, in fewer broken changes, in invoices paid for work done. Nothing here is investment advice.
