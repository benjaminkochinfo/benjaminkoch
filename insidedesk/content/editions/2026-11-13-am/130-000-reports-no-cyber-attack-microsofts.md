---
title: "130,000 reports, no cyber-attack: Microsoft's mailboxes go dark, and the case for a second channel"
dek: "Outlook, Teams and the rest of Microsoft 365 were disrupted for more than five hours on Thursday. The cause, so far, is the most ordinary kind: servers failing their own health checks."
desk: tech
format: note
charts: []
sources:
  - {n: 1, title: "Microsoft begins restoring services as global outage affects Outlook and Teams", publisher: "The Guardian", url: "https://www.theguardian.com/technology/2026/nov/13/microsoft-outage-outlook-teams-word-excel-reports", date: "13 Nov 2026, 02:19 CET (updated)"}
  - {n: 2, title: "Microsoft's Outlook email hit by new outage", publisher: "TechCrunch", url: "https://techcrunch.com/2026/11/12/microsofts-outlook-email-hit-by-new-outage/", date: "12 Nov 2026, 20:03 CET"}
watch:
  - "Whether Microsoft publishes a post-incident review naming the configuration change behind the failure; it said it was assessing whether reverting a small number of recent updates could speed recovery [1]."
comment: "Resilience is not a product you buy once. It is a second address you keep, and a habit of writing things down."
---
On Thursday evening, European time, the dull machinery of office life stopped for a lot of people at once. Outage tracker Down Detector showed a spike in Microsoft 365 problems around 1pm New York time (19:00 CET), with nearly 130,000 reports covering Word, Excel, PowerPoint, Outlook and Teams, as well as SharePoint and OneDrive; the Copilot assistant was hit too [1]. Disruption lasted more than five hours, and reports had fallen to about 13,000 five hours after the peak [1].

**What Microsoft says happened.** A portion of its infrastructure was "experiencing elevated load", and a number of servers were "unexpectedly unavailable" after a problem caused them to fail automated checks [1][2]. A spokesperson said the company "had no indication of a cyber-attack" [1]. Late on Thursday Microsoft said restored servers had remained stable, that it was shifting traffic to alternate routes, and that users "may experience a gradual recovery" as their clients reconnect [1]. It was also assessing whether reverting "the small number of recent configuration updates" it had identified could help [1]. TechCrunch notes that Microsoft's previous major incident, in September, was blamed on a "core authentication configuration" issue [2].

**Why one fault spreads.** Mark Gregory of RMIT University described the mechanism: if part of a pool of servers fails, every user crowds onto the rest, "and that overloads them. And then they go down" [1]. The outage also broke connectors that OpenAI's and Anthropic's AI tools use to reach Microsoft 365 [1]. The more services lean on one another, the further a single misstep travels.

**For you.** Nothing here was a hack, and nobody needs to panic. But the lesson is the same one every payroll office learnt long ago: keep a second channel. A personal email address your colleagues know, a phone number for the people you must reach, and important documents saved locally rather than only in the cloud. Gregory put it simply: "it then becomes important to have an alternative" [1]. And if a message arrives during an outage asking you to "re-verify" your account, treat it with extra suspicion; Microsoft's own guidance was that recovery would come gradually as clients reconnect [1].
