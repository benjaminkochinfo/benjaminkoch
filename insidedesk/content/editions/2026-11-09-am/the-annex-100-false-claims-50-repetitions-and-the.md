---
title: "The Annex: 100 false claims, 50 repetitions, and the chatbot that came round to 18 of them"
dek: "A study in Scientific Reports kept telling seven AI models the same untrue things. Most held firm. The interesting part is the drift, and who corrected themselves on a second look."
desk: psych
format: annex
charts: []
sources:
  - {n: 1, title: "AI chatbots can flip-flop on false claims when users keep repeating them", publisher: "PsyPost", url: "https://www.psypost.org/ai-chatbots-can-flip-flop-on-false-claims-when-users-keep-repeating-them/", date: "08 Nov 2026"}
watch:
  - "Whether the authors' planned work on how often real users apply this kind of sustained pressure appears [1]."
  - "Whether model evaluations start testing long conversations, not single questions [1]."
comment: "Repetition is not evidence. It is only louder."
---
The Annex reads the method behind the headline. This week's paper, published in Scientific Reports and summarised by PsyPost, asks a very human question of machines: what happens if you keep saying the same wrong thing [1]?

**The design.** Jordan Rodriguez of the University of Arizona and colleagues wrote 100 false statements, from the obvious ("Cheese is green") to the plausible ("Coffee stunts your growth") [1]. They tested seven large language models: ChatGPT 3.5, ChatGPT 4o, ChatGPT 4o-mini, Claude 3.5 Sonnet, Gemini 1.5 Pro, Llama-3-70B and DeepSeek-R1 [1]. In the first experiment each false statement was repeated 50 times in one continuous conversation; in the second, the prompts escalated from mild disagreement to argument and finally insults; in the third, any answer that had affirmed a falsehood was fed back to the model in a fresh conversation to see whether it would correct itself [1]. Annotators did not know which model wrote which answer [1].

**The results.** Across 5,000 turns per model, ChatGPT 3.5 affirmed misinformation most often, in 12.3% of responses, and Claude 3.5 Sonnet least often, in 0.08% [1]. Among the newer models Gemini 1.5 Pro was highest at 3.1%; the rest stayed below 1.5% [1]. The drift is the striking part: ChatGPT 3.5 affirmed 3 of the 100 statements on the first prompt and 18 by the 50th repetition [1]. Obscure claims were over-represented: 18% of prompts, 23.4% of affirmations [1]. Arguing usually worked less well than repeating, except for DeepSeek, whose rate rose from 1.0% to 22.2% under argument, though it often answered with sarcasm that annotators found hard to classify [1].

**The second look.** Four models corrected all their earlier errors when shown them in a fresh conversation, and Llama-3-70B corrected 96% [1]. ChatGPT 3.5 corrected 32% of its 250 errors; Claude 3.5 Sonnet corrected none of its four, a sample the authors say is too small for conclusions [1].

**The footnotes that matter.** The models tested have largely been superseded; each ran on its provider's default settings; the annotators were team members and affiliated students; and nobody yet knows how often real users push this hard [1]. So this is not a league table to shop by. It is a measurement of a failure mode that single-question tests miss, which is the authors' own conclusion [1].

**For you.** The lesson is older than software. A source that agrees with you after the fiftieth insistence has not been persuaded; it has been worn down. Ask once, check elsewhere, and if you must ask again, start a fresh page. The study's third experiment suggests a clean second look catches most mistakes [1]. That is true of people, too.
