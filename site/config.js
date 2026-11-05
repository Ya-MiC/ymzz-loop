// SPDX-License-Identifier: MIT · ymzz-notion site config (public — never put secrets here)
// SIGNUP_ENDPOINT: URL of your deployed signup worker (see docs/signup.md), e.g.
//   "https://ymzz-signup.<your-subdomain>.workers.dev/subscribe"
// Leave "" to disable sign-up: the form then explains it is not open yet and offers SIGNUP_MAILTO.
window.YMZZ_CONFIG = {
  SIGNUP_ENDPOINT: "",
  SIGNUP_MAILTO: "",
  VERSION: "1.3.0"
};
