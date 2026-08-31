(function (w) {
  "use strict";
  function pair(a, b) {
    var out = [];
    a = a || []; b = b || [];
    for (var i = 0; i < a.length; i++) for (var j = 0; j < b.length; j++) out.push(a[i] + " " + b[j]);
    return out;
  }
  function banks(a, b, c, d) {
    var out = pair(a, b);
    if (c && c.length && d && d.length) {
      out = out.concat(pair(c, d));
      out = out.concat(pair(a, d));
      out = out.concat(pair(c, b));
    }
    return out;
  }
  function desk(spec) {
    return {
      heads: (spec.heads || []).concat(pair(spec.hA, spec.hB)),
      dek: (spec.dek || []).concat(pair(spec.dkA, spec.dkB)),
      mainstream: banks(spec.msA, spec.msB, spec.msC, spec.msD),
      cut: banks(spec.cutA, spec.cutB, spec.cutC, spec.cutD),
      insight: banks(spec.inA, spec.inB, spec.inC, spec.inD),
      more: banks(spec.dA, spec.dB, spec.dC, spec.dD),
      turn: banks(spec.tA, spec.tB, spec.tC, spec.tD),
      heard: (spec.heard || []).concat(pair(spec.hdA, spec.hdB)),
      keep: (spec.keep || []).concat(pair(spec.kA, spec.kB)),
      note: (spec.note || []).concat(pair(spec.nA, spec.nB)),
      watch: (spec.watch || []).concat(pair(spec.wA, spec.wB)).concat(pair(spec.wC, spec.wD))
    };
  }

  var L = {};

  L.markets = desk({
    heads: [
      "The tape already told you",
      "Cheerleaders are not a bid",
      "Price is the apology",
      "You refused the stampede",
      "The curve sold you a schedule",
      "Spreads heal before speeches do",
      "Carry is rent; collateral is the deed",
      "Quiet books still clear",
      "The choir is late again",
      "Funding breathed first",
      "A punctual market is not a kind one",
      "Variance left the headline",
      "Patience remains uncrowded",
      "The open does not owe you drama",
      "Breadth whispered; you heard it",
      "Mood is expensive this morning",
      "The close is a receipt",
      "Nobody hid a ticker from you",
      "Size to the night you can sleep",
      "Tourists donate; you collect",
      "The schedule has teeth",
      "A feeling is not a position",
      "The bid was never in the comments",
      "Ordinary healing looks dull",
      "You do not need a secret print"
    ],
    dek: [
      "What they said. What the tape said. What you can keep.",
      "From the mood they sold you to the schedule that still pays.",
      "Price keeps the minutes. Everything else is hospitality.",
      "If it needs a choir, it is not a position.",
      "The constructive read is almost boring. That is why it can compound."
    ],
    msA: [
      "The mainstream version is a feeling with a chart taped to it: crash, melt-up, genius, idiot.",
      "What most people were handed is a verb — rallied, slumped, shrugged — as if a verb were a mechanism.",
      "The rooms sold a story about winners and losers, loud enough to travel, too simple to use.",
      "You have already heard today's hospitality: a temperature, a villain, a miracle.",
      "The official account arrives dressed as information and behaves like marketing.",
      "Everyone was invited to pick a side of the tape before breakfast.",
      "The feed needs a plot twist. The book needs a clearing time.",
      "A crowd was assembled around a number that had not yet had to settle."
    ],
    msB: [
      "It is designed to be heard. It is not designed to be kept.",
      "That is hospitality. It is not how a book actually heals.",
      "You can skip the costume and still be early.",
      "The loudest account is usually the one that did not have to clear.",
      "You were not missing a secret. You were missing quiet.",
      "None of that is how funding actually breathes.",
      "The stampede is the product. You do not have to buy it.",
      "A choir is not a bid, no matter how on-key it sounds."
    ],
    cutA: [
      "Here is the cut, and it is kinder than cynicism:",
      "The useful disagreement is not 'they are lying.'",
      "Nobody hid a magic print in a drawer.",
      "If it needed a stampede to work, it was not a thesis.",
      "Cheerleaders showed up on time. Collateral showed up quieter.",
      "You are allowed to step out of the crowd without becoming a hermit.",
      "The late story always needs a villain. The early story needs a wait.",
      "Spreads heal in small type. Speeches never will."
    ],
    cutB: [
      "They hid how ordinary the good outcome looks.",
      "It is 'they are late, and they need a choir.' Price does not.",
      "They hid the schedule under a mood.",
      "It was a crowd. Crowds do not pay you for leaving.",
      "That is the whole difference, and it is still legal.",
      "Funding already voted. The microphone is catching up.",
      "You can side with the wait and still be optimistic.",
      "Punctual is not cruel. It is merely on time."
    ],
    inA: [
      "The insight that actually travels is almost insultingly simple:",
      "Once you see the tape as a schedule with teeth,",
      "What clears is not the narrative.",
      "Cash flow first, story second, size to the night you can still sleep.",
      "The inherited and the ordinary survive the same Tuesday in different fonts.",
      "Stop renting panic and the basis starts looking like a wage.",
      "A book heals the way a bruise heals: unphotographed, then suddenly usable.",
      "Quiet liquidity is a temperament test you can pass on purpose."
    ],
    inB: [
      "That is not a slogan. That is how Tuesday remains livable.",
      "the mainstream mood looks expensive and a little silly.",
      "What clears is collateral, time, and whether you can wait without becoming a tourist in your own life.",
      "Keep that and you have the whole desk in one pocket.",
      "Same language. Different stationery. Same advice: do not perform.",
      "Compounding prefers boredom. You can prefer it too.",
      "You do not need a hotter take. You need a clearing time.",
      "Pass it, and luck arrives embarrassed."
    ],
    heard: [
      "If you have been muttering that it cannot be as dramatic as the timeline, you were not naive. You were early.",
      "You already knew the loudest account did not have to clear. This is only the receipt.",
      "If this feels like relief, that is information. Relief means a sentence finally fit the world you live in.",
      "You refused the stampede. Keep that. It is the whole edge, and it is still allowed."
    ],
    keep: [
      "Keep this: the constructive read is almost boring, and that is why it can compound. Let the tourists donate. You have a life to run.",
      "Optimistic by default does not mean gullible. It means you assume systems would like to remain systems — then you check the funding, and you go outside.",
      "Starve the speech. Keep the habit. The rest is weather.",
      "You understood the desk if you leave with a schedule, not a mood."
    ],
    note: [
      "Hot take, said quietly: the market is not gaslighting you. The content is. Price is the apology.",
      "If this felt like relief, good. Relief is a print.",
      "We will not sell you a crash or a rapture. We will sell you Tuesday, which is rarer.",
      "Cheerleaders are not a bid. You can smile at that and still be long patience."
    ],
    dA: [
      "Here is the extra turn, still short enough to keep:",
      "A reader who stays for one more paragraph usually wanted this:",
      "The useful detail is not a secret number.",
      "If you only remember one mechanism from this desk, make it this."
    ],
    dB: [
      "the bid lives in collateral and time, not in the comment section.",
      "ordinary healing looks dull, and dull is how books actually recover.",
      "you do not need a hotter print. You need a size that still sleeps.",
      "once the choir is optional, you are already early."
    ],
    wA: [
      "Watch whether breadth",
      "Watch whether funding",
      "Watch whether your size",
      "Watch whether the choir",
      "Watch whether the close"
    ],
    wB: [
      "agrees with the index or only decorates it.",
      "healed before the speech did.",
      "still fits a night you can sleep.",
      "is still required to hold the line.",
      "looks like a receipt or a sermon."
    ],
    watch: [
      "Whether breadth agrees or the index is doing karaoke.",
      "Whether your size still fits the night.",
      "Whether funding healed before the story did.",
      "Whether you still need a choir to hold the line.",
      "Whether tourists are still paying you to wait.",
      "Whether quiet books cleared while loud ones performed."
    ]
  });

  L.geoecon = desk({
    heads: [
      "Freight is the diplomat",
      "Invoices redraw the map",
      "The summit is an ad",
      "A warehouse with flags",
      "Insurance before the metaphor",
      "Corridors beat cliffs",
      "Treaties take the train",
      "Incentives commute daily",
      "The grocery ticket is the map",
      "Haircuts are more precise than borders",
      "Logistics finishes the argument",
      "A bill of lading outvotes a communiqué",
      "Power still matters. So does the invoice.",
      "The clip is not the corridor",
      "Settlement prefers boredom",
      "Flags are loud on purpose",
      "Who can still fund, ship, settle",
      "The insurance quote is the adult",
      "Containers do not watch speeches",
      "Most days the lights stay on"
    ],
    dek: [
      "Flags are loud. Freight is the diplomat. You can keep that.",
      "From the summit photo to the invoice that actually moved.",
      "If it cannot survive a grocery ticket, it was cosplay.",
      "The world is a warehouse with flags. That is better than a movie."
    ],
    msA: [
      "The mainstream map is a morality play: heroes, villains, a flag, a clip.",
      "What most people were sold is that the world is a movie and movies need villains.",
      "You were handed a temperature and told it was a strategy.",
      "The official rooms prefer a metaphor that fits in a headline.",
      "Everyone was invited to pick a team before they picked a corridor.",
      "The feed needs escalation. A port needs a schedule.",
      "You have seen the summit photograph. You have not seen the insurance slip.",
      "Borders were loud today. They usually are when someone is fundraising attention."
    ],
    msB: [
      "Warehouses do not need villains. They need corridors.",
      "That is not how a container gets insured.",
      "You can decline the costume and still be informed.",
      "Logistics will finish the argument whether the clip does or not.",
      "A grocery ticket is a more honest map than a morale poster.",
      "Incentives commute. Treaties take the slow train.",
      "The useful question is who can still settle, not who won the metaphor.",
      "Haircuts redraw more lines than communiqués."
    ],
    cutA: [
      "The cut is not cynicism. It is logistics.",
      "You do not need a war room for this.",
      "Power still matters. So does the bill of lading.",
      "If your geopolitics cannot survive a grocery ticket,",
      "Most countries, most days, would rather keep the lights on than win the metaphor.",
      "Follow the corridor and the panic looks overdressed.",
      "A settlement is not naivety. It is how people get home.",
      "The optimistic fact is hiding under the panic on purpose."
    ],
    cutB: [
      "Treaties take the train. Incentives commute.",
      "You need to know who can still fund, ship, and settle.",
      "Hold both and the clip looks like an advertisement.",
      "it was cosplay, and you already suspected that.",
      "That is less exciting. It is also adult.",
      "Insurance before the metaphor. Always.",
      "You are allowed to hope for boredom at a border.",
      "Competence that still wants dinner is a foreign policy."
    ],
    inA: [
      "Once you hold freight and flags in the same hand,",
      "Nations, like families, survive on sequences.",
      "The honest insight travels without a costume:",
      "Corridors beat cliffs. Every time you actually measure.",
      "Keep the invoice in view and the morality play loses its budget.",
      "A warehouse with flags is still a warehouse: maintained, or not.",
      "The inherited already knew this. The ordinary learn it at the pump.",
      "Diplomacy is a long invoice with better chairs."
    ],
    inB: [
      "the mainstream temperature looks like a fundraising tool.",
      "That is allowed to be good news.",
      "most systems prefer a corridor to a cliff, and you may build as if that is true.",
      "You can keep that without becoming simple.",
      "Same shock, two clocks. You were not imagining the squeeze.",
      "Repair is unfashionable and therefore cheap to ignore — and expensive to skip.",
      "You can work with that without applauding anyone.",
      "If you remember only the invoice, you remember enough."
    ],
    heard: [
      "If you have been doing the household math while they did the geopolitics, you were on the real desk.",
      "You wanted someone to say the world is not a movie. It is a warehouse with flags. You already knew.",
      "You felt this as a price before you felt it as a theory. That order is correct."
    ],
    keep: [
      "Keep the corridor, not the choir. That is the whole international desk in one pocket.",
      "A slightly positive desk is not kindness. It is competence that still wants dinner.",
      "You understood if you leave more interested in freight than in villains."
    ],
    note: [
      "Insurance before the metaphor. Smile at that. It will still be true tomorrow.",
      "Flags are loud on purpose. Freight does not need to be.",
      "If the map cannot survive the grocery ticket, throw out the map, not the groceries."
    ],
    dA: [
      "One more turn, still usable:",
      "The extra fact that makes the map honest:",
      "If the clip cannot survive this sentence, drop the clip.",
      "Keep this beside the grocery ticket."
    ],
    dB: [
      "who can still fund, ship, and settle is the whole method.",
      "a corridor is a policy. A villain is a product.",
      "insurance quotes are diplomats. Treat them that way.",
      "most days the lights stay on, and that is allowed to be the story."
    ],
    wA: [
      "Watch freight",
      "Watch insurance",
      "Watch who can still settle",
      "Watch whether industrial policy",
      "Watch the grocery ticket"
    ],
    wB: [
      "before the metaphor.",
      "as if it were a diplomat — because it is.",
      "in a currency others will still hold.",
      "is building capacity or adjectives.",
      "before you trust the map."
    ],
    watch: [
      "Freight, insurance, energy — the three honest diplomats.",
      "Who can still issue in a currency others voluntarily hold.",
      "Whether industrial policy is building capacity or adjectives.",
      "Whether the corridor still exists after the clip.",
      "Whether the grocery ticket agrees with the speech."
    ]
  });

  L.politics = desk({
    heads: [
      "The annex is the news",
      "Just run the place",
      "Wednesday still has to work",
      "Rage is overpriced",
      "The footnote outvotes the choir",
      "Campaigns are retail. Governing is wholesale.",
      "You were tired of being recruited",
      "The podium is an ad",
      "Clerks would like to remain clerks",
      "Read the annex first",
      "A temperature is not a program",
      "Losing without burning the building",
      "The calendar is the adult",
      "Repair happens unphotographed",
      "Pick a side of the annex, not the clip",
      "Cosplay is not a civic duty",
      "The bus still has to run",
      "Continuity is not a crime",
      "Statistical offices are not romantic",
      "You can keep your nervous system"
    ],
    dek: [
      "From the rally to the annex. The annex is the news.",
      "What they performed. What still has to work on Wednesday.",
      "Rage is widely available and usually overpriced.",
      "The constructive citizen reads the footnote."
    ],
    msA: [
      "The mainstream political product is recruitment: pick a side, raise your temperature, call it information.",
      "What you were handed is a personality with a podium.",
      "You have been recruited. You were tired of it.",
      "The feed needs a villain before noon.",
      "Campaigns arrived dressed as governing.",
      "Everyone was invited to perform citizenship as a sport.",
      "A clip traveled farther than a budget footnote.",
      "You were told the temperature was the program."
    ],
    msB: [
      "That fatigue is a civic skill. Keep it.",
      "Campaigns are retail. Governing is wholesale.",
      "The gap is where disappointment lives — and also where repair happens.",
      "You do not have to RSVP.",
      "Wednesday still has to work either way.",
      "A choir is not a legislature.",
      "The annex does not trend. That is its virtue.",
      "You were right to want the place simply run."
    ],
    cutA: [
      "We will not do character assassination as a sport.",
      "The useful cut is institutional, not personal.",
      "The disagreement with the feed is not 'everyone is corrupt.'",
      "Who can spend, who can say no, who still faces a calendar:",
      "Democracy, on a good day, is a technology for losing without burning the building.",
      "Budgets, courts, statistical offices — the unsexy triad.",
      "Mock the clerks and you miss the only machinery that still knows Tuesday.",
      "A slightly positive desk assumes most clerks would like to remain clerks."
    ],
    cutB: [
      "It is cheap and it makes you dumber.",
      "That is ruder and more useful than a takedown.",
      "It is 'the annex still outruns the rally.'",
      "that is the whole political method.",
      "Hold that without becoming a mark.",
      "Mock them and you will miss Wednesday.",
      "Repair is unphotographed. That is not a scandal. That is how it works.",
      "Then it checks whether the numbers stay honest."
    ],
    inA: [
      "Once you read the annex as the news,",
      "The inherited want continuity. The ordinary want the bus.",
      "Keep your nervous system. That is not apathy.",
      "Institutions are a love letter to people who will be alive after the clip.",
      "You can count on unphotographed repair without applauding the podium.",
      "A calendar with teeth is more honest than a personality.",
      "If a sentence only works as recruitment, it is not analysis.",
      "Optimistic by default here means Wednesday can still exist."
    ],
    inB: [
      "the rally looks like what it is: an ad.",
      "Those are the same request, spoken in two accents.",
      "It is an allergy to cosplay. There is a difference.",
      "You can keep that sentence in a pocket.",
      "That is allowed. It is even adult.",
      "Vote if you can. Read the footnote either way.",
      "You already preferred the footnote. Good.",
      "You do not need a miracle. You need a bus."
    ],
    heard: [
      "If you have been saying 'just run the place' under your breath, this desk heard you.",
      "You are not apathetic. You are allergic to cosplay.",
      "You wanted the temperature to go down. That is a policy preference, not a personality flaw."
    ],
    keep: [
      "Read the annex. Keep your nervous system. Vote if you can.",
      "You understood if you leave cooler and more interested in the footnote than in the choir.",
      "Repair happens unphotographed. You are allowed to count on that."
    ],
    note: [
      "Rage is overpriced. You understood the piece if the phone is a degree cooler.",
      "We will not take anyone down in a comment. We will take the annex seriously.",
      "Just run the place. That is the whole comment, and it still smiles."
    ],
    dA: [
      "One more civic detail, then you can keep your nervous system:",
      "The extra honesty that makes the rally look like an ad:",
      "If you only take one institution home, take this.",
      "Wednesday is the test. The clip is not."
    ],
    dB: [
      "who can spend, who can say no, and who still faces a calendar.",
      "clerks would like to remain clerks, and that is not a small thing.",
      "the footnote outvotes the choir when anyone actually reads it.",
      "repair is unphotographed, which is how it usually works."
    ],
    wA: [
      "Watch the annex",
      "Watch the budget footnote",
      "Watch whether Wednesday",
      "Watch whether the choir",
      "Watch the statistical office"
    ],
    wB: [
      "before the rally.",
      "as if it were the news — because it is.",
      "still has a bus.",
      "is still required to feel informed.",
      "for honesty, not for applause."
    ],
    watch: [
      "Budgets, courts, statistical integrity.",
      "Whether rhetoric is buying time or spending it.",
      "Whether Wednesday still has a bus.",
      "Whether the annex still outruns the clip.",
      "Whether you were recruited or informed."
    ]
  });

  L.psych = desk({
    heads: [
      "You are over-informed, not broken",
      "Put the phone in the other room",
      "Calm is still legal",
      "Indignation is not a thesis",
      "Become expensive again",
      "A sequence beats a personality",
      "The villain before breakfast is a product",
      "Attention is now a cost of goods",
      "You do not need a new self by Friday",
      "Stretching is not a plan",
      "Water, then one decision",
      "The mind wanted a saga",
      "Give it a checklist",
      "Optimism without being a mark",
      "Your diet is a position",
      "Sleep is a risk limit",
      "Relief is information",
      "You can practise calm",
      "The customer is not the fool",
      "A walk still compounds"
    ],
    dek: [
      "From the feed's temperature to a sequence you can repeat.",
      "You are over-informed, not broken. That is the whole cut.",
      "Calm is a technology. You can practise it.",
      "Indignation bonds quickly and predicts nothing."
    ],
    msA: [
      "The mainstream psychological product is a new personality by Friday and a villain by breakfast.",
      "What most people were told is that their anxiety is a brand.",
      "You have bought some of the diet. That does not make you a fool.",
      "The feed requires a temperature to prove you care.",
      "Everyone was invited to stretch before they were invited to decide.",
      "A saga was sold as information.",
      "You were offered membership in a mood.",
      "The villain arrived on time. The plan did not."
    ],
    msB: [
      "It is often just an unmanaged information diet wearing a clever jacket.",
      "It makes you the customer. Customers can leave.",
      "You can put the phone in another room and become expensive again.",
      "That is a business model, not a duty.",
      "Stretching is fine. Do not confuse it with a plan.",
      "The mind wanted a saga. Give it a checklist.",
      "You do not need a new self. You need a Wednesday sequence.",
      "Indignation is a cheap identity. You can afford a better one."
    ],
    cutA: [
      "You do not need a new personality.",
      "Attention is now a cost of goods sold.",
      "The inherited fear wasting a past. The ordinary fear never building a future.",
      "If the diet requires a villain before coffee,",
      "Calm is a technology, not a mood that visits the worthy.",
      "Optimism without being a mark is allowed.",
      "A sequence you can repeat on a bad Wednesday",
      "Water, walk, one decision."
    ],
    cutB: [
      "You need a sequence you can repeat on a bad Wednesday.",
      "The optimistic move is vulgar and available: make attention expensive again.",
      "Both are permission stories. Neither is solved by a hotter take.",
      "you are stretching. Stop before it becomes a personality.",
      "You can practise it. That is the whole method.",
      "You already suspected that. This is the confirmation.",
      "has saved more money and more marriages than a macro call.",
      "If you leave with only that, you understood the desk."
    ],
    inA: [
      "Once you treat the diet as a position,",
      "Sleep is a risk limit you cannot negotiate with.",
      "Relief is information. It means a sentence finally fit.",
      "You can be kind to yourself without becoming a subscriber to your own panic.",
      "The checklist is not romantic. It compounds.",
      "Become expensive again. That is not withdrawal. That is price.",
      "A walk still clears more than a thread.",
      "You are not behind. You are refusing to be stampeded."
    ],
    inB: [
      "the villain looks like what it is: inventory.",
      "Keep that limit. It is adult.",
      "Keep the sentence.",
      "That is the psychological product, and it is free.",
      "Practise forbearance until it looks like personality. Then keep practising.",
      "The feed cannot mark it to market. Good.",
      "You already knew. You wanted permission. You have it.",
      "That is the edge, and it is still legal."
    ],
    heard: [
      "If you came here to feel less crazy, stay. That is a legitimate use of a letter.",
      "You are allowed to be optimistic without being a mark.",
      "You already wanted the phone in the other room. This is the nudge you will remember."
    ],
    keep: [
      "Water, walk, one decision. Understanding is cooler than winning.",
      "You are not broken. You are over-informed. That is the kindest accurate sentence in the building.",
      "Give the mind a checklist. It wanted a saga. You can smile at that and still obey the list."
    ],
    note: [
      "If you finished smug, same prescription as anger: water.",
      "Calm is still legal. That one will burn in nicely.",
      "Put the phone in the other room. The day will not sue you."
    ],
    dA: [
      "One more useful sentence, then put the phone down:",
      "The extra cut that makes the villain look like inventory:",
      "If you keep only a method, keep this.",
      "Calm is still cheaper than a new personality."
    ],
    dB: [
      "a sequence you can repeat on a bad Wednesday beats a saga.",
      "attention is a cost of goods. Make it expensive again.",
      "water, walk, one decision. That is the whole protocol.",
      "you are over-informed, not broken. Act like that is true."
    ],
    wA: [
      "Watch the diet",
      "Watch sleep",
      "Watch whether a villain",
      "Watch whether the phone",
      "Watch whether a checklist"
    ],
    wB: [
      "as a position, not as a pastime.",
      "as a risk limit you cannot negotiate.",
      "is still required before coffee.",
      "still sits in the same room as your attention.",
      "beats a saga today."
    ],
    watch: [
      "Your information diet as a position.",
      "Sleep as a risk limit.",
      "Whether you still need a villain before coffee.",
      "Whether calm got practised or only praised.",
      "Whether one decision actually happened."
    ]
  });

  L.energy = desk({
    heads: [
      "The bill arrived first",
      "Inventories skip the play",
      "Keep the lights, skip the take",
      "Physics does not trend",
      "Storage vetoes the sermon",
      "Tightness is arithmetic",
      "Commentators tip in adjectives",
      "A barrel is a schedule",
      "The back of the curve often refuses to panic",
      "Hydrocarbons still clear 8 a.m.",
      "Concrete, copper, patience",
      "A cold house is not a take",
      "Freight sets the conversation",
      "The spike can be loud and finite",
      "Plan a summer anyway",
      "Electrons are not vibes",
      "Maintenance is the transition",
      "The physical does not attend",
      "Sequence is mercy",
      "Dinner still has to happen"
    ],
    dek: [
      "From the take to the bill. Trust the bill. Then keep the lights on.",
      "Inventories skip the morality play. You can too.",
      "A barrel is a schedule. A slogan is a wish.",
      "Physics does not trend. You can stop refreshing."
    ],
    msA: [
      "The mainstream energy story is a sermon with a price tag: saints, sinners, a spike, a collapse.",
      "What you were handed is attitude. Tightness is arithmetic.",
      "You felt the bill before you felt the take.",
      "Commentators arrived late and tipped in adjectives.",
      "The clip needed a morality. The tank needed litres.",
      "Everyone was invited to pick a church of energy before they picked an inventory print.",
      "A slogan traveled. A storage number did not.",
      "You were told the spike was a personality."
    ],
    msB: [
      "That is not you being unsophisticated. That is you being the high-frequency print.",
      "Inventories do not attend the play.",
      "Trust that order. It is honest.",
      "Freight and storage already voted.",
      "You can keep the lights and skip the sermon.",
      "Hydrocarbons still clear civilisation at 8 a.m. That is not a vibe. That is a clock.",
      "The transition is real wherever someone pours concrete, copper, and patience.",
      "Both can be true. Both can pay. Adults live like that."
    ],
    cutA: [
      "A constructive desk believes two things at once.",
      "When prompt tightens, marketing loosens.",
      "There is no humor in a cold house.",
      "The kind reading of a spike is not a prophecy.",
      "Treat barrels and electrons like a bridge:",
      "The back of the curve often refuses to panic as hard as the front.",
      "You do not need to be a prophet.",
      "Follow the physical."
    ],
    cutB: [
      "Hydrocarbons still clear 8 a.m. The transition is real where welders are. Hold both.",
      "Households adapt or donate. You already knew which one you refuse to be.",
      "There is plenty in watching very online people discover storage. Hold both thoughts.",
      "It is that the disruption can be loud and finite.",
      "maintained, unfashionable, necessary. Then the clip looks like weather.",
      "Sometimes the front is theatre. Sometimes it is physics. Check storage.",
      "You need to respect physics and still plan a summer.",
      "Let the moralising catch the next train."
    ],
    inA: [
      "Once you trust the bill more than the take,",
      "Sequence is mercy: lights first, architecture second.",
      "Plan dinner. Then argue about the grid.",
      "A summer is still allowed. That is the optimistic default.",
      "Maintenance is the unglamorous cousin of every energy story that works.",
      "You can stop refreshing and still be informed.",
      "Inventories are the adult in the room. They do not need your applause.",
      "The household print remains the fastest political number."
    ],
    inB: [
      "the sermon looks like hospitality.",
      "You can keep that without becoming simple.",
      "That order is civilisation.",
      "You understood if you can still plan one.",
      "Welders, not brunch. You can smile at that.",
      "Physics does not trend. Good.",
      "Check them. Then go outside.",
      "You felt it first. Believe yourself."
    ],
    heard: [
      "You wanted someone to say the lights matter more than the take. The lights matter more than the take.",
      "If you have been doing the household math while they did the geopolitics, you were already here."
    ],
    keep: [
      "Keep the lights on, then argue about the architecture. Sequence is mercy.",
      "You understood if you can still plan dinner. Follow the physical.",
      "Optimistic by default: a summer is still allowed, and so is a weld."
    ],
    note: [
      "Physics does not trend. You can remember that all week.",
      "No war diagnosis from a comment box. The curve, then hope for a corridor.",
      "The bill arrived first. Believe the bill."
    ],
    dA: [
      "One more physical sentence:",
      "The extra honesty after the sermon:",
      "If you keep only a sequence, keep this.",
      "Dinner is still allowed. So is a weld."
    ],
    dB: [
      "inventories skip the play. Check them before the clip.",
      "the bill arrived first. Believe the bill.",
      "lights first, architecture second. Sequence is mercy.",
      "the back of the curve often refuses the panic. Notice that."
    ],
    wA: [
      "Watch inventories",
      "Watch freight",
      "Watch the household bill",
      "Watch whether the front",
      "Watch spare capacity"
    ],
    wB: [
      "before adjectives.",
      "as if it set the conversation — because it does.",
      "as the honest political print.",
      "is theatre or physics.",
      "before you trust the sermon."
    ],
    watch: [
      "Inventories, freight, spare capacity. Then adjectives.",
      "Whether the front is theatre or physics.",
      "The household bill as the honest print.",
      "Whether the lights still come first.",
      "Whether a summer is still plannable."
    ]
  });

  L.money = desk({
    heads: [
      "The dots are not scripture",
      "A committee trying to sleep",
      "Temperament beats a call",
      "Households run policy too",
      "Waiting is not a scandal",
      "A press conference is not a plot twist",
      "The mortgage outlives the dots",
      "Hawk and dove are costumes",
      "Balance sheets have bedtimes",
      "You do not need a personality at the committee",
      "Patience is the policy you can run",
      "A delayed kitchen is a rates view",
      "Solvent, kind, long optionality",
      "The conference is theatre",
      "Funding math vetoes drama",
      "Go outside after the minutes",
      "Strangers cooperate at scale. That is the miracle.",
      "A hold can be a kindness",
      "The less theatrical instrument",
      "You came to feel solvent"
    ],
    dek: [
      "From the press conference to a temperament you can actually run.",
      "The dots are not scripture. Waiting is not a scandal.",
      "Households run monetary policy too. They just use other words.",
      "Temperament survives a hold. A call often does not."
    ],
    msA: [
      "The mainstream money story is a personality cult around a committee: hawk, dove, pivot, panic.",
      "What most people were given is a rate call dressed as a personality.",
      "You were invited to treat a press conference as a plot twist.",
      "The dots arrived as scripture. They are a committee trying to sleep.",
      "Everyone was asked to pick a team before they picked a mortgage plan.",
      "A verb was issued: hike, hold, cut. The household issued a kitchen delay.",
      "The feed needs a pivot. The balance sheet needs a bedtime.",
      "You were told waiting was a scandal."
    ],
    msB: [
      "You do not have to RSVP.",
      "Central banks are large, cautious balance sheets with legal mandates and human sleep requirements.",
      "That sentence saves a career of theatrical disappointment.",
      "You can plan the mortgage anyway.",
      "Households run the same policy under other names: fixed-rate, second job, delayed kitchen.",
      "The inherited run it as duration. Same job. Different fonts.",
      "Patience is the only policy you can actually execute.",
      "Waiting is often the kindness."
    ],
    cutA: [
      "You wanted someone to stop pretending the dots are scripture.",
      "Energy lifts the headline, growth cools the room, the committee waits.",
      "A temperament beats a call.",
      "Money is how strangers cooperate at scale.",
      "If you came for a hot tip, the exit is everywhere.",
      "The conference is theatre. The discount window is a teacher.",
      "Stay solvent, stay kind, stay long optionality.",
      "The less theatrical instrument is usually the adult."
    ],
    cutB: [
      "Here it is. You can live with a hold.",
      "That is not a plot. That is a job.",
      "Calls expire. Temperament does not.",
      "Everything else is a footnote to that miracle, including the jokes.",
      "If you came to feel solvent, sit down. You chose correctly.",
      "You already suspected the theatre. Good.",
      "That is the whole call, and it is not a number.",
      "Align with it. Then go outside."
    ],
    inA: [
      "Once you treat the committee as a balance sheet with a bedtime,",
      "A slightly positive desk assumes the institution would like to remain an institution.",
      "You understood this desk if you leave with a temperament, not a call.",
      "The household already voted. Believe the kitchen.",
      "Funding math vetoes drama. Let it.",
      "You do not need a personality at the podium.",
      "Plan the mortgage as if waiting were allowed — because it is.",
      "Optimistic by default: cooperation at scale still works more often than the internet admits."
    ],
    inB: [
      "the cult looks expensive.",
      "Then it watches inflation, labor, and the price of waiting.",
      "Temperament survives a hold.",
      "Same policy. Honest language.",
      "Then go outside. The minutes will keep.",
      "You need a night you can sleep.",
      "That is adult, and it still smiles.",
      "You can keep that without becoming simple."
    ],
    heard: [
      "You were right not to treat a press conference as a personality.",
      "If you came to feel solvent, you came to the right desk."
    ],
    keep: [
      "Let the funding math veto the drama. Then go outside.",
      "You understood if you leave with a temperament, not a call.",
      "Waiting is not a scandal. You can remember that all week."
    ],
    note: [
      "Not a rate call. A temperament call.",
      "The dots are not scripture. Smile. Then plan the mortgage.",
      "Households run policy too. You already knew. You live there."
    ],
    dA: [
      "One more monetary sentence, then go outside:",
      "The extra cut after the press conference:",
      "If you keep only a temperament, keep this.",
      "A hold can be a kindness. Plan the mortgage as if that were true."
    ],
    dB: [
      "the dots are not scripture. The kitchen often is.",
      "households already voted with delays and second jobs.",
      "patience is the policy you can actually run.",
      "funding math vetoes drama. Let it."
    ],
    wA: [
      "Watch real yields",
      "Watch the kitchen delay",
      "Watch whether the committee",
      "Watch whether a call",
      "Watch labor"
    ],
    wB: [
      "alongside energy, before the personality.",
      "as if it were policy — because it is.",
      "needed a bedtime more than a choir.",
      "is still pretending to be a temperament.",
      "as the print that actually votes."
    ],
    watch: [
      "Real yields, energy, labor — the trinity that actually votes.",
      "Whether you still need a personality at the committee.",
      "Whether the kitchen delay is the honest print.",
      "Whether waiting is still treated as a scandal.",
      "Whether you leave with a temperament or a tip."
    ]
  });

  L.ordinary = desk({
    heads: [
      "You were in the story",
      "The tomato is the print",
      "School-run math still clears",
      "A kitchen is a rates view",
      "Ordinary is the elite skill",
      "Payroll is the honest number",
      "The specialist voice was a costume",
      "Dinner is duration",
      "A commute is a balance sheet",
      "You were never a lesser reader",
      "Wages versus rents",
      "Keep the household, keep the joke",
      "Dry powder still works",
      "Tuesday can still be livable",
      "The table is the expert",
      "Milk is a high-frequency print",
      "Furniture is policy",
      "Teach competence, or practise it",
      "The bus is the program",
      "You buy milk. This letter is for you."
    ],
    dek: [
      "You were in the macro story the whole time. Here is the readable font.",
      "From the expert voice to the table where the tomato is priced.",
      "School-run math is not unsophisticated. It clears tonight.",
      "Ordinary life is the point of the machine."
    ],
    msA: [
      "The mainstream letter is written for people who think they are not in the story.",
      "What you were told is that this stuff is for specialists.",
      "A class costume was issued: experts speak, households listen.",
      "You have been in the story since breakfast. Macro is why the tomato costs what it costs.",
      "The specialist voice arrived without a school run.",
      "Everyone was invited to feel unqualified before they felt the rent.",
      "A kitchen renovation is a rates view. Nobody put that in the presser.",
      "You were told ordinary meant lesser."
    ],
    msB: [
      "They are. You are. The font was the problem.",
      "That is a costume. Take it off.",
      "The table is the expert that has to clear tonight.",
      "Believe the tomato.",
      "You were never a lesser reader. You were the point.",
      "A commute is duration. A paycheck is a print.",
      "Builders obey rates. Buyers obey paychecks. You can work with that triangle.",
      "It is the most elite skill we have, practised without a summit invite."
    ],
    cutA: [
      "A family that inherited a warehouse and a family that inherited a commute are both running duration.",
      "There is nothing ordinary about keeping a household intact through a loud decade.",
      "Housing is where policy becomes furniture.",
      "Affordability is wages versus rents.",
      "You do not have to tweet at the triangle.",
      "Payroll is the honest high-frequency print.",
      "If you inherited much, teach competence. If you inherited little, practise it.",
      "Corridors are how children get to school."
    ],
    cutB: [
      "One has better collateral. Both can be saved by a boring sequence.",
      "It is elite, unphotographed, and daily.",
      "You can work with that. You already do.",
      "You were not wrong to notice.",
      "You can buy milk and still be in the letter.",
      "Believe it over the specialist costume.",
      "Same letter. Same dignity.",
      "That is enough justification for an entire desk."
    ],
    inA: [
      "Once you see the table as the expert,",
      "Keep the household. Keep the joke. Keep a little dry powder.",
      "Tuesday can still be livable. That is the optimistic default.",
      "You understood if you felt spoken to. That is because you were.",
      "The bus is the program. Continuity is not a crime.",
      "Dinner is duration. You already run a book.",
      "Share this with the person who thinks it is not for them.",
      "Ordinary is not lesser. Ordinary is the point."
    ],
    inB: [
      "the presser looks overdressed.",
      "Complete strategy for most humans.",
      "You can keep that without a forecast.",
      "Good.",
      "You already preferred the bus.",
      "You can smile at that.",
      "They were in the story the whole time.",
      "Keep that. It burns in."
    ],
    heard: [
      "If you have been doing the honest math at the table, you are not bad with money. You are early.",
      "You wanted to be spoken to like an adult who buys milk. That is the whole editorial line."
    ],
    keep: [
      "Keep the household. Keep the joke. Keep a little dry powder.",
      "You understood if the tomato now looks like a print. It is.",
      "School-run math still clears. You can remember that all week."
    ],
    note: [
      "This section is the point. The other desks exist to keep this one honest.",
      "You buy milk. This letter is for you. That should stick.",
      "A kitchen is a rates view with better lighting."
    ],
    dA: [
      "One more household sentence:",
      "The extra honesty after the specialist voice:",
      "If you keep only a strategy, keep this.",
      "The tomato is still a print. Believe it."
    ],
    dB: [
      "wages versus rents is the affordability debate that clears.",
      "you were never a lesser reader. You were the point.",
      "keep the household, the joke, and a little dry powder.",
      "school-run math still has to clear tonight."
    ],
    wA: [
      "Watch wages versus rents",
      "Watch the table",
      "Watch whether Tuesday",
      "Watch the tomato",
      "Watch whether the specialist"
    ],
    wB: [
      "as the only affordability debate that clears.",
      "as the expert that has to settle tonight.",
      "is still livable.",
      "as a high-frequency print.",
      "still talks down to people who buy milk."
    ],
    watch: [
      "Wages versus rents.",
      "Whether the specialist still talks down to the table.",
      "Whether Tuesday remains livable.",
      "Whether payroll is treated as the honest print.",
      "Whether the school run still clears."
    ]
  });

  L.tech = desk({
    heads: [
      "The demo left, the bill stayed",
      "No mascot required",
      "Megawatts before models",
      "Restart it on Sunday",
      "Competence with a cooling budget",
      "Infrastructure can be maintained",
      "Fairy tales can only be refreshed",
      "The keynote is hospitality",
      "Who pays for the electricity",
      "A brochure does not compound",
      "Welders, not brunch",
      "Heat, latency, liability",
      "Second generation gets paid",
      "A warehouse, not a ticker",
      "Boredom is the stack's friend",
      "Keep a human in the loop",
      "Power is the unfashionable input",
      "The floor still matters",
      "Concrete, copper, patience",
      "Explain it without a brand"
    ],
    dek: [
      "From the keynote to the power bill. The bill is the insight.",
      "No mascot required. A floor, a megawatt, a Sunday restart.",
      "If it cannot be plugged in, it is still a brochure.",
      "Competence with a cooling budget is enough."
    ],
    msA: [
      "The mainstream tech story is a demo that will save civilisation by Thursday.",
      "What you were handed is a mascot and a miracle.",
      "You were right to distrust the keynote.",
      "The feed needs a saviour. The room needs cooling.",
      "A brand arrived dressed as a law of nature.",
      "Everyone was invited to worship before they were invited to plug it in.",
      "The miracle traveled. The megawatt did not.",
      "You were told the stack had no physics."
    ],
    msB: [
      "You were wrong if you thought that meant nothing is being built.",
      "What actually constrains the decade is electricity, cooling, people, and a dull quarter survived.",
      "Treat compute as infrastructure and the fairy tale ends. That is a kindness.",
      "Infrastructure can be maintained. Fairy tales can only be refreshed.",
      "Software eats nothing by itself. It rents power, talent, and time.",
      "If the story has no electrician and no clerk, it is a brochure.",
      "Brochures do not compound. Second generations sometimes do.",
      "Physics showed up anyway. It always does."
    ],
    cutA: [
      "When a single corridor can reprice the year, you are watching a warehouse, not a ticker.",
      "The honest edge is not a secret model.",
      "Ask what breaks when the demo leaves: heat, latency, liability, the person who stays late.",
      "No mascot required.",
      "Welders, not brunch.",
      "Keep a human in the loop.",
      "Explain it without a brand name.",
      "Competence with a cooling budget"
    ],
    cutB: [
      "Warehouses prefer boredom. So should you.",
      "It is asking the unglamorous question and waiting.",
      "That is the adult list.",
      "A floor, a megawatt, a Sunday restart.",
      "You can smile at that.",
      "Then you may have a thesis.",
      "If you cannot, it was not ready.",
      "is enough. You can keep that."
    ],
    inA: [
      "Once you price the power first,",
      "Concrete, copper, and patience are being poured. That is the optimistic fact.",
      "The rest is costume.",
      "People who wait for the second generation sometimes get paid.",
      "Hype is funding language. Maintenance is civilisation language.",
      "You already muttered about the electricity. You were the adult in the thread.",
      "A brochure cannot restart on Sunday. A maintained floor can.",
      "You understood if you can say it without a logo."
    ],
    inB: [
      "the keynote looks like hospitality.",
      "The costume is optional.",
      "You can skip it.",
      "Patience is still a tech policy.",
      "Keep the second sentence.",
      "Good. Stay there.",
      "Prefer the floor.",
      "Good. That was the test."
    ],
    heard: [
      "If you have been muttering who pays for the electricity, you are the adult in the thread.",
      "We will not make you worship a logo. We will make you respect a cooling budget."
    ],
    keep: [
      "Plug it in, price the power, keep a human in the loop.",
      "You understood if you can explain it without a brand name.",
      "The demo left. The bill stayed. Believe the bill."
    ],
    note: [
      "If a sentence needs a brand name to stand, it was not ready.",
      "Megawatts before models. That one will stick.",
      "No mascot required. Smile. Then check the cooling."
    ],
    dA: [
      "One more stack sentence:",
      "The extra honesty after the keynote:",
      "If you keep only a test, keep this.",
      "Explain it without a logo. That is the exam."
    ],
    dB: [
      "megawatts, cooling, and a Sunday restart beat a miracle.",
      "a brochure cannot compound. A maintained floor can.",
      "the demo left. The bill stayed. Believe the bill.",
      "no mascot required. Competence with a cooling budget is enough."
    ],
    wA: [
      "Watch power",
      "Watch whether it restarts",
      "Watch the bill",
      "Watch whether a brand",
      "Watch cooling"
    ],
    wB: [
      "before the model.",
      "on a Sunday without a keynote.",
      "after the demo leaves.",
      "is still required for the sentence to stand.",
      "as an input, not as an afterthought."
    ],
    watch: [
      "Power, water, people — the three unfashionable inputs.",
      "Whether the bottleneck is silicon, permission, or sleep.",
      "Whether it can restart on Sunday.",
      "Whether the sentence needs a logo.",
      "Whether welders showed up, or only brunch."
    ]
  });

  L.health = desk({
    heads: [
      "The night shift is the print",
      "A body is not a press cycle",
      "Staff Tuesday or the forecast is late",
      "Care is a labor market",
      "Sleep is the cheap reform",
      "Labor lives in a back",
      "Wellness theatre does not staff",
      "Prevention is cheaper than theatre",
      "A ratio, not a vibe",
      "Carers to cared-for",
      "The clinic is logistics with a conscience",
      "Absorb a bad week",
      "You are not anxious. You are accurate.",
      "Kindness is staffing",
      "Drink water. That is not a joke.",
      "The body does not take a day off the clock",
      "Two jobs and a parent is not infinite hours",
      "Count systems, not strangers",
      "Tuesday is the test",
      "Health is how a civilisation continues"
    ],
    dek: [
      "From 'labor' in the rooms to a back, a night, a shift.",
      "The body does not take a press cycle off. That is the insight.",
      "Staff Tuesday or every other forecast is late.",
      "Kindness here is staffing. Everything else is branding."
    ],
    msA: [
      "The official rooms say labor as if nobody lives in a body.",
      "The mainstream health story is either panic or wellness theatre.",
      "You have been offered both. Neither staffs Tuesday.",
      "What you were handed is a forecast that assumes infinite healthy hours.",
      "A vibe was issued. A night shift was not filled.",
      "Everyone was invited to optimize before they were invited to sleep.",
      "The specialist voice arrived without a carer in it.",
      "You were told your accuracy was anxiety."
    ],
    msB: [
      "Labor lives in a back, a night, a shift. Start there.",
      "You were right to roll your eyes.",
      "Count staff, sleep, and whether a household can absorb a bad week.",
      "People who already run two jobs and a parent are not an infinite input.",
      "Aging is a ratio, not a vibe: carers to cared-for, beds to winters.",
      "You can argue with a speech. You cannot argue with an empty rota.",
      "Prevention is cheaper than theatre. Sleep is cheaper still.",
      "If you have been doing that math, you are not anxious. You are accurate."
    ],
    cutA: [
      "Every other desk on this letter arrives here:",
      "A constructive health desk counts systems, not strangers.",
      "No diagnoses from a chair.",
      "The clinic is logistics with a conscience.",
      "If the clinic cannot staff Tuesday,",
      "Kindness is staffing.",
      "Drink water. That is not a joke.",
      "Health is how a civilisation proves it intends to continue."
    ],
    cutB: [
      "a person who can still work, care, walk, and think. That is the hard constraint under the hard constraints.",
      "That respect is the method.",
      "Just the rota, the sleep, the week a household can absorb.",
      "Once you see that, the specialist costume loosens.",
      "every other forecast is late. Start there.",
      "Everything else is branding. You can smile at that and still mean it.",
      "Keep the body. Keep the carer. Keep Tuesday staffed.",
      "You can keep that without a manifesto."
    ],
    inA: [
      "Once you start at Tuesday's rota,",
      "You understood if you leave with staffing, sleep, and a refusal to treat a body as a press cycle.",
      "The carer and the operator in the same week are the expert.",
      "Optimistic by default: prevention and sleep still work, and they are not a brand.",
      "Count the ratio. Then be kind on purpose.",
      "A bad week should be absorbable. That is policy.",
      "You were spoken to, not around. Good.",
      "The night shift is the print. Believe it."
    ],
    inB: [
      "the theatre looks expensive.",
      "Drink water. Then decide one thing.",
      "Believe them.",
      "You can practise that tonight.",
      "That is adult.",
      "You already wanted that.",
      "Stay there.",
      "It does not take a press cycle off."
    ],
    heard: [
      "If you have been the carer and the operator in the same week, this desk is talking to you. Not around you.",
      "If you have been doing that math, you are not anxious. You are accurate."
    ],
    keep: [
      "Keep the body. Keep the carer. Keep Tuesday staffed.",
      "You understood if you leave with staffing and sleep, not a wellness brand.",
      "Kindness is staffing. Remember that. It sticks."
    ],
    note: [
      "No diagnoses from a chair. Count systems.",
      "Staff Tuesday or the forecast is late. That line will burn in.",
      "Sleep is the cheap reform. You can start tonight."
    ],
    dA: [
      "One more clinical sentence:",
      "The extra honesty after the wellness theatre:",
      "If you keep only a test, keep Tuesday.",
      "Kindness is staffing. Everything else is branding."
    ],
    dB: [
      "the night shift is the print. Believe the rota.",
      "a body is not a press cycle. Stop treating it like one.",
      "if Tuesday is unstaffed, every other forecast is late.",
      "sleep is still the cheapest reform, and it starts tonight."
    ],
    wA: [
      "Watch the rota",
      "Watch sleep",
      "Watch whether a household",
      "Watch prevention",
      "Watch whether Tuesday"
    ],
    wB: [
      "before the forecast.",
      "as a policy, not as a slogan.",
      "can still absorb a bad week.",
      "is funded or only praised.",
      "actually fills."
    ],
    watch: [
      "Staffing, beds, the household's ability to absorb a bad week.",
      "Whether prevention is funded or only praised.",
      "Whether Tuesday's rota actually fills.",
      "Whether the body is still treated as a press cycle.",
      "Whether kindness showed up as staff."
    ]
  });

  L.security = desk({
    heads: [
      "Boredom is the win",
      "Spare parts beat speeches",
      "A corridor is the thesis",
      "No war tourism from this chair",
      "The night should stay dull",
      "Spectacle is cheap",
      "Invoices keep alliances",
      "A map with little tanks is a product",
      "Prices arrived before the theory",
      "Literature cannot load a ship",
      "Settlement over spectacle",
      "Training is untelevised",
      "Hope without being simple",
      "Constraints have numbers",
      "No trophies, no names",
      "The bus still needs a night",
      "Deterrence is a schedule",
      "Civilian clothes, security bones",
      "Decline the temperature",
      "Then live"
    ],
    dek: [
      "From the map with little tanks to a night that stays boring.",
      "Spectacle is cheap. A corridor is the thesis.",
      "Spare parts beat speeches. You can keep that.",
      "Boredom at a border is an achievement."
    ],
    msA: [
      "The mainstream security product is a map with little tanks and a temperature.",
      "You have been invited to do war tourism from a comfortable chair.",
      "What you were handed is costume.",
      "The feed needs escalation. A port needs a night that stays dull.",
      "Households felt this first as prices, then as attention they did not consent to give.",
      "A speech traveled. A spare part did not.",
      "Everyone was asked to pick a team before they picked a corridor.",
      "You were told boredom was a failure of narrative."
    ],
    msB: [
      "Decline. The chair is not a briefing room.",
      "Deterrence, like term premia, works slowly and then all at once.",
      "Speeches are cheap. Spare parts and training are not.",
      "Trade lanes, cables, grain — security stories in civilian clothes.",
      "If your geopolitics cannot survive a freight print, it was literature.",
      "Literature can be beautiful. It cannot load a ship.",
      "The inherited want continuity. The ordinary want the bus. Both need a dull night.",
      "Boredom at a border is not a failure. It is the point."
    ],
    cutA: [
      "A country that cannot keep a port, a cable, a hospital, and a school ordinary",
      "A constructive line is not naivety.",
      "Alliances are balance sheets with flags.",
      "Follow the invoice.",
      "You are allowed to hope for a corridor without being simple.",
      "Constraints have numbers. This desk will not name private people as trophies.",
      "If a sentence only works by frightening you,",
      "Logistics, then law, then hope."
    ],
    cutB: [
      "will discover that every other argument was luxury.",
      "It is the observation that most people, most days, prefer a settlement to a spectacle.",
      "They work when invoices are paid.",
      "That is ruder and more useful than a map with toys.",
      "That bet is not stupid.",
      "You prefer numbers. Good.",
      "it was selling something. Decline. You already wanted to.",
      "That order is the whole comment."
    ],
    inA: [
      "Once you want a dull night more than a clip,",
      "Keep the corridor. Then live.",
      "Order is not a mood. It is a maintained machine.",
      "You understood if you leave less frightened and more interested in spare parts.",
      "Anyone selling spectacle as strategy is not pricing your Tuesday.",
      "Training is untelevised. Prefer it.",
      "Hope without being simple is allowed.",
      "The night should stay dull. That is a policy."
    ],
    inB: [
      "the temperature looks like a product.",
      "That is the optimistic default.",
      "Maintain it.",
      "Good. That was the test.",
      "You already knew. Stay there.",
      "You can smile at that.",
      "Keep it.",
      "Then the rest of the week can be about living."
    ],
    heard: [
      "If you have been hoping, quietly, that the grown-ups still have a corridor: yes. That is the bet. It is not a stupid bet.",
      "You prefer numbers to trophies. Good."
    ],
    keep: [
      "Keep the corridor. Keep the night boring. Then live.",
      "You understood if you leave more interested in spare parts than in maps.",
      "Boredom is the win. Remember that. It sticks."
    ],
    note: [
      "If a sentence only works by frightening you, it was selling something. Decline.",
      "No war tourism from this chair. Logistics, then law, then hope.",
      "Spectacle is cheap. A corridor is the thesis. Smile. Then prefer the corridor."
    ],
    dA: [
      "One more security sentence, then live:",
      "The extra honesty after the map with toys:",
      "If you keep only a preference, keep a dull night.",
      "Spare parts beat speeches. Training is untelevised."
    ],
    dB: [
      "a corridor is the thesis. Spectacle is the product.",
      "literature cannot load a ship. Freight can.",
      "boredom at a border is an achievement, not a failure.",
      "if a sentence only works by frightening you, it was selling something."
    ],
    wA: [
      "Watch the corridor",
      "Watch spare parts",
      "Watch insurance",
      "Watch whether the night",
      "Watch whether a sentence"
    ],
    wB: [
      "before the map with little tanks.",
      "and training — the untelevised stocks.",
      "as if it still cleared.",
      "stayed dull.",
      "needed fear to stand."
    ],
    watch: [
      "Corridors, cables, whether insurance still clears.",
      "Spare parts and training — the untelevised stocks.",
      "Whether the night stayed dull.",
      "Whether spectacle was priced as strategy.",
      "Whether the bus still had a night."
    ]
  });

  function enrich(L) {
    var P = {
      markets: {
        h1: ["The tape", "Price", "Funding", "The quiet book", "The open", "The close", "Collateral", "Patience"],
        h2: ["does not owe you a miracle", "clears without a choir", "voted before the microphone", "still fits a night you can sleep", "is a schedule with teeth", "is a receipt, not a sermon", "is the deed; carry is rent", "is still the uncrowded factor"],
        m1: ["Today's hospitality was a temperature with a chart behind it.", "A crowd assembled around a number that had not settled.", "The feed needed a winner before the book had a clearing time.", "Someone sold a mood and called it a market.", "The official verb arrived on time and meant almost nothing.", "You were invited to panic or to cheer. Both were products.", "A secret was advertised. None was required.", "The loud book performed. The quiet one cleared."],
        m2: ["You can skip the costume and still be early.", "That is not how a spread actually heals.", "The stampede is the inventory they are selling.", "A choir is optional. Collateral is not.", "Ordinary healing looks dull, which is the point.", "You were not missing a ticker. You were missing quiet.", "The late story always needs a villain.", "Size to sleep remains the whole method."],
        c1: ["The useful cut is almost insulting in its simplicity.", "They did not hide a print. They hid a schedule.", "If it needed applause to hold, it was theatre.", "Funding already voted in small type.", "You may leave the crowd without leaving the market.", "Punctual is not cruel. It is on time.", "Cheerleaders showed up. The bid did not need them.", "Variance left the headline and went to work."],
        c2: ["Keep that, and the rest is weather.", "Price is the apology. Take it.", "Tourists donate. You collect.", "The microphone is catching up, late as usual.", "That is still legal, and it still pays.", "A feeling is not a position.", "The comment section is not a bid.", "Quiet liquidity is a test you can pass on purpose."],
        i1: ["The mechanism is cash, time, and a night you can still sleep.", "Once the tape is a schedule, the mood looks expensive.", "Books heal like bruises: unphotographed, then usable.", "The inherited and the ordinary run the same Tuesday in different fonts.", "Stop renting panic and the basis starts looking like a wage.", "Compounding prefers boredom. You can prefer it too.", "You do not need a hotter take. You need a clearing time.", "Luck arrives embarrassed when the habit is already working."],
        i2: ["That is the whole desk, said slowly enough to keep.", "You can pocket it and go outside.", "Same language, different stationery, same refusal to perform.", "That is how Tuesday remains livable.", "Dull is not a failure. Dull is how it compounds.", "The constructive read is almost boring. Good.", "Keep the schedule. Starve the speech.", "You understood if you leave with a size, not a sermon."],
        x1: ["One more market fact, still short:", "The extra turn after the choir goes home:", "If you remember only a test, remember this:", "Here is the detail that makes the stampede look silly:"],
        x2: ["the bid lives in time and collateral, not in volume of takes.", "ordinary healing is unfashionable, which is why it still works.", "you do not need a secret. You need a night that still fits.", "once applause is optional, you are already early."],
        t1: ["Sit with this for a second and it gets kinder:", "The optimistic default is not a mood. It is a bet:", "You can smile at the tape without becoming a tourist:", "The letter's job is to return your nervous system:"],
        t2: ["systems would like to remain systems. Check the funding, then live.", "the boring basis still pays people who can wait.", "a punctual market is not your enemy. The choir is optional.", "relief is a print. If you felt it, you understood."],
        hd1: ["If you already thought the timeline was overacting,", "If the loudest account felt like it did not have to clear,", "If you refused the stampede before breakfast,", "If this reads like a receipt for something you already knew,"],
        hd2: ["you were early, not naive.", "you were right. This is only the stamp.", "keep that. It is the edge.", "good. That is the point of the desk."],
        k1: ["Keep the habit. Starve the speech.", "Let tourists donate.", "Go outside. The tape will keep.", "You have a life to run."],
        k2: ["The rest is weather.", "You collect the boring basis.", "Tuesday is still allowed.", "That is the whole optimistic default."],
        n1: ["Price is the apology.", "Cheerleaders are not a bid.", "Tuesday is rarer than a rapture.", "Relief is information."],
        n2: ["You can remember that all week.", "Smile, then size to sleep.", "You understood if you wanted less drama.", "Keep it."],
        w1: ["Watch whether the choir", "Watch whether funding", "Watch whether breadth", "Watch whether your night", "Watch whether the close", "Watch whether tourists"],
        w2: ["is still required to believe the bid.", "cleared before the microphone did.", "is singing or merely decorating.", "still fits the size you chose.", "looks like a receipt.", "are paying you to wait."]
      },
      geoecon: {
        h1: ["Freight", "Invoices", "The corridor", "Insurance", "The grocery ticket", "A warehouse", "Settlement", "The bill of lading"],
        h2: ["is the diplomat", "redraw the map", "beats the cliff", "comes before the metaphor", "is the honest map", "with flags is still a warehouse", "prefers boredom", "outvotes the communiqué"],
        m1: ["The mainstream map arrived as a morality play.", "A villain was issued before a corridor was checked.", "The summit photograph traveled farther than the insurance slip.", "You were handed a temperature and told it was strategy.", "Borders were loud. They usually are when attention is fundraising.", "The clip needed escalation. The port needed a schedule.", "Flags did their job. Freight did not need to shout.", "Everyone picked a team before they picked a settlement."],
        m2: ["Warehouses need corridors, not villains.", "That is not how a container gets insured.", "Logistics will finish the argument anyway.", "A grocery ticket is a more honest map.", "Incentives commute. Treaties take the train.", "You can decline the costume and still be informed.", "Haircuts redraw more lines than speeches.", "Most days the lights stay on. That is allowed to be the story."],
        c1: ["The cut is logistics, not cynicism.", "You do not need a war room for this.", "Power still matters. So does the invoice.", "If it cannot survive a grocery ticket,", "Follow the corridor and the panic looks overdressed.", "A settlement is how people get home.", "Who can still fund, ship, and settle:", "The optimistic fact hides under the panic on purpose."],
        c2: ["Treaties are slow. Incentives are not.", "You need a corridor more than a metaphor.", "Hold both and the clip looks like an ad.", "it was cosplay, and you already knew.", "Insurance before the metaphor. Always.", "You are allowed to hope for boredom at a border.", "that is the whole method.", "Competence that still wants dinner is policy."],
        i1: ["Once freight and flags sit in the same hand,", "Nations survive on sequences, like families.", "Corridors beat cliffs when anyone measures.", "Keep the invoice in view.", "A warehouse with flags is maintained, or it is not.", "The inherited knew. The ordinary learn it at the pump.", "Diplomacy is a long invoice with better chairs.", "Same shock, two clocks."],
        i2: ["the temperature looks like fundraising.", "That is allowed to be good news.", "You can keep that without becoming simple.", "The morality play loses its budget.", "Repair is unfashionable and expensive to skip.", "You were not imagining the squeeze.", "If you remember the invoice, you remember enough.", "You can work with that without applause."],
        x1: ["One more international fact:", "The extra honesty after the photograph:", "Keep this beside the ticket:", "If the clip dies here, let it die:"],
        x2: ["who can still settle is the map.", "a corridor is a policy. A villain is a product.", "insurance quotes are diplomats.", "most days the lights stay on."],
        t1: ["Sit with the corridor for a second:", "The kind bet is not naive:", "You can smile at a dull border:", "The letter returns you to dinner:"],
        t2: ["most systems prefer a corridor to a cliff. Build as if that is true.", "people still want the lights on more than the metaphor.", "boredom there is an achievement.", "competence that wants dinner is a foreign policy."],
        hd1: ["If you did the household math while they did the geopolitics,", "If the world never felt like a movie to you,", "If the grocery ticket taught you more than the clip,"],
        hd2: ["you were on the real desk.", "you were right. It is a warehouse with flags.", "you already had the method."],
        k1: ["Keep the corridor, not the choir.", "Prefer freight to villains.", "Want dinner more than a metaphor."],
        k2: ["That is the whole international pocket.", "You understood if that feels like relief.", "That is allowed to be the point."],
        n1: ["Insurance before the metaphor.", "Flags are loud on purpose.", "Freight does not need to shout."],
        n2: ["Smile. It stays true tomorrow.", "You can remember that.", "The diplomat already left the port."],
        w1: ["Watch freight", "Watch insurance", "Watch settlement", "Watch the grocery ticket", "Watch the corridor"],
        w2: ["before the metaphor.", "as a diplomat.", "in a currency others still hold.", "before you trust the map.", "after the clip fades."]
      },
      politics: {
        h1: ["The annex", "The footnote", "Wednesday", "The calendar", "The clerk", "The bus", "The rally", "Rage"],
        h2: ["is the news", "outvotes the choir", "still has to work", "is the adult", "would like to remain a clerk", "is the program", "is an ad", "is overpriced"],
        m1: ["The product on offer was recruitment with a smile.", "A personality arrived wearing a podium.", "You were invited to perform citizenship as a sport.", "A clip outran a budget line again.", "The temperature was sold as a program.", "Campaigns dressed up as governing.", "You were tired of being recruited. That fatigue is skill.", "A choir assembled before a calendar did."],
        m2: ["You do not have to RSVP.", "Governing is still wholesale.", "Wednesday still has to work.", "The annex does not trend. That is its virtue.", "You were right to want the place simply run.", "Retail is loud. Wholesale is the job.", "Keep the fatigue. It is civic.", "A legislature is not a choir."],
        c1: ["We will not hunt persons for sport.", "The useful cut is who can spend, who can say no, who faces a calendar.", "The feed is not disproved by shouting 'corrupt.'", "Democracy, on a good day, is how you lose without burning the building.", "Budgets, courts, statistical offices:", "Mock the clerks and you miss Tuesday.", "Repair is unphotographed.", "A slightly positive desk assumes clerks want to remain clerks."],
        c2: ["It is cheap and it makes you dumber.", "That is ruder than a takedown, and more useful.", "It is disproved by reading the annex.", "Hold that without becoming a mark.", "the unsexy triad still runs the middle of the week.", "That is not a small mistake.", "That is how it usually works.", "Then it checks if the numbers stay honest."],
        i1: ["Once the annex is the news,", "The inherited want continuity. The ordinary want the bus.", "Keep your nervous system.", "Institutions are a letter to people alive after the clip.", "You can count on quiet repair without clapping.", "A calendar with teeth beats a personality.", "If it only works as recruitment, it is not analysis.", "Optimistic by default means Wednesday can exist."],
        i2: ["the rally looks like an ad.", "Same request, two accents.", "That is an allergy to cosplay, not apathy.", "Pocket that sentence.", "That is adult.", "Vote if you can. Read the footnote either way.", "You already preferred the footnote.", "You need a bus more than a miracle."],
        x1: ["One more civic fact:", "The extra honesty after the choir:", "If you take one institution home:", "Wednesday is the exam:"],
        x2: ["who can spend, who can refuse, who still has a date on the calendar.", "clerks remaining clerks is not a small civilisational trick.", "the footnote still outvotes the choir when it is read.", "the clip is not."],
        t1: ["Sit with the bus for a second:", "You can want continuity without a costume:", "The kind default is not applause:", "This desk returns your temperature:"],
        t2: ["it is the program. Continuity is not a crime.", "the ordinary and the inherited asked for the same thing.", "repair happening quietly is still repair.", "cooler is a policy preference."],
        hd1: ["If you have been saying just run the place,", "If the temperature felt like recruitment,", "If you wanted the footnote more than the choir,"],
        hd2: ["this desk heard you.", "you were not wrong.", "you already had the method."],
        k1: ["Read the annex.", "Keep your nervous system.", "Prefer the bus to the miracle."],
        k2: ["Vote if you can.", "That is not apathy.", "You understood if you leave cooler."],
        n1: ["Rage is overpriced.", "Just run the place.", "The annex is ruder than a takedown."],
        n2: ["Put the phone down a degree.", "That is the whole comment.", "And more useful."],
        w1: ["Watch the annex", "Watch Wednesday", "Watch the footnote", "Watch the clerks", "Watch whether you were"],
        w2: ["before the rally.", "for a bus.", "as if it were the news.", "for honesty, not applause.", "recruited or informed."]
      },
      psych: {
        h1: ["Calm", "The phone", "A checklist", "Attention", "Indignation", "Sleep", "A walk", "Water"],
        h2: ["is still legal", "belongs in the other room", "beats a saga", "is a cost of goods", "is not a thesis", "is a risk limit", "still compounds", "then one decision"],
        m1: ["A new personality was promised by Friday.", "A villain was required before breakfast.", "Your anxiety was offered a brand.", "You bought some of the diet. That makes you a customer, not a fool.", "The feed asked for a temperature as proof of care.", "A saga arrived dressed as information.", "Membership in a mood was on sale.", "The villain was punctual. The plan was not."],
        m2: ["You need a Wednesday sequence, not a new self.", "That is inventory, not duty.", "It is often an unmanaged diet in a clever jacket.", "Customers can leave.", "You can become expensive again.", "Give the mind a list. It wanted a saga.", "You do not owe the mood a subscription.", "Stretching is fine. It is not a plan."],
        c1: ["You do not need a new personality.", "Attention is now a cost of goods sold.", "The inherited fear a wasted past. The ordinary fear no future.", "A villain before coffee means you are stretching.", "Calm is a technology.", "Optimism without being a mark is allowed.", "A repeatable Wednesday sequence", "Water, walk, one decision."],
        c2: ["You need a sequence you can repeat when it is ugly.", "Make it expensive again. That is price, not withdrawal.", "Both are permission stories. A hotter take will not settle them.", "Stop before it becomes your name.", "You can practise it. That is the method.", "You already suspected. This is the stamp.", "has saved more than a macro call.", "If that is all you keep, you understood."],
        i1: ["Treat the diet as a position and", "Sleep does not negotiate.", "Relief is a print.", "Be kind to yourself without subscribing to your panic.", "The checklist is not romantic. It compounds.", "Become expensive again.", "A walk still clears more than a thread.", "You are not behind. You are not stampeded."],
        i2: ["the villain looks like inventory.", "Keep that limit.", "Keep the sentence that fit.", "That product is free.", "Practise until it looks like personality. Then continue.", "The feed cannot mark it. Good.", "You wanted permission. You have it.", "That edge is still legal."],
        x1: ["One more useful line, then the phone can go:", "The extra cut:", "If you keep a method:", "Calm is cheaper than a new self."],
        x2: ["a bad-Wednesday sequence beats a saga.", "attention costs. Price it.", "water, walk, one decision.", "you are over-informed, not broken."],
        t1: ["Sit with the other room for a second:", "You can smile at the saga and still obey the list:", "The kind default is not numbness:", "This desk returns you to your own attention:"],
        t2: ["expensive attention is a position.", "that is adult.", "it is practised calm.", "that was the whole point."],
        hd1: ["If you came to feel less crazy,", "If you already wanted the phone elsewhere,", "If optimism without being a mark felt like home,"],
        hd2: ["stay. That is a legitimate use.", "this is the nudge you will remember.", "you already had the desk."],
        k1: ["Water, walk, one decision.", "You are over-informed, not broken.", "Give the mind a checklist."],
        k2: ["Understanding is cooler than winning.", "Act like that is true.", "It wanted a saga. Smile, then obey."],
        n1: ["Calm is still legal.", "Put the phone in the other room.", "If you finished smug, drink water."],
        n2: ["That one burns in.", "The day will not sue you.", "Same prescription as anger."],
        w1: ["Watch the diet", "Watch sleep", "Watch the villain", "Watch the phone", "Watch the list"],
        w2: ["as a position.", "as a limit.", "before coffee.", "in the other room.", "beating the saga."]
      },
      energy: {
        h1: ["Inventories", "The bill", "Freight", "Storage", "Physics", "The lights", "A barrel", "The weld"],
        h2: ["skip the play", "arrived first", "sets the conversation", "vetoes the sermon", "does not trend", "come before the architecture", "is a schedule", "is the transition"],
        m1: ["A sermon arrived with a price tag.", "Attitude was issued. Arithmetic was not.", "You felt the bill before the take.", "Adjectives arrived after freight had voted.", "A morality was required. Litres were required more.", "A church of energy was offered before a print.", "The slogan traveled. Storage did not.", "The spike was given a personality."],
        m2: ["You are the high-frequency print, not unsophisticated.", "Tightness is arithmetic.", "Trust that order.", "Inventories do not attend.", "Keep the lights. Skip the sermon.", "8 a.m. still clears on hydrocarbons. That is a clock.", "Concrete, copper, patience: that is the real transition.", "Adults can hold both without a church."],
        c1: ["Believe two things at once.", "When prompt tightens, marketing loosens.", "A cold house is not a take.", "A spike can be loud and finite.", "Treat barrels and electrons like a bridge.", "The back of the curve often refuses the panic.", "You do not need to be a prophet.", "Follow the physical."],
        c2: ["8 a.m. still has to work. Welders still have to show. Hold both.", "Households adapt or donate. You already chose.", "There is humor in watching the internet discover storage. Hold both.", "Check storage before you join a church.", "Maintained, unfashionable, necessary.", "Notice that. It is kindness in a number.", "Respect physics. Plan a summer.", "Let the sermon catch the next train."],
        i1: ["Once the bill outranks the take,", "Lights first, architecture second.", "Plan dinner, then the grid.", "A summer is still allowed.", "Maintenance is the cousin of every energy story that works.", "You can stop refreshing.", "Inventories are the adult.", "The household bill is still the fastest political number."],
        i2: ["the sermon looks like hospitality.", "Sequence is mercy.", "That order is civilisation.", "Optimistic, and practical.", "Welders, not brunch.", "Physics does not trend. Good.", "Check them. Then go outside.", "You felt it first. Believe yourself."],
        x1: ["One more physical line:", "After the sermon:", "If you keep a sequence:", "Dinner and a weld are both allowed."],
        x2: ["inventories skip the play. Check them.", "the bill arrived first.", "lights first.", "the back of the curve often stays calmer. Notice."],
        t1: ["Sit with the tank for a second:", "You can want a transition and still want 8 a.m.:", "The kind default is not a church:", "This desk returns you to dinner:"],
        t2: ["arithmetic is not an insult.", "adults hold both.", "it is a weld.", "that is civilisation."],
        hd1: ["If you wanted the lights to matter more than the take,", "If you did household math during the geopolitics,"],
        hd2: ["they do.", "you were already on this desk."],
        k1: ["Keep the lights on, then argue.", "Follow the physical.", "Plan a summer."],
        k2: ["Sequence is mercy.", "You understood if dinner is still possible.", "That is the optimistic default."],
        n1: ["Physics does not trend.", "The bill arrived first.", "No war diagnosis from a chair."],
        n2: ["Remember it all week.", "Believe the bill.", "The curve, then a corridor."],
        w1: ["Watch inventories", "Watch freight", "Watch the bill", "Watch the front", "Watch spare capacity"],
        w2: ["before adjectives.", "as the conversation.", "as politics.", "for theatre versus physics.", "before the sermon."]
      },
      money: {
        h1: ["The dots", "The committee", "A hold", "The kitchen", "Patience", "Funding", "The mortgage", "Temperament"],
        h2: ["are not scripture", "is trying to sleep", "can be a kindness", "already voted", "is the policy you can run", "vetoes drama", "outlives the presser", "beats a call"],
        m1: ["A cult of hawks and doves was offered.", "A rate call arrived dressed as a personality.", "The press conference asked to be a plot twist.", "The dots were treated as scripture.", "You were asked to pick a team before a mortgage plan.", "A verb was issued. The household issued a delay.", "The feed wanted a pivot. The sheet wanted a bedtime.", "Waiting was sold as a scandal."],
        m2: ["You do not have to RSVP.", "It is a balance sheet with a legal mandate and a bedtime.", "That sentence saves theatrical disappointment.", "You can plan the mortgage anyway.", "Households already run the policy: fixed-rate, second job, delayed kitchen.", "Same job as duration, different font.", "Patience is the policy you can execute.", "Waiting is often the kindness."],
        c1: ["Stop pretending the dots are holy.", "Headline up, growth cool, committee waits.", "Temperament beats a call.", "Money is strangers cooperating at scale.", "Hot tips have an exit everywhere.", "The conference is theatre.", "Stay solvent, kind, long optionality.", "The less theatrical instrument is the adult."],
        c2: ["You can live with a hold.", "That is a job, not a plot.", "Calls expire.", "The rest is a footnote, including the jokes.", "Solvent is the right reason to sit down.", "The window teaches more than the stage.", "That is the whole call, and it is not a number.", "Align, then go outside."],
        i1: ["Once the committee is a bedtime and a sheet,", "Assume the institution would like to remain one.", "Leave with a temperament, not a call.", "Believe the kitchen.", "Let funding math veto drama.", "You do not need a personality on the podium.", "Plan the mortgage as if waiting were allowed.", "Cooperation at scale still works more than the internet admits."],
        i2: ["the cult looks expensive.", "Then watch inflation, labor, and the wait.", "It survives a hold.", "Same policy, honest words.", "Then go outside.", "You need a night you can sleep.", "It is.", "Keep that without becoming simple."],
        x1: ["One more monetary line, then outside:", "After the conference:", "If you keep a temperament:", "A hold can be kindness."],
        x2: ["the kitchen is often the scripture.", "households already voted.", "patience is the runnable policy.", "plan the mortgage as if that were true."],
        t1: ["Sit with the bedtime:", "You can want an institution to remain one:", "The kind default is not a tip:", "This desk returns you to solvent:"],
        t2: ["it is more honest than a cult.", "that is the slightly positive bet.", "it is a temperament.", "that was the reason to sit down."],
        hd1: ["If you would not treat a presser as a personality,", "If you came to feel solvent,"],
        hd2: ["you were right.", "you came to the right desk."],
        k1: ["Let funding math veto drama.", "Leave with a temperament.", "Waiting is not a scandal."],
        k2: ["Then go outside.", "Not a call.", "Remember it all week."],
        n1: ["Not a rate call.", "The dots are not scripture.", "Households run policy too."],
        n2: ["A temperament call.", "Smile, then plan the mortgage.", "You live there."],
        w1: ["Watch real yields", "Watch the kitchen", "Watch the bedtime", "Watch the call", "Watch labor"],
        w2: ["with energy, before personality.", "as policy.", "more than the choir.", "pretending to be temperament.", "as the vote."]
      },
      ordinary: {
        h1: ["The tomato", "The school run", "The kitchen", "Payroll", "The commute", "Milk", "The table", "Tuesday"],
        h2: ["is the print", "still clears", "is a rates view", "is the honest number", "is a balance sheet", "is high-frequency", "is the expert", "can still be livable"],
        m1: ["The specialist letter was written as if you were not in it.", "This stuff was reserved for experts as a costume.", "You were in it at breakfast. The tomato had a price.", "A class voice arrived without a school run.", "You were invited to feel unqualified before you felt the rent.", "A kitchen renovation is a rates view. Nobody announced it.", "Ordinary was sold as lesser.", "The expert spoke. The table still had to clear tonight."],
        m2: ["The font was the problem, not you.", "Take the costume off.", "Believe the tomato.", "You were never a lesser reader. You were the point.", "A commute is duration. A paycheck is a print.", "You already run a book.", "It is the elite skill, practised without a summit.", "The table is the expert that settles."],
        c1: ["Warehouse or commute: both are duration.", "Keeping a household through a loud decade is elite.", "Policy becomes furniture in housing.", "Affordability is wages versus rents.", "You do not have to tweet at the triangle.", "Believe payroll over costume.", "Teach competence, or practise it.", "Corridors are how children get to school."],
        c2: ["Better collateral helps. A boring sequence saves both.", "Unphotographed, daily.", "You already work with that.", "You were not wrong to notice.", "You can buy milk and still be in the letter.", "Same letter. Same dignity.", "That is enough justification.", "That is the program."],
        i1: ["Once the table is the expert,", "Keep household, joke, dry powder.", "Tuesday can still be livable.", "If you felt spoken to, you were.", "The bus is the program.", "Dinner is duration. You already run it.", "Share this with the person who thinks it is not for them.", "Ordinary is the point."],
        i2: ["the presser looks overdressed.", "Complete strategy for most humans.", "Keep that without a forecast.", "Good.", "Continuity is not a crime.", "Smile at that.", "They were in it the whole time.", "Keep that. It burns in."],
        x1: ["One more household line:", "After the specialist voice:", "If you keep a strategy:", "Believe the tomato."],
        x2: ["wages versus rents still clears.", "you were the point.", "household, joke, dry powder.", "it is a print."],
        t1: ["Sit with the table:", "You can be elite without a summit:", "The kind default is livable Tuesday:", "This desk is for people who buy milk:"],
        t2: ["it settles tonight.", "you already were.", "that is enough.", "that is the whole line."],
        hd1: ["If you have been doing honest math at the table,", "If you wanted to be spoken to like an adult who buys milk,"],
        hd2: ["you are early, not bad with money.", "that is the editorial line."],
        k1: ["Keep the household and the joke.", "The tomato is a print.", "School-run math still clears."],
        k2: ["And a little dry powder.", "Believe it.", "Tonight."],
        n1: ["This section is the point.", "You buy milk.", "A kitchen is a rates view."],
        n2: ["The other desks keep it honest.", "This letter is for you.", "Better lighting."],
        w1: ["Watch wages versus rents", "Watch the table", "Watch Tuesday", "Watch the tomato", "Watch the specialist"],
        w2: ["as the debate that clears.", "as tonight's expert.", "for livable.", "as a print.", "for talking down."]
      },
      tech: {
        h1: ["The demo", "The bill", "Megawatts", "A mascot", "The floor", "Cooling", "Sunday", "Welders"],
        h2: ["left", "stayed", "before models", "is not required", "can restart", "is an input", "is the exam", "not brunch"],
        m1: ["A demo was scheduled to save civilisation by Thursday.", "A mascot and a miracle were issued.", "You were right about the keynote.", "The feed needed a saviour. The room needed cooling.", "A brand arrived as if it were physics.", "Worship was requested before a plug.", "The miracle traveled. The megawatt did not.", "The stack was told it had no physics."],
        m2: ["Something is still being built. Concrete, copper, patience.", "Electricity, cooling, people, a dull quarter: those constrain the decade.", "Treat it as infrastructure and the fairy tale ends. Kindness.", "Infrastructure can be maintained. Fairy tales only refresh.", "Software rents power, talent, and time.", "No electrician, no clerk: a brochure.", "Brochures do not compound. Second generations sometimes do.", "Physics showed up anyway."],
        c1: ["A corridor that reprices the year is a warehouse, not a ticker.", "The edge is not a secret model.", "What breaks when the demo leaves: heat, latency, liability, the late person.", "No mascot required.", "Welders, not brunch.", "Keep a human in the loop.", "Explain it without a brand.", "A cooling budget is competence enough."],
        c2: ["Warehouses like boredom. Join them.", "Ask the unglamorous question and wait.", "That is the adult list.", "Floor, megawatt, Sunday restart.", "Smile at that.", "Then maybe a thesis.", "If you cannot, it was not ready.", "Keep that."],
        i1: ["Price power first and", "Concrete and copper are being poured. That is the optimistic fact.", "Costume is optional.", "Second generation sometimes gets paid.", "Hype funds. Maintenance civilises.", "You muttered about electricity. You were the adult.", "A brochure cannot restart on Sunday. A floor can.", "No logo, still a sentence:"],
        i2: ["the keynote looks like hospitality.", "Skip the costume.", "Skip it.", "Patience is a tech policy.", "Keep the second sentence.", "Stay there.", "Prefer the floor.", "that was the test."],
        x1: ["One more stack line:", "After the keynote:", "If you keep a test:", "No logo required."],
        x2: ["megawatts and a Sunday restart beat a miracle.", "a brochure does not compound.", "the demo left. The bill stayed.", "competence with cooling is enough."],
        t1: ["Sit with the bill:", "You can want tools and still want physics:", "The kind default is a floor:", "This desk returns you to Sunday:"],
        t2: ["believe it over the demo.", "adults hold both.", "maintained, unfashionable.", "can it restart."],
        hd1: ["If you asked who pays for the electricity,", "If you would not worship a logo,"],
        hd2: ["you were the adult in the thread.", "respect a cooling budget instead."],
        k1: ["Plug it in. Price the power.", "Explain it without a brand.", "Believe the bill."],
        k2: ["Keep a human in the loop.", "That is the exam.", "The demo already left."],
        n1: ["If it needs a brand to stand, it was not ready.", "Megawatts before models.", "No mascot required."],
        n2: ["Yours does not.", "That sticks.", "Check the cooling."],
        w1: ["Watch power", "Watch Sunday", "Watch the bill", "Watch the logo", "Watch cooling"],
        w2: ["before the model.", "for a restart.", "after the demo.", "required to stand.", "as an input."]
      },
      health: {
        h1: ["The rota", "The night shift", "Tuesday", "Sleep", "Staffing", "A body", "Prevention", "Care"],
        h2: ["is the print", "does not take a press cycle off", "must fill or the forecast is late", "is the cheap reform", "is kindness", "is not a campaign", "is cheaper than theatre", "is a labor market"],
        m1: ["Labor was discussed as if it had no body.", "Panic and wellness theatre were both on offer.", "Neither staffs Tuesday.", "Infinite healthy hours were assumed of people already running two jobs and a parent.", "A vibe was issued. A shift was empty.", "Optimization was offered before sleep.", "The specialist voice had no carer in it.", "Your accuracy was called anxiety."],
        m2: ["Start with a back, a night, a shift.", "You were right to roll your eyes.", "Count staff, sleep, a household's bad week.", "That input is not infinite.", "Aging is a ratio: carers, beds, winters.", "You can argue with a speech, not with an empty rota.", "Prevention is cheaper. Sleep is cheaper still.", "You were accurate."],
        c1: ["Every other desk arrives here:", "Count systems, not strangers.", "No diagnoses from a chair.", "The clinic is logistics with a conscience.", "Unstaffed Tuesday,", "Kindness is staffing.", "Drink water. Not a joke.", "A civilisation that intends to continue"],
        c2: ["a person who can still work, care, walk, think.", "That respect is the method.", "Rota, sleep, absorbable week.", "The costume loosens.", "late forecast. Start there.", "Branding is the rest. Mean it.", "Keep body, carer, Tuesday.", "looks like this."],
        i1: ["Start at Tuesday's rota and", "Leave with staffing, sleep, and no press-cycle body.", "The carer-operator is the expert.", "Prevention and sleep still work. Not a brand.", "Count the ratio. Then be kind on purpose.", "A bad week should be absorbable. That is policy.", "You were spoken to, not around.", "The night shift is the print."],
        i2: ["the theatre looks expensive.", "Drink water. Then one decision.", "Believe them.", "Practise tonight.", "That is adult.", "You already wanted that.", "Stay.", "It does not take a day off."],
        x1: ["One more clinical line:", "After the theatre:", "If you keep a test:", "Kindness is staffing."],
        x2: ["believe the rota.", "a body is not a press cycle.", "Tuesday unstaffed means the forecast is late.", "sleep starts tonight."],
        t1: ["Sit with Tuesday:", "You can be accurate without being anxious:", "The kind default is an absorbable week:", "This desk talks to the carer:"],
        t2: ["it is the exam.", "you already were.", "that is policy.", "not around them."],
        hd1: ["If you have been carer and operator in one week,", "If the math felt like accuracy,"],
        hd2: ["this is talking to you.", "it was."],
        k1: ["Keep the body and the carer.", "Leave with staffing and sleep.", "Kindness showed up as staff, or it did not."],
        k2: ["Keep Tuesday staffed.", "Not a wellness brand.", "Remember which."],
        n1: ["Count systems.", "Staff Tuesday or the forecast is late.", "Sleep is the cheap reform."],
        n2: ["No diagnoses from a chair.", "That burns in.", "Start tonight."],
        w1: ["Watch the rota", "Watch sleep", "Watch a bad week", "Watch prevention", "Watch Tuesday"],
        w2: ["before the forecast.", "as policy.", "for absorbable.", "funded or praised.", "for a fill."]
      },
      security: {
        h1: ["Boredom", "Spare parts", "A corridor", "Spectacle", "Training", "Insurance", "The night", "The bus"],
        h2: ["is the win", "beat speeches", "is the thesis", "is cheap", "is untelevised", "still has to clear", "should stay dull", "still needs a night"],
        m1: ["A map with little tanks was the product.", "War tourism from a chair was offered.", "Costume was issued as analysis.", "The feed wanted escalation. The port wanted a dull night.", "Prices arrived before the theory. So did stolen attention.", "A speech traveled. A spare part did not.", "A team was requested before a corridor.", "Boredom was called a narrative failure."],
        m2: ["Decline. The chair is not a briefing room.", "Deterrence works slowly, then all at once.", "Speeches are cheap. Parts and training are not.", "Cables, grain, lanes: security in civilian clothes.", "If it dies on a freight print, it was literature.", "Literature cannot load a ship.", "Continuity and the bus both need a dull night.", "Boredom at a border is the point."],
        c1: ["A port, a cable, a hospital, a school — if those fail,", "Not naive: most people prefer settlement to spectacle.", "Alliances are balance sheets with flags.", "Follow the invoice.", "Hope for a corridor without being simple.", "Numbers, not trophies. No private names.", "If fear is required for the sentence to stand,", "Logistics, then law, then hope."],
        c2: ["every other argument was luxury.", "Institutions exist to make betrayal expensive.", "They work when paid.", "Ruder than toys on a map, more useful.", "That bet is not stupid.", "You prefer numbers. Good.", "it was selling. Decline.", "That order is the comment."],
        i1: ["Want a dull night more than a clip and", "Keep the corridor. Then live.", "Order is a maintained machine, not a mood.", "Leave less frightened, more interested in parts.", "Spectacle priced as strategy is not pricing your Tuesday.", "Prefer untelevised training.", "Hope without being simple is allowed.", "A dull night is policy."],
        i2: ["the temperature looks like a product.", "That is the default worth having.", "Maintain it.", "That was the test.", "You already knew.", "Smile at that.", "Keep it.", "Then live the week."],
        x1: ["One more security line, then live:", "After the toy map:", "If you keep a preference:", "Spare parts beat speeches."],
        x2: ["a corridor is the thesis. Spectacle is the product.", "literature cannot load a ship.", "a dull night.", "training is untelevised."],
        t1: ["Sit with the dull night:", "You can want a corridor without a costume:", "The kind default is settlement:", "This desk returns you to Tuesday:"],
        t2: ["it is an achievement.", "people still prefer it.", "most days, most people.", "someone was not pricing it with tanks."],
        hd1: ["If you quietly hoped the grown-ups still had a corridor,", "If you prefer numbers to trophies,"],
        hd2: ["yes. That bet is not stupid.", "good."],
        k1: ["Keep the corridor.", "Prefer parts to maps.", "Boredom is the win."],
        k2: ["Keep the night boring. Then live.", "That was the test.", "Remember it."],
        n1: ["If it needs fear to stand, it was selling.", "No tourism from this chair.", "Spectacle is cheap."],
        n2: ["Decline.", "Logistics, law, hope.", "A corridor is the thesis."],
        w1: ["Watch the corridor", "Watch spare parts", "Watch insurance", "Watch the night", "Watch fear"],
        w2: ["before the toy map.", "and training.", "for a clear.", "for dull.", "required to stand."]
      }
    };

    Object.keys(P).forEach(function (k) {
      var D = L[k], W = P[k];
      if (!D || !W) return;
      function add(field, a, b) {
        if (!a || !b) return;
        D[field] = (D[field] || []).concat(pair(a, b));
      }
      D.heads = (D.heads || []).concat(pair(W.h1, W.h2));
      add("dek", W.h1, W.h2);
      add("mainstream", W.m1, W.m2);
      add("cut", W.c1, W.c2);
      add("insight", W.i1, W.i2);
      add("more", W.x1, W.x2);
      D.turn = (D.turn || []).concat(pair(W.t1, W.t2));
      add("heard", W.hd1, W.hd2);
      add("keep", W.k1, W.k2);
      add("note", W.n1, W.n2);
      add("watch", W.w1, W.w2);
    });
  }
  enrich(L);

  function fill(L) {
    var X = {
      markets: {
        heads: ["The auction already voted","Overnight is a character test","Crowding is not conviction","The unloved bid is still a bid","Rolls tell on the speech","Thin hours tell the truth","A gap is not a thesis","Settlement Wednesday is the adult","Dealers do not owe you a plot","The basis is a wage if you wait","Positioning is the weather under the weather","Mean reversion is a habit, not a prayer","The weekend does not clear","Liquidity left through the side door","A squeeze is a crowd with a calendar"],
        dek: ["From the verb they sold you to the auction that still has to work.","Crowding is loud. Clearing is quiet. Keep the quiet.","Overnight already filed a dissent. You can read it without a choir.","The constructive tape is a schedule you can still sleep inside."],
        h1: ["The auction","Overnight","Crowding","The basis","Thin hours","The roll","Settlement","Positioning"],
        h2: ["already voted in small type","is a character test you can pass","is not the same thing as a bid","pays people who can wait","tell on the speech","outlives the metaphor","is the adult in the room","is weather under the weather"],
        dk1: ["What the rooms called a market","The overnight print","A crowded tape","The unloved hour"],
        dk2: ["was mostly a feeling looking for a number.","already dissented, politely.","is not a map of tomorrow.","is often the honest one."],
        m1: ["The rooms issued a verb and waited for you to decorate it.","A squeeze was advertised as a personality.","Overnight left a note the day session tried to ignore.","Someone called crowding a thesis and asked you to pay rent on it.","The auction was treated as a backdrop instead of a vote.","Thin hours were edited out of the story because they were unphotogenic.","A gap arrived wearing a manifesto.","You were invited to confuse a squeeze with a season.","The weekend was sold as a cliff. It is a pause that still has to settle.","Dealers were written out of the play as if inventory were optional.","A headline needed a hero. The book needed a roll.","The unloved name was treated as a moral failure instead of a price.","Correlation was announced as destiny before it had to survive a Tuesday.","You were handed a temperature of the index and told it was breadth.","A miracle was scheduled for the open. The open declined."],
        m2: ["None of that had to clear. You do.","That is a product. You can leave it on the shelf.","Read the note. It is ruder and cheaper.","Rent is not a position.","Votes still count when they are dull.","Unphotogenic is often the print.","Manifestos do not roll.","Seasons have inventories. Squeezes have calendars.","Pauses still have funding.","Inventory is the plot.","Heroes do not roll. Rolls do.","Price is allowed to be unloved.","Destiny is a word people use when they have not waited.","Breadth is a count, not a feeling.","Declining is what opens do."],
        c1: ["The useful cut is the roll, not the sermon.","Nobody hid the overnight. They just did not put it on a thumbnail.","If the thesis required a crowd in the first hour, it was a crowd.","Crowding can be right and still be expensive.","Thin hours are not a glitch in the story. They are the story's spine.","A gap is a question. It is not an answer wearing boots.","Settlement still happens on a calendar, not on a feeling.","You may dislike the auction and still believe it.","The unloved bid is allowed to be the adult.","Positioning is not sin. Forgetting it is.","Mean reversion is what patience looks like when it has a job.","Dealers are not villains. They are a balance sheet with a bedtime."],
        c2: ["Keep that and the verb looks like hospitality.","Thumbnails are not minutes.","Crowds invoice you for the privilege of staying.","Expensive and correct is still expensive.","Spines are allowed to be dull.","Answer it with size you can sleep, or do not answer.","Feelings do not have CUSIPs.","Belief here is just reading.","Adults are unfashionable on purpose.","Memory is the cheap edge.","Jobs beat prayers.","Bedtimes veto a lot of poetry."],
        i1: ["Once the tape is an auction with a bedtime,","Cash still clears before character does.","The inherited already knew overnight can veto a speech.","Ordinary books heal in rolls, not in takes.","Stop paying rent on a squeeze and the week gets quieter.","A schedule with teeth is kinder than a mood with a megaphone.","Size to the gap you can still explain at dinner.","Quiet hours are a temperament exam with no invigilator."],
        i2: ["the choir looks like overtime.","That order still pays.","You can know it without becoming grim.","Takes do not stitch a bruise.","Quiet is not a failure of nerve.","Megaphones are rental equipment.","Dinner is still a risk limit.","You can sit it without an audience."],
        x1: ["One more market fact, then you can leave the verb:","After the squeeze-as-personality leaves the room:","If you keep only a test for the week, keep this:","Here is the dull mechanism that makes the manifesto look expensive:"],
        x2: ["the auction still votes, even when nobody films it.","rolls and overnight remain the minutes.","a gap you cannot explain at dinner is not a thesis.","crowding can be loud and still be a bill."],
        t1: ["Sit with the unloved hour for a second:","You can want a market to remain a market:","The kind default is not a squeeze:","This desk returns you to a night that still fits:"],
        t2: ["it is often where the honest bid lives.","that is the slightly constructive bet.","it is a roll that still clears.","that was the whole method."],
        hd1: ["If overnight already felt ruder than the speech,","If you declined to rent the squeeze,","If crowding felt like weather rather than destiny,","If the unloved hour made more sense than the open,"],
        hd2: ["you were reading the minutes.","you kept the only edge that still compounds.","you were early, not cold.","you already had the desk."],
        heard: ["If you have been waiting for the verb to get quieter, that wait is the work.","You already suspected the auction was the news. This is only the stamp."],
        k1: ["Keep the roll. Starve the verb.","Let crowding pay you to wait.","Go to dinner. The auction will keep.","Size to overnight, not to the thumbnail."],
        k2: ["That is the whole constructive tape.","That is still legal.","Tuesday remains usable.","The rest is weather under the weather."],
        keep: ["You understood if you leave with a roll, a bedtime, and no rented squeeze.","Optimistic by default here means the auction would like to remain an auction — then you check overnight, and you live."],
        n1: ["The auction is ruder than the speech.","Crowding is a bill.","Overnight files dissents.","A gap is a question."],
        n2: ["Believe the rudeness.","You do not have to pay it.","Read them.","Answer only with sleepable size."],
        note: ["Hot take, still quiet: the open is not your parent. The roll is.","We will not sell you a squeeze as a season. We will sell you settlement Wednesday."],
        w1: ["Watch overnight","Watch the roll","Watch crowding","Watch thin hours","Watch the gap","Watch whether the auction","Watch the unloved bid","Watch whether dinner"],
        w2: ["as the first dissent.","as the minutes.","as a bill, not a destiny.","as the spine.","you can still explain.","still has to work.","as the adult.","still fits the size."],
        watch: ["Whether overnight vetoed the speech.","Whether crowding invoiced you.","Whether the roll still cleared.","Whether thin hours agreed with the thumbnail.","Whether the gap survived dinner."]
      },
      geoecon: {
        heads: ["Premia are the map","Customs outvotes the clip","A chokepoint is a price","Harvest is a diplomat","Invoices commute faster than flags","The premium is the adult","Ports keep the minutes","A visa is logistics","Grain does not watch the podium","Pipelines are arguments in steel","Settlement is a border with manners","The surcharge is the communiqué"],
        dek: ["From the flag to the premium. The premium is the map.","Ports keep minutes. Podiums keep adjectives.","If it cannot survive a surcharge, it was theatre.","Corridors are policy you can still eat inside."],
        h1: ["Premia","Customs","The chokepoint","Harvest","The surcharge","A visa","The port","Grain"],
        h2: ["are the map","outvotes the clip","is a price, not a metaphor","is a diplomat","is the communiqué","is logistics with a face","keeps the minutes","does not watch the podium"],
        dk1: ["What they called a world","The clip at the border","A flag with no invoice","The grocery surcharge"],
        dk2: ["was a premium looking for a speech.","was not the corridor.","is a costume.","is the honest diplomat."],
        m1: ["The rooms issued a flag and waited for you to pick a team.","A chokepoint was narrated as destiny before it had been priced as a wait.","Customs was treated as a footnote to a feeling.","Harvest was written out as if calories were optional.","You were handed a clip of a border and told it was a policy.","Premia moved first. The metaphor arrived in a better suit.","A visa queue was sold as a character test instead of a schedule.","Ports were asked to be symbols. They preferred to be ports.","Grain was given a morality before it was given a route.","Someone confused a surcharge with a sermon.","Pipelines were discussed as opinions. They remain steel.","The grocery ticket already knew the map. The podium was catching up."],
        m2: ["Teams do not load ships.","Waits have invoices. Destiny does not.","Feelings do not clear customs.","Calories still commute.","Policy still needs a dock.","Suits are late on purpose.","Schedules are kinder than tests.","Symbols do not berth.","Routes feed people. Moralities feed clips.","Sermons do not itemise.","Opinions rust. Steel waits.","Catching up is allowed to be the story."],
        c1: ["The cut is a premium, not a team.","You do not need a war room to read a surcharge.","Power still matters. So does the berth.","If the geopolitics cannot survive customs,","Follow the harvest and the panic looks overdressed.","A visa is a corridor with a clerk.","Most days the lights, the grain, and the invoice still want to move.","The optimistic fact is a dull port."],
        c2: ["Teams are a product. Premia are a print.","Surcharges are diplomats with worse manners.","Hold both and the clip looks rented.","it was a costume, and you already felt the till.","Overdressed panic is still panic.","Clerks finish more arguments than choruses.","Wanting to move is a policy.","Dull ports feed Tuesdays."],
        i1: ["Once premia and flags sit in the same ledger,","Nations, like kitchens, survive on sequences of delivery.","Keep the surcharge in view and the morality play loses its catering.","A port with flags is still a port: dredged, or not.","The inherited read this at the pump. The ordinary read it at the till.","Diplomacy is a long invoice that learned to sit down.","Corridors beat cliffs when anyone has to eat.","Same shock, two clocks: the clip and the container."],
        i2: ["the temperature looks like fundraising with better lighting.","That is allowed to be good news.","Catering was the real budget.","Dredging is unfashionable and therefore decisive.","You were not imagining the squeeze in the bag.","Sitting down is how settlement happens.","Eating is a foreign policy.","You can work with the container without clapping for the clip."],
        x1: ["One more international fact after the photograph:","Keep this beside the till:","If the clip dies on a surcharge, let it:","The extra honesty that makes a villain look like a product:"],
        x2: ["who can still berth, insure, and settle is the method.","a corridor is a policy you can still cook with.","surcharges are the communiqué.","most days the grain still wants a route."],
        t1: ["Sit with the dull port:","You can want a corridor without a costume:","The kind default is not a cliff:","This desk returns you to a grocery ticket:"],
        t2: ["it is an achievement, not a narrative failure.","people still prefer delivery to destiny.","it is a berth that still works.","that is the map you can keep."],
        hd1: ["If you read the till before the clip,","If the world never felt like a team sport,","If the surcharge taught you more than the summit,"],
        hd2: ["you were already doing the international desk.","you were right. It is a warehouse with better lighting.","you had the method in your pocket."],
        heard: ["If you have been doing kitchen math during the geopolitics, that order is correct.","You wanted someone to say the port is the news. The port is the news."],
        k1: ["Keep the premium, not the team.","Prefer the berth to the villain.","Want dinner more than a summit."],
        k2: ["That is the whole international pocket.","You understood if that feels like relief.","That is allowed to be the point."],
        keep: ["You understood if you leave more interested in a surcharge than in a side.","A slightly positive desk here is competence that still wants a route home."],
        n1: ["Premia before the metaphor.","Flags are loud on a schedule.","Ports do not need a choir."],
        n2: ["The diplomat already left a number.","You can remember that at the till.","Berths still finish arguments."],
        note: ["Insurance before the metaphor still pays. Smile at the surcharge; it is speaking.","If the map cannot survive customs, keep the groceries."],
        w1: ["Watch premia","Watch customs","Watch harvest","Watch the berth","Watch the visa queue","Watch the surcharge","Watch grain","Watch whether the port"],
        w2: ["before the team.","as a diplomat.","as foreign policy.","after the clip fades.","as a schedule.","as the communiqué.","for a route, not a morality.","still wants to be dull."],
        watch: ["Premia, berths, harvests — the three honest diplomats.","Whether the surcharge agrees with the speech.","Whether grain still has a route.","Whether customs outran the clip.","Whether dinner is still a corridor."]
      },
      politics: {
        heads: ["Quorum is the news","Procurement outvotes the rally","The clerk's calendar is the adult","Municipal is the country","A census is a spine","Ordinance before oratory","The annex still has page numbers","Losing on time is a skill","The bus is a statute","FOIA is ruder than a take","Spending power is the plot","Wednesday has a quorum or it does not"],
        dek: ["From the rally to the quorum. The quorum is the news.","Procurement is ruder than a podium and more useful.","Rage is still overpriced at the municipal level.","The constructive citizen reads the calendar, then the clip."],
        h1: ["Quorum","Procurement","The municipal","A census","The ordinance","FOIA","The clerk","Spending power"],
        h2: ["is the news","outvotes the rally","is the country","is a spine","beats oratory","is ruder than a take","would like a calendar","is the plot"],
        dk1: ["What they called politics","The podium","A temperature with a flag","The annex"],
        dk2: ["was a calendar looking for a choir.","was retail. Wholesale still has a bus.","was not a program.","still has page numbers."],
        m1: ["The rooms issued a personality and asked you to confuse it with a government.","A rally was treated as a legislature with better lighting.","You were recruited before you were informed, again.","A clip outran a procurement line because procurement does not trend.","The temperature was sold as a statute.","Campaigns arrived wearing the clothes of a calendar.","Municipal reality was treated as lesser politics. It is most of the country.","A choir assembled before a quorum did.","You were told the annex was boring as if that were an argument against it.","Spending power was discussed as a vibe. It is a signature and a date.","Losing was narrated as death. It is often a calendar event.","The bus was asked to be a metaphor. It preferred to run."],
        m2: ["Governments still need a Wednesday.","Lighting is not a majority.","Fatigue is still a civic skill.","Trends are not appropriations.","Statutes do not have a temperature.","Calendars do not campaign. They arrive.","Lesser is a costume. The pothole is not.","Choirs do not count.","Boredom is how page numbers work.","Dates still bind.","Death makes a better clip than a recess.","Running is the program."],
        c1: ["We will not hunt persons for sport. The annex is ruder.","The useful cut is quorum, spending, and who still faces a date.","The feed is not disproved by shouting corruption as a personality.","Democracy, on a good day, is how you lose and still have a bus.","Procurement, courts, statistical offices:","Mock the clerk and you will miss the only Tuesday that still knows how to count.","Repair is unphotographed on purpose.","A slightly positive desk assumes most clerks would like the calendar to remain a calendar."],
        c2: ["Ruder is more useful than a takedown.","That is the whole political method, said without a choir.","It is disproved by a page number.","Hold that without becoming a mark for either choir.","the unsexy triad still runs the middle of the week.","Counting is not a small civilisational trick.","Purpose is not a scandal.","Then it checks whether the numbers stay boringly honest."],
        i1: ["Once quorum is the news,","The inherited want continuity. The ordinary want the bus to exist.","Keep your nervous system off the recruitment list.","Institutions are a letter to people who will still need a pavement.","You can count on quiet repair without clapping for a podium.","A calendar with teeth beats a personality with a clip.","If a sentence only works as recruitment, it is not analysis.","Optimistic by default means Wednesday can still have a quorum."],
        i2: ["the rally looks like an advertisement with better chairs.","Same request, two accents, one pavement.","That is an allergy to cosplay, not apathy.","Pavement is a love letter.","Clapping is optional. Dates are not.","Clips expire. Calendars do not.","You already preferred the footnote. Stay there.","You need a bus more than a miracle with a flag."],
        x1: ["One more civic fact after the choir sits down:","The extra honesty that makes the rally look rented:","If you take one institution home:","Wednesday is the exam; the clip is makeup:"],
        x2: ["who can spend, who can refuse, who still has a date.","clerks remaining clerks is not a small trick.","the footnote still outvotes the choir when it is read.","makeup is not a majority."],
        t1: ["Sit with the bus for a second:","You can want continuity without a costume:","The kind default is not applause:","This desk returns your temperature:"],
        t2: ["it is a statute that still has to run.","the ordinary and the inherited asked for the same pavement.","repair happening quietly is still repair.","cooler is a policy preference."],
        hd1: ["If you have been saying just run the place,","If the temperature felt like a job application,","If you wanted the annex more than the anthem,"],
        hd2: ["this desk filed that as the brief.","you were not wrong to decline.","you already had the method."],
        heard: ["If you wanted the phone to be cooler and the bus to exist, those are the same preference.","You are not apathetic. You are done being recruited before breakfast."],
        k1: ["Read the quorum. Keep the pavement.","Prefer the clerk to the choir.","Vote if you can. Ride the bus either way."],
        k2: ["That is not apathy.","You understood if you leave cooler.","Wednesday still has to work."],
        keep: ["You understood if you leave more interested in procurement than in a personality.","Repair unphotographed is still how a country remains a country."],
        n1: ["Rage is still overpriced.","Just run the place.","The annex has page numbers."],
        n2: ["Put the phone down a degree.","That is the whole civic comment.","Read them."],
        note: ["We will not take anyone down in a comment. We will take the calendar seriously.","A quorum is ruder than a rally and more useful by Wednesday."],
        w1: ["Watch the quorum","Watch procurement","Watch Wednesday","Watch the clerk","Watch whether you were","Watch the census","Watch the bus","Watch FOIA"],
        w2: ["before the rally.","as if it were the news.","for a majority that can count.","for a calendar, not applause.","recruited or informed.","as a spine.","as a statute.","as the rude adult."],
        watch: ["Quorum, procurement, pavement.","Whether rhetoric bought time or spent it.","Whether Wednesday still has a bus.","Whether the annex still outruns the clip.","Whether you were informed or merely warmed."]
      },
      psych: {
        heads: ["Boredom is a skill","The other room is a policy","A ritual beats a revelation","Rumours in your head are inventory","Habit is the only compounding","You do not owe the feed a pulse","Morning is a risk desk","The saga is optional","One closed loop is a life","Permission is not a personality","Stillness is a technology","You can leave the diet without leaving the century"],
        dek: ["From the temperature they sold you to a ritual you can repeat.","You are over-informed. That is a position, not a diagnosis.","The other room is still the cheapest reform.","A checklist is ruder than a saga and kinder by afternoon."],
        h1: ["Boredom","The other room","A ritual","Habit","Morning","Stillness","The closed loop","Permission"],
        h2: ["is a skill","is a policy","beats a revelation","is the only compounding","is a risk desk","is a technology","is a life","is not a personality"],
        dk1: ["What they called a self","The villain before coffee","A branded anxiety","The saga"],
        dk2: ["was a diet looking for a customer.","was inventory, not duty.","was not a diagnosis.","wanted a checklist and would not admit it."],
        m1: ["The rooms issued a new self and a deadline of Friday.","A villain was required as proof of seriousness.","Your unease was offered a logo.","You bought some of the diet. That makes you a customer with a receipt, not a fool with a fate.","The feed asked for a pulse as a loyalty test.","A saga arrived dressed as insight.","Membership in a mood was on sale at a discount to sleep.","The villain was punctual. The walk was not scheduled.","You were told calm was a personality you had failed to purchase.","Stretching was confused with a plan because stretching photographs better.","Someone sold rumination as depth.","You were invited to treat boredom as a medical emergency."],
        m2: ["Deadlines like that are retail.","Seriousness does not need a mascot.","Logos are not diagnoses.","Receipts can be declined next time.","Loyalty tests are optional.","Insight would have fit on a list.","Sleep is not a coupon.","Walks do not need to trend.","Calm is practise, not retail.","Photographs are not Wednesday.","Depth can be a walk.","Boredom is often the treatment."],
        c1: ["You do not need a new self. You need a loop you can close.","Attention is a cost of goods. Price it like one.","The inherited fear a wasted past. The ordinary fear a blank week.","If a villain is required before water,","Calm is a technology you can run when it is ugly.","Optimism without being a customer of your own panic is allowed.","A repeatable morning","Water, walk, one closed loop."],
        c2: ["Loops beat revelations when the week gets cheap.","That is price, not withdrawal.","Both are permission stories. A hotter take will not settle either.","you are stretching a product until it becomes a name. Stop.","Ugly is the exam. Pretty is the brochure.","You already suspected. This is the receipt.","has saved more than a worldview.","If that is all you keep, you understood."],
        i1: ["Treat the diet as a position and","Sleep still does not negotiate, which is its virtue.","Relief is a print: a sentence fit, then your shoulders dropped.","Be kind without subscribing to the panic as a service.","The checklist is unromantic on purpose. That is how it compounds.","Become expensive again. The feed cannot mark a room it is not in.","A walk still clears more inventory than a thread.","You are not behind. You are declining a stampede with better lighting."],
        i2: ["the villain looks like stock that wants to move.","Keep the limit. It is adult.","Keep the sentence. Drop the subscription.","That product is free and does not upsell.","Purpose is not a personality. Keep practising.","Good. Rooms are still legal.","You wanted permission. You have it, in walking shoes.","Lighting is not an obligation."],
        x1: ["One more useful line, then the other room:","The extra cut after the saga sits down:","If you keep a method:","Calm is still cheaper than a rebrand."],
        x2: ["a closed loop on a bad Wednesday beats a revelation.","attention costs. Put a price on the door.","water, walk, one loop.","you are over-informed, not broken. Act like a person with a door."],
        t1: ["Sit with the other room:","You can smile at the saga and still obey the list:","The kind default is not numbness:","This desk returns you to your own morning:"],
        t2: ["expensive attention is a position you can close.","that is adult, not cold.","it is practised stillness.","that was the whole point of the letter."],
        hd1: ["If you came to feel less crazy,","If you already wanted the door between you and the diet,","If optimism without being a mark felt like home,"],
        hd2: ["stay. That is a legitimate use of paper.","this is the nudge that will still work on Thursday.","you already had the desk in the other room."],
        heard: ["If the phone felt like a landlord, you were not weak. You were over-leased.","You already wanted a checklist. The saga was just louder."],
        k1: ["Water, walk, one closed loop.","You are over-informed, not broken.","Give the morning a list."],
        k2: ["Understanding is cooler than winning a thread.","Act like a person with a door.","It wanted a saga. Smile, then close the loop."],
        keep: ["You understood if you leave with a ritual, not a rebrand.","Boredom, practised on purpose, is still the cheapest compounding."],
        n1: ["The other room is still legal.","If you finished smug, drink water.","Boredom is a skill."],
        n2: ["Use it.","Same prescription as anger.","Practise it before you praise it."],
        note: ["Calm is still legal. That one burns in if you walk it.","Put the phone in the other room. The day will not file a complaint."],
        w1: ["Watch the diet","Watch sleep","Watch the villain","Watch the door","Watch the loop","Watch boredom","Watch morning","Watch whether a saga"],
        w2: ["as a position you can close.","as a limit that does not negotiate.","before water.","as policy.","closing once.","for skill, not emergency.","as a risk desk.","was required to feel informed."],
        watch: ["Whether the other room got used.","Whether one loop closed.","Whether a villain was still required before water.","Whether sleep was treated as a limit.","Whether boredom was practised or panicked."]
      },
      energy: {
        heads: ["Degree-days do not campaign","Spare capacity is the adult","A tanker is a sentence","Outages are minutes","Reserves veto adjectives","The interconnect is the argument","Baseload is a bedtime","Welders are the transition","The meter is the diplomat","A cold morning is data","Maintenance is policy","Electrons still have a route"],
        dek: ["From the sermon to the meter. Trust the meter.","Spare capacity is ruder than a slogan and kinder in January.","A barrel is still a schedule. A hashtag is still a wish.","Physics does not need your refresh."],
        h1: ["Degree-days","Spare capacity","The tanker","The meter","Baseload","The interconnect","A weld","Reserves"],
        h2: ["do not campaign","is the adult","is a sentence","is the diplomat","is a bedtime","is the argument","is the transition","veto adjectives"],
        dk1: ["What they called energy","The slogan","A spike with a personality","The household meter"],
        dk2: ["was arithmetic looking for a church.","arrived after freight had voted.","was not a season.","already knew."],
        m1: ["The rooms issued a morality and a price tag in the same breath.","Attitude was plentiful. Spare capacity was not.","You felt the meter before you felt the take.","Adjectives arrived after the tanker had already turned.","A church of energy was offered to people who still had to boil a kettle.","The slogan traveled. The outage did not issue a press release.","Storage was treated as a personality flaw in the model.","The spike was given a name as if names heated rooms.","Baseload was discussed as an opinion. It remains a bedtime.","Welders were invited to the transition as a metaphor and then not as a payroll.","Interconnects were asked to be vibes. They preferred to be copper.","A cold morning was narrated as a scandal instead of a degree-day."],
        m2: ["Breath is not a reserve.","That is the whole difference, and it is arithmetic.","Trust the meter. It is the high-frequency print.","Turned tankers are minutes.","Kettles are civilisation.","Press releases do not restore volts.","Models do not freeze. Houses do.","Names do not heat.","Opinions do not keep 8 a.m.","Payroll is the transition.","Copper still has a route.","Degree-days are allowed to be dull."],
        c1: ["Believe two physical things at once.","When prompt tightens, the brochure loosens.","A cold house is not a take, and it is not a personality.","A spike can be loud and still be finite.","Treat barrels, electrons, and welds as a bridge:","The back of the curve often refuses the panic the front is selling.","You do not need to be a prophet of either church.","Follow the meter, the tanker, and the spare."],
        c2: ["8 a.m. still has to work. Welders still have to show. Hold both.","Households adapt or donate. You already chose which one you refuse.","There is a grim humor in watching a feed discover storage. Hold both thoughts.","Finite is kindness in a number if you check stocks.","maintained, unfashionable, necessary. Then the clip looks like weather.","Sometimes the front is theatre. Sometimes it is physics. Ask reserves.","Respect physics and still plan a summer table.","Let the moralising catch the next interconnect."],
        i1: ["Once the meter outranks the take,","Lights first, architecture second, sermons a distant third.","Plan dinner, then the grid, then the argument.","A summer is still allowed. That is practical, not naive.","Maintenance is the cousin of every energy story that actually compounds.","You can stop refreshing and still be the adult in the kitchen.","Inventories and degree-days are the grown-ups.","The household bill remains the fastest political number, and it does not campaign."],
        i2: ["the sermon looks like hospitality with a steeple.","Sequence is mercy you can cook with.","That order is still civilisation.","You understood if a table is still plannable.","Cousins do not trend. Good.","Kitchens do not need a feed.","Check them. Then go outside while it is still light.","Believe the bill before the architecture."],
        x1: ["One more physical line after the church sits down:","If you keep a sequence:","Dinner and a weld are both allowed:","After the spike-as-personality:"],
        x2: ["inventories and spare still skip the play.","lights first.","the back of the curve often stays calmer. Notice.","the meter arrived first."],
        t1: ["Sit with the tank:","You can want a transition and still want 8 a.m.:","The kind default is not a church:","This desk returns you to a kettle:"],
        t2: ["arithmetic is not an insult to anyone.","adults hold both without a hymn.","it is a weld on a payroll.","that is civilisation, still."],
        hd1: ["If you wanted the lights to outrank the take,","If you did kitchen math during the geopolitics of barrels,"],
        hd2: ["they do, and they did.","you were already on this desk."],
        heard: ["You wanted someone to say the meter matters more than the take. The meter matters more.","If you have been planning a summer while they planned a church, stay with the summer."],
        k1: ["Keep the lights, then argue.","Follow the meter.","Plan a summer table."],
        k2: ["Sequence is mercy.","You understood if dinner is still possible.","That is the optimistic default, with a weld."],
        keep: ["You understood if you can still plan dinner and a maintenance window.","Optimistic by default: a summer is allowed, and so is copper."],
        n1: ["Physics does not trend.","The meter arrived first.","No war from a kettle."],
        n2: ["Remember it in January.","Believe it.","The curve, then a corridor."],
        note: ["Spare capacity is kindness with a decimal.","We will not diagnose a war from a comment box. Check the tanker, then hope for a route."],
        w1: ["Watch inventories","Watch spare","Watch the meter","Watch degree-days","Watch the tanker","Watch the front","Watch welds","Watch whether a summer"],
        w2: ["before adjectives.","as the adult.","as politics.","as data, not scandal.","as a sentence.","for theatre versus physics.","as payroll.","is still plannable."],
        watch: ["Inventories, spare, degree-days. Then adjectives.","Whether the front is theatre or physics.","Whether the meter still comes first.","Whether a weld is on a payroll.","Whether a summer table still exists."]
      },
      money: {
        heads: ["Term premium is the adult","Reserves have a bedtime","The kitchen is a committee","A hold can be kindness","Deposits vote every night","Duration is a household word","The window teaches more than the stage","Real rates do not campaign","A mortgage outlives a presser","Patience is runnable policy","Dots are not a personality","Funding math vetoes drama"],
        dek: ["From the cult of hawks to a kitchen that already voted.","The dots are not scripture. The mortgage is a paragraph.","Waiting is often the kindness the committee cannot say.","Temperament beats a call, then you go outside."],
        h1: ["Term premium","Reserves","Deposits","The kitchen","A hold","The window","Real rates","Duration"],
        h2: ["is the adult","have a bedtime","vote every night","is a committee","can be kindness","teaches more than the stage","do not campaign","is a household word"],
        dk1: ["What they called policy","The presser","A hawk-and-dove play","The mortgage"],
        dk2: ["was a bedtime looking for a cult.","was theatre with better chairs.","was not a balance sheet.","outlives the dots."],
        m1: ["The rooms issued a cult of hawks and doves and asked you to join before breakfast.","A rate call arrived wearing a personality.","The press conference asked to be a plot twist in a household that needed a bedtime.","The dots were treated as scripture by people who still have a kitchen to run.","You were asked to pick a team before you picked a fixed rate.","A verb was issued. The household issued a delay in a renovation.","The feed wanted a pivot. The sheet wanted the lights out at a decent hour.","Waiting was sold as a scandal instead of a temperament.","Reserves were discussed as a mood. They are a quantity with a clock.","Term premium was treated as trivia. It is how the future invoices the present.","Deposits vote every night whether anyone films them.","A hold was narrated as weakness. It is often how an institution remains one."],
        m2: ["You do not have to join a cult to have a mortgage.","Personalities expire. Sheets do not.","Bedtimes are policy.","Kitchens already run a committee.","Teams are retail. Duration is wholesale.","Delays are a rates view with better lighting.","Lights-out is a mandate.","Temperament is allowed to be dull.","Clocks still bind.","Invoices are ruder than dots.","Unfilmed votes still count.","Remaining is not a small trick."],
        c1: ["Stop pretending the dots are holy writ.","Headline heat, cooler growth, a committee that would like to sleep:","Temperament beats a call because calls expire.","Money is strangers cooperating at scale, including the ones you will never meet.","Hot tips have an exit in every corridor.","The conference is theatre. The window is tuition.","Stay solvent, kind, and long optionality you can explain.","The less theatrical instrument is the adult in the room."],
        c2: ["You can live with a hold without becoming a mascot.","That is a job, not a plot twist.","Expiry is information.","The rest is a footnote, including the jokes about personalities.","Solvent is the right reason to sit down.","Tuition is ruder and sticks.","That is the whole call, and it is not a number on a wheel.","Align with it, then go outside while there is still a pavement."],
        i1: ["Once the committee is a bedtime and a sheet,","Assume the institution would like to remain one, then watch.","Leave with a temperament, not a mascot.","Believe the kitchen; it already voted in delays and second jobs.","Let funding math veto drama before you rent a take.","You do not need a personality on the podium to have a night.","Plan the mortgage as if waiting were allowed, because it is.","Cooperation at scale still works more often than a thread will admit."],
        i2: ["the cult looks expensive and a little teenage.","Inflation, labor, and the wait are the watchlist.","Mascots do not survive a hold. Temperament can.","Honest words, same policy.","Then go outside. The math will keep.","Nights you can sleep are the mandate you can run.","Allowed is the kind word for patience.","Keep that without becoming simple, or cynical, or both."],
        x1: ["One more monetary line, then outside:","After the conference lights dim:","If you keep a temperament:","A hold can be kindness:"],
        x2: ["the kitchen is often the scripture.","households already voted in duration.","patience is the runnable policy.","plan the mortgage as if that were true."],
        t1: ["Sit with the bedtime:","You can want an institution to remain one:","The kind default is not a tip:","This desk returns you to solvent:"],
        t2: ["it is more honest than a cult with better chairs.","that is the slightly positive bet, then you check.","it is a temperament you can carry.","that was the reason to sit down in the first place."],
        hd1: ["If you would not treat a presser as a personality,","If you came to feel solvent rather than informed-by-choir,","If the kitchen already felt like a committee,"],
        hd2: ["you were right, and cheaper.","you came to the right letter.","you already had the method."],
        heard: ["If you have been waiting without calling it a scandal, that wait is policy you can run.","You wanted someone to say a hold can be kindness. A hold can be kindness."],
        k1: ["Let funding math veto drama.","Leave with a temperament.","Waiting is not a scandal."],
        k2: ["Then go outside.","Not a mascot.","Remember it when the dots wriggle."],
        keep: ["You understood if you leave with a bedtime, a mortgage plan, and no cult.","Optimistic by default: institutions would like to remain institutions — then you check, and you live."],
        n1: ["Not a rate call.","The dots are not scripture.","Households run policy too."],
        n2: ["A temperament call.","Smile, then plan the mortgage.","You live in that committee."],
        note: ["The window teaches. The stage performs. Take the tuition.","Deposits vote every night. You can remember that without a feed."],
        w1: ["Watch real rates","Watch the kitchen","Watch the bedtime","Watch the call","Watch labor","Watch deposits","Watch term premium","Watch whether a hold"],
        w2: ["with energy, before personality.","as policy.","more than the choir.","pretending to be temperament.","as the vote.","as a nightly committee.","as the adult.","is being sold as weakness."],
        watch: ["Real rates, kitchens, bedtimes.","Whether a hold is kindness or theatre.","Whether deposits still vote quietly.","Whether the mortgage outlived the presser.","Whether you left with temperament or a mascot."]
      },
      ordinary: {
        heads: ["Payroll Friday is a print","The supermarket is a rates desk","Rent is a duration","The school-run is logistics","A landlord is a curve","Milk is high-frequency","The table still settles","Tuesday is the expert","A commute is a balance sheet","The pharmacy is an institution","Inherited furniture is policy","Ordinary is the point"],
        dek: ["From the specialist voice to a table that still has to clear tonight.","You were in it at breakfast. The tomato had a price.","A kitchen is a rates view with better light.","Ordinary is not lesser. It is the print that settles."],
        h1: ["Payroll Friday","The supermarket","Rent","The school-run","Milk","The table","The commute","The pharmacy"],
        h2: ["is a print","is a rates desk","is duration","is logistics","is high-frequency","still settles","is a balance sheet","is an institution"],
        dk1: ["What they called the economy","The specialist voice","A class accent","The tomato"],
        dk2: ["was a kitchen looking for permission.","arrived without a school-run.","was not a credential.","is a print."],
        m1: ["The specialist letter was written as if you were furniture in someone else's model.","This stuff was reserved for experts as a costume you were not issued.","You were in it at breakfast. The tomato had a number.","A class voice arrived without a school-run, a pharmacy, or a bus.","You were invited to feel unqualified before you felt the rent.","A kitchen renovation is a rates view. Nobody sent a presser.","Ordinary was sold as lesser so the specialist could remain specialist.","The expert spoke. The table still had to clear tonight, with chairs.","Payroll Friday was treated as a rounding error in a grander story.","The commute was discussed as a lifestyle. It is duration in traffic.","A landlord is a curve you already trade, whether you like the word or not.","Milk is high-frequency data with a handle."],
        m2: ["The font was the problem, not your life.","Take the costume off. You already run a book.","Believe the tomato. It does not need a forecast.","You were never a lesser reader. You were the point.","Unqualified is a class trick. Rent is not.","Pressers are optional. Kitchens are not.","Specialist is a lighting choice.","Chairs are the expert that settles.","Grander stories still cash a paycheck.","Traffic is a print.","Liking the word is optional. Living the curve is not.","Handles are honest."],
        c1: ["Warehouse or commute: both are duration with different collateral.","Keeping a household through a loud decade is elite work, unphotographed.","Policy becomes furniture in housing, quietly, then all at once.","Affordability is still wages versus rents, not a vibe versus a vibe.","You do not have to tweet at the triangle to be in the letter.","Believe payroll over costume, supermarket over sermon.","Teach competence, or practise it at the table.","Corridors are how children get to school, which is the program."],
        c2: ["Better collateral helps. A boring sequence saves both.","Unphotographed, daily, with a kettle.","You already work with that, in rooms.","You were not wrong to notice the squeeze in the bag.","You can buy milk and still be the reader.","Same letter. Same dignity. Same till.","That is enough justification for a desk.","That is the whole ordinary method."],
        i1: ["Once the table is the expert,","Keep household, joke, and a little dry powder.","Tuesday can still be livable without a forecast.","If you felt spoken to, you were; stay.","The bus is the program, not the metaphor.","Dinner is duration. You already run it.","Share this with the person who thinks the letter is not for them.","Ordinary is the point, which is why the other desks exist."],
        i2: ["the presser looks overdressed for supper.","Complete strategy for most humans who buy milk.","Keep that without becoming a mascot of resilience.","Good. Permission was the missing line.","Continuity is not a crime, and neither is a sandwich.","Smile at that, then set the table.","They were in it the whole time, at breakfast.","Keep that. It burns in without a slogan."],
        x1: ["One more household line:","After the specialist voice sits down:","If you keep a strategy:","Believe the tomato:"],
        x2: ["wages versus rents still clears, or it does not.","you were the point, not the footnote.","household, joke, dry powder.","it is a print with a smell."],
        t1: ["Sit with the table:","You can be elite without a summit:","The kind default is a livable Tuesday:","This desk is for people who buy milk:"],
        t2: ["it settles tonight, with or without a forecast.","you already were, in traffic.","that is enough, and it is adult.","that is the whole editorial line."],
        hd1: ["If you have been doing honest math at the table,","If you wanted to be spoken to like an adult who buys milk,","If the specialist voice felt like the wrong font,"],
        hd2: ["you are early, not bad with money.","that is the line, and it will not change.","you were right; the font was the tell."],
        heard: ["If you have been running a book without being told you were, you were.","You wanted the letter to include the supermarket. It does, on purpose."],
        k1: ["Keep the household and the joke.","The tomato is a print.","School-run math still clears."],
        k2: ["And a little dry powder.","Believe it at the till.","Tonight, with chairs."],
        keep: ["You understood if you leave feeling spoken to, not spoken over.","Ordinary is the elite skill practised without a lanyard."],
        n1: ["This section is the point.","You buy milk.","A kitchen is a rates view."],
        n2: ["The other desks keep it honest.","This letter is for you.","Better lighting, same duration."],
        note: ["A commute is duration. A paycheck is a print. You already knew.","Share this with the person who thinks they are not the reader."],
        w1: ["Watch wages versus rents","Watch the table","Watch Tuesday","Watch the tomato","Watch the specialist","Watch payroll Friday","Watch the school-run","Watch milk"],
        w2: ["as the debate that clears.","as tonight's expert.","for livable.","as a print.","for talking down.","as the honest number.","as logistics.","as high-frequency."],
        watch: ["Wages versus rents, still.","Whether Tuesday remained livable.","Whether the table settled.","Whether the specialist talked down.","Whether milk still had a handle."]
      },
      tech: {
        heads: ["Uptime is the exam","A substation is a thesis","Permits beat demos","Failover is character","PUE is an input","The invoice stayed","Latency is a place","Clerks still restart Sunday","Cooling is policy","No mascot required for a floor","Megawatts before metaphors","Second shift gets paid"],
        dek: ["From the demo to the bill. The bill stayed.","Uptime is ruder than a keynote and more useful on Sunday.","A floor can restart. A brochure cannot.","Physics showed up anyway, with a permit."],
        h1: ["Uptime","The substation","A permit","Failover","PUE","The invoice","Latency","Sunday restart"],
        h2: ["is the exam","is a thesis","beats a demo","is character","is an input","stayed","is a place","is the test"],
        dk1: ["What they called a stack","The keynote","A mascot with a miracle","The cooling bill"],
        dk2: ["was infrastructure looking for a costume.","left. The invoice did not.","was not a floor.","is competence."],
        m1: ["The rooms scheduled a demo to save civilisation by Thursday afternoon.","A mascot and a miracle were issued before a plug.","You were right about the keynote: it was hospitality.","The feed needed a saviour. The room needed cooling and a permit.","A brand arrived as if it were physics with better slides.","Worship was requested before anyone priced a megawatt.","The miracle traveled. The substation did not.","The stack was told it had no body. Bodies showed up as heat.","Latency was discussed as a vibe. It is a place with a cable.","Failover was treated as a footnote to a story about genius.","Sunday restart was not in the brochure. It is the exam.","Second shift was invited as a metaphor and not as a wage."],
        m2: ["Thursday afternoons do not civilise. Concrete does.","Plugs are the plot.","Hospitality is allowed to be pretty. It is not a floor.","Permits are ruder than saviours.","Slides do not dump heat.","Megawatts do not worship.","Substations finish arguments.","Heat is an input, not a scandal.","Cables have addresses.","Genius does not fail over. Floors do.","Brochures do not sit the exam.","Wages are the second generation."],
        c1: ["A corridor that reprices the year is a warehouse, not a ticker with a mascot.","The edge is not a secret model. It is an unglamorous question you can wait on.","What breaks when the demo leaves: heat, latency, liability, the late person.","No mascot is required for a floor that restarts.","Welders and electricians, not brunch, still hold the decade.","Keep a human in the loop who can still explain it on Sunday.","If you cannot say it without a brand, it was not ready.","A cooling budget is competence enough to count as a thesis."],
        c2: ["Warehouses like boredom. Join them without a costume.","Waiting is the method, not a personality flaw.","That is the adult list, and it still has names.","Restarts are character.","Smile at that, then price the power.","Sunday is the invigilator.","Readiness does not need a logo.","Count it. Keep it."],
        i1: ["Price power first and","Concrete and copper are being poured. That is the optimistic fact, unfashionable.","Costume is optional; failover is not.","Second shift sometimes gets paid, which is a tech policy.","Hype funds. Maintenance civilises. Keep the second sentence.","You muttered about electricity. Stay with that muttering.","A brochure cannot restart on Sunday. A floor can, if someone trained.","No logo, still a sentence:"],
        i2: ["the keynote looks like hospitality with better fonts.","Skip the costume; keep the pour.","Optional is the kind word for marketing.","Patience is a stack.","Civilising is the whole job after the raise.","Adults mutter about inputs.","Training is the exam you can keep.","that was the test, and it did not need a brand."],
        x1: ["One more stack line after the demo:","If you keep a test:","No logo required:","After the miracle leaves the building:"],
        x2: ["megawatts and a Sunday restart beat a saviour.","the invoice stayed.","competence with cooling is enough.","a brochure does not compound."],
        t1: ["Sit with the bill:","You can want tools and still want physics:","The kind default is a floor:","This desk returns you to Sunday:"],
        t2: ["believe it over the demo, every time.","adults hold both without a mascot.","maintained, permitted, unfashionable.","can it restart, with a name on a rota."],
        hd1: ["If you asked who pays for the electricity,","If you would not worship a logo,","If Sunday restart felt like the real exam,"],
        hd2: ["you were the adult in the thread.","respect a cooling budget instead.","you already had the desk."],
        heard: ["If you muttered about permits while they muttered about destiny, you were early.","You wanted a floor, not a mascot. Keep wanting that."],
        k1: ["Plug it in. Price the power.","Explain it without a brand.","Believe the invoice."],
        k2: ["Keep a human in the loop.","That is the exam.","The demo already left."],
        keep: ["You understood if you leave more interested in a substation than in a saviour.","Optimistic by default: something is still being built in copper, if the permit holds."],
        n1: ["If it needs a brand to stand, it was not ready.","Megawatts before models.","No mascot required."],
        n2: ["Yours does not.","That sticks on Sunday.","Check the cooling, then the rota."],
        note: ["Uptime is character. Brochures are not.","Second shift is the generation that sometimes gets paid."],
        w1: ["Watch power","Watch Sunday","Watch the invoice","Watch the logo","Watch cooling","Watch permits","Watch failover","Watch the rota"],
        w2: ["before the model.","for a restart.","after the demo.","required to stand.","as an input.","as a thesis.","as character.","for a name."],
        watch: ["Power, permits, Sunday restart.","Whether a logo was required to stand.","Whether the invoice outlived the demo.","Whether a human could still explain it.","Whether cooling was treated as policy."]
      },
      health: {
        heads: ["The vacancy is the print","Winter is a ratio","A waitlist is policy","Primary care is logistics","Carer hours are the mandate","Beds do not take a press cycle off","Prevention is cheaper than theatre","Staffing is kindness with a rota","A body is not a campaign","Tuesday must fill","Sleep is the cheap reform","The night shift is the expert"],
        dek: ["From the theatre to the rota. The rota is the print.","A body is not a press cycle. Tuesday still has to fill.","Kindness showed up as staff, or it did not.","Sleep is still the reform that does not need a brand."],
        h1: ["The vacancy","Winter","The waitlist","Primary care","Carer hours","The night shift","A bed","Prevention"],
        h2: ["is the print","is a ratio","is policy","is logistics","are the mandate","is the expert","does not campaign","is cheaper than theatre"],
        dk1: ["What they called health","The wellness brand","A vibe with no shift","The rota"],
        dk2: ["was labor looking for a body.","staffs nobody.","was not a clinic.","is the news."],
        m1: ["The rooms discussed labor as if it had no back and no night.","Panic and wellness theatre were both on offer, with better lighting.","Neither staffs Tuesday, which is the exam.","Infinite healthy hours were assumed of people already running two jobs and a parent.","A vibe was issued. A shift was empty.","Optimization was offered before sleep, as if sleep were a lifestyle.","The specialist voice had no carer in it, and no winter.","Your accuracy about the waitlist was called anxiety.","Aging was treated as a vibe. It is a ratio of carers to winters.","Primary care was asked to be a slogan. It preferred to be a corridor.","A press cycle took the day off. The night shift did not.","Prevention was praised. Payroll for prevention was not."],
        m2: ["Start with a back, a night, a shift.","Lighting does not fill a rota.","Exams that do not fill are late forecasts.","That input is not infinite, and it never was.","Empty is the print.","Sleep is a limit, not a lifestyle brand.","Winters are ratios.","Accuracy is allowed to be grim and still be kind.","Ratios do not campaign.","Corridors still see people.","Nights are the expert.","Praise is not a hire."],
        c1: ["Every other desk arrives here, in a body that has to work.","Count systems, not strangers, and not villains in scrubs.","No diagnoses from a chair. Rota, sleep, absorbable week.","The clinic is logistics with a conscience, which is not a brand.","Unstaffed Tuesday,","Kindness is staffing, then manners.","Drink water. Not a joke, not a slogan.","A civilisation that intends to continue"],
        c2: ["a person who can still work, care, walk, think.","That respect is the method, and it is ruder than a campaign.","The costume loosens when you count.","Conscience without a rota is a brochure.","late forecast. Start there, not with a vibe.","Branding is the rest. Mean the first half.","Keep body, carer, Tuesday.","looks like a filled night, or it does not."],
        i1: ["Start at Tuesday's rota and","Leave with staffing, sleep, and no press-cycle body.","The carer-operator is the expert, in both directions.","Prevention and sleep still work. They are not a brand, and they start tonight.","Count the ratio. Then be kind on purpose, which is staffing.","A bad week should be absorbable. That is policy you can recognise.","You were spoken to, not around; stay if that is rare.","The night shift is the print, and it does not take a day off for a cycle."],
        i2: ["the theatre looks expensive and understaffed.","Drink water. Then one decision that is not a vibe.","Believe them, in both jobs.","Practise tonight, which is how cheap reforms work.","That is adult, and it hires.","You already wanted that, in your own week.","Rarity is information.","It does not, and that is the whole clinical comment."],
        x1: ["One more clinical line:","After the theatre:","If you keep a test:","Kindness is staffing:"],
        x2: ["believe the rota before the forecast.","a body is not a press cycle.","Tuesday unstaffed means the forecast is late.","sleep starts tonight, without a logo."],
        t1: ["Sit with Tuesday:","You can be accurate without being a brand of anxiety:","The kind default is an absorbable week:","This desk talks to the carer:"],
        t2: ["it is the exam, with names.","you already were, and you were called anxious for it.","that is policy, not a mood.","not around them, not over them."],
        hd1: ["If you have been carer and operator in one week,","If the math felt like accuracy,","If the night shift felt like the only honest print,"],
        hd2: ["this is talking to you, on purpose.","it was, and it still is.","you already had the desk."],
        heard: ["If you have been counting staff while they counted vibes, you were the adult.","You wanted Tuesday to fill. Wanting that is not a personality. It is a mandate."],
        k1: ["Keep the body and the carer.","Leave with staffing and sleep.","Kindness showed up as staff, or it did not."],
        k2: ["Keep Tuesday staffed.","Not a wellness brand.","Remember which, without a speech."],
        keep: ["You understood if you leave more interested in a rota than in a campaign.","Optimistic by default: a bad week can still be absorbable, if someone is paid to be there."],
        n1: ["Count systems.","Staff Tuesday or the forecast is late.","Sleep is the cheap reform."],
        n2: ["No diagnoses from a chair.","That burns in.","Start tonight."],
        note: ["A waitlist is policy. A vibe is not.","The night shift does not take a press cycle off. Remember that when the lighting improves."],
        w1: ["Watch the rota","Watch sleep","Watch a bad week","Watch prevention","Watch Tuesday","Watch vacancies","Watch winter","Watch carer hours"],
        w2: ["before the forecast.","as policy.","for absorbable.","funded or only praised.","for a fill.","as the print.","as a ratio.","as the mandate."],
        watch: ["Rota, vacancies, winter ratios.","Whether a bad week was absorbable.","Whether prevention was funded.","Whether Tuesday filled.","Whether the carer was spoken to, or around."]
      },
      security: {
        heads: ["A dull night is the win","Spare parts beat maps","Insurance still has to clear","Cables are civilian clothes","Training is untelevised","The grain corridor is a thesis","Spectacle is cheap inventory","A hospital is the argument","Boredom at a border is policy","Logistics, then law, then hope","The bus still needs a night","Fear for sale is not analysis"],
        dek: ["From the toy map to a corridor that still has a night.","Spare parts are ruder than speeches and more useful.","If it needs fear to stand, it was selling.","Boredom at a border is an achievement."],
        h1: ["A dull night","Spare parts","The cable","Training","Insurance","The grain corridor","A hospital","Boredom"],
        h2: ["is the win","beat maps","is civilian clothes","is untelevised","still has to clear","is a thesis","is the argument","at a border is policy"],
        dk1: ["What they called security","The toy map","A speech with tanks","The night"],
        dk2: ["was a corridor looking for a dull hour.","was not a briefing.","was not logistics.","should stay boring."],
        m1: ["The rooms issued a map with little symbols and called it a briefing.","War tourism from a chair was offered as if furniture conferred rank.","Costume was issued as analysis, with better lighting.","The feed wanted escalation. The port wanted a night that stayed dull.","Prices arrived before the theory, and so did stolen attention.","A speech traveled. A spare part did not, and neither did a trained person.","A team was requested before a corridor was checked.","Boredom was called a narrative failure, which is how you know it was the point.","Cables were discussed as metaphors. They remain wet, buried, and expensive.","Grain was given a subplot. It preferred a lane.","A hospital was asked to be a symbol. It preferred a generator.","Fear was priced as a subscription."],
        m2: ["Decline. The chair is not a briefing room.","Rank is not upholstery.","Lighting is not logistics.","Dull nights feed Tuesdays.","Stolen attention is still a cost.","Untelevised stocks still decide.","Corridors are the thesis. Teams are a product.","Points are allowed to be boring.","Expensive and buried is the print.","Lanes feed people. Subplots feed clips.","Generators are the argument.","Subscriptions are optional. Analysis is not."],
        c1: ["A port, a cable, a hospital, a school — if those fail,","Not naive: most people, most days, prefer settlement to spectacle.","Alliances are balance sheets with flags, and they work when paid.","Follow the invoice, the spare, the trainer.","Hope for a corridor without becoming simple, or a tourist.","Numbers, not trophies, and no private names from a chair.","If fear is required for the sentence to stand,","Logistics, then law, then hope — that order is the comment."],
        c2: ["every other argument was luxury, and you already felt that.","Institutions exist to make betrayal expensive, which is dull on purpose.","Unpaid sheets are literature.","Ruder than toys on a map, more useful by morning.","That bet is not stupid, and it still wants dinner.","You prefer numbers. Good. Stay there.","it was selling. Decline the subscription.","Hope without the first two is a greeting card."],
        i1: ["Want a dull night more than a clip and","Keep the corridor. Then live the week as if that were allowed.","Order is a maintained machine, not a mood you can rent.","Leave less frightened, more interested in parts and training.","Spectacle priced as strategy is not pricing your Tuesday, or your bus.","Prefer untelevised training; it is the only kind that loads.","Hope without being simple is allowed, and so is a generator.","A dull night is policy you can recognise when it holds."],
        i2: ["the temperature looks like a product with better graphics.","Allowed is the kind word for peace as logistics.","Maintain it, pay it, do not photograph it for sport.","That was the test, and it does not need a flag on a desk.","You already knew, in the part of you that buys tickets.","Smile at that, then prefer it.","Keep both.","Then live the week, which is the point of the night."],
        x1: ["One more security line, then live:","After the toy map:","If you keep a preference:","Spare parts beat speeches:"],
        x2: ["a corridor is the thesis. Spectacle is inventory.","literature cannot load a ship, or a generator.","a dull night, still.","training is untelevised, on purpose."],
        t1: ["Sit with the dull night:","You can want a corridor without a costume:","The kind default is settlement:","This desk returns you to Tuesday:"],
        t2: ["it is an achievement, not a failure of plot.","people still prefer it when they are not being sold a team.","most days, most people, unpaid by the clip.","someone was not pricing it with little symbols."],
        hd1: ["If you quietly hoped the grown-ups still had a corridor,","If you prefer numbers to trophies,","If a dull night felt like the win,"],
        hd2: ["yes. That bet is not stupid.","good. Stay with numbers.","it is, and it was."],
        heard: ["If you hoped for boredom at a border, that hope is adult.","You wanted parts, not a map for the coffee table. Keep wanting parts."],
        k1: ["Keep the corridor.","Prefer parts to maps.","Boredom is the win."],
        k2: ["Keep the night boring. Then live.","That was the test.","Remember it when the lighting improves."],
        keep: ["You understood if you leave less frightened and more interested in a spare part.","Optimistic by default: most people, most days, still prefer a corridor to a clip."],
        n1: ["If it needs fear to stand, it was selling.","No tourism from this chair.","Spectacle is cheap inventory."],
        n2: ["Decline the subscription.","Logistics, law, hope.","A corridor is the thesis."],
        note: ["A hospital with a generator is an argument. A map with toys is a product.","Cables, grain, lanes: security in civilian clothes. Keep the clothes."],
        w1: ["Watch the corridor","Watch spare parts","Watch insurance","Watch the night","Watch fear","Watch cables","Watch training","Watch whether a hospital"],
        w2: ["before the toy map.","and a trainer.","for a clear.","for dull.","required to stand.","as civilian clothes.","as untelevised stock.","still has a generator."],
        watch: ["Corridors, cables, whether insurance still clears.","Spare parts and training — the untelevised stocks.","Whether the night stayed dull.","Whether spectacle was priced as strategy.","Whether the bus still had a night."]
      }
    };

    Object.keys(X).forEach(function (k) {
      var D = L[k], W = X[k];
      if (!D || !W) return;
      function add(field, a, b) {
        if (!a || !b || !a.length || !b.length) return;
        D[field] = (D[field] || []).concat(pair(a, b));
      }
      D.heads = (D.heads || []).concat(W.heads || []).concat(pair(W.h1, W.h2));
      D.dek = (D.dek || []).concat(W.dek || []).concat(pair(W.dk1, W.dk2));
      add("mainstream", W.m1, W.m2);
      add("cut", W.c1, W.c2);
      add("insight", W.i1, W.i2);
      add("more", W.x1, W.x2);
      add("turn", W.t1, W.t2);
      add("heard", W.hd1, W.hd2);
      D.heard = (D.heard || []).concat(W.heard || []);
      add("keep", W.k1, W.k2);
      D.keep = (D.keep || []).concat(W.keep || []);
      add("note", W.n1, W.n2);
      D.note = (D.note || []).concat(W.note || []);
      add("watch", W.w1, W.w2);
      D.watch = (D.watch || []).concat(W.watch || []);
    });
  }
  fill(L);
  (function scarce(L) {
    var S = {
      markets: {
        t1: ["The tape gets kinder when you stop renting it:", "A book that can wait is already the optimistic bet:", "You can leave the verb on the table:", "Overnight is allowed to be the grown-up:", "The unloved hour is not a punishment:", "Settlement is a kindness with a date:", "Crowding will invoice you whether you notice or not:", "Thin hours are a courtesy the day session forgets:"],
        t2: ["check the roll, then live.","patience is a bid.","the auction will keep.","read it without a thumbnail.","it is often the honest print.","dates still bind.","noticing is the cheap edge.","remember them."],
        hd1: ["If the verb felt overdressed,","If you wanted the roll more than the miracle,","If overnight already vetoed the speech in your head,","If crowding felt like rent,","If the gap could not survive dinner,","If you declined the squeeze-as-season,","If thin hours made more sense than the open,","If you wanted a bedtime more than a plot,"],
        hd2: ["you were reading.","you already had the method.","you were early.","you were right to leave.","you understood the test.","you kept the edge.","you were on the desk.","good."],
        k1: ["Keep the auction.","Starve the thumbnail.","Let overnight dissent.","Size to dinner.","Collect the unloved hour.","Refuse the rented squeeze.","Prefer the roll.","Leave the verb."],
        k2: ["Then go outside.","The book will keep.","That is still legal.","That is a risk limit.","It often pays.","Seasons have inventories.","Minutes beat metaphors.","Tuesday remains usable."]
      },
      geoecon: {
        t1: ["The till is kinder than the clip:", "A dull port is an achievement:", "You can want a route without a team:", "Surcharges are allowed to be diplomats:", "Harvest is not a subplot:", "Customs is ruder than a summit:", "A visa queue is a schedule:", "Grain still wants a lane:"],
        t2: ["keep the ticket.","feed Tuesdays.","delivery still beats destiny.","read the number.","it feeds people.","page numbers still bind.","treat it like one.","give it one."],
        hd1: ["If the till taught you first,","If you declined the team sport,","If the berth felt like the news,","If the surcharge spoke more clearly than the flag,","If you wanted dinner more than a summit,","If customs already vetoed the costume,","If the grocery bag was the map,","If a dull port felt like a win,"],
        hd2: ["you were doing the desk.","you were right.","it was.","you were reading.","that preference is adult.","you already knew.","you had the method.","it is."],
        k1: ["Keep the premium.","Prefer the berth.","Want a route home.","Believe the till.","Let customs vote.","Skip the team.","Keep the surcharge.","Hope for a dull port."],
        k2: ["Not the choir.","Not the villain.","That is policy.","It is the diplomat.","It outruns clips.","Ships do not join.","It is speaking.","Then cook."]
      },
      politics: {
        t1: ["The pavement is kinder than the anthem:", "A quorum is allowed to be the plot:", "You can want a bus without a miracle:", "Procurement is ruder than a podium:", "The clerk's date still binds:", "Municipal is not lesser:", "Losing on time is a civic skill:", "The annex is allowed to be boring:"],
        t2: ["keep the pavement.","count, then live.","statutes still run.","read the line.","dates are the adult.","it is most of the country.","recesses are not death.","page numbers work."],
        hd1: ["If you wanted the bus more than the anthem,","If recruitment felt like a job you did not apply for,","If the annex felt like the news,","If quorum felt ruder and better,","If you declined to hunt persons,","If Wednesday felt like the exam,","If procurement outran the clip in your head,","If cooler felt like a policy,"],
        hd2: ["you already had the brief.","you were right to decline.","it is.","you were reading.","good. Stay with institutions.","it is.","you were early.","it is."],
        k1: ["Read the quorum.","Keep the pavement.","Prefer the clerk.","Ride the bus.","Take the annex.","Let Wednesday count.","Skip the choir.","Keep your temperature."],
        k2: ["Then vote if you can.","That is the country.","Calendars still bind.","It is a statute.","Page numbers help.","Majorities are dull on purpose.","Retail is loud.","Cooler is allowed."]
      },
      psych: {
        t1: ["The other room is kinder than a rebrand:", "A closed loop is allowed to be a life:", "You can want calm without a purchase:", "Boredom is a skill with a door:", "Morning is a risk desk you already own:", "The saga is optional equipment:", "Water is still a policy:", "Permission does not need a personality:"],
        t2: ["use it.","close it once.","practise it.","practise it before you praise it.","run it.","leave it on the shelf.","start there.","you already have it."],
        hd1: ["If the phone felt like a landlord,","If you wanted a list more than a saga,","If the other room already felt like policy,","If a villain before water felt like retail,","If boredom felt like medicine,","If you declined a new self by Friday,","If one loop felt like enough,","If stillness felt like a technology,"],
        hd2: ["you were over-leased, not weak.","you already had the method.","it is.","it was.","it often is.","good.","it is.","it is, and you can run it."],
        k1: ["Close one loop.","Use the other room.","Walk before the thread.","Price the door.","Keep the list.","Practise boredom.","Start with water.","Leave the saga."],
        k2: ["That is a life.","It is still legal.","Threads can wait.","Attention is a cost.","Sagas wanted it anyway.","It compounds.","Then one decision.","Retail will keep without you."]
      },
      energy: {
        t1: ["The meter is kinder than the church:", "A weld on a payroll is the transition:", "You can want 8 a.m. and a summer:", "Spare is allowed to be kindness:", "Degree-days are data, not scandal:", "Tankers are sentences:", "Baseload is a bedtime:", "Maintenance is policy you can touch:"],
        t2: ["believe it.","pay it.","adults hold both.","check the decimal.","treat them that way.","read them.","keep it.","touch it."],
        hd1: ["If the meter spoke first,","If you wanted a kettle more than a hymn,","If spare felt like the adult,","If a weld felt more real than a slogan,","If January already taught you arithmetic,","If you declined the church and kept the tank,","If a summer table still felt plannable,","If copper felt like the optimistic fact,"],
        hd2: ["you were reading.","you were on this desk.","it is.","it is.","you were early.","good.","that is the default.","it is, if the permit holds."],
        k1: ["Believe the meter.","Keep 8 a.m.","Plan the table.","Check spare.","Pay the weld.","Follow the tanker.","Skip the hymn.","Keep the lights."],
        k2: ["Then argue, if you must.","It is a clock.","Summers are allowed.","Kindness has a decimal.","Payroll is the transition.","It already voted.","Churches can wait.","Then architecture."]
      },
      money: {
        t1: ["The kitchen is kinder than the cult:", "A hold is allowed to be kindness:", "You can want a bedtime and a sheet:", "Term premium is the adult in the invoice:", "Deposits vote whether you film them:", "The window is tuition:", "Duration is a household word:", "Solvent is a reason to sit down:"],
        t2: ["it already voted.","plan the mortgage that way.","institutions like remaining.","read it.","count them.","take it.","you already speak it.","then live."],
        hd1: ["If the presser felt like a personality you did not need,","If the kitchen already felt like a committee,","If waiting did not feel like a scandal,","If a hold felt like remaining,","If dots felt unlike scripture,","If you wanted temperament not a mascot,","If the mortgage outlived the wheel,","If solvent felt like the point,"],
        hd2: ["you were right, and cheaper.","you already had the method.","it is not.","it often is.","they are not.","good.","it does.","it was."],
        k1: ["Keep the bedtime.","Let math veto drama.","Plan the mortgage.","Leave the cult.","Take the window.","Count deposits.","Prefer a hold to a mascot.","Go outside."],
        k2: ["Sheets still bind.","Then live.","It outlives dots.","Retail is loud.","Tuition sticks.","They vote nightly.","Remaining is a trick.","The committee will keep."]
      },
      ordinary: {
        t1: ["The table is kinder than the specialist:", "Milk is allowed to be data:", "You can want a livable Tuesday:", "Payroll Friday is a print with a name:", "The school-run is logistics, not lifestyle:", "Rent is duration you already trade:", "A commute is a balance sheet in traffic:", "The tomato does not need a forecast:"],
        t2: ["it settles tonight.","believe the handle.","that is enough.","cash it.","treat it that way.","living it is the trade.","count it.","smell it."],
        hd1: ["If the specialist font felt wrong,","If you wanted to be spoken to at the till,","If breakfast already had a number,","If the school-run felt like the real logistics,","If rent felt like a curve,","If you were told you were lesser and did not believe it,","If the table still had to clear,","If a joke and dry powder felt like a strategy,"],
        hd2: ["it was.","that is the line.","it did.","it is.","you already trade it.","you were right.","it did, with chairs.","it is, for most humans."],
        k1: ["Keep the table.","Believe the tomato.","Cash payroll.","Run the school-run.","Keep a joke.","Hold a little powder.","Buy the milk.","Skip the costume."],
        k2: ["It settles tonight.","It is a print.","It is the number.","It is logistics.","It is strategy.","It is adult.","It is high-frequency.","You already run a book."]
      },
      tech: {
        t1: ["The invoice is kinder than the miracle:", "Sunday restart is allowed to be the exam:", "You can want tools and a permit:", "Cooling is policy with a decimal:", "Failover is character:", "A substation is a thesis you can visit:", "Second shift is a generation:", "Uptime does not need a mascot:"],
        t2: ["it stayed.","sit it.","adults hold both.","count it.","floors have it.","go look.","pay it.","floors do not."],
        hd1: ["If you asked who pays for the electricity,","If the demo felt like hospitality,","If Sunday felt like the real test,","If a permit felt ruder and better,","If you would not worship a logo,","If heat felt like an input,","If a name on a rota felt like the loop,","If copper felt like the optimistic fact,"],
        hd2: ["you were the adult.","it was.","it is.","it is.","good.","it is, not a scandal.","it is.","it is, if it pours."],
        k1: ["Price the power.","Keep the permit.","Sit Sunday.","Believe the invoice.","Skip the mascot.","Pay the second shift.","Explain it without a brand.","Prefer the floor."],
        k2: ["Then the model.","Theses need them.","Brochures will not.","It stayed.","Saviours are retail.","Generations sometimes get paid.","Readiness sounds like that.","It can restart."]
      },
      health: {
        t1: ["The rota is kinder than the campaign:", "An absorbable week is allowed to be policy:", "You can want accuracy without a brand of fear:", "Night shift is the expert:", "Vacancies are the print:", "Sleep is a cheap reform with a pillow:", "Carer hours are a mandate:", "Tuesday filling is the exam:"],
        t2: ["read it.","recognise it.","you already were accurate.","believe them.","count them.","start tonight.","pay them.","fill it."],
        hd1: ["If you have been both carer and operator,","If the waitlist felt like policy,","If a vibe could not fill a shift,","If winter already felt like a ratio,","If you were called anxious for counting,","If the night shift felt like the only honest desk,","If prevention was praised and not hired,","If a bad week needed to be absorbable,"],
        hd2: ["this is for you.","it is.","it could not.","it is.","you were accurate.","it is.","you noticed the gap.","that is the mandate."],
        k1: ["Keep the rota.","Staff Tuesday.","Pay the carer.","Start sleep tonight.","Count vacancies.","Skip the theatre.","Believe the night shift.","Want an absorbable week."],
        k2: ["It is the print.","Or the forecast is late.","It is kindness.","Cheap reforms start.","They are the news.","Lighting is not a hire.","They did not take the day off.","That is policy."]
      },
      security: {
        t1: ["The dull night is kinder than the clip:", "A spare part is allowed to be the thesis:", "You can want a corridor without a team:", "Insurance is a diplomat with worse manners:", "Training is untelevised on purpose:", "A generator is an argument:", "Fear-as-subscription is optional:", "Logistics then law then hope:"],
        t2: ["keep it boring.","stock it.","people still prefer delivery.","let it clear.","prefer it.","hospitals know.","decline it.","that order still holds."],
        hd1: ["If you hoped the grown-ups still had a corridor,","If a toy map felt like a product,","If boredom at a border felt like the win,","If you wanted parts not trophies,","If fear was required for the sentence to stand,","If a cable felt more real than a speech,","If the bus still needed a night,","If you declined tourism from a chair,"],
        hd2: ["yes. That bet is not stupid.","it was.","it is.","good.","it was selling.","it is.","it does.","correct."],
        k1: ["Keep the corridor.","Stock the spare.","Prefer the dull night.","Let insurance clear.","Train untelevised.","Keep the generator.","Decline the subscription.","Live the week."],
        k2: ["Then live.","Maps cannot load.","That is the win.","Diplomats itemise.","It is the only kind that loads.","Hospitals are arguments.","Fear is inventory.","That was the point of the night."]
      }
    };
    Object.keys(S).forEach(function (k) {
      var D = L[k], W = S[k];
      if (!D || !W) return;
      D.turn = (D.turn || []).concat(pair(W.t1, W.t2));
      D.heard = (D.heard || []).concat(pair(W.hd1, W.hd2));
      D.keep = (D.keep || []).concat(pair(W.k1, W.k2));
    });
  })(L);
  w._n = L;
})(window);
