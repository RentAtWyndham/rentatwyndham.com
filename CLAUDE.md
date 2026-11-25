# rentatwyndham.com - notes for Claude Code
Line: RAW. Static site (GitHub Pages). Rules: Primer in Drive RAW Team Hub; Operating Core card in rental-worksheet-ops AGENTS.md.

## Forms must pass the five-check test (John 2026-11-18)
Before calling any change to a site form done, test it per `docs/FORM_TEST_CHECKLIST.md`:
the response is really received, missing fields are explained, the on-page message after sending,
where the visitor goes next, and the email(s) they and the team get. Update the status table in that file.

## Merging pull requests (John 2026-11-24 in Claude Code)
John: "merge your own PRs once checks pass always. Leaving them open and waiting on me only causes delays and I am not to be a bottle neck." and "merge the PRs as you see fit when it makes sense and something is simply waiting on my OK. If it is something critical, let me know that I should review it."
- Claude Code merges its own pull request as soon as its checks pass (run the tests first where the repo has no CI). Do not leave a PR open waiting on John's OK. Tell John after, with the full PR link and what is and is not live.
- Critical = stop and ask John to review first, with the link and one line on why: money out, refunds, cancellations, payout or price logic, deleting data, a bulk sheet change, or turning on a new automatic message to renters or owners.
- A merge is not a deploy. Say whether the change is live (a9-max deploy for scripts, GitHub Pages for the site).
- Never merge a PR another person or another session opened unless John asks. The Operating Core card limits (payments, deletions, bulk: John's OK first) are unchanged.
