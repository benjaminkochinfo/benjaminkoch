---
title: "Blocked on iOS 27, detected on Android, not possible on macOS: Signal's three answers to the screen-reading assistant"
dek: "Signal is switching off screenshots because the operating system's own AI now reads your screen. Its president calls that an existential threat; the remedy she asks for is documentation."
desk: tech
format: note
charts: []
sources:
  - {n: 1, title: "Signal is Serious About Protecting Your Privacy", publisher: "Signal", url: "https://signal.org/blog/protecting-your-privacy/", date: "20 Nov 2026"}
  - {n: 2, title: "Signal restricts mobile screenshots as it confronts 'existential threat' of AI surveillance", publisher: "TechCrunch", url: "https://techcrunch.com/2026/11/21/signal-restricts-mobile-screenshots-as-it-confronts-existential-threat-of-ai-surveillance/", date: "21 Nov 2026, 22:37 CET"}
watch:
  - "Whether Apple, Google or Microsoft publish an opt-out for apps from on-device AI data access; Signal says some providers are \"engaging\" with it [1]."
  - "Signal's promised further update: it hopes \"to have more to share on this topic soon\" [1]."
comment: "Encryption protects the message on the wire. It cannot protect it from the screen it is read on."
---
For a decade the promise of an encrypted messenger was simple: nobody between you and the person you write to can read it. This week Signal said that promise now has a hole at the end of the line, where the message is displayed [1].

The company will block screenshots inside its app on iOS 27, and on Android it will switch on its "Screen security" setting automatically when it detects an AI assistant trying to read the screen [1]. Last year it did the same on Windows 11 against Microsoft's Recall [1]. The reason, in Meredith Whittaker's words: the operating systems' agents "scan" what is on screen, and once captured, your data is "made accessible to whatever local database or remote server an OS-level AI agent is using at that moment" [1][2]. She calls it "an existential threat to Signal" [1].

Read the footnotes, because that is where the engineering sits. On many Android builds Signal cannot reliably detect a blocked screenshot, so it watches for the assistant instead [1]. On macOS it cannot block screenshots at all; the only advice for macOS 27 users is to add Signal to Siri's Excluded Apps list in System Settings [1]. And Signal concedes that screenshot blocking does not stop "more sneaky ways", such as an agent reading content already in the file system [1][2]. You can switch the protection off, at the price, Signal says, of breaking its privacy guarantees for you and your contacts [1].

What it asks for is not a ban. It is two dull things: an easy, documented way for an app to opt out of AI data access, and proper technical documentation of how the agents work [1]. Signal says it has spent months on "forensic investigations" just to learn what the assistants do with app data [1]. It also names a third party: agents such as Meta's Muse that use accessibility permissions, built for people who need them, as "a skeleton key" [1].

The constructive reading is that this is a standards problem, and standards problems get solved by specifications, not by slogans. Signal says it is "cautiously optimistic" that Google and Apple are talking [1]. Until a setting exists, the setting that protects you is the one Signal has just turned on.
