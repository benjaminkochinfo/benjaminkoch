---
title: "One router in Arkansas, 17 of 22 control centres, 12,462 cancelled flights: the FAA's copper lesson"
dek: "America's sky did not stop because of a hacker or an AI. It stopped because a box at a remote radio site started shouting, and the network had no way to tell it to be quiet."
desk: tech
format: note
charts: []
sources:
  - {n: 1, title: "Nationwide Ground Stop: Questions and Answers", publisher: "Federal Aviation Administration", url: "https://www.faa.gov/newsroom/nationwide-ground-stop-questions-and-answers", date: "15 Nov 2026"}
  - {n: 2, title: "FAA contractor, router focus of investigation into air traffic halt", publisher: "USA Today", url: "https://www.usatoday.com/story/news/nation/2026/11/14/faa-ground-stop-probe-l3harris/92780406007/", date: "15 Nov 2026, 17:54 CET (updated)"}
  - {n: 3, title: "Ground stop shows \"we have to get off old network,\" Transportation Secretary Sean Duffy says", publisher: "CBS News", url: "https://www.cbsnews.com/news/ground-stop-faa-telecom-network-sean-duffy-face-the-nation/", date: "15 Nov 2026, 17:52 CET"}
watch:
  - "The FAA and L3Harris root-cause finding: installer error or a faulty router. Duffy has promised to publish it [2][3]."
  - "Whether the FAA moves remote-site maintenance to the night, which it says it will now reevaluate [1]."
  - "Congress and the $50 billion telecom request, which a Democratic member calls 'a prioritization problem' [3]."
comment: "Modernisation is not a new network. It is the night someone switches the old one off without anyone noticing."
---
On Friday at about 15:30 Eastern time, 21:30 in Berlin, the US Federal Aviation Administration ordered every departure in the country to stay on the ground [1]. Traffic resumed at 20:15 Eastern, 02:15 CET on Saturday [1]. Desk arithmetic: four hours and 45 minutes. In that window about 3,500 aircraft already airborne landed safely, and by the FAA's count operators cancelled about 12,462 flights that day, not all of them because of the stop [1].

The cause, as the FAA now tells it, is gloriously dull. Its legacy equipment became unstable when data flooded the FAA's telecoms network "at a rate of 1,000 connection attempts every 4 to 5 seconds" [1]. Investigators point to two sites: a radar site in Amarillo, Texas, and a radio site in El Dorado, Arkansas, where the contractor L3Harris had been deploying a new router while swapping old copper lines for fibre [1][3]. Instability spread to 17 of the FAA's 22 en-route control centres [1]. L3Harris blocked the two locations and the network calmed; the broadcast function was then switched off on roughly 60 similar routers [1].

**Not the clever failure.** No cyber-attack, says the FAA, and no link to its new SMART planning system [1]. The fault sat in the seam between old and new: a time-division network that could not cope with a modern box behaving badly. L3Harris says more than 70% of the planned copper-to-fibre conversion is done [2]. Transportation Secretary Sean Duffy says such work has been done thousands of times and that remote sites were worked on in daylight "because the risk, historically, has been very low" [3]. Whether the router or the installer was at fault is still open [2][3].

**The useful part for you.** Every organisation is running a copper-to-fibre migration of some kind: an old phone system, a legacy accounting server, a site nobody visits. The lessons the FAA itself lists are the boring ones. Do changes when traffic is low, even at small sites [1]. Know which devices can broadcast to the whole network and turn that off by default [1]. Keep some channels independent: during the disruption, some radio frequencies and radar feeds stayed up and controllers could still track aircraft [1].

The politics will now turn this into a number. Duffy asks Congress for $50 billion for a new telecom system; Representative Jim Himes says the existing money should be spent first [3]. Both may be right. But no budget line replaces a change window and a rollback plan.
