---
title: "Fixed on 7 August, drained on 1 November: the cost of the update nobody installed"
dek: "Thieves emptied hot wallets on payment servers still running BTCPay Server 2.4.1 or earlier, three months after the patch."
desk: tech
kind: brief
published: "2026-11-04T17:30:05+01:00"
sources:
  - {n: 1, title: "Security Incident Affecting BTCPay Server 2.4.1 and Earlier", publisher: "BTCPay Server", url: "https://blog.btcpayserver.org/btcpay-server-security-incident-2-4-1-and-earlier/", date: "02 Nov 2026"}
---
BTCPay Server, open-source software merchants use to accept Bitcoin, says attackers stole Bitcoin and Litecoin from hot wallets on servers running version 2.4.1 or earlier [1]. The attackers used a different method to exploit a vulnerability fixed in 2.4.2, released on 7 August [1]. Servers already on 2.4.2 or later when the project warned on 1 November showed no impact [1].

"We wish we had done more to reach users still running older versions," the project writes; it also asked hosting providers to take instances offline [1]. Its advice is sober: updating alone cannot remove access an attacker may already have, so affected operators should sweep funds to a new wallet with a new seed and rebuild on a fresh server [1]. Funds whose keys sat off the server, including hardware wallets, were unaffected [1]. The patch was the cheap part. Installing it was the control.
