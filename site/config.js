// SPDX-License-Identifier: MIT · ymzz-loop site config (public — never put secrets here)
// SIGNUP_ENDPOINT: URL of your deployed signup worker (see docs/signup.md), e.g.
//   "https://ymzz-signup.<your-subdomain>.workers.dev/subscribe"
// Leave "" to disable sign-up: the form then explains it is not open yet and offers SIGNUP_MAILTO.
//
// FONTS LOCKED (do not change without legal + design review):
//   UI text      → Inter (OFL-1.1) — all chrome, body, labels, buttons
//   Display      → Fraunces (OFL-1.1) — existing display headlines only
//   Code         → JetBrains Mono (OFL-1.1) — code / pre only
//   Numbers      → font-variant-numeric: tabular-nums lining-nums (locked)
// Self-hosted under site/fonts/; see CREDITS.md + site/licenses/.
window.YMZZ_CONFIG = {
  SIGNUP_ENDPOINT: "",
  SIGNUP_MAILTO: "",
  VERSION: "1.17.0",
  FONTS_LOCKED: true
};
