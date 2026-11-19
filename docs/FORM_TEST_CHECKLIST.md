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

## Forms and status
| Form | Page | Script | Backend (automations/apps-script) | 1 Response | 2 Field errors | 3 Message | 4 Next | 5 Email |
|---|---|---|---|---|---|---|---|---|
| Booking request | /booking-request | assets/js/site.js | website-date-request | Fixed in PR #21 (reads reply) - live test pending | Fixed in PR #21 | Fixed in PR #21 | Stays on page, form hidden | Ack "We received your request - RentAtWyndham.com" + info@ "Date Request - ..." - live test pending |
| Owner application | /rent-your-points | assets/js/owner-form.js + form-kit.js | owner-interest | Reads reply (fixed) - live test pending | Inline red errors incl. each contract's resort and points (fixed) | "Thank you, [name]! ..." + confirmation email address | Stays on page, form hidden, 3 next steps | Owner "Thanks for applying with RentAtWyndham" from join@ + team "New Owner Application - ..." - live test pending |
| Resale contract interest | /wyndham-points-for-sale | assets/js/contracts.js + form-kit.js | resale-buyer-interest | Reads reply (fixed) - live test pending | Inline red errors (fixed) | "Thank you, [name]. We received your request." + contracts + email (fixed) | Stays on page, "Back to the contract list" link | Buyer "Your interest in these Wyndham contracts" (cc John Kushman) + team "Resale Interest - ..." - live test pending |
| Special deals pop-up | / (home) | assets/js/deals-popup.js + form-kit.js | special-deals-signup | Reads reply (fixed) - live test pending | Inline red errors (fixed) | "You're on the list, [name]." / "already on the list" + email (fixed) | "Request your dates" button to /booking-request | Welcome "You're on the RentAtWyndham deals list" + info@ "New deals sign-up - ..." - live test pending |

Known gap: only the booking request backend returns a reference ID; the other three backends return ok/error only, so their pages show no reference number.
