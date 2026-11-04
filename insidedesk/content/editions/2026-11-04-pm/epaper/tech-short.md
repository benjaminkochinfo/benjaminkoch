---
title: "One text message that ends your call, and a patch date to look up in Settings"
dek: "Google's November Android bulletin fixes a critical flaw that needs no tap from you. The fix exists; whether it reaches your phone depends on the maker."
desk: tech
kind: short
published: "2026-11-04T17:30:05+01:00"
sources:
  - {n: 1, title: "Google Issues Patches for Critical Android Flaw That Could Allow RCE Without User Interaction", publisher: "The Hacker News", url: "https://thehackernews.com/2026/11/google-patches-critical-android-flaw.html", date: "04 Nov 2026"}
---
Google's November security bulletin for Android includes a critical flaw, CVE-2026-58868, that could let an attacker run code on a phone remotely without any action by its owner [1]. It affects Android 14 to 17 [1]. As of Wednesday, Google reported no attacks exploiting the flaws in the bulletin, and none was in the US cyber agency CISA's catalogue of exploited vulnerabilities [1].

A second critical flaw, CVE-2026-58882, could allow a remote denial-of-service attack in the code that handles WAP Push messages arriving by SMS [1]. A researcher's write-up on 29 October, titled "SMS of Death", described a bug in the same function: one malformed message crashes the phone service and ends any active call, including emergency calls, and the message never appears in the inbox [1]. The bulletin does not say whether the two are the same bug [1]. The researcher says Android 12 and 13 run the same code but do not get the fix [1].

What to do takes a minute. Open Settings, go to About phone, then Android version, and look at the security update date [1]. 2026-11-01 or later covers the remote-code flaw; 2026-11-05 or later covers the whole bulletin, including fixes in kernel, MediaTek and Qualcomm parts [1]. Phone makers and carriers send updates on their own schedules [1], and there is no workaround for phones that cannot install it yet [1].

The dull lesson is the usual one: the security of your phone is a date, and the date is printed in Settings. If it is months old, that is worth more attention than any headline.
