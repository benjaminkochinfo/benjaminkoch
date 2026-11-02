---
title: "Due today: the dullest line in the Ivanti story is the one that matters"
dek: "Washington's cyber agency gave federal networks until 2 November to fix one Ivanti flaw and until 13 November for its sibling. The deadline, not the headline, is the defence."
desk: tech
format: note
charts: []
sources:
  - {n: 1, title: "Known Exploited Vulnerabilities Catalog (JSON feed), catalogue version 2026.10.30", publisher: "Cybersecurity and Infrastructure Security Agency (CISA)", url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", date: "retrieved 2 Nov 2026, 16:30 CET"}
  - {n: 2, title: "Daily News Coverage: AI Reality Check, Nvidia Antitrust Problem, CXMT, PHP2Shell, ServiceNow & Samsung", publisher: "The CODEW", url: "https://www.thecodew.com/2026/11/daily-news-coverage-november-2.html", date: "02 Nov 2026"}
watch:
  - "13 November: CISA's due date for the second Ivanti Connect Secure flaw, CVE-2026-118527 [1]."
comment: "A patch is a promise; a due date is a payroll."
---
Most security news arrives as a number with a villain attached. Today's useful item is a date. In its catalogue of vulnerabilities known to be exploited in the wild, America's Cybersecurity and Infrastructure Security Agency lists CVE-2026-111357, a "missing authentication for critical function" flaw in Ivanti Connect Secure, the remote-access gateway many organisations put at the edge of their networks. It was added on 30 October. The due date is today, 2 November [1].

The catalogue is plain about what the flaw does. It "could allow a local authenticated attacker to escalate their privileges", and it can be chained with two other Ivanti bugs, CVE-2026-104935 and CVE-2026-118527 [1]. The second of those was added the same day, with a due date of 13 November [1]. Today's entry is also marked for forensic triage, which means agencies are expected to look for signs of intrusion as well as install the fix [1].

The required action is not a press release. Agencies must "apply mitigations in accordance with vendor instructions" under the agency's binding directive, or "discontinue use of the product if mitigations are unavailable" [1]. That last clause is the most grown-up sentence in cybersecurity. It says a tool you cannot fix is a tool you stop using, whatever it cost.

Around this sits a noisy week. A technology round-up today reports a Chinese-linked campaign against firewalls and a record theft from the Binance exchange [2]. Those are claims from news reports and forensic firms, and they will be argued over. The catalogue is different: it is a public list with fields, dates and owners, and it does not need a villain to work.

If you run a small firm's network, you are not bound by a US federal directive. You can still borrow its habit. Find out whether you have this gateway, check the vendor's advisory, and put a date in the diary that someone owns. Nothing dramatic happens when a deadline is met. That is the point.
