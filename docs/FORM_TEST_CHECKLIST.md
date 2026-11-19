# Website form test checklist

John's rule (2026-11-18): every form on rentatwyndham.com is tested end to end before a change to it is called done.
Test all five points below on the live site, on desktop and at phone width (about 390px).

## The five checks for every form
1. **Response** - the visitor's submission really reached the backend. The page must read the backend reply, not assume success.
   A `fetch(..., {mode: 'no-cors'})` cannot read the reply and shows success even when the send failed - that fails this check.
2. **Missing or wrong fields** - each problem field is marked in red with its own plain message under it ("Enter your first name."),
   plus one line by the button saying how many fields need attention. Not just the browser's one-at-a-time pop-up.
3. **On-page message after sending** - professional and specific: thanks them by name, repeats what they sent,
   says what happens next and when, and gives a reference ID. If the send fails, it says so and gives the email fallback.
4. **Where they go next** - what the visitor sees or is sent to after the message (same page, a thank-you page, a link onward).
   Write down the expected result for each form.
5. **Email they get** - the auto-reply to the visitor (subject, sender, wording) and the team notice (to whom, subject),
   both checked in Gmail. The team notice must show the same reference ID as the page.

## Test data rules
- Use a TEST identity: last name with "Test" or "Formcheck", own email (jellis@), notes "TEST - not a real request. Do not quote. Safe to delete."
- At most two real submissions per form per test run.
- Post a row on the AI Discussion Board (To ALL) before testing so the bots ignore TEST leads, and a row after with what to clean up.
- Do not edit the Rental Worksheet during the test; list TEST rows for John to delete.

## Mocked test before every push
`node docs/forms.mock.test.js .` (needs Playwright) serves the site locally, fakes script.google.com and checks all four forms at
1280px and 390px: empty submit, bad email and phone, network failure, unreadable reply, every backend error code, the slow-send
label, success with a reference, an older backend with no reference, and no sideways scroll. 352 checks. It sends nothing real.

## Forms and status
Last updated 2026-11-19. All four forms share `assets/js/form-kit.js` (field checks, send, slow-send label, reference line).
"Mock" = passed the mocked test above. "Live" = passed on the real site with real emails checked in Gmail.

| Form | Page | Script | Backend (automations/apps-script) | 1 Response | 2 Field errors | 3 Message | 4 Next | 5 Email |
|---|---|---|---|---|---|---|---|---|
| Booking request | /booking-request | assets/js/site.js + form-kit.js | website-date-request | Live PASS 2026-11-18 (ref WEB-20261118-203743-FORMCH) | Live PASS 2026-11-18 | Live PASS 2026-11-18: thanks by name, summary, reference | Live PASS: stays on page, form and side box hidden | Live PASS 2026-11-18: ack "We received your request - RentAtWyndham.com" + info@ "Date Request - ..." with the same Inquiry ID |
| Owner application | /rent-your-points | assets/js/owner-form.js + form-kit.js | owner-interest | Mock pass - live test pending | Mock pass - live pending | Mock pass - live pending ("Thank you, [name]! ..." + "mention reference WEB-...") | Stays on page, form hidden, 3 next steps - live pending | Owner "Thanks for applying with RentAtWyndham" from join@ + team "New Owner Application - ..." with "Reference:" - live pending |
| Resale contract interest | /wyndham-points-for-sale | assets/js/contracts.js + form-kit.js | resale-buyer-interest | Mock pass - live test pending | Mock pass - live pending | Mock pass - live pending ("Thank you, [name]. We received your request." + contracts + "mention reference RES-...") | Stays on page, "Back to the contract list" link - live pending | Buyer "Your interest in these Wyndham contracts" + team "Resale Interest - ..." with "Reference:" - live pending. A test from jellis@ runs in TEST mode: John Kushman is not emailed |
| Special deals pop-up | / (home, or /#deals to open it) | assets/js/deals-popup.js + form-kit.js | special-deals-signup | Mock pass - live test pending | Mock pass - live pending | Mock pass - live pending ("You're on the list, [name]." / "already on the list" + reference DEAL-...) | "Request your dates" button to /booking-request - live pending | Welcome "You're on the RentAtWyndham deals list" + info@ "New deals sign-up - ..." with "Reference:" - live pending |

Changes since the 2026-11-18 booking test (so the booking form gets one more live run with the others): the booking form moved onto
form-kit.js, the button says "Sending - this can take up to 20 seconds..." after 4 seconds, and the info@ notice gains a "History:" line
(backend v1.4.0).

Reference IDs: every backend returns one once its new version is deployed (owner-interest v1.1.0 `WEB-...-LASTNA`, resale-buyer-interest
v1.4.0 `RES-...`, special-deals-signup v1.2.0 `DEAL-...`). Until then the three pages simply show no reference line.
