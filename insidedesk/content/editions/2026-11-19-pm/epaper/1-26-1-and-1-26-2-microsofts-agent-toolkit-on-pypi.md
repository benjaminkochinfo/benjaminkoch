---
title: "1.26.1 and 1.26.2: Microsoft's agent toolkit on PyPI shipped a credential stealer"
dek: "Two malicious releases of a package with about 200,000 monthly downloads ran their payload at Python start-up, whether or not you imported it."
desk: tech
kind: short
published: "2026-11-19T17:30:02+01:00"
sources:
  - {n: 1, title: "Microsoft's Agent Framework PyPI package compromised to steal credentials", publisher: "BleepingComputer", url: "https://www.bleepingcomputer.com/news/security/microsofts-agent-framework-pypi-package-compromised-to-steal-credentials/", date: "18 Nov 2026, 17:58 CET"}
---
Attackers published two malicious versions of Microsoft's official Agent Framework package on PyPI, the Python package index, on 17 November [1]. The toolkit, Microsoft's open-source kit for building and coordinating AI agents, has roughly 200,000 monthly downloads [1]. Versions 1.26.1 and 1.26.2 carried a credential stealer that ran automatically during normal Python start-up, even when the framework itself was never imported, while keeping the framework working by depending on the legitimate 1.26.0 core [1].

The first version harvested secrets from environment variables, configuration files and other processes, targeting Azure, AWS, Docker, Hugging Face, OpenAI and other services, and tried to obtain Azure managed-identity and DevOps tokens; the second added requests for CI pipeline tokens [1]. PyPI quarantined the first release; the attacker published the second about 2.5 minutes later, and it was quarantined about eight minutes after that, which suggests publishing access survived the first quarantine [1]. How the attacker got in is unclear, and Microsoft had not answered BleepingComputer at publication [1].

The advice from the researchers is plain: if you installed either version, isolate the environment, rebuild from a clean one on 1.26.0, and rotate every credential it could reach [1]. Then do the boring part for everything else: pin versions, and let new releases wait a day before your build pulls them. Supply chains are attacked at the speed of an upload and defended at the speed of a lockfile.
