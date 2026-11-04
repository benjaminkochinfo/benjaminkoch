---
title: "An off button for AI agents, sold as news: CrowdStrike's kill switch and the oldest control in computing"
dek: "The security firm says a human can now stop a misbehaving agent, keep it from relaunching and cut its network access. That this is a product launch says a lot about how agents were being deployed."
desk: tech
format: note
charts: []
sources:
  - {n: 1, title: "CrowdStrike Introduces the AI Kill Switch for AI Safety", publisher: "CrowdStrike (press release)", url: "https://www.crowdstrike.com/en-us/press-releases/crowdstrike-introduces-ai-kill-switch-for-ai-safety/", date: "03 Nov 2026"}
  - {n: 2, title: "CrowdStrike's new kill switch can stop rogue AI agents in their tracks, CEO says", publisher: "CNBC", url: "https://www.cnbc.com/2026/11/03/crowdstrikes-new-kill-switch-can-stop-rogue-ai-agents-in-their-tracks-ceo-says.html", date: "04 Nov 2026, 00:37 CET"}
watch:
  - "When the termination step moves from the gateway to the endpoint; CrowdStrike says that is coming 'soon' [1]."
  - "Whether rival security vendors and the AI labs themselves ship comparable, logged stop controls, so that an off switch becomes a standard rather than a feature."
comment: "Every machine worth trusting comes with a way to stop it, and a record of who pressed it."
---
"Everyone is building AI agents, but they never had the off button, and now they do," CrowdStrike's chief executive George Kurtz told CNBC on Tuesday [2]. Read that sentence twice. It is meant as a sales line. It is also a confession on behalf of an industry: software that acts on its own, with system-level access, has been going into companies without a dependable way to halt it.

**What was launched.** The "AI Kill Switch" sits in CrowdStrike's Falcon Guardian product, announced at its Fal.Con Europe conference in Barcelona and available immediately [1][2]. If an agent breaks out of its intended behaviour, an authorised administrator can terminate it, block it from launching again on a host or group of hosts, and cut off its enterprise network access [1]. Every action is recorded in an audit trail [1]. The company's own fine print matters: termination works first at the gateway, and only "soon" on the endpoint itself [1].

**Why it is needed at all.** The press release explains the problem plainly. Agents "chain steps, hit obstacles, and can take actions no one authorized, even when no adversary is involved" [1]. That last clause is the important one. The risk being sold against is not only the hacker; it is the helper that misreads its instructions. Kurtz compares the switch to an airbag: a safeguard you need even when the system is designed to work [2].

**The contrarian reading.** Strip away the launch language and what is on offer is the most traditional control in IT: a named person, a stop command, a block on restarts and a log. That is the right answer, and it is a dull one. Kurtz says enterprise customers told Anthropic, "We need CrowdStrike before we can deploy AI" [2]. Whatever the vendor, the demand is healthy: buyers asking for brakes before they buy the engine.

**For you.** If your employer is rolling out agents, the useful questions are the boring ones. Who can stop this agent? Can it restart itself? Is there a record? A product can answer those. A policy has to require them. For investors, CNBC notes the shares have fallen about 12% from their 6 October record of $278.86 [2]; a launch is not a result. Nothing here is investment advice.
