/* LODESTRATH configuration. Final EUR prices; no VAT is charged.
   Payment links: Stripe Payment Link per desk and licence. Empty = the button opens an email
   to the house instead (no checkout). */
window.LODESTRATH_CONFIG = {
  CONTACT: "isoline@benjaminkoch.info",
  PORTAL_URL: "https://billing.stripe.com/p/login/eVq7sMahEdQrc1a4Oocs800",
  PAYMENT_LINKS: {
    "macro-central-banks": { quarter: "https://buy.stripe.com/14AdRablI9Abc1agx6cs808", year: "https://buy.stripe.com/fZu4gA4XkaEffdm3Kkcs809" },
    "geointel":            { quarter: "https://buy.stripe.com/fZu14o61o13Ffdma8Ics80a", year: "https://buy.stripe.com/7sYaEYblIdQr2qA0y8cs80b" },
    "energy-commodities":  { quarter: "https://buy.stripe.com/6oUcN60H4bIj3uE80Acs80c", year: "https://buy.stripe.com/5kQcN61L827J4yI3Kkcs80d" },
    "sanctions-trade":     { quarter: "https://buy.stripe.com/8x25kE4XkbIje9i3Kkcs80e", year: "https://buy.stripe.com/7sY00kfBY6nZfdmbcMcs80f" },
    "boardroom-legacy":    { quarter: "https://buy.stripe.com/00w7sMfBYeUvd5e0y8cs80g", year: "https://buy.stripe.com/cNifZi3TgcMn4yIa8Ics80h" },
    house_year: "https://buy.stripe.com/7sYaEYexU5jV2qA3Kkcs80i"
  }
};
