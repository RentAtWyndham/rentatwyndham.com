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
Owner application live re-run 2026-11-26 12:33 PM PT on owner-interest v1.2.3 (web app version 10): ref WEB-20261126-123338-FORMCH, one submission, desktop. PASS - row written on Website Applications (read back); team alert from the join@ alias and owner auto-reply with the booking-link line ending "Best," (both read in jellis@ Gmail by John); queue-file entry and ntfy "New owner application" posted by the a9-max relay 12:35 PM PT (relay log); thank-you heading, reference, applicant email filled in step 1 ("on its way to jellis@rentatwyndham.com" - empty only in a raw page fetch, owner-form.js fills it on success), "Pick a time to talk with John" above the steps, form hidden. NOT re-checked: 390px (agent could not resize; last checked 2026-11-24 11:35 PM PT). Test row: WEB-20261126-123338-FORMCH (Status "TEST - delete") - John to delete. The 2026-11-24 row WEB-20261124-233515-FORMCH is gone. Previous run 2026-11-24 11:35 PM PT (PR 28): checks 1-4 PASS live; check 5 PASS on v1.1.0.

Last updated 2026-11-18 11:00 PM PT. **All four forms passed all five checks live on 2026-11-18**, desktop and 390px, with the
emails read in Gmail. All four share `assets/js/form-kit.js` (field checks, send, slow-send label, reference line).

| Form | Page | Script | Backend (automations/apps-script) | 1 Response | 2 Field errors | 3 Message | 4 Next | 5 Email |
|---|---|---|---|---|---|---|---|---|
| Booking request | /booking-request | assets/js/site.js + form-kit.js | website-date-request v1.4.0 | PASS - 6.5 s, ref WEB-20261118-220820-FORMCH | PASS - 8 fields on an empty form (Adults and Kids have defaults); bad email + phone; same at 390px | PASS - "Thank you, Test. We received your request." + summary + reference | PASS - stays on page, form replaced by the "Request received" panel | PASS - ack "We received your request - RentAtWyndham.com" ("Good to see you again, Test!") + info@ "Date Request - ..." with the same Inquiry ID and the History line |
| Owner application | /rent-your-points | assets/js/owner-form.js + form-kit.js | owner-interest v1.2.3 live (web app version 10, 2026-11-26) | PASS 2026-11-24 11:35 PM PT - 3.8 s, ref WEB-20261124-233515-FORMCH read from the backend reply | PASS - 6 fields incl. contract 1 resort and points, "6 fields need attention" line, nothing sent; 390px, no sideways scroll | PASS - "Thank you, Test! We're so glad you reached out." + "Pick a time ... now, or we'll reach out within a day." + reference | PASS - stays on page, form hidden; primary button "Pick a time to talk with John" above the 3 steps opens the booking page in a new tab; "Prefer to talk first? Pick a time" under Apply now and by Submit (new tab) | PASS 2026-11-26 on v1.2.3 - "Thanks for applying with RentAtWyndham" from join@ with the booking-link line, ends "Best,"; team "New Owner Application - Formcheck - ..." from the join@ alias (no longer jellis@ -> jellis@); ntfy "New owner application" via the relay |
| Resale contract interest | /wyndham-points-for-sale | assets/js/contracts.js + form-kit.js | resale-buyer-interest v1.4.0 | PASS - 4.2 s, ref RES-20261118-225257-FORMCH (contract RC-01) | PASS - 3 fields once a contract is picked (4 with none); same at 390px | PASS - "Thank you, Test. We received your request." + contract + reference | PASS - stays on page, "Back to the contract list" link | PASS in TEST mode - buyer reply, "TEST Wyndham contract buyer" notice and team "Resale Interest - ..." with the same Reference, all to John only; John Kushman not emailed, Contracts tab untouched (read back) |
| Special deals pop-up | / (home, or /#deals to open it) | assets/js/deals-popup.js + form-kit.js | special-deals-signup v1.2.0 | PASS - 3.6 s, ref DEAL-20261118-225436-TEST | PASS - first name + email; same at 390px | PASS - "You're on the list, Test." then, second time, "You're already on the list, Test." with the same reference | PASS - "Request your dates" button to /booking-request | PASS - welcome "You're on the RentAtWyndham deals list" + info@ "New deals sign-up - Test" with the same Reference; no email on the repeat |

Slow-send label: seen live on booking, owner and resale ("Sending - this can take up to 20 seconds..." at 4.0 s). The deals send
finished in under 4 s, so its label was only checked in the mocked test.

Not covered live (by design): a real resale buyer, where John Kushman is cc'd and the Contracts tab is updated - that path last ran
for real on 2026-11-09 and is covered by the backend's offline tests. Known and harmless: in resale TEST mode the buyer email and
the page still say John Kushman was copied; only John ever sees that.

Test rows: all six were deleted on 2026-11-18 about 11:05 PM PT with John's OK and read back (Leads tab WEB-20261118-220820-FORMCH,
WEB-20261118-203743-FORMCH, WEB-20261118-190742-TEST; Website Applications WEB-20261118-225107-FORMCH; resale Leads
RES-20261118-225257-FORMCH; deals Subscribers DEAL-20261118-225436-TEST).

Wording decisions (John 2026-11-18): the booking side box now reads "Usually within the hour during business hours (the same day
otherwise), we email you back ..." (was "Usually the same day, John or Elizabeth emails you back ..."). The owner page keeps
join@rentatwyndham.com and the resale page keeps owners@rentatwyndham.com - the Primer's "questions go to info@" rule covers renter
messages only.
