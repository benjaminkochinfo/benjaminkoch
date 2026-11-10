/* WMT landing configuration. This page is deployed as /wmt/wm_terminal.html; the terminal lives at /wmt/terminal.html. */
window.WMT_CONFIG = {
  TERMINAL_URL: "terminal.html",
  CONTENT_URL: "landing/data/content.json",
  MODELS_URL: "landing/data/models.json",
  SEEDS_URL: "landing/data/seeds.json",
  COUNTRIES_URL: "landing/assets/geo/countries.geojson",
  /* Final EUR prices (incl. VAT), approved 10 Nov 2026. */
  PRICING: {
    approved: true,
    weekly:    { label: "€9",  per: "/ month",   alt: "or €90 / year" },
    monthly:   { label: "€19", per: "/ month",   alt: "or €190 / year" },
    quarterly: { label: "€79", per: "/ quarter", alt: "or €290 / year" }
  },
  /* Payments (Stripe only): paste a Stripe Payment Link (https://buy.stripe.com/...) per tier.
     Empty = button falls back to the waitlist form. No backend required. */
  PAYMENT_LINKS: {
    weekly: "",
    monthly: "",
    quarterly: ""
  },
  /* Newsletter / waitlist: Brevo embedded form. Paste the form's action URL from
     Brevo > Contacts > Forms > (your form) > Share > HTML code, e.g.
     "https://xxxxxxxx.sibforms.com/serve/MUIFA...". Empty = form stays disconnected (preview).
     Double opt-in is configured on the Brevo side. CADENCE_FIELD must match a Brevo contact
     attribute name (create a text attribute "CADENCE"), or set it to "" to omit. */
  NEWSLETTER: {
    provider: "brevo",
    formAction: "https://39e981b8.sibforms.com/serve/MUIFAHWzkV1-LBO8X8eOZ8mZDRtvzGYJx8rYo9pRpIeAZZfQQLjU8UsnSLZRBPzRiFon0JS3Ntz8XwVpKzkHKswBDGNSR9w0z0WNnyuQEqIOpbCPliFN1DG5D1OcdLaWXhNItB7Oic_HcHmvwG-hFV1XTTD1FpS6HTtua00EO20WxF5NLW8zk86ri2oXKMcg1H0Hnn9Wqrq9bpoznA==",
    CADENCE_FIELD: ""
  },
  PRESETS: [
    { name: "Berlin", lat: 52.52, lon: 13.405 },
    { name: "Rotterdam port", lat: 51.95, lon: 4.14 },
    { name: "Jebel Ali", lat: 25.01, lon: 55.06 },
    { name: "Singapore Strait", lat: 1.26, lon: 103.82 },
    { name: "Taipei", lat: 25.03, lon: 121.56 },
    { name: "Kyiv", lat: 50.45, lon: 30.52 },
    { name: "Panama Canal", lat: 9.08, lon: -79.68 }
  ]
};
