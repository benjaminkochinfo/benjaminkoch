/**
 * WMT — Static catalogs: domains, countries, instruments, scenarios,
 * risk models (incl. KMRI), layers, markers, view presets
 */

const DOMAINS = [
  { id: "all", label: "All", tip: "See everything at once" },
  { id: "geo", label: "GEO", tip: "Map and places" },
  { id: "war", label: "War / Crisis", tip: "Conflicts and tension" },
  { id: "weather", label: "Weather", tip: "Storms and natural hazards" },
  { id: "macro", label: "Macro", tip: "Money, markets, and currencies" },
  { id: "food", label: "Food / Ag", tip: "Food crops and soft commodities" },
  { id: "energy", label: "Energy", tip: "Oil, gas, and power routes" },
  { id: "transport", label: "Transport", tip: "Ships, canals, and traffic risk" },
  { id: "insurance", label: "Insurance", tip: "Storm and war insurance signals" },
  { id: "tech", label: "Tech / Chips", tip: "Semiconductors, data centers, AI power" },
  { id: "metals", label: "Metals", tip: "Gold, silver, copper, aluminum" },
  { id: "afford", label: "Affordability", tip: "Housing, school, food, transport, living costs" },
];

const SCENARIOS = [
  { id: "baseline", name: "Everyday watch", domains: ["all"], desc: "A calm, balanced look at the whole world." },
  { id: "great_power", name: "Big-power tension", domains: ["war", "macro", "geo", "tech"], desc: "Taiwan, NATO, sanctions, and market fear." },
  { id: "active_war", name: "Active war", domains: ["war", "energy", "insurance"], desc: "Fighting, energy shock, and war insurance." },
  { id: "food_shock", name: "Food price shock", domains: ["food", "weather", "macro"], desc: "Wheat, cocoa, and weather stress on food." },
  { id: "energy_crisis", name: "Energy squeeze", domains: ["energy", "transport", "macro"], desc: "Oil, gas, and blocked sea routes." },
  { id: "cat_weather", name: "Storm season", domains: ["weather", "insurance", "transport"], desc: "Storms, floods, and insurance stress." },
  { id: "shipping", name: "Shipping trouble", domains: ["transport", "energy", "food"], desc: "Red Sea, Suez, Hormuz, and freights." },
  { id: "sanctions", name: "Sanctions watch", domains: ["macro", "war", "energy"], desc: "Trade rules, dual-use goods, shadow fleets." },
  { id: "chip_crunch", name: "Chip & data crunch", domains: ["tech", "metals", "energy", "macro"], desc: "Semiconductors, data centers, power, copper." },
  { id: "pandemic_style", name: "System shock", domains: ["macro", "transport", "food"], desc: "When many systems slow down together." },
];

/**
 * Lenses = simple questions the terminal tries to answer.
 */
const LENSES = [
  { id: "overview", name: "Big picture", question: "What matters most right now?", desc: "A clear overview for everyone." },
  { id: "threat", name: "Danger watch", question: "Where is fighting or tension rising?", desc: "Wars, hotspots, and military risk." },
  { id: "stability", name: "Hope path", question: "Where can things get better?", desc: "Ways out of trouble — positive paths." },
  { id: "markets", name: "Money & prices", question: "What are markets saying about energy, food, and fear?", desc: "Stocks, oil, food, metals, chips." },
  { id: "logistics", name: "Moving goods", question: "Which sea routes and ports are stressed?", desc: "Shipping and corridors." },
  { id: "humanitarian", name: "People & food", question: "Where do people and food systems need help?", desc: "Food security and aid." },
  { id: "climate_cat", name: "Weather risk", question: "What storms and hazards should we watch?", desc: "Weather, quakes, El Niño." },
  { id: "tech", name: "Chips & cloud", question: "How are semiconductors and data centers doing?", desc: "Chips, AI, power for data centers." },
  { id: "metals", name: "Metals", question: "What are gold, silver, copper, and aluminum doing?", desc: "Industrial and precious metals." },
  {
    id: "afford",
    name: "Affordability",
    question: "Where is life more affordable — housing, school, food, transport?",
    desc: "Cost of living: home, school, childcare, car, gas, groceries, utilities.",
  },
  { id: "decision", name: "60-second brief", question: "If I must explain the world in one minute, what do I say?", desc: "Short, clear answers." },
];

/**
 * Affordability categories — cost scores 0–100 (higher = more expensive).
 * Easy labels for families, students, and older readers.
 */
const AFFORD_CATEGORIES = [
  { id: "housing", name: "Housing / rent", tip: "Rent or mortgage for a typical home.", icon: "🏠" },
  { id: "groceries", name: "Groceries / food", tip: "Weekly food shopping basket.", icon: "🛒" },
  { id: "utilities", name: "Utilities", tip: "Water, trash, basic home services.", icon: "💧" },
  { id: "energy", name: "Home energy", tip: "Electricity and heating for the home.", icon: "⚡" },
  { id: "gasFuel", name: "Gas / fuel", tip: "Petrol or diesel for the car.", icon: "⛽" },
  { id: "transport", name: "Transport", tip: "Public transport and getting around.", icon: "🚌" },
  { id: "cars", name: "Cars", tip: "Buying and keeping a family car.", icon: "🚗" },
  { id: "childcare", name: "Childcare", tip: "Daycare and after-school care.", icon: "👶" },
  { id: "schoolPublic", name: "Public school", tip: "State / public school costs for families.", icon: "🏫" },
  { id: "schoolPrivate", name: "Private school", tip: "Private school fees.", icon: "📘" },
  { id: "higherEd", name: "Higher education", tip: "University or college costs.", icon: "🎓" },
  { id: "healthcare", name: "Healthcare", tip: "Basic medical and insurance burden.", icon: "🏥" },
];

/**
 * Cost-of-living by country (model indices, 0–100 = more expensive).
 * affordScore = overall ease of living (higher = more affordable places).
 * Live markets (oil, food) gently adjust energy/fuel/grocery each refresh.
 */
const AFFORDABILITY = [
  { code: "USA", city: "US average", affordScore: 48, housing: 78, groceries: 72, utilities: 62, energy: 58, gasFuel: 55, transport: 68, cars: 70, childcare: 85, schoolPublic: 35, schoolPrivate: 88, higherEd: 90, healthcare: 82, note: "Wide city gap: some towns cheaper, coastal cities costly." },
  { code: "CHN", city: "Major cities", affordScore: 55, housing: 70, groceries: 55, utilities: 45, energy: 48, gasFuel: 52, transport: 40, cars: 55, childcare: 60, schoolPublic: 30, schoolPrivate: 75, higherEd: 50, healthcare: 48, note: "Big cities expensive for homes; smaller cities more open." },
  { code: "RUS", city: "Major cities", affordScore: 58, housing: 55, groceries: 50, utilities: 40, energy: 42, gasFuel: 45, transport: 38, cars: 60, childcare: 45, schoolPublic: 25, schoolPrivate: 65, higherEd: 40, healthcare: 55, note: "Varies a lot by region and currency swings." },
  { code: "UKR", city: "Safer cities", affordScore: 62, housing: 40, groceries: 48, utilities: 50, energy: 55, gasFuel: 58, transport: 35, cars: 55, childcare: 40, schoolPublic: 22, schoolPrivate: 55, higherEd: 35, healthcare: 50, note: "War pressure changes local prices and services." },
  { code: "TWN", city: "Taipei area", affordScore: 52, housing: 75, groceries: 60, utilities: 48, energy: 50, gasFuel: 55, transport: 42, cars: 58, childcare: 70, schoolPublic: 28, schoolPrivate: 72, higherEd: 45, healthcare: 35, note: "Strong services; housing in the capital is the heavy cost." },
  { code: "ISR", city: "Central Israel", affordScore: 42, housing: 88, groceries: 80, utilities: 70, energy: 72, gasFuel: 75, transport: 65, cars: 78, childcare: 82, schoolPublic: 40, schoolPrivate: 85, higherEd: 55, healthcare: 48, note: "Housing and childcare are often the biggest family costs." },
  { code: "IRN", city: "Major cities", affordScore: 60, housing: 50, groceries: 55, utilities: 45, energy: 40, gasFuel: 30, transport: 35, cars: 70, childcare: 50, schoolPublic: 25, schoolPrivate: 60, higherEd: 40, healthcare: 55, note: "Fuel can look cheap; other goods follow sanctions and FX." },
  { code: "SAU", city: "Riyadh / Jeddah", affordScore: 54, housing: 65, groceries: 60, utilities: 40, energy: 35, gasFuel: 25, transport: 50, cars: 55, childcare: 65, schoolPublic: 20, schoolPrivate: 80, higherEd: 45, healthcare: 50, note: "Energy often low cost; private schools can be high." },
  { code: "TUR", city: "Istanbul area", affordScore: 56, housing: 60, groceries: 58, utilities: 55, energy: 60, gasFuel: 70, transport: 40, cars: 72, childcare: 55, schoolPublic: 25, schoolPrivate: 70, higherEd: 40, healthcare: 45, note: "Inflation can move monthly costs quickly." },
  { code: "DEU", city: "Germany average", affordScore: 50, housing: 72, groceries: 68, utilities: 65, energy: 70, gasFuel: 72, transport: 48, cars: 65, childcare: 55, schoolPublic: 15, schoolPrivate: 60, higherEd: 25, healthcare: 30, note: "Public school and university often low fee; energy and rent matter." },
  { code: "GBR", city: "UK average", affordScore: 46, housing: 80, groceries: 70, utilities: 68, energy: 72, gasFuel: 74, transport: 55, cars: 68, childcare: 88, schoolPublic: 20, schoolPrivate: 85, higherEd: 75, healthcare: 25, note: "Childcare and London housing push costs up." },
  { code: "FRA", city: "France average", affordScore: 51, housing: 70, groceries: 72, utilities: 60, energy: 62, gasFuel: 75, transport: 45, cars: 65, childcare: 50, schoolPublic: 15, schoolPrivate: 70, higherEd: 30, healthcare: 28, note: "Strong public services; fuel and city rent weigh more." },
  { code: "IND", city: "Major metros", affordScore: 64, housing: 55, groceries: 40, utilities: 35, energy: 40, gasFuel: 55, transport: 30, cars: 50, childcare: 45, schoolPublic: 25, schoolPrivate: 65, higherEd: 40, healthcare: 45, note: "Very wide gap: metros cost more than smaller cities." },
  { code: "PAK", city: "Major cities", affordScore: 66, housing: 45, groceries: 42, utilities: 40, energy: 48, gasFuel: 55, transport: 32, cars: 55, childcare: 40, schoolPublic: 22, schoolPrivate: 55, higherEd: 35, healthcare: 50, note: "Energy and FX moves can change monthly bills." },
  { code: "JPN", city: "Japan average", affordScore: 49, housing: 75, groceries: 78, utilities: 58, energy: 60, gasFuel: 68, transport: 50, cars: 62, childcare: 65, schoolPublic: 30, schoolPrivate: 75, higherEd: 55, healthcare: 35, note: "Food and city housing often feel high; transit is excellent." },
  { code: "KOR", city: "Seoul area", affordScore: 48, housing: 78, groceries: 72, utilities: 55, energy: 55, gasFuel: 65, transport: 42, cars: 60, childcare: 70, schoolPublic: 30, schoolPrivate: 80, higherEd: 55, healthcare: 40, note: "Education competition and housing drive family budgets." },
  { code: "PRK", city: "Model only", affordScore: 40, housing: 50, groceries: 70, utilities: 70, energy: 75, gasFuel: 80, transport: 60, cars: 90, childcare: 50, schoolPublic: 20, schoolPrivate: 90, higherEd: 40, healthcare: 70, note: "Limited open data — illustrative only." },
  { code: "SDN", city: "Urban", affordScore: 45, housing: 40, groceries: 65, utilities: 70, energy: 75, gasFuel: 70, transport: 55, cars: 75, childcare: 45, schoolPublic: 30, schoolPrivate: 60, higherEd: 50, healthcare: 75, note: "Conflict and supply stress raise daily costs for families." },
  { code: "EGY", city: "Cairo area", affordScore: 60, housing: 50, groceries: 48, utilities: 40, energy: 45, gasFuel: 40, transport: 30, cars: 55, childcare: 45, schoolPublic: 25, schoolPrivate: 70, higherEd: 40, healthcare: 50, note: "Public transport helps; private school is the big step-up cost." },
  { code: "YEM", city: "Urban", affordScore: 42, housing: 45, groceries: 70, utilities: 75, energy: 80, gasFuel: 75, transport: 60, cars: 80, childcare: 50, schoolPublic: 35, schoolPrivate: 65, higherEd: 55, healthcare: 80, note: "Conflict makes food and fuel less predictable." },
  { code: "LBN", city: "Beirut area", affordScore: 44, housing: 65, groceries: 72, utilities: 85, energy: 90, gasFuel: 80, transport: 55, cars: 75, childcare: 60, schoolPublic: 35, schoolPrivate: 75, higherEd: 60, healthcare: 70, note: "Power and utilities stress hit households hard." },
  { code: "SYR", city: "Urban", affordScore: 40, housing: 50, groceries: 75, utilities: 80, energy: 85, gasFuel: 80, transport: 60, cars: 85, childcare: 55, schoolPublic: 35, schoolPrivate: 70, higherEd: 55, healthcare: 80, note: "War damage keeps daily life costly and uneven." },
  { code: "BRA", city: "Major cities", affordScore: 58, housing: 55, groceries: 55, utilities: 55, energy: 50, gasFuel: 60, transport: 45, cars: 65, childcare: 55, schoolPublic: 25, schoolPrivate: 70, higherEd: 50, healthcare: 55, note: "Private school and cars weigh on middle-class budgets." },
  { code: "ARG", city: "Buenos Aires", affordScore: 57, housing: 50, groceries: 55, utilities: 50, energy: 48, gasFuel: 55, transport: 40, cars: 70, childcare: 50, schoolPublic: 20, schoolPrivate: 65, higherEd: 35, healthcare: 50, note: "Inflation can change month-to-month affordability." },
  { code: "AUS", city: "Australia average", affordScore: 45, housing: 85, groceries: 75, utilities: 70, energy: 68, gasFuel: 70, transport: 60, cars: 68, childcare: 80, schoolPublic: 25, schoolPrivate: 85, higherEd: 70, healthcare: 45, note: "Housing is often the #1 pressure for families." },
  { code: "ZAF", city: "Major cities", affordScore: 60, housing: 48, groceries: 50, utilities: 55, energy: 60, gasFuel: 62, transport: 50, cars: 60, childcare: 50, schoolPublic: 30, schoolPrivate: 70, higherEd: 50, healthcare: 55, note: "Private school and transport can dominate family costs." },
  { code: "NGA", city: "Lagos area", affordScore: 58, housing: 55, groceries: 52, utilities: 65, energy: 70, gasFuel: 55, transport: 55, cars: 65, childcare: 50, schoolPublic: 30, schoolPrivate: 65, higherEd: 45, healthcare: 60, note: "Power reliability adds hidden costs for homes and shops." },
  { code: "CIV", city: "Abidjan", affordScore: 62, housing: 48, groceries: 50, utilities: 55, energy: 55, gasFuel: 58, transport: 45, cars: 60, childcare: 48, schoolPublic: 28, schoolPrivate: 60, higherEd: 45, healthcare: 55, note: "Food and fuel moves matter quickly for households." },
  { code: "GHA", city: "Accra", affordScore: 63, housing: 48, groceries: 50, utilities: 55, energy: 58, gasFuel: 60, transport: 45, cars: 58, childcare: 48, schoolPublic: 28, schoolPrivate: 58, higherEd: 45, healthcare: 55, note: "Education choices drive long-term family budgets." },
  { code: "IDN", city: "Jakarta area", affordScore: 61, housing: 55, groceries: 45, utilities: 40, energy: 42, gasFuel: 48, transport: 35, cars: 55, childcare: 50, schoolPublic: 25, schoolPrivate: 65, higherEd: 45, healthcare: 50, note: "Metro housing costs more; islands vary widely." },
  { code: "PHL", city: "Metro Manila", affordScore: 60, housing: 58, groceries: 48, utilities: 50, energy: 55, gasFuel: 58, transport: 40, cars: 58, childcare: 50, schoolPublic: 28, schoolPrivate: 65, higherEd: 50, healthcare: 55, note: "Private school is a common middle-class goal and cost." },
  { code: "MEX", city: "Major cities", affordScore: 59, housing: 55, groceries: 52, utilities: 48, energy: 50, gasFuel: 55, transport: 40, cars: 58, childcare: 52, schoolPublic: 25, schoolPrivate: 70, higherEd: 45, healthcare: 55, note: "Cars and private education lift costs in big cities." },
  { code: "POL", city: "Poland average", affordScore: 58, housing: 58, groceries: 52, utilities: 55, energy: 60, gasFuel: 62, transport: 40, cars: 55, childcare: 48, schoolPublic: 18, schoolPrivate: 55, higherEd: 30, healthcare: 40, note: "Public school helps; energy winters matter." },
  { code: "EST", city: "Tallinn", affordScore: 54, housing: 62, groceries: 60, utilities: 58, energy: 62, gasFuel: 68, transport: 42, cars: 58, childcare: 45, schoolPublic: 15, schoolPrivate: 55, higherEd: 30, healthcare: 35, note: "Digital services strong; winter energy is the watch item." },
  { code: "SWE", city: "Sweden average", affordScore: 48, housing: 74, groceries: 72, utilities: 62, energy: 58, gasFuel: 70, transport: 45, cars: 62, childcare: 40, schoolPublic: 12, schoolPrivate: 55, higherEd: 22, healthcare: 25, note: "Strong public services; housing in big cities is the main cost." },
  { code: "NOR", city: "Norway average", affordScore: 44, housing: 78, groceries: 80, utilities: 65, energy: 45, gasFuel: 72, transport: 50, cars: 68, childcare: 42, schoolPublic: 12, schoolPrivate: 58, higherEd: 20, healthcare: 22, note: "High wages and high prices; energy often manageable." },
  { code: "DNK", city: "Denmark average", affordScore: 46, housing: 76, groceries: 74, utilities: 64, energy: 60, gasFuel: 72, transport: 42, cars: 70, childcare: 38, schoolPublic: 12, schoolPrivate: 55, higherEd: 20, healthcare: 22, note: "Childcare and public school support families; city housing is high." },
  { code: "FIN", city: "Finland average", affordScore: 49, housing: 70, groceries: 70, utilities: 60, energy: 58, gasFuel: 70, transport: 45, cars: 62, childcare: 40, schoolPublic: 12, schoolPrivate: 52, higherEd: 18, healthcare: 24, note: "Strong public school and care system; winter energy matters." },
  { code: "NLD", city: "Netherlands average", affordScore: 47, housing: 80, groceries: 70, utilities: 62, energy: 68, gasFuel: 74, transport: 40, cars: 65, childcare: 75, schoolPublic: 15, schoolPrivate: 60, higherEd: 40, healthcare: 28, note: "Housing and childcare are the big family costs; transit is strong." },
  { code: "CHE", city: "Switzerland average", affordScore: 38, housing: 90, groceries: 88, utilities: 70, energy: 55, gasFuel: 72, transport: 50, cars: 72, childcare: 85, schoolPublic: 18, schoolPrivate: 80, higherEd: 45, healthcare: 55, note: "Very high prices overall; wages are also high." },
  { code: "CAN", city: "Canada average", affordScore: 46, housing: 82, groceries: 72, utilities: 65, energy: 55, gasFuel: 60, transport: 58, cars: 65, childcare: 78, schoolPublic: 20, schoolPrivate: 80, higherEd: 70, healthcare: 30, note: "Housing in big cities is the main pressure." },
  { code: "ITA", city: "Italy average", affordScore: 50, housing: 68, groceries: 70, utilities: 60, energy: 65, gasFuel: 74, transport: 45, cars: 62, childcare: 55, schoolPublic: 15, schoolPrivate: 65, higherEd: 30, healthcare: 30, note: "Public services help; fuel and city rent vary by region." },
  { code: "ESP", city: "Spain average", affordScore: 52, housing: 65, groceries: 62, utilities: 58, energy: 62, gasFuel: 70, transport: 42, cars: 60, childcare: 52, schoolPublic: 15, schoolPrivate: 65, higherEd: 32, healthcare: 28, note: "Coastal and capital cities cost more than smaller towns." },
];

/**
 * Region templates — used to build affordability for ANY country
 * (so Sweden never shows Germany, etc.)
 */
const AFFORD_REGION_TEMPLATES = {
  Europe: {
    affordScore: 52,
    housing: 66,
    groceries: 64,
    utilities: 58,
    energy: 60,
    gasFuel: 68,
    transport: 42,
    cars: 58,
    childcare: 48,
    schoolPublic: 16,
    schoolPrivate: 58,
    higherEd: 32,
    healthcare: 30,
  },
  "N. America": {
    affordScore: 48,
    housing: 78,
    groceries: 70,
    utilities: 62,
    energy: 55,
    gasFuel: 55,
    transport: 62,
    cars: 68,
    childcare: 80,
    schoolPublic: 28,
    schoolPrivate: 82,
    higherEd: 78,
    healthcare: 70,
  },
  LatAm: {
    affordScore: 58,
    housing: 52,
    groceries: 52,
    utilities: 50,
    energy: 52,
    gasFuel: 58,
    transport: 42,
    cars: 60,
    childcare: 50,
    schoolPublic: 26,
    schoolPrivate: 68,
    higherEd: 48,
    healthcare: 52,
  },
  Caribbean: {
    affordScore: 54,
    housing: 58,
    groceries: 62,
    utilities: 58,
    energy: 60,
    gasFuel: 62,
    transport: 48,
    cars: 62,
    childcare: 52,
    schoolPublic: 28,
    schoolPrivate: 70,
    higherEd: 50,
    healthcare: 52,
  },
  Asia: {
    affordScore: 56,
    housing: 58,
    groceries: 50,
    utilities: 48,
    energy: 50,
    gasFuel: 55,
    transport: 38,
    cars: 55,
    childcare: 52,
    schoolPublic: 26,
    schoolPrivate: 68,
    higherEd: 48,
    healthcare: 48,
  },
  MENA: {
    affordScore: 52,
    housing: 60,
    groceries: 58,
    utilities: 50,
    energy: 45,
    gasFuel: 40,
    transport: 42,
    cars: 60,
    childcare: 55,
    schoolPublic: 25,
    schoolPrivate: 72,
    higherEd: 48,
    healthcare: 48,
  },
  Africa: {
    affordScore: 58,
    housing: 48,
    groceries: 52,
    utilities: 55,
    energy: 58,
    gasFuel: 58,
    transport: 45,
    cars: 60,
    childcare: 48,
    schoolPublic: 28,
    schoolPrivate: 62,
    higherEd: 45,
    healthcare: 55,
  },
  Oceania: {
    affordScore: 48,
    housing: 78,
    groceries: 72,
    utilities: 65,
    energy: 62,
    gasFuel: 68,
    transport: 55,
    cars: 65,
    childcare: 72,
    schoolPublic: 24,
    schoolPrivate: 80,
    higherEd: 65,
    healthcare: 42,
  },
  Eurasia: {
    affordScore: 54,
    housing: 55,
    groceries: 52,
    utilities: 48,
    energy: 48,
    gasFuel: 52,
    transport: 40,
    cars: 58,
    childcare: 48,
    schoolPublic: 22,
    schoolPrivate: 60,
    higherEd: 40,
    healthcare: 48,
  },
  World: {
    affordScore: 50,
    housing: 60,
    groceries: 58,
    utilities: 55,
    energy: 55,
    gasFuel: 58,
    transport: 48,
    cars: 60,
    childcare: 55,
    schoolPublic: 28,
    schoolPrivate: 65,
    higherEd: 50,
    healthcare: 50,
  },
};

/**
 * Always returns a profile for the selected country code (never another country).
 * Uses curated table when present; otherwise region + risk model for that country.
 */
function getAffordProfile(code) {
  if (!code || code === "GLOBAL") return null;
  const curated = (typeof AFFORDABILITY !== "undefined" ? AFFORDABILITY : []).find((a) => a.code === code);
  if (curated) return { ...curated, source: "curated" };

  const c =
    typeof COUNTRIES !== "undefined" ? COUNTRIES.find((x) => x.code === code) : null;
  if (!c) return null;

  const tpl = AFFORD_REGION_TEMPLATES[c.region] || AFFORD_REGION_TEMPLATES.World;
  const risk = typeof c.risk === "number" ? c.risk : 40;
  // Higher instability → daily goods/services feel harder (illustrative)
  const stress = (risk - 40) * 0.22;
  const clamp = (n) => Math.max(8, Math.min(96, Math.round(n)));
  const bump = (v, factor = 1) => clamp(v + stress * factor);

  return {
    code: c.code,
    city: c.name + " (capital area model)",
    affordScore: clamp((tpl.affordScore || 50) - stress * 0.8),
    housing: bump(tpl.housing, 0.6),
    groceries: bump(tpl.groceries, 0.9),
    utilities: bump(tpl.utilities, 0.7),
    energy: bump(tpl.energy, 0.8),
    gasFuel: bump(tpl.gasFuel, 0.7),
    transport: bump(tpl.transport, 0.5),
    cars: bump(tpl.cars, 0.6),
    childcare: bump(tpl.childcare, 0.5),
    schoolPublic: bump(tpl.schoolPublic, 0.3),
    schoolPrivate: bump(tpl.schoolPrivate, 0.5),
    higherEd: bump(tpl.higherEd, 0.4),
    healthcare: bump(tpl.healthcare, 0.7),
    note:
      "Illustrative cost model for " +
      c.name +
      " (" +
      (c.region || "world") +
      "), scaled with country risk. Not an official price list — use for comparison.",
    source: "region-model",
  };
}

/** COUNTRIES: loaded from js/countries.js (worldwide capitals) */

/** Markets you can follow — money, food, energy, metals, chips, data centers */
const INSTRUMENTS = [
  { sym: "BRENT", name: "Brent oil (world oil price)", cls: "energy", unit: "USD/bbl", seed: 84.6 },
  { sym: "WTI", name: "WTI oil (US oil price)", cls: "energy", unit: "USD/bbl", seed: 80.1 },
  { sym: "NATGAS", name: "Natural gas (power & heat)", cls: "energy", unit: "USD/MMBtu", seed: 2.91 },
  { sym: "GOLD", name: "Gold", cls: "metals", unit: "USD/oz", seed: 2418 },
  { sym: "SILVER", name: "Silver", cls: "metals", unit: "USD/oz", seed: 28.4 },
  { sym: "COPPER", name: "Copper (wires, data centers, building)", cls: "metals", unit: "USD/lb", seed: 4.52 },
  { sym: "PLAT", name: "Platinum", cls: "metals", unit: "USD/oz", seed: 980 },
  { sym: "ALUM", name: "Aluminum (cans, cars, power lines)", cls: "metals", unit: "USD/t", seed: 2380 },
  { sym: "WHEAT", name: "Wheat (bread & grain)", cls: "ag", unit: "USc/bu", seed: 568 },
  { sym: "CORN", name: "Corn", cls: "ag", unit: "USc/bu", seed: 432 },
  { sym: "SOY", name: "Soybeans", cls: "ag", unit: "USc/bu", seed: 1185 },
  { sym: "COCOA", name: "Cocoa (chocolate)", cls: "ag", unit: "USD/t", seed: 8200 },
  { sym: "COFFEE", name: "Coffee", cls: "ag", unit: "USc/lb", seed: 248 },
  { sym: "SUGAR", name: "Sugar", cls: "ag", unit: "USc/lb", seed: 21.4 },
  { sym: "RICE", name: "Rice", cls: "ag", unit: "USD/cwt", seed: 17.8 },
  { sym: "PALM", name: "Palm oil", cls: "ag", unit: "MYR/t", seed: 4120 },
  { sym: "DXY", name: "US dollar strength", cls: "fx", unit: "idx", seed: 104.8 },
  { sym: "EURUSD", name: "Euro vs US dollar", cls: "fx", unit: "fx", seed: 1.084 },
  { sym: "USDJPY", name: "US dollar vs yen", cls: "fx", unit: "fx", seed: 156.2 },
  { sym: "US10Y", name: "US 10-year interest rate", cls: "rates", unit: "%", seed: 4.28 },
  { sym: "VIX", name: "Fear gauge (market stress)", cls: "vol", unit: "idx", seed: 18.4 },
  { sym: "SPX", name: "S&P 500 (big US companies)", cls: "equity", unit: "idx", seed: 5512 },
  { sym: "NDX", name: "Nasdaq Composite", cls: "equity", unit: "idx", seed: 17800 },
  { sym: "DJI", name: "Dow Jones", cls: "equity", unit: "idx", seed: 39800 },
  { sym: "BTC", name: "Bitcoin", cls: "crypto", unit: "USD", seed: 67240 },
  { sym: "ETH", name: "Ethereum", cls: "crypto", unit: "USD", seed: 3420 },
  { sym: "GBPUSD", name: "Pound vs US dollar", cls: "fx", unit: "fx", seed: 1.27 },
  { sym: "USDCNY", name: "US dollar vs yuan", cls: "fx", unit: "fx", seed: 7.24 },
  { sym: "SOXX", name: "Semiconductor index (chips)", cls: "semi", unit: "idx", seed: 245 },
  { sym: "SMH", name: "VanEck Semiconductor ETF", cls: "semi", unit: "USD", seed: 240 },
  { sym: "NVDA", name: "NVIDIA (AI chips)", cls: "semi", unit: "USD", seed: 120 },
  { sym: "TSM", name: "TSMC (world chip factory)", cls: "semi", unit: "USD", seed: 185 },
  { sym: "ASML", name: "ASML (chip-making machines)", cls: "semi", unit: "USD", seed: 780 },
  { sym: "AMD", name: "AMD (processors)", cls: "semi", unit: "USD", seed: 155 },
  { sym: "AVGO", name: "Broadcom (chips & networking)", cls: "semi", unit: "USD", seed: 170 },
  { sym: "INTC", name: "Intel", cls: "semi", unit: "USD", seed: 32 },
  { sym: "EQIX", name: "Equinix (data centers)", cls: "datacenter", unit: "USD", seed: 820 },
  { sym: "DLR", name: "Digital Realty (data centers)", cls: "datacenter", unit: "USD", seed: 155 },
  { sym: "MSFT", name: "Microsoft (cloud / AI)", cls: "datacenter", unit: "USD", seed: 430 },
  { sym: "GOOGL", name: "Alphabet (cloud / AI)", cls: "datacenter", unit: "USD", seed: 175 },
  { sym: "SHIP", name: "Shipping cost proxy", cls: "transport", unit: "idx", seed: 1842 },
  { sym: "BDI", name: "Freight stress proxy", cls: "transport", unit: "idx", seed: 1620 },
  { sym: "WARINS", name: "War insurance cost proxy", cls: "insurance", unit: "bps", seed: 42 },
  { sym: "CAT", name: "Storm insurance proxy", cls: "insurance", unit: "idx", seed: 118 },
  { sym: "FOODX", name: "Food price basket", cls: "ag", unit: "idx", seed: 128.4 },
];

const LAYERS = [
  { id: "conflicts", name: "Conflicts / War", color: "#ff5252", count: 47, on: true, domain: "war" },
  { id: "tensions", name: "Tensions", color: "#ff8a65", count: 18, on: true, domain: "war" },
  { id: "bases", name: "Military Bases", color: "#4a9eff", count: 214, on: true, domain: "geo" },
  { id: "hotspots", name: "Hotspots", color: "#b388ff", count: 29, on: true, domain: "war" },
  { id: "nuclear", name: "Nuclear", color: "#ffd60a", count: 38, on: true, domain: "war" },
  { id: "sanctions", name: "Sanctions", color: "#ff6b1a", count: 16, on: true, domain: "macro" },
  { id: "weather", name: "Weather / Storms", color: "#00d4ff", count: 12, on: true, domain: "weather" },
  { id: "disasters", name: "Disasters (live)", color: "#80cbc4", count: 0, on: true, domain: "weather" },
  { id: "economic", name: "Economic", color: "#00c853", count: 22, on: true, domain: "macro" },
  { id: "waterways", name: "Waterways / AIS", color: "#64b5f6", count: 13, on: true, domain: "transport" },
  { id: "transport", name: "Transport / Traffic", color: "#90caf9", count: 15, on: true, domain: "transport" },
  { id: "outages", name: "Power Outages", color: "#ff9800", count: 9, on: true, domain: "infra" },
  { id: "military", name: "Military Movement", color: "#e040fb", count: 31, on: true, domain: "war" },
  { id: "natural", name: "Natural Hazards", color: "#8bc34a", count: 14, on: true, domain: "weather" },
  { id: "agriculture", name: "Agriculture / Food", color: "#aed581", count: 11, on: true, domain: "food" },
  { id: "insurance", name: "Insurance / CAT", color: "#ce93d8", count: 8, on: true, domain: "insurance" },
  { id: "tech", name: "Chips / Tech hubs", color: "#64ffda", count: 12, on: true, domain: "tech" },
  { id: "datacenter", name: "Data centers", color: "#18ffff", count: 8, on: true, domain: "tech" },
  { id: "metals", name: "Metals hubs", color: "#ffd740", count: 6, on: true, domain: "metals" },
];

const THEATERS = [
  { id: "taiwan", name: "Taiwan Strait", posture: "elevated", note: "ADIZ / naval density · great-power risk", countries: ["TWN", "CHN", "USA", "JPN"] },
  { id: "gulf", name: "Persian Gulf", posture: "watch", note: "Hormuz transit · energy insurance", countries: ["IRN", "SAU", "USA"] },
  { id: "baltic", name: "Baltic / NATO Flank", posture: "elevated", note: "GNSS jamming · hybrid activity", countries: ["EST", "POL", "DEU", "RUS"] },
  { id: "korea", name: "Korean Peninsula", posture: "watch", note: "Deterrence posture", countries: ["KOR", "PRK", "USA", "JPN"] },
  { id: "blacksea", name: "Black Sea", posture: "critical", note: "Active combat · grain corridor", countries: ["UKR", "RUS", "TUR"] },
  { id: "scs", name: "South China Sea", posture: "elevated", note: "Militia vessels · trade lanes", countries: ["CHN", "PHL", "VNM"] },
  { id: "sahel", name: "Sahel Belt", posture: "critical", note: "JNIM expansion · state fragility", countries: ["NGA"] },
  { id: "redsea", name: "Red Sea / Bab el-M.", posture: "elevated", note: "Shipping diversions · war-risk", countries: ["YEM", "EGY", "SAU"] },
  { id: "arctic", name: "Arctic Approaches", posture: "stable", note: "Dual-use infra buildout", countries: ["RUS", "USA"] },
  { id: "levant", name: "Levant Corridor", posture: "elevated", note: "Multi-actor kinetic risk", countries: ["ISR", "LBN", "SYR"] },
];

const CII = [
  { code: "UKR", name: "Ukraine", score: 92, color: "#ff3b30" },
  { code: "SDN", name: "Sudan", score: 88, color: "#ff3b30" },
  { code: "YEM", name: "Yemen", score: 84, color: "#ff3b30" },
  { code: "MMR", name: "Myanmar", score: 81, color: "#ff6b1a" },
  { code: "SYR", name: "Syria", score: 80, color: "#ff6b1a" },
  { code: "LBN", name: "Lebanon", score: 76, color: "#ff6b1a" },
  { code: "ISR", name: "Israel", score: 72, color: "#ff6b1a" },
  { code: "PRK", name: "N. Korea", score: 70, color: "#f5a623" },
  { code: "IRN", name: "Iran", score: 68, color: "#f5a623" },
  { code: "HTI", name: "Haiti", score: 71, color: "#f5a623" },
  { code: "RUS", name: "Russia", score: 58, color: "#f5a623" },
  { code: "TWN", name: "Taiwan", score: 55, color: "#f5a623" },
];

const ALERTS = [
  { id: "a1", sev: "crit", title: "Mass casualty event — Kharkiv oblast", sub: "WAR · theater UKR", layer: "conflicts", lat: 50, lon: 36.2, countries: ["UKR"], domains: ["war"] },
  { id: "a2", sev: "crit", title: "Coastal grid failure — Lebanon", sub: "INFRA · LBN", layer: "outages", lat: 33.9, lon: 35.5, countries: ["LBN"], domains: ["war"] },
  { id: "a3", sev: "high", title: "Taiwan Strait escalation +18", sub: "TENSION · TWN/CHN", layer: "hotspots", lat: 24.5, lon: 119.5, countries: ["TWN", "CHN"], domains: ["war", "geo"] },
  { id: "a4", sev: "high", title: "Baltic GNSS jamming expanded", sub: "HYBRID · EST/POL", layer: "military", lat: 56, lon: 20, countries: ["EST", "POL"], domains: ["war", "transport"] },
  { id: "a5", sev: "high", title: "Red Sea war-risk premiums sticky", sub: "INSURANCE · shipping", layer: "insurance", lat: 15, lon: 42, countries: ["YEM"], domains: ["insurance", "transport"] },
  { id: "a6", sev: "med", title: "Cocoa supply stress — West Africa rains", sub: "AG · CIV/GHA", layer: "agriculture", lat: 7, lon: -5, countries: ["CIV", "GHA"], domains: ["food", "weather"] },
  { id: "a7", sev: "med", title: "Black Sea grain corridor risk", sub: "FOOD · UKR", layer: "agriculture", lat: 46, lon: 32, countries: ["UKR"], domains: ["food", "war"] },
  { id: "a8", sev: "high", title: "Hormuz energy insurance watch", sub: "ENERGY · IRN/SAU", layer: "waterways", lat: 26.5, lon: 56.5, countries: ["IRN", "SAU"], domains: ["energy", "transport"] },
];

const HOTSPOTS = [
  { id: "h1", name: "Eastern Ukraine Front", score: 94, delta: 4, lat: 48.5, lon: 37.5, countries: ["UKR"] },
  { id: "h2", name: "Sudan — Khartoum/Darfur", score: 91, delta: 7, lat: 15.5, lon: 32.5, countries: ["SDN"] },
  { id: "h3", name: "Taiwan Strait", score: 78, delta: 18, lat: 24.5, lon: 119.5, countries: ["TWN", "CHN"] },
  { id: "h4", name: "Red Sea Shipping Lane", score: 72, delta: -3, lat: 15, lon: 42, countries: ["YEM"] },
  { id: "h5", name: "Sahel — Burkina/Mali", score: 70, delta: 5, lat: 13, lon: -1.5, countries: ["NGA"] },
  { id: "h6", name: "Gaza / S. Lebanon", score: 68, delta: -2, lat: 33.2, lon: 35.4, countries: ["ISR", "LBN"] },
  { id: "h7", name: "Myanmar Civil Conflict", score: 66, delta: 1, lat: 21, lon: 96, countries: [] },
  { id: "h8", name: "Baltic Hybrid Zone", score: 55, delta: 9, lat: 56, lon: 20, countries: ["EST", "POL"] },
  { id: "h9", name: "Hormuz Energy Node", score: 52, delta: 2, lat: 26.5, lon: 56.5, countries: ["IRN", "SAU"] },
  { id: "h10", name: "W. Africa Cocoa Belt", score: 48, delta: 6, lat: 7, lon: -5, countries: ["CIV", "GHA"] },
];

const MARKETS_SEED = INSTRUMENTS.map((i) => ({
  sym: i.sym,
  name: i.name,
  cls: i.cls,
  val: String(i.seed),
  chg: "0.00%",
  dir: "flat",
  source: "seed",
  unit: i.unit,
}));

const INFRA = [
  { icon: "⚡", name: "Power grid stress / outages", stat: "9 ACTIVE", level: "warn" },
  { icon: "🖥", name: "Data-center power demand", stat: "HIGH", level: "warn" },
  { icon: "🛢", name: "Hormuz oil route", stat: "NORMAL", level: "ok" },
  { icon: "🚢", name: "Bab el-Mandeb shipping", stat: "REDUCED", level: "warn" },
  { icon: "📡", name: "GPS / navigation jamming", stat: "7 ZONES", level: "crit" },
  { icon: "🔌", name: "Undersea internet cables", stat: "2 WATCH", level: "warn" },
  { icon: "✈️", name: "Air traffic risk zones", stat: "4 NOTAM", level: "warn" },
  { icon: "🚛", name: "Road corridor stress", stat: "ELEVATED", level: "warn" },
  { icon: "🏛", name: "War-risk insurance", stat: "STICKY", level: "crit" },
  { icon: "🔬", name: "Chip supply chain", stat: "WATCH", level: "warn" },
];

const TRANSPORT_NODES = [
  { id: "t1", name: "Strait of Hormuz", type: "chokepoint", status: "watch", lat: 26.5, lon: 56.5, note: "Energy critical · ~20% seaborne oil" },
  { id: "t2", name: "Bab el-Mandeb", type: "chokepoint", status: "elevated", lat: 12.5, lon: 43.3, note: "Traffic reduced · war-risk premiums" },
  { id: "t3", name: "Suez Canal", type: "canal", status: "watch", lat: 30, lon: 32.5, note: "Weather + Red Sea spillover" },
  { id: "t4", name: "Malacca / Singapore", type: "strait", status: "normal", lat: 1.2, lon: 103.8, note: "High density · dark fleet watch" },
  { id: "t5", name: "Panama Canal", type: "canal", status: "watch", lat: 9.1, lon: -79.7, note: "Draft / water constraints seasonal" },
  { id: "t6", name: "Bosporus", type: "strait", status: "elevated", lat: 41.1, lon: 29.1, note: "Black Sea war adjacency" },
  { id: "t7", name: "Cape of Good Hope route", type: "reroute", status: "elevated", lat: -34.3, lon: 18.4, note: "Red Sea diversion node" },
  { id: "t8", name: "Taiwan Strait shipping", type: "corridor", status: "elevated", lat: 24.5, lon: 119.5, note: "Great-power contingency" },
];

const AG_REGIONS = [
  { id: "ag1", name: "Black Sea grain export", crop: "WHEAT", stress: 78, lat: 46, lon: 32, note: "War + logistics" },
  { id: "ag2", name: "US Midwest belt", crop: "CORN/SOY", stress: 32, lat: 41, lon: -93, note: "Weather watch" },
  { id: "ag3", name: "W. Africa cocoa", crop: "COCOA", stress: 72, lat: 7, lon: -5, note: "Rain / disease / supply" },
  { id: "ag4", name: "Brazil soy/coffee", crop: "SOY/COFFEE", stress: 40, lat: -15, lon: -50, note: "FX + climate" },
  { id: "ag5", name: "SE Asia rice/palm", crop: "RICE/PALM", stress: 45, lat: 2, lon: 110, note: "Trade policy sensitive" },
  { id: "ag6", name: "India wheat/rice", crop: "WHEAT/RICE", stress: 38, lat: 23, lon: 78, note: "Monsoon dependent" },
];

const INSURANCE_SIGNALS = [
  { id: "ins1", name: "Red Sea war-risk rates", level: "high", change: "+12%", note: "Sticky premiums on commercial hull" },
  { id: "ins2", name: "Black Sea marine", level: "crit", change: "+28%", note: "Limited capacity · high deductibles" },
  { id: "ins3", name: "Gulf energy platforms", level: "watch", change: "+4%", note: "Political violence add-ons" },
  { id: "ins4", name: "Atlantic CAT season proxy", level: "elevated", change: "+9%", note: "Storm frequency pricing" },
  { id: "ins5", name: "Cyber / hybrid (Baltic)", level: "elevated", change: "+7%", note: "GNSS / infrastructure riders" },
  { id: "ins6", name: "Crop multi-peril (ag)", level: "watch", change: "+3%", note: "Cocoa/wheat weather loading" },
];

const MARKERS = [
  { id: "c1", layer: "conflicts", sev: "critical", lat: 48.5, lon: 37.5, title: "Donetsk axis combat", desc: "Sustained artillery/drone. Critical kinetic tempo.", source: "OSINT mock", time: "12m", countries: ["UKR"] },
  { id: "c2", layer: "conflicts", sev: "critical", lat: 15.5, lon: 32.5, title: "Khartoum urban warfare", desc: "Multi-faction fighting. IDP surge.", source: "mock", time: "41m", countries: ["SDN"] },
  { id: "c3", layer: "conflicts", sev: "high", lat: 33.4, lon: 36.3, title: "Golan/Syria exchanges", desc: "Air defense elevated.", source: "mock", time: "2h", countries: ["SYR", "ISR"] },
  { id: "c6", layer: "conflicts", sev: "high", lat: 31.5, lon: 34.5, title: "Gaza perimeter ops", desc: "Ongoing kinetic activity.", source: "mock", time: "1h", countries: ["ISR"] },
  { id: "tn1", layer: "tensions", sev: "elevated", lat: 24.5, lon: 119.5, title: "Taiwan Strait tension", desc: "Air/naval signaling elevated.", source: "model", time: "live", countries: ["TWN", "CHN"] },
  { id: "tn2", layer: "tensions", sev: "elevated", lat: 38, lon: 127, title: "Peninsula deterrence", desc: "Watch posture.", source: "model", time: "live", countries: ["KOR", "PRK"] },
  { id: "tn3", layer: "tensions", sev: "high", lat: 56, lon: 24, title: "NATO-Russia hybrid", desc: "GNSS + undersea sensitivity.", source: "model", time: "live", countries: ["EST", "RUS"] },
  { id: "b1", layer: "bases", sev: "info", lat: 33.9, lon: 130.9, title: "USFJ / JSDF Kyushu", desc: "Pacific contingency basing.", source: "open", time: "static", countries: ["JPN"] },
  { id: "b2", layer: "bases", sev: "info", lat: 25.3, lon: 51.5, title: "CENTCOM Qatar", desc: "Regional C2 / air hub.", source: "open", time: "static", countries: ["SAU"] },
  { id: "b3", layer: "bases", sev: "info", lat: 52.4, lon: 13.5, title: "NATO Germany logistics", desc: "Eastern flank support.", source: "open", time: "static", countries: ["DEU"] },
  { id: "b4", layer: "bases", sev: "info", lat: 13.6, lon: 144.8, title: "Guam strategic", desc: "Bomber/SSN support.", source: "open", time: "static", countries: ["USA"] },
  { id: "hs1", layer: "hotspots", sev: "critical", lat: 24.5, lon: 119.5, title: "Hotspot Taiwan Strait", desc: "Multi-domain convergence.", source: "model", time: "live", countries: ["TWN"] },
  { id: "hs2", layer: "hotspots", sev: "high", lat: 15, lon: 42, title: "Hotspot Red Sea", desc: "Shipping + insurance risk.", source: "model", time: "live", countries: ["YEM"] },
  { id: "n1", layer: "nuclear", sev: "watch", lat: 32, lon: 48, title: "Iran nuclear complex", desc: "OSINT monitoring.", source: "IAEA-style", time: "6h", countries: ["IRN"] },
  { id: "n3", layer: "nuclear", sev: "info", lat: 51.4, lon: 30.1, title: "Zaporizhzhia NPP", desc: "Strategic flashpoint.", source: "IAEA-style", time: "8h", countries: ["UKR"] },
  { id: "s1", layer: "sanctions", sev: "elevated", lat: 55.75, lon: 37.6, title: "Russia sanctions regime", desc: "Shadow fleet enforcement.", source: "policy", time: "policy", countries: ["RUS"] },
  { id: "s3", layer: "sanctions", sev: "high", lat: 35.7, lon: 51.4, title: "Iran sanctions", desc: "Secondary sanctions risk.", source: "policy", time: "policy", countries: ["IRN"] },
  { id: "w1", layer: "weather", sev: "high", lat: 18, lon: 135, title: "NW Pacific tropical", desc: "Shipping impact 48–72h.", source: "weather model", time: "1h", countries: ["PHL", "JPN"] },
  { id: "w2", layer: "weather", sev: "elevated", lat: 25, lon: -90, title: "Gulf of Mexico convective", desc: "Energy downtime risk.", source: "weather", time: "3h", countries: ["USA"] },
  { id: "e1", layer: "economic", sev: "elevated", lat: 31.2, lon: 121.5, title: "China export hub", desc: "Freight / PMI soft patch.", source: "macro", time: "market", countries: ["CHN"] },
  { id: "e3", layer: "economic", sev: "info", lat: 40.7, lon: -74, title: "US liquidity node", desc: "Rates / dollar funding.", source: "markets", time: "live", countries: ["USA"] },
  { id: "ww1", layer: "waterways", sev: "high", lat: 12.5, lon: 43.3, title: "Bab el-Mandeb", desc: "Transit below baseline.", source: "AIS mock", time: "live", countries: ["YEM"] },
  { id: "ww4", layer: "waterways", sev: "elevated", lat: 26.5, lon: 56.5, title: "Hormuz", desc: "Energy chokepoint.", source: "AIS mock", time: "live", countries: ["IRN"] },
  { id: "tr1", layer: "transport", sev: "elevated", lat: -34.3, lon: 18.4, title: "Cape diversion node", desc: "Red Sea re-routing load.", source: "transport", time: "live", countries: ["ZAF"] },
  { id: "tr2", layer: "transport", sev: "watch", lat: 9.1, lon: -79.7, title: "Panama Canal", desc: "Draft constraints.", source: "transport", time: "live", countries: ["USA"] },
  { id: "o1", layer: "outages", sev: "critical", lat: 33.9, lon: 35.5, title: "Lebanon grid failure", desc: "Coastal corridor outage.", source: "mock", time: "31m", countries: ["LBN"] },
  { id: "m1", layer: "military", sev: "high", lat: 24, lon: 118, title: "PLA naval SAG", desc: "East of median line.", source: "mock", time: "55m", countries: ["CHN", "TWN"] },
  { id: "m2", layer: "military", sev: "elevated", lat: 56, lon: 20, title: "Baltic EW cell", desc: "GNSS interference.", source: "mock", time: "1h", countries: ["EST"] },
  { id: "ag1", layer: "agriculture", sev: "high", lat: 46, lon: 32, title: "Black Sea grain risk", desc: "Export corridor stress.", source: "ag model", time: "live", countries: ["UKR"] },
  { id: "ag2", layer: "agriculture", sev: "elevated", lat: 7, lon: -5, title: "Cocoa belt stress", desc: "Supply + weather.", source: "ag model", time: "live", countries: ["CIV", "GHA"] },
  { id: "ins1", layer: "insurance", sev: "high", lat: 15, lon: 42, title: "War-risk pricing node", desc: "Marine premiums elevated.", source: "insurance proxy", time: "live", countries: ["YEM"] },
  { id: "na1", layer: "natural", sev: "high", lat: 45, lon: 150, title: "Kuril seismicity", desc: "May merge with live USGS.", source: "USGS-style", time: "3h", countries: ["JPN", "RUS"] },
  { id: "chip1", layer: "tech", sev: "elevated", lat: 24.8, lon: 121.0, title: "Taiwan chip cluster", desc: "World-leading semiconductor manufacturing hub.", source: "open", time: "live", countries: ["TWN"] },
  { id: "chip2", layer: "tech", sev: "info", lat: 37.4, lon: -122.0, title: "Silicon Valley / AI design", desc: "Chip design and AI software center.", source: "open", time: "static", countries: ["USA"] },
  { id: "chip3", layer: "tech", sev: "info", lat: 52.4, lon: 4.9, title: "ASML / EU lithography", desc: "Critical chip-making equipment region.", source: "open", time: "static", countries: ["DEU"] },
  { id: "chip4", layer: "tech", sev: "watch", lat: 37.3, lon: 127.0, title: "Korea memory corridor", desc: "Memory chip manufacturing.", source: "open", time: "live", countries: ["KOR"] },
  { id: "dc1", layer: "datacenter", sev: "elevated", lat: 39.0, lon: -77.5, title: "N. Virginia data centers", desc: "Large cloud / AI data-center region — power hungry.", source: "open", time: "live", countries: ["USA"] },
  { id: "dc2", layer: "datacenter", sev: "watch", lat: 53.3, lon: -6.3, title: "Dublin data-center belt", desc: "European cloud capacity; grid watch.", source: "open", time: "live", countries: ["GBR"] },
  { id: "dc3", layer: "datacenter", sev: "info", lat: 1.3, lon: 103.8, title: "Singapore digital hub", desc: "Regional cloud and connectivity hub.", source: "open", time: "static", countries: ["IDN"] },
  { id: "met1", layer: "metals", sev: "info", lat: -22.0, lon: -68.0, title: "Chile copper belt", desc: "Major copper supply for wires and electronics.", source: "open", time: "live", countries: ["BRA"] },
  { id: "met2", layer: "metals", sev: "watch", lat: -26.2, lon: 28.0, title: "S. Africa PGM / metals", desc: "Platinum-group and mining hub.", source: "open", time: "live", countries: ["ZAF"] },
];

const EVENTS = [
  { id: "ev1", layer: "conflicts", sev: "crit", title: "Kharkiv: mass casualty under verification", time: "14m", domains: ["war"] },
  { id: "ev2", layer: "hotspots", sev: "high", title: "Taiwan Strait model +18", time: "52m", domains: ["war"] },
  { id: "ev3", layer: "insurance", sev: "high", title: "Red Sea war-risk premiums sticky", time: "1h", domains: ["insurance", "transport"] },
  { id: "ev4", layer: "agriculture", sev: "med", title: "Cocoa supply stress — W. Africa", time: "2h", domains: ["food"] },
  { id: "ev5", layer: "agriculture", sev: "high", title: "Black Sea grain corridor risk", time: "3h", domains: ["food", "war"] },
  { id: "ev6", layer: "weather", sev: "high", title: "NW Pacific tropical system", time: "1h", domains: ["weather"] },
  { id: "ev7", layer: "waterways", sev: "high", title: "Bab el-Mandeb transit reduced", time: "live", domains: ["transport"] },
  { id: "ev8", layer: "military", sev: "high", title: "Baltic GNSS jamming expanded", time: "1.2h", domains: ["war"] },
  { id: "ev9", layer: "economic", sev: "med", title: "Brent risk premium rebuild", time: "18m", domains: ["energy", "macro"] },
  { id: "ev10", layer: "sanctions", sev: "med", title: "Dual-use tech designation package", time: "2.4h", domains: ["macro", "war"] },
];

/**
 * Public / major wire & broadcast RSS — no Al Jazeera.
 * CORS proxies in feeds.js handle browser access.
 */
const NEWS_SOURCES = [
  { id: "bbc_world", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", on: true, tag: "BBC" },
  { id: "bbc_biz", name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", on: true, tag: "BBC-BIZ" },
  // CNN
  { id: "cnn_top", name: "CNN Top", url: "http://rss.cnn.com/rss/cnn_topstories.rss", on: true, tag: "CNN" },
  { id: "cnn_world", name: "CNN World", url: "http://rss.cnn.com/rss/edition_world.rss", on: true, tag: "CNN-W" },
  { id: "cnn_edition", name: "CNN International", url: "http://rss.cnn.com/rss/edition.rss", on: true, tag: "CNN-I" },
  // US networks
  { id: "abc_intl", name: "ABC News International", url: "https://abcnews.go.com/abcnews/internationalheadlines", on: true, tag: "ABC" },
  { id: "abc_top", name: "ABC News Top", url: "https://abcnews.go.com/abcnews/topstories", on: true, tag: "ABC-TOP" },
  { id: "cbs_main", name: "CBS News", url: "https://www.cbsnews.com/latest/rss/main", on: true, tag: "CBS" },
  { id: "cbs_world", name: "CBS World", url: "https://www.cbsnews.com/latest/rss/world", on: true, tag: "CBS-W" },
  { id: "newsnation", name: "NewsNation", url: "https://www.newsnationnow.com/feed/", on: true, tag: "NN" },
  { id: "cnbc", name: "CNBC Top News", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", on: true, tag: "CNBC" },
  { id: "cnbc_world", name: "CNBC World", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362", on: true, tag: "CNBC-W" },
  { id: "nyt_world", name: "NY Times World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", on: true, tag: "NYT" },
  { id: "nyt_biz", name: "NY Times Business", url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", on: true, tag: "NYT-BIZ" },
  { id: "wsj_world", name: "WSJ World", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml", on: true, tag: "WSJ" },
  { id: "wsj_markets", name: "WSJ Markets", url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", on: true, tag: "WSJ-MKT" },
  // Europe / international
  { id: "euronews", name: "Euronews", url: "https://www.euronews.com/rss", on: true, tag: "EN" },
  { id: "dw_top", name: "DW Top (English)", url: "https://rss.dw.com/xml/rss-en-top", on: true, tag: "DW" },
  { id: "dw_global", name: "DW Global (English)", url: "https://rss.dw.com/rdf/rss-en-all", on: true, tag: "DW-G" },
  { id: "france24_en", name: "France 24 English", url: "https://www.france24.com/en/rss", on: true, tag: "F24" },
  { id: "wapo_world", name: "Washington Post World", url: "https://feeds.washingtonpost.com/rss/world", on: true, tag: "WaPo" },
  { id: "wapo_national", name: "Washington Post National", url: "https://feeds.washingtonpost.com/rss/national", on: true, tag: "WaPo-N" },
  { id: "bloomberg_mkt", name: "Bloomberg Markets", url: "https://feeds.bloomberg.com/markets/news.rss", on: true, tag: "BBG" },
  { id: "bloomberg_pol", name: "Bloomberg Politics", url: "https://feeds.bloomberg.com/politics/news.rss", on: true, tag: "BBG-P" },
  { id: "bloomberg_tech", name: "Bloomberg Technology", url: "https://feeds.bloomberg.com/technology/news.rss", on: true, tag: "BBG-T" },
  { id: "foxnews", name: "Fox News", url: "https://moxie.foxnews.com/google-publisher/latest.xml", on: true, tag: "FOX" },
  { id: "foxbiz", name: "Fox Business", url: "https://moxie.foxbusiness.com/google-publisher/latest.xml", on: true, tag: "FOXBIZ" },
  { id: "nbc", name: "NBC News", url: "https://feeds.nbcnews.com/nbcnews/public/news", on: true, tag: "NBC" },
  { id: "npr", name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml", on: true, tag: "NPR" },
  { id: "defense", name: "Defense News", url: "https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml", on: true, tag: "DEF" },
  { id: "ap_top", name: "AP Top (Google News)", url: "https://news.google.com/rss/search?q=when:1d+source:Associated+Press&hl=en-US&gl=US&ceid=US:en", on: true, tag: "AP" },
  { id: "reuters_gnews", name: "Reuters (Google News)", url: "https://news.google.com/rss/search?q=when:1d+source:Reuters&hl=en-US&gl=US&ceid=US:en", on: true, tag: "REU" },
  { id: "usgs_news", name: "USGS News", url: "https://www.usgs.gov/news/news-releases/feed", on: true, tag: "USGS" },
  { id: "nasa", name: "NASA Breaking", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", on: true, tag: "NASA" },
  { id: "reliefweb", name: "ReliefWeb Headlines", url: "https://reliefweb.int/headlines/rss.xml", on: true, tag: "RW" },
];

/**
 * Risk model catalog — includes user flagship KMRI
 * KMRI = Kinetic-Macro Risk Index (user-developed multi-domain composite)
 */
const DEFAULT_INDICATORS = [
  {
    id: "kmri",
    name: "KMRI",
    label: "Kinetic-Macro Risk Index",
    desc: "Flagship model: kinetic tension + macro fear + food/energy stress + insurance/war-risk tone. Higher = broader multi-domain risk.",
    weights: { kinetic: 28, riskTone: 18, energy: 14, food: 12, insurance: 12, newsCrisis: 10, transport: 6 },
    model: true,
    flagship: true,
  },
  {
    id: "gsi",
    name: "GSI",
    label: "Geopolitical Stress Index",
    desc: "Hotspot heat + crisis news + risk-asset tone.",
    weights: { hotspots: 40, newsCrisis: 30, riskTone: 30 },
    model: true,
  },
  {
    id: "tsi",
    name: "TSI",
    label: "Tension Score Index",
    desc: "Theater posture + tensions layer + great-power keywords.",
    weights: { theaters: 45, kinetic: 35, newsCrisis: 20 },
    model: true,
  },
  {
    id: "wri",
    name: "WRI",
    label: "Weather Risk Index",
    desc: "Storms/disasters (live EONET/USGS) + weather news velocity.",
    weights: { weather: 50, quakes: 25, velocity: 15, newsCrisis: 10 },
    model: true,
  },
  {
    id: "fsi",
    name: "FSI",
    label: "Food Security Index",
    desc: "Wheat/cocoa/food basket pressure + ag region stress + Black Sea risk.",
    weights: { food: 55, weather: 20, kinetic: 15, transport: 10 },
    model: true,
  },
  {
    id: "eri",
    name: "ERI",
    label: "Energy Risk Index",
    desc: "Oil/gas moves + Gulf/Red Sea/Black Sea energy-adjacent stress.",
    weights: { energy: 50, chokepoints: 30, theaters: 20 },
    model: true,
  },
  {
    id: "tri",
    name: "TRI",
    label: "Transport Risk Index",
    desc: "Chokepoints, freight proxies, shipping news.",
    weights: { transport: 55, chokepoints: 25, insurance: 20 },
    model: true,
  },
  {
    id: "iri",
    name: "IRI",
    label: "Insurance Risk Proxy",
    desc: "War-risk + CAT proxies + marine corridor stress.",
    weights: { insurance: 50, transport: 20, weather: 15, kinetic: 15 },
    model: true,
  },
  {
    id: "cpr",
    name: "CPR",
    label: "Commodity Pressure Ratio",
    desc: "Softs + energy + metals simultaneous pressure.",
    weights: { food: 35, energy: 35, riskTone: 15, transport: 15 },
    model: true,
  },
  {
    id: "ror",
    name: "ROR",
    label: "Risk-On / Risk-Off",
    desc: "−100 risk-off … +100 risk-on from crypto/equity vs gold/fear.",
    weights: { riskOn: 50, safeHaven: 50 },
    bipolar: true,
    model: true,
  },
  {
    id: "nvi",
    name: "NVI",
    label: "News Velocity Index",
    desc: "Headline throughput scaled — spikes often lead tape moves.",
    weights: { velocity: 100 },
    model: true,
  },
  {
    id: "cci",
    name: "CCI",
    label: "Crisis Convergence",
    desc: "Co-firing of elevated theaters, critical alerts, strong quakes.",
    weights: { theaters: 35, alerts: 40, quakes: 25 },
    model: true,
  },
  {
    id: "spi",
    name: "SPI",
    label: "Stability Path Index",
    desc: "Constructive-stability model: lower kinetic + higher risk-on + cooler insurance = more room for positive paths. Higher SPI = more constructive headroom.",
    weights: { riskOn: 35, safeHaven: 15, kinetic: 25, insurance: 15, transport: 10 },
    model: true,
    constructive: true,
  },
  {
    id: "osi",
    name: "OSI",
    label: "Open-Source Intensity",
    desc: "Live public signal density: news velocity + crisis tone + disaster/quake heat.",
    weights: { velocity: 40, newsCrisis: 30, weather: 15, quakes: 15 },
    model: true,
  },
  {
    id: "iis",
    name: "IIS",
    label: "Infrastructure Integrity Stress",
    desc: "Overall power-grid, telecom, and outage stress. Higher = more fragile electricity and networks.",
    weights: { outageHeat: 40, powerStress: 25, telecomStress: 20, energy: 10, weather: 5 },
    model: true,
  },
];

const RISK_MODEL_HELP = [
  { id: "kmri", summary: "Main score for “how stressed is the world right now?”" },
  { id: "tsi", summary: "War and tension score." },
  { id: "fsi", summary: "Food and crop stress." },
  { id: "wri", summary: "Weather and disaster stress." },
  { id: "iis", summary: "Power grid, telecom, and outage stress." },
  { id: "eri", summary: "Oil and energy stress." },
  { id: "iri", summary: "Insurance stress (storms and war)." },
  { id: "tri", summary: "Shipping and transport stress." },
  { id: "cpr", summary: "When many commodity prices rise together." },
  { id: "spi", summary: "Room for things to get better (higher is better)." },
  { id: "osi", summary: "How loud the news feed is." },
];

const WIDGET_CATALOG = {
  map: { id: "map", title: "WORLD MAP", help: "3D globe. Switch Hybrid / Satellite / Streets. Click dots for details. Fly to a country from the top bar.", w: 8, h: 4, accent: "#00d4ff" },
  layers: { id: "layers", title: "MAP LAYERS", help: "Turn map layers on or off (war, weather, chips, metals…).", w: 4, h: 2 },
  alerts: { id: "alerts", title: "TOP ALERTS", help: "The most important warnings right now.", w: 4, h: 2 },
  hotspots: { id: "hotspots", title: "HOTSPOTS", help: "Places where risk is rising or falling.", w: 4, h: 2 },
  indicators: { id: "indicators", title: "RISK MODELS", help: "Risk scores (KMRI, SPI…). Click a card for a simple explanation.", w: 4, h: 3, accent: "#f5a623" },
  kmri: { id: "kmri", title: "KMRI FLAGSHIP", help: "Main world-stress score, with what drives it.", w: 4, h: 2, accent: "#f5a623" },
  markets: { id: "markets", title: "MONEY MARKETS", help: "Currencies, stocks, crypto — with live charts.", w: 6, h: 3 },
  commodities: { id: "commodities", title: "FOOD COMMODITIES", help: "Wheat, cocoa, corn and more — linked to grocery prices.", w: 6, h: 3 },
  energy: { id: "energy", title: "ENERGY", help: "Oil and gas prices with charts.", w: 6, h: 2 },
  metals: { id: "metals", title: "METALS", help: "Gold, silver, copper, platinum, aluminum — with charts.", w: 6, h: 3, accent: "#ffd740" },
  semiconductors: { id: "semiconductors", title: "SEMICONDUCTORS", help: "Chip makers and the chip index — Taiwan, AI, factories.", w: 6, h: 3, accent: "#64ffda" },
  datacenters: { id: "datacenters", title: "DATA CENTERS", help: "Cloud buildings that power AI and the internet — power and copper demand.", w: 6, h: 2, accent: "#18ffff" },
  news: { id: "news", title: "LIVE NEWS", help: "Headlines from trusted sources. Filters to the selected country and lens.", w: 6, h: 3, accent: "#00d4ff" },
  theaters: { id: "theaters", title: "WORLD THEATERS", help: "Big regions of military or political tension.", w: 4, h: 2 },
  cii: { id: "cii", title: "COUNTRY STRESS", help: "Simple country stress scores.", w: 4, h: 2 },
  country: { id: "country", title: "COUNTRY BRIEF", help: "Easy snapshot of the country you selected.", w: 4, h: 2 },
  instrument: { id: "instrument", title: "PRICE BRIEF", help: "Details for the price you clicked.", w: 4, h: 2 },
  infra: { id: "infra", title: "INFRASTRUCTURE", help: "Power grids, cables, GPS, roads — including outages.", w: 4, h: 2 },
  transport: { id: "transport", title: "SHIPPING ROUTES", help: "Key canals and sea chokepoints.", w: 4, h: 2 },
  weather: { id: "weather", title: "WORLD TEMPERATURES", help: "Live capital temperatures worldwide (Open-Meteo). Click a country to fly the map.", w: 6, h: 3 },
  disasters: { id: "disasters", title: "LIVE DISASTERS", help: "Earthquakes and open natural events (live).", w: 4, h: 2 },
  agriculture: { id: "agriculture", title: "FOOD REGIONS", help: "Crop regions that feed the world.", w: 4, h: 2 },
  insurance: { id: "insurance", title: "INSURANCE SIGNALS", help: "Storm and war insurance cost signals.", w: 4, h: 2 },
  quakes: { id: "quakes", title: "EARTHQUAKES", help: "Live earthquake list from USGS.", w: 4, h: 2 },
  feeds: { id: "feeds", title: "FEED HEALTH", help: "Are our live sources working? Green = good.", w: 4, h: 2 },
  scenarios: { id: "scenarios", title: "SCENARIOS", help: "Pick a story (food shock, chip crunch…) to focus the desk.", w: 4, h: 2 },
  politics: { id: "politics", title: "WORLD POLITICS", help: "Big political themes in plain language.", w: 4, h: 2 },
  answers: { id: "answers", title: "ANSWER DESK", help: "Simple Q&A for the selected country, lens, and scenario.", w: 6, h: 3, accent: "#00c853" },
  implications: { id: "implications", title: "POSITIVE PATHS", help: "Problem → better path → good outcome. Always constructive.", w: 6, h: 3, accent: "#00c853" },
  triad: { id: "triad", title: "WHAT YOU ARE WATCHING", help: "Country × lens × scenario in one place.", w: 4, h: 2, accent: "#b388ff" },
  pulse: { id: "pulse", title: "WORLD PULSE", help: "Quick numbers: risk scores, news, disasters.", w: 4, h: 2, accent: "#00d4ff" },
  radar: { id: "radar", title: "MODEL RADAR", help: "Spider chart of the risk models.", w: 4, h: 3, accent: "#f5a623" },
  lens: { id: "lens", title: "QUESTION LENS", help: "Which question should the terminal answer?", w: 4, h: 2 },
  mktboard: { id: "mktboard", title: "MARKET BOARD", help: "Big live board of prices. Changes with country and lens.", w: 12, h: 3, accent: "#2962ff" },
  mkthero: { id: "mkthero", title: "FOCUS CHART", help: "Large chart for the price you selected.", w: 8, h: 3, accent: "#2962ff" },
  currencies: { id: "currencies", title: "CURRENCIES", help: "Dollar, euro, yen and more.", w: 6, h: 3, accent: "#4a9eff" },
  grocery: { id: "grocery", title: "GROCERY TRIP SIGNAL", help: "Will food and fuel lean cheaper or more expensive? Simple household signal.", w: 6, h: 2, accent: "#00c853" },
  climate: { id: "climate", title: "CLIMATE · EL NIÑO", help: "El Niño and seasons — and how people adapt.", w: 6, h: 2, accent: "#00d4ff" },
  impact: { id: "impact", title: "IMPACT MONITOR", help: "Politics · money · daily life — easy words, still professional.", w: 6, h: 3, accent: "#00c853" },
  newsfocus: { id: "newsfocus", title: "FOCUSED NEWS", help: "Only headlines that match the selected country and lens.", w: 6, h: 3, accent: "#00d4ff" },
  techbrief: { id: "techbrief", title: "CHIPS & DATA CENTERS", help: "Plain-language brief: chips, cloud buildings, power, copper.", w: 6, h: 2, accent: "#64ffda" },
  afford: {
    id: "afford",
    title: "AFFORDABILITY · COST OF LIVING",
    help: "Housing, groceries, utilities, energy, gas, cars, transport, public vs private school, childcare, healthcare — easy to read.",
    w: 8,
    h: 3,
    accent: "#00c853",
  },
  affordRank: {
    id: "affordRank",
    title: "PLACES TO LIVE · RANKING",
    help: "Countries ranked by overall affordability (higher score = easier everyday life costs).",
    w: 4,
    h: 3,
    accent: "#69f0ae",
  },
  affordEdu: {
    id: "affordEdu",
    title: "EDUCATION & CHILDCARE",
    help: "Public school, private school, university, and childcare costs compared simply.",
    w: 6,
    h: 2,
    accent: "#ffd54f",
  },
  affordHome: {
    id: "affordHome",
    title: "HOME · UTILITIES · ENERGY",
    help: "Housing/rent, utilities, home energy — the big fixed costs of living.",
    w: 6,
    h: 2,
    accent: "#4fc3f7",
  },
  affordMove: {
    id: "affordMove",
    title: "GETTING AROUND",
    help: "Public transport, cars, and fuel/gas costs.",
    w: 6,
    h: 2,
    accent: "#ff8a65",
  },
  compare: {
    id: "compare",
    title: "COUNTRY COMPARE",
    help: "Compare 2–3 countries: risk, affordability, weather, food/energy pressure.",
    w: 12,
    h: 3,
    accent: "#b388ff",
  },
  inflation: {
    id: "inflation",
    title: "INFLATION · GROWTH",
    help: "Current inflation, recent history, projected inflation and real growth (illustrative model).",
    w: 8,
    h: 3,
    accent: "#ff6b1a",
  },
  affordRisk: {
    id: "affordRisk",
    title: "RISK · STABILITY",
    help: "Country risk and stability scores for living / moving decisions (illustrative).",
    w: 6,
    h: 3,
    accent: "#ff6b1a",
  },
  chipchain: {
    id: "chipchain",
    title: "CHIP SUPPLY CHAIN",
    help: "Design → machines → factories → packaging — plain language map of the semiconductor chain.",
    w: 6,
    h: 3,
    accent: "#64ffda",
  },
  climatefood: {
    id: "climatefood",
    title: "CLIMATE → FOOD",
    help: "How El Niño / seasons may affect food stress by country (easy language).",
    w: 6,
    h: 2,
    accent: "#00d4ff",
  },
  familyAfford: {
    id: "familyAfford",
    title: "FAMILY PROFILE",
    help: "Single / couple / family with kids — reweights housing, school, childcare, car.",
    w: 6,
    h: 2,
    accent: "#00c853",
  },
  moveTo: {
    id: "moveTo",
    title: "MOVE-TO RANKING",
    help: "Rank places by priority: cheap rent, public school, low fuel, stability, etc.",
    w: 6,
    h: 3,
    accent: "#69f0ae",
  },
  powerai: {
    id: "powerai",
    title: "POWER FOR AI",
    help: "Data centers need power and copper — live links to gas, copper, and cloud stocks.",
    w: 6,
    h: 2,
    accent: "#18ffff",
  },
  powerMix: {
    id: "powerMix",
    title: "POWER MIX",
    help: "Electricity sources: nuclear, coal, gas, hydro, wind, solar — share of generation (illustrative).",
    w: 6,
    h: 3,
    accent: "#ffd54f",
  },
  telecoms: {
    id: "telecoms",
    title: "TELECOMS · MOBILE · LANDLINE",
    help: "Mobile, landline, and internet infrastructure strength by country or region.",
    w: 6,
    h: 2,
    accent: "#4fc3f7",
  },
  outages: {
    id: "outages",
    title: "OUTAGES · WARNINGS",
    help: "Power outages, internet outages, telecom disruptions — down / up / warning status.",
    w: 6,
    h: 3,
    accent: "#ff9800",
  },
  critInfra: {
    id: "critInfra",
    title: "CRITICAL INFRA SCORE",
    help: "Overall power + telecom + outage integrity indicator (higher stress = more fragile grids & networks).",
    w: 4,
    h: 2,
    accent: "#ff6b1a",
  },
};

/** Power generation mix % by region template (illustrative, not official IEA tables) */
const POWER_MIX_TEMPLATES = {
  Europe: { nuclear: 22, coal: 14, gas: 18, hydro: 12, wind: 16, solar: 10, other: 8, note: "EU mix varies widely by country — Nordics more hydro; France more nuclear." },
  "N. America": { nuclear: 18, coal: 16, gas: 38, hydro: 7, wind: 10, solar: 6, other: 5, note: "Gas-heavy in many US regions; Canada more hydro." },
  LatAm: { nuclear: 2, coal: 6, gas: 22, hydro: 45, wind: 8, solar: 6, other: 11, note: "Hydro-dominant in several South American systems." },
  Caribbean: { nuclear: 0, coal: 5, gas: 35, hydro: 5, wind: 8, solar: 12, other: 35, note: "Often oil/diesel and gas islands — import-dependent." },
  Asia: { nuclear: 8, coal: 42, gas: 18, hydro: 12, wind: 6, solar: 8, other: 6, note: "Coal still large in parts of Asia; rapid solar/wind growth." },
  Oceania: { nuclear: 0, coal: 28, gas: 22, hydro: 12, wind: 14, solar: 16, other: 8, note: "Australia coal/gas + rising solar; NZ more hydro." },
  MENA: { nuclear: 2, coal: 4, gas: 55, hydro: 4, wind: 6, solar: 12, other: 17, note: "Gas and oil generation common; solar expanding fast." },
  Africa: { nuclear: 1, coal: 28, gas: 18, hydro: 22, wind: 4, solar: 6, other: 21, note: "Mix of coal, hydro, gas, and diesel; access gaps remain." },
  Eurasia: { nuclear: 12, coal: 18, gas: 42, hydro: 14, wind: 2, solar: 2, other: 10, note: "Gas and hydro important across Eurasia grids." },
  World: { nuclear: 10, coal: 30, gas: 24, hydro: 15, wind: 8, solar: 6, other: 7, note: "Global average-style mix for comparison only." },
};

/** Country-level power mix overrides (illustrative shares of generation) */
const POWER_MIX_BY_CODE = {
  FRA: { nuclear: 65, coal: 1, gas: 6, hydro: 11, wind: 8, solar: 4, other: 5, note: "France — nuclear-heavy grid." },
  DEU: { nuclear: 0, coal: 26, gas: 15, hydro: 4, wind: 27, solar: 12, other: 16, note: "Germany — strong wind/solar; coal still in mix." },
  SWE: { nuclear: 30, coal: 0, gas: 1, hydro: 40, wind: 20, solar: 2, other: 7, note: "Sweden — hydro + nuclear + wind." },
  NOR: { nuclear: 0, coal: 0, gas: 2, hydro: 88, wind: 6, solar: 0, other: 4, note: "Norway — almost all hydro." },
  USA: { nuclear: 18, coal: 16, gas: 40, hydro: 6, wind: 10, solar: 5, other: 5, note: "US average — gas is the largest slice." },
  CAN: { nuclear: 14, coal: 6, gas: 10, hydro: 58, wind: 6, solar: 1, other: 5, note: "Canada — hydro-dominant." },
  CHN: { nuclear: 5, coal: 55, gas: 4, hydro: 16, wind: 9, solar: 7, other: 4, note: "China — coal still large; renewables growing fast." },
  IND: { nuclear: 3, coal: 70, gas: 3, hydro: 9, wind: 5, solar: 6, other: 4, note: "India — coal-heavy with rising solar." },
  JPN: { nuclear: 8, coal: 28, gas: 32, hydro: 8, wind: 2, solar: 10, other: 12, note: "Japan — gas/coal with growing solar." },
  KOR: { nuclear: 28, coal: 30, gas: 28, hydro: 1, wind: 1, solar: 5, other: 7, note: "Korea — nuclear + coal + gas." },
  GBR: { nuclear: 14, coal: 2, gas: 32, hydro: 2, wind: 28, solar: 6, other: 16, note: "UK — wind and gas lead; coal almost gone." },
  BRA: { nuclear: 2, coal: 3, gas: 10, hydro: 60, wind: 12, solar: 5, other: 8, note: "Brazil — hydro and rising wind." },
  AUS: { nuclear: 0, coal: 45, gas: 18, hydro: 6, wind: 12, solar: 14, other: 5, note: "Australia — coal/gas with strong rooftop solar." },
  ZAF: { nuclear: 5, coal: 80, gas: 2, hydro: 2, wind: 4, solar: 3, other: 4, note: "South Africa — coal-dominant grid stress." },
  SAU: { nuclear: 0, coal: 0, gas: 55, hydro: 0, wind: 2, solar: 5, other: 38, note: "Saudi — oil/gas generation; solar ramping." },
  ARE: { nuclear: 20, coal: 0, gas: 55, hydro: 0, wind: 1, solar: 12, other: 12, note: "UAE — nuclear online + gas + solar." },
  POL: { nuclear: 0, coal: 60, gas: 10, hydro: 2, wind: 12, solar: 8, other: 8, note: "Poland — still coal-heavy; renewables rising." },
  TUR: { nuclear: 0, coal: 28, gas: 22, hydro: 20, wind: 10, solar: 8, other: 12, note: "Turkey — diversified mix with hydro and coal." },
  TWN: { nuclear: 6, coal: 40, gas: 38, hydro: 3, wind: 3, solar: 6, other: 4, note: "Taiwan — coal/gas; nuclear phasing issues matter for industry." },
};

function getPowerMix(code) {
  if (code && POWER_MIX_BY_CODE[code]) return { code, ...POWER_MIX_BY_CODE[code], source: "country" };
  const c = typeof COUNTRIES !== "undefined" ? COUNTRIES.find((x) => x.code === code) : null;
  const reg = c?.region || "World";
  const tpl = POWER_MIX_TEMPLATES[reg] || POWER_MIX_TEMPLATES.World;
  return { code: code || "WORLD", ...tpl, source: "region", region: reg };
}

/** Telecom / internet infrastructure scores 0–100 (higher = stronger) */
const TELECOM_TEMPLATES = {
  Europe: { mobile: 88, landline: 55, fiber: 62, internet: 86, mobileNet: 90, note: "Strong mobile and fixed broadband in most of Europe." },
  "N. America": { mobile: 90, landline: 48, fiber: 55, internet: 88, mobileNet: 92, note: "Excellent mobile; fiber uneven by region." },
  LatAm: { mobile: 78, landline: 28, fiber: 35, internet: 68, mobileNet: 80, note: "Mobile-first; fixed broadband improving in cities." },
  Caribbean: { mobile: 72, landline: 22, fiber: 28, internet: 60, mobileNet: 75, note: "Mobile primary; submarine cables critical." },
  Asia: { mobile: 85, landline: 30, fiber: 58, internet: 78, mobileNet: 88, note: "Very strong mobile in East Asia; mixed elsewhere." },
  Oceania: { mobile: 86, landline: 40, fiber: 50, internet: 84, mobileNet: 88, note: "Good urban networks; remote islands harder." },
  MENA: { mobile: 82, landline: 25, fiber: 40, internet: 70, mobileNet: 85, note: "Strong Gulf mobile; conflict zones fragile." },
  Africa: { mobile: 70, landline: 8, fiber: 18, internet: 48, mobileNet: 72, note: "Mobile leapfrogging; fixed lines rare outside cities." },
  Eurasia: { mobile: 80, landline: 35, fiber: 40, internet: 72, mobileNet: 82, note: "Solid mobile; quality varies by state." },
  World: { mobile: 78, landline: 30, fiber: 40, internet: 70, mobileNet: 80, note: "Global average-style telecom profile." },
};

const TELECOM_BY_CODE = {
  KOR: { mobile: 96, landline: 45, fiber: 92, internet: 95, mobileNet: 97, note: "World-class fiber and mobile." },
  JPN: { mobile: 94, landline: 50, fiber: 85, internet: 93, mobileNet: 95, note: "Excellent fixed and mobile." },
  SGP: { mobile: 95, landline: 40, fiber: 90, internet: 96, mobileNet: 97, note: "Top-tier city-state networks." },
  SWE: { mobile: 93, landline: 35, fiber: 82, internet: 94, mobileNet: 95, note: "Nordic fiber and mobile strength." },
  DEU: { mobile: 90, landline: 55, fiber: 55, internet: 88, mobileNet: 91, note: "Strong mobile; fiber catching up." },
  USA: { mobile: 92, landline: 40, fiber: 52, internet: 90, mobileNet: 93, note: "Strong overall; rural gaps remain." },
  CHN: { mobile: 92, landline: 25, fiber: 80, internet: 85, mobileNet: 94, note: "Massive 5G and fiber rollout." },
  IND: { mobile: 85, landline: 8, fiber: 25, internet: 58, mobileNet: 88, note: "Huge mobile base; fixed broadband lagging." },
  BRA: { mobile: 82, landline: 20, fiber: 40, internet: 72, mobileNet: 84, note: "Urban fiber growth; interior weaker." },
  NGA: { mobile: 68, landline: 2, fiber: 10, internet: 42, mobileNet: 70, note: "Mobile-first; power limits internet uptime." },
  ZAF: { mobile: 80, landline: 12, fiber: 30, internet: 65, mobileNet: 82, note: "Good urban mobile; load-shedding hurts uptime." },
  LBN: { mobile: 55, landline: 15, fiber: 12, internet: 40, mobileNet: 58, note: "Grid and network stress raise outages." },
  UKR: { mobile: 70, landline: 20, fiber: 35, internet: 60, mobileNet: 72, note: "Resilient but war-damaged in places." },
  TWN: { mobile: 94, landline: 42, fiber: 80, internet: 92, mobileNet: 95, note: "Advanced networks supporting industry." },
};

function getTelecomProfile(code) {
  if (code && TELECOM_BY_CODE[code]) return { code, ...TELECOM_BY_CODE[code], source: "country" };
  const c = typeof COUNTRIES !== "undefined" ? COUNTRIES.find((x) => x.code === code) : null;
  const reg = c?.region || "World";
  const tpl = TELECOM_TEMPLATES[reg] || TELECOM_TEMPLATES.World;
  return { code: code || "WORLD", ...tpl, source: "region", region: reg };
}

/**
 * Active infrastructure events — power / internet / telecom
 * status: down | degraded | warn | recovering | up
 */
const INFRA_EVENTS = [
  { id: "ie1", type: "power", status: "down", sev: "crit", code: "LBN", title: "Coastal grid failure", note: "Extended blackouts reported on coastal corridor.", lat: 33.9, lon: 35.5 },
  { id: "ie2", type: "power", status: "warn", sev: "high", code: "ZAF", title: "Load-shedding risk", note: "Scheduled / emergency power cuts possible.", lat: -25.75, lon: 28.19 },
  { id: "ie3", type: "power", status: "degraded", sev: "elevated", code: "TWN", title: "Grid stress watch", note: "Industrial demand + weather can strain reserve margin.", lat: 25.03, lon: 121.56 },
  { id: "ie4", type: "internet", status: "degraded", sev: "elevated", code: "TCD", title: "Sahel connectivity stress", note: "Cross-border fiber and mobile backhaul fragile.", lat: 12.13, lon: 15.05 },
  { id: "ie5", type: "internet", status: "warn", sev: "high", code: "YEM", title: "International bandwidth risk", note: "Cable and gateway fragility raises outage odds.", lat: 15.35, lon: 44.2 },
  { id: "ie6", type: "telecom", status: "degraded", sev: "elevated", code: "UKR", title: "Mobile / fixed war damage", note: "Local outages and repairs ongoing in conflict zones.", lat: 50.45, lon: 30.52 },
  { id: "ie7", type: "power", status: "warn", sev: "elevated", code: "IND", title: "Peak demand warning", note: "Heat-driven peak loads can force local cuts.", lat: 28.61, lon: 77.21 },
  { id: "ie8", type: "internet", status: "recovering", sev: "watch", code: "TON", title: "Subsea cable recovery", note: "Island connectivity sensitive to single cable cuts.", lat: -21.14, lon: -175.2 },
  { id: "ie9", type: "power", status: "up", sev: "info", code: "FRA", title: "Nuclear fleet stable", note: "No major national outage flag in model.", lat: 48.86, lon: 2.35 },
  { id: "ie10", type: "telecom", status: "up", sev: "info", code: "KOR", title: "Networks normal", note: "Mobile and fiber operating in normal band.", lat: 37.57, lon: 126.98 },
  { id: "ie11", type: "internet", status: "warn", sev: "elevated", code: "SDN", title: "Connectivity blackout risk", note: "Conflict can force mobile/internet shutdowns.", lat: 15.5, lon: 32.53 },
  { id: "ie12", type: "power", status: "degraded", sev: "high", code: "PAK", title: "Grid instability watch", note: "Demand spikes and fuel constraints can cascade.", lat: 33.68, lon: 73.04 },
  { id: "ie13", type: "telecom", status: "warn", sev: "elevated", code: "MMR", title: "Mobile network restrictions", note: "Policy and conflict can throttle mobile access.", lat: 16.8, lon: 96.15 },
  { id: "ie14", type: "power", status: "warn", sev: "watch", code: "USA", title: "Storm grid warning season", note: "Severe weather can take local feeders offline.", lat: 38.9, lon: -77.0 },
  { id: "ie15", type: "internet", status: "degraded", sev: "elevated", code: "CUB", title: "International gateway limits", note: "Limited routes raise impact of any cable fault.", lat: 23.11, lon: -82.37 },
];

function statusRank(s) {
  return { down: 5, degraded: 4, warn: 3, recovering: 2, up: 1, ok: 1 }[s] || 0;
}

function infraStressFromEvents(events) {
  if (!events?.length) return 25;
  const scores = events.map((e) => {
    const base = { crit: 95, high: 78, elevated: 58, watch: 40, info: 15 }[e.sev] || 35;
    const st = { down: 1.15, degraded: 1.0, warn: 0.9, recovering: 0.65, up: 0.2 }[e.status] || 0.8;
    return base * st;
  });
  return Math.max(5, Math.min(98, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)));
}

/** Family profiles for affordability weighting */
const FAMILY_PROFILES = [
  {
    id: "single",
    name: "Single adult",
    desc: "One person, smaller home, less childcare weight.",
    weights: { housing: 1.1, groceries: 0.85, childcare: 0.2, schoolPublic: 0.1, schoolPrivate: 0.1, cars: 0.9, transport: 1.1, energy: 0.9 },
  },
  {
    id: "couple",
    name: "Couple, no kids",
    desc: "Two adults sharing costs.",
    weights: { housing: 1.0, groceries: 1.0, childcare: 0.15, schoolPublic: 0.1, schoolPrivate: 0.1, cars: 1.0, transport: 1.0, energy: 1.0 },
  },
  {
    id: "family",
    name: "Family with kids",
    desc: "More weight on school, childcare, car, and larger home.",
    weights: { housing: 1.15, groceries: 1.25, childcare: 1.6, schoolPublic: 1.2, schoolPrivate: 1.4, cars: 1.2, transport: 0.9, energy: 1.15 },
  },
  {
    id: "student",
    name: "Student",
    desc: "Rent + food + transport; little car or childcare.",
    weights: { housing: 1.2, groceries: 1.0, childcare: 0.05, schoolPublic: 0.2, schoolPrivate: 0.2, higherEd: 1.8, cars: 0.3, transport: 1.4, energy: 0.7 },
  },
];

/** Move-to priority presets */
const MOVE_PRIORITIES = [
  { id: "cheap_rent", name: "Cheap rent / housing", key: "housing", invert: true },
  { id: "public_school", name: "Affordable public school", key: "schoolPublic", invert: true },
  { id: "low_childcare", name: "Lower childcare cost", key: "childcare", invert: true },
  { id: "low_fuel", name: "Lower fuel cost", key: "gasFuel", invert: true },
  { id: "cheap_food", name: "Cheaper groceries", key: "groceries", invert: true },
  { id: "low_energy", name: "Lower home energy bills", key: "energy", invert: true },
  { id: "good_transit", name: "Affordable public transport", key: "transport", invert: true },
  { id: "overall", name: "Overall affordability", key: "affordScore", invert: false },
  { id: "low_risk", name: "Lower country risk", key: "risk", invert: true },
  { id: "high_stability", name: "Higher stability", key: "stability", invert: false },
];

/**
 * Inflation & real growth — illustrative history + current + projected (not official forecasts).
 * hist = last ~6 yearly CPI-like readings (%); current; projNext (%); growthHist; growthCurrent; growthProj.
 */
const INFLATION_PROFILES = {
  USA: { hist: [1.2, 4.7, 8.0, 4.1, 3.4, 2.9], current: 2.8, proj: [2.6, 2.4, 2.3], growthHist: [2.3, 5.8, 1.9, 2.5, 2.8], growth: 2.4, growthProj: [2.2, 2.1, 2.0], note: "Illustrative CPI-style path; not Fed official." },
  DEU: { hist: [0.5, 3.1, 6.9, 5.9, 2.3, 2.2], current: 2.2, proj: [2.1, 2.0, 1.9], growthHist: [1.1, 1.8, -0.3, 0.0, 0.2], growth: 0.3, growthProj: [0.8, 1.1, 1.3], note: "Euro-area style model." },
  SWE: { hist: [0.7, 2.2, 8.4, 5.9, 2.5, 2.0], current: 1.9, proj: [1.8, 1.9, 2.0], growthHist: [2.0, 5.0, 2.6, -0.2, 0.6], growth: 1.0, growthProj: [1.4, 1.7, 1.8], note: "Nordic model estimate." },
  GBR: { hist: [0.9, 2.6, 9.1, 6.7, 4.0, 2.6], current: 2.5, proj: [2.3, 2.2, 2.1], growthHist: [1.6, 7.6, 4.3, 0.1, 0.9], growth: 1.0, growthProj: [1.2, 1.4, 1.5], note: "UK-style illustrative path." },
  FRA: { hist: [0.5, 1.6, 5.2, 4.9, 2.5, 2.1], current: 2.0, proj: [1.9, 1.8, 1.8], growthHist: [1.8, 6.8, 2.5, 0.9, 1.1], growth: 1.0, growthProj: [1.2, 1.3, 1.4], note: "Euro-area style model." },
  CHN: { hist: [2.9, 0.9, 2.0, 0.2, 0.3, 0.5], current: 0.6, proj: [1.0, 1.4, 1.6], growthHist: [6.1, 8.4, 3.0, 5.2, 4.8], growth: 4.6, growthProj: [4.4, 4.2, 4.0], note: "China growth remains higher than most advanced economies in this model." },
  IND: { hist: [4.8, 5.1, 6.7, 5.4, 5.0, 4.8], current: 4.7, proj: [4.5, 4.3, 4.2], growthHist: [3.9, 9.1, 7.0, 7.6, 6.8], growth: 6.5, growthProj: [6.4, 6.3, 6.2], note: "Higher growth, moderate inflation in model." },
  JPN: { hist: [0.0, -0.2, 2.5, 3.3, 2.8, 2.5], current: 2.4, proj: [2.2, 2.0, 1.8], growthHist: [-4.5, 2.2, 1.0, 1.9, 0.9], growth: 0.8, growthProj: [0.9, 1.0, 1.0], note: "Japan long low-inflation history, recent pickup." },
  BRA: { hist: [3.7, 8.3, 9.3, 4.6, 4.5, 4.2], current: 4.0, proj: [3.8, 3.6, 3.5], growthHist: [-3.9, 5.0, 2.9, 2.9, 2.2], growth: 2.0, growthProj: [2.1, 2.2, 2.2], note: "LatAm style path." },
  ZAF: { hist: [3.3, 4.6, 6.9, 5.9, 4.8, 4.5], current: 4.4, proj: [4.3, 4.2, 4.1], growthHist: [-6.3, 4.9, 1.9, 0.6, 1.1], growth: 1.2, growthProj: [1.4, 1.6, 1.7], note: "Illustrative SA path." },
  AUS: { hist: [0.9, 2.9, 6.6, 5.4, 3.5, 3.0], current: 2.9, proj: [2.7, 2.5, 2.5], growthHist: [2.2, 5.2, 3.8, 1.5, 1.4], growth: 1.5, growthProj: [1.8, 2.0, 2.1], note: "Australia model." },
  CAN: { hist: [0.7, 3.4, 6.8, 3.9, 2.8, 2.5], current: 2.4, proj: [2.2, 2.1, 2.0], growthHist: [5.3, 1.3, 1.1, 1.2, 1.5], growth: 1.4, growthProj: [1.6, 1.7, 1.8], note: "Canada model." },
  NLD: { hist: [1.1, 2.8, 10.0, 4.1, 3.1, 2.6], current: 2.5, proj: [2.3, 2.2, 2.1], growthHist: [2.0, 6.2, 4.3, 0.1, 0.8], growth: 1.0, growthProj: [1.2, 1.4, 1.5], note: "Netherlands / euro-area style." },
  KOR: { hist: [0.5, 2.5, 5.1, 3.6, 2.3, 2.2], current: 2.1, proj: [2.0, 2.0, 1.9], growthHist: [0.7, 4.3, 2.6, 1.4, 2.2], growth: 2.1, growthProj: [2.1, 2.2, 2.2], note: "Korea model." },
  MEX: { hist: [3.4, 5.7, 7.9, 5.5, 4.7, 4.2], current: 4.0, proj: [3.8, 3.6, 3.5], growthHist: [-8.6, 5.8, 3.9, 3.2, 1.5], growth: 1.6, growthProj: [1.8, 2.0, 2.1], note: "Mexico model." },
  TUR: { hist: [12.3, 19.6, 72.3, 53.9, 58.5, 45.0], current: 42.0, proj: [38.0, 32.0, 28.0], growthHist: [1.9, 11.4, 5.5, 4.5, 3.2], growth: 3.0, growthProj: [3.1, 3.2, 3.2], note: "High-inflation path (illustrative)." },
  DEFAULT: { hist: [2.0, 3.5, 6.0, 4.5, 3.2, 2.8], current: 2.7, proj: [2.5, 2.4, 2.3], growthHist: [1.5, 4.0, 2.0, 2.2, 2.3], growth: 2.2, growthProj: [2.2, 2.3, 2.3], note: "Regional default model when no country-specific series is set." },
};

/**
 * Super-regions for filtering (maps onto COUNTRIES[].region tags).
 * Use in country picker, affordability, weather, rankings.
 */
const REGION_GROUPS = [
  { id: "all", name: "All regions", short: "WORLD", regions: null },
  { id: "americas", name: "Americas", short: "AMERICAS", regions: ["N. America", "LatAm", "Caribbean"] },
  { id: "europe", name: "Europe", short: "EUROPE", regions: ["Europe"] },
  { id: "apac", name: "Asia-Pacific", short: "APAC", regions: ["Asia", "Oceania"] },
  { id: "mena", name: "Middle East & N. Africa", short: "MENA", regions: ["MENA"] },
  { id: "africa", name: "Africa", short: "AFRICA", regions: ["Africa"] },
  { id: "eurasia", name: "Eurasia", short: "EURASIA", regions: ["Eurasia"] },
];

/**
 * Advanced / developed economy codes (illustrative IMF-style advanced list).
 * Everything else in the catalog is treated as developing / emerging for filters.
 */
const DEVELOPED_CODES = new Set([
  "USA", "CAN", "GBR", "IRL", "FRA", "DEU", "NLD", "BEL", "LUX", "CHE", "AUT", "ITA", "ESP", "PRT", "GRC",
  "NOR", "SWE", "DNK", "FIN", "ISL", "JPN", "KOR", "AUS", "NZL", "SGP", "ISR", "CZE", "SVK", "SVN",
  "EST", "LVA", "LTU", "POL", "HUN", "CYP", "MLT", "HRV", "TWN", "HKG", "MAC", "AND", "MCO", "LIE", "SMR",
]);

function isDevelopedCountry(code) {
  if (!code || code === "GLOBAL") return null;
  return DEVELOPED_CODES.has(code);
}

function countryRiskScore(code) {
  const c = typeof COUNTRIES !== "undefined" ? COUNTRIES.find((x) => x.code === code) : null;
  if (!c) return 40;
  return typeof c.risk === "number" ? c.risk : 40;
}

/** Stability 0–100 (higher = calmer). Inverse of risk with light clamp. */
function countryStabilityScore(code) {
  return Math.max(5, Math.min(98, 100 - countryRiskScore(code)));
}

function travelAdviceForRisk(risk) {
  if (risk >= 80) {
    return {
      level: "critical",
      label: "Travel — avoid non-essential",
      tip: "Very high security / crisis stress in model. Check official foreign-ministry advice before any trip.",
    };
  }
  if (risk >= 65) {
    return {
      level: "high",
      label: "Travel — high caution",
      tip: "Elevated risk. Prefer essential travel only; monitor local news and official advisories.",
    };
  }
  if (risk >= 50) {
    return {
      level: "elevated",
      label: "Travel — heightened caution",
      tip: "Some instability. Stay aware of local rules, weather, and demonstrations.",
    };
  }
  if (risk >= 35) {
    return {
      level: "watch",
      label: "Travel — normal precautions",
      tip: "Routine travel awareness. Watch weather and local transport strikes.",
    };
  }
  return {
    level: "ok",
    label: "Travel — standard",
    tip: "Model risk is relatively low. Still follow normal travel common sense and weather alerts.",
  };
}

/** WMO-style Open-Meteo weather codes → human warning */
function weatherWarningFromCode(codeWx, wind, precip, tempC) {
  const c = Number(codeWx);
  const w = Number(wind) || 0;
  const p = Number(precip) || 0;
  const t = tempC != null && Number.isFinite(Number(tempC)) ? Number(tempC) : null;
  if (c >= 95) return { level: "critical", label: "Thunderstorm / severe", tip: "Thunderstorm risk near capital — delay outdoor plans." };
  if (c >= 80 && c <= 82) return { level: "elevated", label: "Heavy rain showers", tip: "Heavy showers — flooding risk on low roads." };
  if (c >= 71 && c <= 77) return { level: "elevated", label: "Snow / ice", tip: "Snow or ice — travel delays possible." };
  if (c >= 65 && c <= 67) return { level: "elevated", label: "Heavy rain / freezing rain", tip: "Heavy or freezing rain — drive carefully." };
  if (c >= 51 && c <= 57) return { level: "watch", label: "Drizzle / light rain", tip: "Wet conditions — minor travel friction." };
  if (c >= 45 && c <= 48) return { level: "watch", label: "Fog", tip: "Fog — reduced visibility for drivers and flights." };
  if (w >= 60) return { level: "high", label: "Very strong wind", tip: "High wind — outdoor and flight risk." };
  if (w >= 40) return { level: "elevated", label: "Strong wind", tip: "Strong wind — secure loose items; check ferries." };
  if (p >= 5) return { level: "watch", label: "Wet spell", tip: "Meaningful precipitation in the capital sample." };
  // Temperature extremes (capital sample)
  if (t != null && t >= 40) return { level: "high", label: "Extreme heat", tip: "Capital sample ≥40°C — heat stress and power demand risk." };
  if (t != null && t >= 35) return { level: "elevated", label: "Hot spell", tip: "Very warm capital reading — hydrate; watch vulnerable groups." };
  if (t != null && t <= -20) return { level: "high", label: "Extreme cold", tip: "Capital sample ≤−20°C — freeze risk for travel and utilities." };
  if (t != null && t <= -10) return { level: "elevated", label: "Hard freeze", tip: "Bitter cold — travel and pipe freeze risk." };
  if (c >= 1 && c <= 3) return { level: "ok", label: "Partly cloudy", tip: "No major weather warning from capital sample." };
  return { level: "ok", label: "Fair / calm", tip: "No severe weather flag from this capital reading." };
}

/**
 * Major sea lanes + tanker corridors (illustrative great-circle style paths).
 * Used on the 3D map for shipping / tanker situational awareness — not live AIS.
 */
const SHIPPING_ROUTES = [
  {
    id: "lane-hormuz-asia",
    name: "Persian Gulf → Asia crude",
    kind: "tanker",
    status: "watch",
    delayH: 6,
    coords: [
      [56.5, 26.5],
      [58, 24],
      [62, 20],
      [72, 12],
      [80, 6],
      [95, 5],
      [104, 2],
      [112, 10],
      [120, 22],
      [130, 32],
    ],
  },
  {
    id: "lane-suez-med",
    name: "Suez / Med energy lane",
    kind: "tanker",
    status: "watch",
    delayH: 12,
    coords: [
      [43.3, 12.5],
      [38, 18],
      [34, 24],
      [32.5, 30],
      [30, 32],
      [25, 35],
      [18, 36],
      [10, 38],
      [5, 40],
      [-5, 36],
    ],
  },
  {
    id: "lane-redsea",
    name: "Red Sea / Bab el-Mandeb",
    kind: "shipping",
    status: "elevated",
    delayH: 48,
    coords: [
      [43.3, 12.5],
      [42, 14],
      [40, 18],
      [38, 22],
      [36, 26],
      [34, 28],
      [32.5, 30],
    ],
  },
  {
    id: "lane-cape",
    name: "Cape of Good Hope diversion",
    kind: "shipping",
    status: "elevated",
    delayH: 96,
    coords: [
      [43, 12],
      [48, 0],
      [40, -15],
      [30, -28],
      [18.4, -34.3],
      [10, -30],
      [0, -20],
      [-10, -5],
      [-20, 10],
      [-40, 25],
      [-60, 30],
    ],
  },
  {
    id: "lane-malacca",
    name: "Malacca / Singapore corridor",
    kind: "shipping",
    status: "normal",
    delayH: 4,
    coords: [
      [95, 5],
      [100, 3],
      [103.8, 1.2],
      [108, 2],
      [115, 8],
      [120, 15],
    ],
  },
  {
    id: "lane-panama",
    name: "Panama Canal transit",
    kind: "shipping",
    status: "watch",
    delayH: 18,
    coords: [
      [-90, 15],
      [-85, 12],
      [-79.7, 9.1],
      [-75, 10],
      [-70, 15],
      [-65, 20],
    ],
  },
  {
    id: "lane-atlantic-crude",
    name: "Atlantic crude / products",
    kind: "tanker",
    status: "normal",
    delayH: 8,
    coords: [
      [-95, 28],
      [-80, 25],
      [-60, 28],
      [-40, 35],
      [-20, 40],
      [-10, 44],
      [0, 48],
    ],
  },
  {
    id: "lane-pacific",
    name: "Trans-Pacific box / energy",
    kind: "shipping",
    status: "normal",
    delayH: 10,
    coords: [
      [140, 35],
      [160, 30],
      [180, 28],
      [-160, 30],
      [-140, 32],
      [-125, 35],
      [-120, 34],
    ],
  },
  {
    id: "lane-blacksea",
    name: "Black Sea grain / energy",
    kind: "shipping",
    status: "elevated",
    delayH: 36,
    coords: [
      [32, 46],
      [30, 43],
      [29.1, 41.1],
      [28, 40],
      [26, 38],
      [25, 36],
    ],
  },
  {
    id: "lane-taiwan",
    name: "Taiwan Strait shipping",
    kind: "shipping",
    status: "elevated",
    delayH: 14,
    coords: [
      [118, 20],
      [119.5, 24.5],
      [121, 28],
      [122, 30],
      [124, 32],
    ],
  },
];

/** Illustrative delayed tanker / vessel trackers along lanes (not live AIS). */
const TANKER_TRACKERS = [
  { id: "tk1", name: "VLCC Gulf → East Asia", route: "lane-hormuz-asia", progress: 0.35, status: "delayed", delayH: 18, cargo: "crude" },
  { id: "tk2", name: "Aframax Red Sea wait", route: "lane-redsea", progress: 0.55, status: "delayed", delayH: 42, cargo: "products" },
  { id: "tk3", name: "Suezmax Cape diversion", route: "lane-cape", progress: 0.4, status: "reroute", delayH: 72, cargo: "crude" },
  { id: "tk4", name: "Panamax canal queue", route: "lane-panama", progress: 0.5, status: "delayed", delayH: 22, cargo: "goods" },
  { id: "tk5", name: "Malacca transit", route: "lane-malacca", progress: 0.7, status: "on-time", delayH: 2, cargo: "mixed" },
  { id: "tk6", name: "Black Sea grain ship", route: "lane-blacksea", progress: 0.3, status: "elevated", delayH: 30, cargo: "grain" },
  { id: "tk7", name: "Atlantic ULCC", route: "lane-atlantic-crude", progress: 0.6, status: "on-time", delayH: 5, cargo: "crude" },
  { id: "tk8", name: "Taiwan Strait boxship", route: "lane-taiwan", progress: 0.45, status: "watch", delayH: 12, cargo: "containers" },
];

function countriesInScope(regionGroupId, develFilter) {
  const all = (typeof COUNTRIES !== "undefined" ? COUNTRIES : []).filter((c) => c.code && c.code !== "GLOBAL");
  const group = (typeof REGION_GROUPS !== "undefined" ? REGION_GROUPS : []).find((g) => g.id === regionGroupId);
  let list = all;
  if (group && group.regions) {
    const set = new Set(group.regions);
    list = list.filter((c) => set.has(c.region));
  }
  if (develFilter === "developed") list = list.filter((c) => isDevelopedCountry(c.code));
  if (develFilter === "developing") list = list.filter((c) => !isDevelopedCountry(c.code));
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

/** Chip supply chain story nodes */
const CHIP_CHAIN = [
  { id: "design", stage: "1 · Design", where: "USA · Europe · Israel", what: "Companies design the chips (brain of phones, cars, AI).", key: ["NVDA", "AMD"], color: "#64ffda" },
  { id: "tools", stage: "2 · Machines", where: "Netherlands · Japan · USA", what: "Special machines print tiny patterns on silicon.", key: ["ASML"], color: "#4a9eff" },
  { id: "foundry", stage: "3 · Factories", where: "Taiwan · Korea · USA · Europe", what: "Factories build the chips at huge scale.", key: ["TSM", "SOXX"], color: "#f5a623" },
  { id: "package", stage: "4 · Package & test", where: "Asia hubs", what: "Chips are packaged, tested, and shipped worldwide.", key: ["SOXX"], color: "#ce93d8" },
  { id: "cloud", stage: "5 · Data centers", where: "USA · Europe · Asia", what: "Cloud and AI buildings use many chips plus power and copper.", key: ["EQIX", "DLR", "COPPER", "NATGAS"], color: "#18ffff" },
];

/** El Niño / climate → food stress tags by region (easy language) */
const CLIMATE_FOOD_BY_REGION = {
  Africa: { enso: "Can raise drought risk in parts of East/Southern Africa; Sahel rains matter for food.", tip: "Watch local rains and grain imports." },
  Asia: { enso: "Can shift monsoon rains — important for rice and water.", tip: "Rice and soft commodities may move with rainfall." },
  MENA: { enso: "Mostly import-dependent; global grain prices matter more than local rain.", tip: "Black Sea and world wheat prices hit bread costs." },
  Europe: { enso: "Indirect: global grain and energy prices; local heat/drought can hit harvests.", tip: "Heatwaves and river levels can stress crops and transport." },
  "N. America": { enso: "Can change rain patterns across US/Canada farm belts.", tip: "Corn, soy, wheat weather windows matter." },
  LatAm: { enso: "Often strong El Niño/La Niña effects on rain in Brazil, Argentina, Andes.", tip: "Soy, coffee, copper regions can feel it." },
  Caribbean: { enso: "Can influence storm season odds and local food imports.", tip: "Storm season + import prices." },
  Oceania: { enso: "Australia farm belts are sensitive to El Niño drought risk.", tip: "Wheat and softs can reprice with dryness." },
  Eurasia: { enso: "Indirect via global food and energy prices.", tip: "Watch global grain corridors." },
  World: { enso: "El Niño is a Pacific pattern that can ripple through world food prices.", tip: "Compare local harvests with global grain prices." },
};

/** Country → news keywords for filtering headlines */
/** Country → headline keywords (phrases preferred; avoid bare ISO codes / common English words). */
const COUNTRY_NEWS_KEYS = {
  USA: ["united states", "u.s.", "washington", "white house", "america", "american", "biden", "trump", "pentagon", "wall street", "federal reserve"],
  CHN: ["china", "beijing", "shanghai", "xi jinping", "chinese", "people's republic"],
  RUS: ["russia", "moscow", "kremlin", "putin", "russian"],
  UKR: ["ukraine", "kyiv", "kiev", "zelensky", "donbas", "kharkiv", "odesa", "ukrainian"],
  TWN: ["taiwan", "taipei", "taiwan strait", "taiwanee"],
  ISR: ["israel", "gaza", "jerusalem", "tel aviv", "israeli", "hamas", "west bank"],
  IRN: ["iran", "tehran", "iranian", "irgc"],
  SAU: ["saudi", "riyadh", "saudi arabia", "opec"],
  TUR: ["turkey", "türkiye", "ankara", "erdogan", "turkish"],
  DEU: ["germany", "berlin", "german", "bundeswehr", "scholz"],
  GBR: ["britain", "united kingdom", "london", "british", "downing street"],
  FRA: ["france", "paris", "french", "macron"],
  IND: ["india", "new delhi", "delhi", "modi", "mumbai", "indian"],
  PAK: ["pakistan", "islamabad", "karachi", "pakistani"],
  JPN: ["japan", "tokyo", "japanese", "yen"],
  KOR: ["south korea", "seoul", "korean"],
  PRK: ["north korea", "pyongyang", "kim jong"],
  SDN: ["sudan", "khartoum", "darfur"],
  EGY: ["egypt", "cairo", "egyptian", "suez canal"],
  YEM: ["yemen", "houthi", "sanaa", "sana'a"],
  LBN: ["lebanon", "beirut", "hezbollah", "lebanese"],
  SYR: ["syria", "damascus", "syrian"],
  BRA: ["brazil", "brasilia", "brazilian", "lula"],
  ARG: ["argentina", "buenos aires", "argentine"],
  AUS: ["australia", "sydney", "canberra", "australian"],
  ZAF: ["south africa", "johannesburg", "cape town", "pretoria"],
  NGA: ["nigeria", "lagos", "abuja", "nigerian"],
  CIV: ["ivory coast", "côte d", "cote d", "abidjan"],
  GHA: ["ghana", "accra"],
  IDN: ["indonesia", "jakarta", "indonesian"],
  PHL: ["philippines", "manila", "filipino"],
  MEX: ["mexico", "mexico city", "mexican"],
  POL: ["poland", "warsaw", "polish", "duda"],
  EST: ["estonia", "tallinn", "estonian"],
  SWE: ["sweden", "stockholm", "swedish"],
  NOR: ["norway", "oslo", "norwegian"],
  CAN: ["canada", "ottawa", "toronto", "canadian", "trudeau"],
  NLD: ["netherlands", "amsterdam", "dutch", "hague"],
  ITA: ["italy", "rome", "italian", "milan"],
  ESP: ["spain", "madrid", "spanish", "barcelona"],
  ARE: ["united arab emirates", "u.a.e", "dubai", "abu dhabi", "emirati"],
  QAT: ["qatar", "doha", "qatari"],
};

/** Lens → news keywords (simple words the news filter looks for) */
const LENS_NEWS_KEYS = {
  overview: [],
  threat: ["war", "missile", "troop", "attack", "conflict", "military", "sanction", "nuclear", "invasion"],
  stability: ["ceasefire", "peace", "diplomacy", "talks", "agreement", "aid", "reconstruction"],
  markets: ["market", "stock", "oil", "inflation", "fed", "rate", "dollar", "bitcoin", "bond", "bank", "gold", "copper"],
  logistics: ["shipping", "port", "canal", "freight", "supply chain", "suez", "hormuz", "red sea"],
  humanitarian: ["aid", "refugee", "famine", "humanitarian", "displaced", "food security", "hospital"],
  climate_cat: ["storm", "hurricane", "flood", "drought", "wildfire", "earthquake", "climate", "el nino", "typhoon"],
  tech: [
    "semiconductor",
    "chip",
    "nvidia",
    "tsmc",
    "asml",
    "data center",
    "datacenter",
    "ai ",
    "artificial intelligence",
    "foundry",
    "gpu",
    "cloud",
  ],
  metals: ["gold", "silver", "copper", "aluminum", "aluminium", "platinum", "mining", "metal"],
  afford: [
    "rent",
    "housing",
    "mortgage",
    "cost of living",
    "childcare",
    "tuition",
    "school fees",
    "grocery",
    "inflation",
    "utility",
    "electricity bill",
    "petrol",
    "gasoline",
    "affordab",
    "minimum wage",
    "real wage",
  ],
  decision: ["summit", "election", "policy", "minister", "president", "cabinet", "parliament"],
};

/** Which prices to show for each lens */
const LENS_MARKET_BASKETS = {
  overview: ["SPX", "NDX", "DXY", "BRENT", "GOLD", "COPPER", "SOXX", "WHEAT", "VIX"],
  threat: ["VIX", "GOLD", "BRENT", "WARINS", "USDJPY", "SPX", "BTC"],
  stability: ["SPX", "EURUSD", "GOLD", "VIX", "BTC", "DXY"],
  markets: ["SPX", "NDX", "DJI", "DXY", "EURUSD", "GBPUSD", "US10Y", "VIX", "BTC", "GOLD", "BRENT", "COPPER", "SOXX"],
  logistics: ["SHIP", "BDI", "BRENT", "WARINS", "COPPER", "DXY"],
  humanitarian: ["WHEAT", "CORN", "RICE", "FOODX", "SOY", "SHIP"],
  climate_cat: ["CAT", "WHEAT", "CORN", "NATGAS", "COFFEE", "SUGAR", "BRENT", "RICE"],
  tech: ["SOXX", "SMH", "NVDA", "TSM", "ASML", "AMD", "AVGO", "EQIX", "DLR", "MSFT", "COPPER", "NATGAS"],
  metals: ["GOLD", "SILVER", "COPPER", "PLAT", "ALUM", "DXY", "SPX"],
  afford: ["WHEAT", "FOODX", "BRENT", "NATGAS", "DXY", "EURUSD", "SPX", "GOLD", "COPPER"],
  decision: ["SPX", "NDX", "DXY", "VIX", "GOLD", "BRENT", "SOXX", "WHEAT"],
};

/** Extra prices when you pick a country */
const COUNTRY_MARKET_EXTRA = {
  USA: ["SPX", "DXY", "US10Y", "WTI", "NVDA", "EQIX"],
  CHN: ["COPPER", "SOY", "DXY", "BRENT", "TSM"],
  DEU: ["EURUSD", "NATGAS", "BRENT", "ASML"],
  GBR: ["EURUSD", "BRENT", "GOLD"],
  JPN: ["USDJPY", "GOLD", "BRENT", "TSM"],
  UKR: ["WHEAT", "CORN", "BRENT", "WARINS"],
  SAU: ["BRENT", "WTI", "DXY"],
  BRA: ["SOY", "COFFEE", "SUGAR", "BRENT", "COPPER"],
  CIV: ["COCOA", "FOODX"],
  GHA: ["COCOA", "GOLD"],
  IND: ["RICE", "WHEAT", "BRENT"],
  AUS: ["COPPER", "GOLD", "BRENT"],
  IRN: ["BRENT", "GOLD", "WARINS"],
  YEM: ["BRENT", "WARINS", "SHIP"],
  RUS: ["BRENT", "WHEAT", "GOLD"],
  TWN: ["TSM", "SOXX", "NVDA", "SPX"],
  KOR: ["SOXX", "AMD", "USDJPY"],
  NLD: ["ASML", "EURUSD", "SOXX"],
  ZAF: ["GOLD", "PLAT", "DXY"],
};

/** Climate / ENSO watch — constructive framing */
const CLIMATE_SIGNALS = [
  {
    id: "enso",
    name: "El Niño / La Niña (Pacific weather pattern)",
    phase: "watch",
    note: "The Pacific Ocean can run warmer or cooler for months. That changes rain and storms around the world.",
    impact: "Some places get more drought or floods; food crops can get harder or easier to grow.",
    positive: "When we know early, farmers and stores can plan. That protects food on the table.",
    regions: ["Pacific", "LatAm", "SE Asia", "Australia", "Africa"],
  },
  {
    id: "atlantic_cat",
    name: "Atlantic hurricane season",
    phase: "seasonal",
    note: "Summer–fall storms can hit the Caribbean and the US Gulf.",
    impact: "Oil platforms and ports may pause; insurance costs can rise.",
    positive: "Early warnings and strong buildings save lives and keep fuel moving sooner.",
    regions: ["USA", "Caribbean", "Gulf of Mexico"],
  },
  {
    id: "monsoon",
    name: "Asian monsoon rains",
    phase: "watch",
    note: "Seasonal rains feed rice and water for hundreds of millions of people.",
    impact: "Too little or too much rain can move rice and food prices.",
    positive: "Better weather data helps plant at the right time.",
    regions: ["India", "SE Asia"],
  },
  {
    id: "sahel_rain",
    name: "Sahel rain and food",
    phase: "elevated",
    note: "Rain and safety together decide if families get enough food.",
    impact: "Local food stress can rise when rains fail.",
    positive: "Food aid and regional grain trade help stop hunger early.",
    regions: ["Sahel", "West Africa"],
  },
  {
    id: "black_sea_wx",
    name: "Black Sea grain (bread wheat)",
    phase: "elevated",
    note: "Weather and safe ships decide how much wheat leaves the Black Sea.",
    impact: "Bread and wheat prices can move for many countries.",
    positive: "Other farm regions (Americas, EU, Australia) can fill gaps for shoppers.",
    regions: ["Ukraine", "Europe", "MENA importers"],
  },
];

const VIEW_META = {
  command: { title: "COMMAND", desc: "Start here: pulse, map, answers, news, grocery signal." },
  answers: { title: "ANSWERS", desc: "Simple Q&A plus positive paths." },
  geo: { title: "MAP", desc: "3D world map, layers, live disasters." },
  crisis: { title: "CRISIS", desc: "War, hotspots, alerts, ways to ease tension." },
  weather: { title: "WEATHER", desc: "Capital temperatures, weather warnings, travel warnings, storms." },
  markets: { title: "MARKETS", desc: "Live prices and charts for money and commodities." },
  commodities: { title: "COMMODITIES", desc: "Oil, food crops, grocery link." },
  metals: { title: "METALS", desc: "Gold, silver, copper, platinum, aluminum." },
  tech: { title: "CHIPS & DATA", desc: "Semiconductors, data centers, power, copper." },
  food: { title: "FOOD", desc: "Crops, food regions, grocery signal." },
  risk: { title: "MODELS", desc: "KMRI and other scores explained simply." },
  news: { title: "NEWS", desc: "Live headlines filtered to country and lens." },
  transport: { title: "TRAFFIC", desc: "Ships, canals, insurance, outages." },
  infra: {
    title: "POWER · TELECOM",
    desc: "Power mix, mobile/landline, internet & power outages, overall infra stress.",
  },
  impact: { title: "IMPACT", desc: "Politics · money · daily life — easy words." },
  afford: {
    title: "AFFORDABILITY",
    desc: "Cost of living, risk & stability — filter by region and developed / developing economies.",
  },
  compare: { title: "COMPARE", desc: "Side-by-side countries: risk, costs, weather, inflation." },
  inflation: { title: "INFLATION · GROWTH", desc: "History, current, projected inflation and real growth." },
  custom: { title: "CUSTOM", desc: "Custom layout for this visit." },
};

const DESK_CATALOG = [
  { id: "command", title: "Command", icon: "⌘", blurb: "Start here", desc: "Pulse · map · answers · grocery", preview: "Opens the main overview: world pulse, map, answers, news, grocery signal." },
  { id: "answers", title: "Answers", icon: "✦", blurb: "Q&A", desc: "Questions and hope paths", preview: "Opens simple answers and positive paths for the selected country and lens." },
  { id: "geo", title: "Map", icon: "◎", blurb: "Globe", desc: "3D map + disasters", preview: "Opens the world map with disasters and quakes." },
  { id: "crisis", title: "Crisis", icon: "⚠", blurb: "War", desc: "Hotspots and alerts", preview: "Opens war theaters, hotspots, and top alerts." },
  { id: "weather", title: "Weather", icon: "☁", blurb: "Temps world", desc: "Global °C · storms · El Niño", preview: "Opens worldwide capital temperatures, disasters, climate, insurance." },
  { id: "markets", title: "Markets", icon: "◈", blurb: "Prices", desc: "Stocks · FX · charts", preview: "Opens the live market board and focus chart." },
  { id: "commodities", title: "Commodities", icon: "▣", blurb: "Oil & food", desc: "Energy · crops · groceries", preview: "Opens oil, food crops, and the grocery signal." },
  { id: "metals", title: "Metals", icon: "◆", blurb: "Gold & copper", desc: "Precious + industrial metals", preview: "Opens gold, silver, copper, platinum, aluminum boards." },
  { id: "tech", title: "Chips & Data", icon: "▣", blurb: "AI power", desc: "Semiconductors · data centers", preview: "Opens chips, data centers, copper, and power links." },
  {
    id: "afford",
    title: "Affordability",
    icon: "⌂",
    blurb: "Living costs",
    desc: "Home · risk · stability · region",
    preview: "Cost of living, risk & stability, family profile, region & developed filters.",
  },
  {
    id: "compare",
    title: "Compare",
    icon: "⇄",
    blurb: "2–3 countries",
    desc: "Side-by-side view",
    preview: "Compare countries on risk, affordability, weather, inflation.",
  },
  {
    id: "inflation",
    title: "Inflation",
    icon: "%",
    blurb: "CPI · growth",
    desc: "History · now · forecast",
    preview: "Inflation history, current reading, projections and growth.",
  },
  { id: "food", title: "Food", icon: "☘", blurb: "Crops", desc: "Food security", preview: "Opens crop regions, food prices, grocery impact." },
  { id: "transport", title: "Traffic", icon: "⬡", blurb: "Ships", desc: "Routes · outages", preview: "Opens shipping chokepoints, insurance, power outages." },
  {
    id: "infra",
    title: "Power · Net",
    icon: "⚡",
    blurb: "Grid · phone",
    desc: "Power mix · telecom · outages",
    preview: "Power sources, mobile/landline, internet & power outages, overall infrastructure score.",
  },
  { id: "impact", title: "Impact", icon: "◎", blurb: "Daily life", desc: "Politics · prices · shops", preview: "Opens Impact Monitor and the grocery-trip signal." },
  { id: "news", title: "News", icon: "☰", blurb: "Headlines", desc: "By country & lens", preview: "Opens filtered live news from major public sources." },
  { id: "risk", title: "Models", icon: "Σ", blurb: "KMRI", desc: "Scores explained", preview: "Opens KMRI, SPI, IIS, and all models in plain language." },
  { id: "custom", title: "Custom", icon: "✶", blurb: "Custom", desc: "Saved layout", preview: "Opens the layout saved with drag-and-drop for this visit." },
];

const VIEW_PRESETS = {
  command: ["pulse", "kmri", "map", "answers", "grocery", "weather"],
  answers: ["triad", "answers", "implications", "impact", "kmri", "grocery"],
  geo: ["map", "layers", "disasters", "quakes", "country", "weather"],
  crisis: ["map", "hotspots", "theaters", "alerts", "kmri", "implications"],
  weather: ["weather", "climatefood", "map", "disasters", "climate", "quakes"],
  markets: ["mktboard", "mkthero", "currencies", "energy", "instrument", "impact"],
  commodities: ["mktboard", "commodities", "energy", "grocery", "climatefood", "agriculture"],
  metals: ["mktboard", "metals", "mkthero", "currencies", "newsfocus", "impact"],
  tech: ["chipchain", "powerai", "semiconductors", "datacenters", "powerMix", "outages"],
  afford: ["afford", "affordRisk", "familyAfford", "moveTo", "affordRank", "affordHome"],
  compare: ["compare", "inflation", "afford", "affordRisk", "weather", "newsfocus"],
  inflation: ["inflation", "compare", "mktboard", "grocery", "impact", "afford"],
  food: ["commodities", "agriculture", "grocery", "climatefood", "climate", "newsfocus"],
  transport: ["map", "transport", "insurance", "energy", "outages", "implications"],
  infra: ["critInfra", "powerMix", "telecoms", "outages", "infra", "energy"],
  impact: ["impact", "grocery", "afford", "inflation", "answers", "newsfocus"],
  news: ["newsfocus", "news", "alerts", "hotspots", "kmri", "weather"],
  risk: ["kmri", "indicators", "radar", "critInfra", "implications", "pulse"],
  custom: null,
};

const WIDGET_ALIASES = {
  tsi_proxy: "indicators",
  wri_proxy: "indicators",
  fsi_proxy: "indicators",
  tri_proxy: "indicators",
  spi_proxy: "indicators",
};

/** Easy words for self-developed indicators (still professional) */
const INDICATOR_EXPLAIN = {
  kmri: {
    short: "Main “how stressed is the world?” score from 0 to 100.",
    how: "It mixes fighting risk, market fear, energy, food, insurance, loud crisis news, and shipping.",
    read: "Higher means more stress across many areas. Use it as the daily headline number.",
    color: "Red 75+ · Orange mid · Green under 40",
  },
  gsi: {
    short: "How hot world politics feel right now.",
    how: "Hotspots + crisis headlines + market fear.",
    read: "High means politics is shaking markets and news.",
    color: "Higher = more political stress.",
  },
  tsi: {
    short: "War and tension score.",
    how: "Theater postures + fighting risk + crisis news.",
    read: "Use this when focusing on wars or military tension.",
    color: "Higher = tighter tension.",
  },
  wri: {
    short: "Weather and natural hazard risk.",
    how: "Live disasters, quakes, weather, and related news.",
    read: "Spikes when storms, fires, or quakes cluster.",
    color: "Higher = more hazard pressure.",
  },
  fsi: {
    short: "Food stress (bread, cocoa, crops).",
    how: "Crop prices, farm regions, weather, shipping.",
    read: "High can mean firmer grocery prices later.",
    color: "Higher = more food stress.",
  },
  eri: {
    short: "Energy stress (oil and gas).",
    how: "Oil/gas moves plus key sea routes for energy.",
    read: "High can mean costlier fuel and travel.",
    color: "Higher = more energy stress.",
  },
  tri: {
    short: "Shipping and transport stress.",
    how: "Freight costs, chokepoints, marine insurance.",
    read: "High when ships take longer, costlier routes.",
    color: "Higher = more logistics stress.",
  },
  iri: {
    short: "Insurance stress (storms and war at sea).",
    how: "War-risk and storm insurance signals + weather + fighting.",
    read: "Sticky insurance costs can raise shipping and trade costs.",
    color: "Higher = tighter insurance markets.",
  },
  cpr: {
    short: "When food, energy, and metals all push together.",
    how: "Food + energy factors with market fear and transport.",
    read: "High means many real-world prices feel heavy at once.",
    color: "Higher = more commodity pressure.",
  },
  ror: {
    short: "Are investors brave (risk-on) or careful (risk-off)?",
    how: "Stocks/crypto strength versus gold and fear.",
    read: "Positive = brave · Negative = careful.",
    color: "Green risk-on · Red risk-off.",
  },
  nvi: {
    short: "How busy the news feed is.",
    how: "Counts recent headlines and scales them 0–100.",
    read: "Spikes mean a very loud news day — read carefully.",
    color: "Higher = denser news flow.",
  },
  cci: {
    short: "When several bad things fire together.",
    how: "Theaters + alerts + strong quakes at the same time.",
    read: "High means a cluster of problems, not just one story.",
    color: "Higher = more convergence.",
  },
  spi: {
    short: "Room for things to get better (constructive score).",
    how: "Rewards calmer markets and lower fighting/insurance/shipping stress.",
    read: "Higher SPI = more hope and room for positive paths. Green is good.",
    color: "Green high (good) · Red low (tight).",
  },
  osi: {
    short: "How dense public open sources are right now.",
    how: "News speed + crisis tone + disaster/quake heat.",
    read: "High means lots of public signal — still check sources.",
    color: "Higher = denser public feed.",
  },
  iis: {
    short: "How stressed power grids and telecom networks look.",
    how: "Outage events + power fragility + weak telecom + energy/weather pressure.",
    read: "High means blackouts, internet cuts, or network warnings are more likely in the model.",
    color: "Higher = more infrastructure stress.",
  },
};

const HOW_TO_STEPS = [
  {
    title: "① Left side = pick a desk",
    text: "Think of desks like rooms. Command is the living room. Markets is the money room. Chips & Data is tech. Impact is daily life. Hover a name to see what opens.",
  },
  {
    title: "② Top bar = what you care about",
    text: "Choose a Country and a Lens (a question). Example: Taiwan + Chips & cloud. News and prices will follow that choice.",
  },
  {
    title: "③ FLASH and INDICES",
    text: "FLASH scrolls live headlines. INDICES shows live prices (oil, gold, chips, currencies…). Click a price to focus it.",
  },
  {
    title: "④ Impact & grocery trip",
    text: "Open Impact. It explains politics, money, and daily life in easy words. The red grocery banner says if the next shop may feel cheaper or more expensive.",
  },
  {
    title: "⑤ Metals, chips, data centers",
    text: "Use Metals for gold and copper. Use Chips & Data for semiconductors and data centers (the buildings that run cloud and AI). Copper and power link them.",
  },
  {
    title: "⑤b Affordability (places to live)",
    text: "Open Affordability for housing, rent, groceries, utilities, energy, gas, cars, public vs private school, childcare, and healthcare. Higher place score = easier everyday living costs.",
  },
  {
    title: "⑥ Risk scores (KMRI · SPI…)",
    text: "Models desk explains each number in plain language. KMRI = world stress. SPI = room for things to improve. Click any card for details.",
  },
  {
    title: "⑦ Move panels (optional)",
    text: "Press E. Drag a panel title onto another panel. Press DONE — the yellow bar goes away and Custom is saved.",
  },
  {
    title: "⑧ Stay live",
    text: "Feeds refresh themselves. Green feed health means sources are up. Outages show on Traffic/Infrastructure. Press ? anytime for this guide.",
  },
];

const TOUR_STEPS = [
  { title: "Desks on the left", text: "Each button opens a ready room. Start with Command." },
  { title: "Country and lens on top", text: "They filter news and which prices you see." },
  { title: "Impact & groceries", text: "Easy words for politics, money, and the next shop." },
  { title: "Metals & chips", text: "Metals desk and Chips & Data desk cover gold, copper, semiconductors, and data centers." },
  { title: "You are ready", text: "Live sources update automatically. Press ? if you need help again." },
];

const DEFAULT_INTERVALS = {
  news: 90,
  markets: 45,
  quakes: 120,
  eonet: 180,
  weather: 150, // Open-Meteo + travel/weather warnings refresh ~2.5 min
  relief: 300,
  indicators: 25,
  ticker: 12,
};

const POLITICS_WATCH = [
  { title: "US–China strategic competition", region: "Indo-Pacific", tone: "elevated" },
  { title: "NATO eastern flank posture", region: "Europe", tone: "elevated" },
  { title: "Middle East multi-front risk", region: "MENA", tone: "high" },
  { title: "Sanctions enforcement (RU/IR/DPRK)", region: "Global", tone: "elevated" },
  { title: "Sahel governance collapse risk", region: "Africa", tone: "critical" },
  { title: "Election / protest volatility watch", region: "Global", tone: "watch" },
];

/** Simplified land polygons for SVG map fallback */
const WORLD_LAND = [
  [[-168, 72], [-140, 70], [-105, 73], [-80, 73], [-60, 60], [-55, 50], [-80, 25], [-97, 15], [-110, 22], [-125, 35], [-130, 50], [-165, 60], [-168, 72]],
  [[-50, 84], [-20, 82], [-15, 70], [-45, 60], [-55, 70], [-50, 84]],
  [[-80, 12], [-60, 10], [-35, -5], [-35, -30], [-55, -55], [-75, -50], [-82, -5], [-80, 12]],
  [[-10, 36], [-9, 44], [-5, 48], [2, 51], [8, 55], [12, 55], [20, 55], [30, 70], [40, 70], [30, 60], [28, 45], [20, 40], [10, 38], [-10, 36]],
  [[5, 58], [10, 60], [20, 70], [30, 71], [25, 60], [15, 55], [5, 58]],
  [[-17, 15], [-10, 35], [10, 37], [25, 32], [32, 30], [43, 12], [50, 10], [40, -5], [35, -25], [20, -35], [15, -35], [12, -15], [-5, -5], [-15, 5], [-17, 15]],
  [[28, 32], [35, 37], [45, 40], [50, 30], [55, 25], [60, 25], [57, 18], [43, 12], [35, 15], [28, 22], [28, 32]],
  [[30, 60], [40, 70], [60, 70], [80, 70], [100, 70], [120, 70], [140, 70], [170, 65], [180, 65], [180, 55], [140, 50], [120, 45], [80, 45], [60, 45], [50, 50], [40, 50], [30, 55], [30, 60]],
  [[140, 70], [160, 70], [180, 70], [180, 60], [160, 55], [140, 55], [140, 70]],
  [[68, 25], [70, 30], [80, 30], [88, 28], [92, 25], [90, 15], [80, 8], [72, 15], [68, 25]],
  [[92, 25], [100, 22], [108, 22], [109, 15], [105, 10], [100, 5], [98, 15], [92, 20], [92, 25]],
  [[75, 40], [80, 45], [100, 45], [120, 45], [130, 45], [135, 35], [125, 25], [110, 20], [100, 25], [90, 30], [80, 35], [75, 40]],
  [[126, 38], [130, 42], [130, 35], [126, 33], [126, 38]],
  [[130, 45], [140, 45], [145, 43], [142, 35], [138, 34], [132, 33], [130, 35], [130, 45]],
  [[115, -20], [130, -12], [145, -12], [153, -25], [150, -38], [140, -38], [115, -35], [115, -20]],
  [[95, -5], [105, -6], [120, -8], [130, -5], [135, -3], [120, 0], [105, 5], [95, 0], [95, -5]],
  [[-8, 50], [-5, 55], [0, 58], [2, 52], [-4, 50], [-8, 50]],
  [[-24, 65], [-14, 66], [-13, 64], [-22, 63], [-24, 65]],
  [[43, -12], [50, -12], [47, -25], [43, -25], [43, -12]],
  [[166, -42], [175, -35], [178, -42], [172, -47], [166, -45], [166, -42]],
];
