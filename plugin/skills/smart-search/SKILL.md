---
name: smart-search
description: Finds the companies and people a person asks for on a Belkins Home 2.0 client project with a bh2 smart search - looks in our own database first, plans what to buy from Generect (and Apollo, and web pages) with a budget the person approves in Belkins Home, judges every company with a reason, and saves the fit companies and their people into the project. Use whenever the person asks to find, build or add a list of companies, leads, contacts or people for a client, to look on a directory, exhibitor, member or team page, or to continue or check a smart search.
---

# Smart search

You find what the person asked for: companies that fit, and the right people in them. Two rules
matter most. **Free before paid**: our own database and Generect's counts cost nothing, so they
come first, and nothing is bought that a count says is not there. **The person holds the money**:
every paid call runs inside a budget a person approves on the search's page in Belkins Home. You
write the plan and ask for the budget; you never approve it, and you stop when it runs out.

Read `bh2 brief` first (the getting-started skill). Everything below acts on the project in use.

## Steps

1. **Understand the ask.** Who (titles), at what companies (industry, size, place, anything else
   that makes one fit), how many, and what to leave out. Fill the gaps from the brief before
   asking the person:
    - `audiences`: the project's title lists. Use them unless the person names other titles.
    - `insights.pages`: the client's own words. `bh2 insights read <id>` an ideal client profile,
      value proposition or case study page before judging anyone.
    - `earlierSearches`: filters the team already used; `makeUp`: what the project already holds
      (its industries, countries, sizes, titles). A new search should not repeat an old one.
      Ask the person only what the brief does not answer, in one message.
2. **Start the search.** `bh2 search new --name "<short name>" --ask "<the person's words>"`. Keep
   the `slug` and the `link` (the search's page in Belkins Home).
3. **Size it, for free.**
    - `bh2 db companies --industry … --location … --size …`: companies our database already holds,
      fresh, not in the project. `total` says how many match.
    - `bh2 call <search> generect /search/database/companies/count/ --body '{…}'`: how many more
      Generect holds. It is net of what the project has. See references/generect.md for bodies.
    - For people at companies you will judge: `bh2 db people --company <id> … --title <words>` finds
      people with a checked email we already hold.
    - `bh2 call <search> generect /search/database/leads/count/ --body '{…}'`: how many people
      Generect's database holds for the titles and places, net of the project's people.
4. **Plan and ask for the budget.** Write the plan in plain words, for the person (references are
   not for them): what you will look at first, what you will buy, how many rows, at what price,
   and the most it can cost, counting up to $0.027 for each person you plan to save (their email
   search). Then
   `bh2 search plan <search> --file clients/<project>/<search>-plan.md --budget <usd>`. Tell the
   person, in one message: the plan in three lines, the amount, and the link: "Open it and press
   Approve". Free steps (our database, counts) can go on while you wait; `bh2 search show <search>`
   says when `budgetApproved` is set.
5. **Find companies.** Our database first (`bh2 db companies`, page by page), then bought pages
   (`bh2 call <search> generect /search/database/companies/ --body '{…, "limit_by": 100}'`). Ask for
   the smallest page that lets you judge: 50–200 rows, never thousands. A page longer than bh2
   prints is saved to `clients/<project>/calls/<callId>.json`; read it from there. For companies
   listed on a web page, see references/web-pages.md.
6. **Judge every company you looked at** (references/judging.md): `fit`, `not_fit` or `unsure`,
   with a one-sentence reason a person can check, and evidence for a fit. Save in batches of up to
   500: `bh2 companies save <search> --file clients/<project>/<search>-verdicts.json`. Fit ones go
   into the project; the rest are kept on the search's page and are never bought again.
7. **Find people** at the fit companies. Our database first: `bh2 db people --company <companyId> …
--title …`. Then Generect:
    - people inside listed companies, up to 50 companies a call: `/search/realtime/company-leads/`
      with the companies' LinkedIn links and the titles as personas. `limit_by` there is people
      **per company**: 50 companies × 3 people is 150 people, $1.05 at most;
    - or, for people across many companies at once ("owners of dental clinics in Texas"),
      Generect's database of people: $0.0045 a person, the cheapest, but check each row's
      `updated_at` (references/generect.md).
8. **Save the people**: `bh2 people save <search> --file clients/<project>/<search>-people.json`,
   a list of `{"contactId"}` (from `bh2 db people`) or `{"callId", "salesId"}` (from a bought
   answer). A person goes in only under a company the project holds: save the company first.
   When an Apollo match or a page you read shows the person's own address, add it:
   `{"callId", "salesId", "email", "emailCallId"}`, with `emailCallId` the Apollo or read call.
   The server checks that address first and asks its sources only if it fails, so Apollo is not
   paid twice. Only an address that answer shows: never a guess, never a shared inbox (`info@`,
   `office@`).
   Saving starts each person's email search at once, on the server: patterns, Hunter, Apollo, then
   the quick check and, when it cannot tell, the deep check (a test email and up to ~10 minutes per
   address). Each person holds up to $0.027 of the budget until their email settles; most cost under
   one cent. People the budget left cannot hold are refused (`email_budget`) and not saved: ask for
   more budget, then save them again from the same answer. Nothing is bought twice.
9. **Close it.** When the ask is met or the budget is spent: `bh2 search show <search>` for the
   numbers. Emails settle on their own within minutes to an hour; `counts.emails.inProgress` says
   how many are still being found or checked, and the search can be closed with them running
   (`bh2 search done <search>` stops buying, not the email searches). Then the hand-over.

## Reading the answers

| Field                                              | Where             | What it is                                                                                                                                                                    | What to do                                                                                                    |
| -------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `budget.approvedUsd` / `spentUsd` / `remainingUsd` | every paid call   | The money: approved, spent (running calls counted at their worst case), left                                                                                                  | Plan the next call to fit `remainingUsd`.                                                                     |
| `costUsd`                                          | a call            | What the vendor charged; the worst case when it does not say                                                                                                                  | Compare with what you expected; a big gap goes in the hand-over.                                              |
| `resultsCount`                                     | a call            | Rows in the answer (or the count, for a count)                                                                                                                                | Zero on a paid page: change the filters, do not ask again.                                                    |
| `excludedByServer`                                 | a Generect call   | Companies or people of the project the server left out for you                                                                                                                | Nothing; it is why a repeat brings new rows.                                                                  |
| `exclusionsTrimmed`                                | a Generect call   | The project's lists did not all fit in one call                                                                                                                               | Known rows may come back; the save skips them.                                                                |
| `savedTo`                                          | a long answer     | Where the answer was written                                                                                                                                                  | Read rows from the file.                                                                                      |
| `callId`                                           | a call            | The bought answer, kept                                                                                                                                                       | Saves name it; `bh2 call show <callId>` reads it again for free.                                              |
| `awaitingApproval`                                 | `bh2 search show` | You asked for more than a person approved                                                                                                                                     | Remind the person with the link; buy nothing meanwhile.                                                       |
| `counts`                                           | `bh2 search show` | Verdicts so far, companies and people the search added, and `emails`: still being found or checked (`inProgress`), then `valid`, `catchAll`, `unknown`, `invalid`, `notFound` | The numbers for the hand-over. Only `valid` (and, if the person accepts it, `catchAll`) can be written to.    |
| `reservedUsd`                                      | `bh2 search show` | The part of `spentUsd` held for work still running: calls, and email searches not yet settled                                                                                 | It comes back as emails settle; wait for it before asking for more budget.                                    |
| `refused`                                          | a save            | Inputs left out, by their place in your list, with a code                                                                                                                     | `employer_not_in_project`: save the company first; `do_not_contact`: leave it; `row_not_found`: check the id; `row_not_savable`: the row names no employer, so find the person inside their company (company-leads, a persona for their title) and save that row; `email_not_in_answer`, `email_other_person`, `shared_inbox`: save them without `email`, or with the call that shows their own address. |

## Decision rules

- **Counts and our database before any page.** Never buy a page the count says is empty.
- **One small page first** on a call you have not used in this search: `limit_by` 10, check the
  rows are what you asked for, then the full page.
- **Out of budget**: a smaller page that still answers the question is fine; otherwise stop
  buying, write how much more is needed and why with `bh2 search plan --budget`, and ask the person
  to approve it.
- **`already_bought`**: the same call was bought for this project within 30 days. Read it with
  `bh2 call show`; `--again` only when the data must be fresher than that.
- **`unsure` is a valid verdict.** A company you cannot judge from what you have is `unsure` with
  what is missing; a person sees it on the page. Do not guess `fit`.
- **The person decides** the titles, the regions and anything that changes the budget. You decide
  page sizes and the order of steps.

## What to write back

- Verdicts and people: the saves above. Nothing found is lost if it is saved.
- The plan and any change to it: `bh2 search plan`.
- The hand-over (getting-started): the search's slug and link, spent against approved, companies
  by verdict, people added, what is left and what it would cost.

## Common mistakes

- Buying before counting, or a 1,000-row page to judge 50 companies.
- Reading `limit_by` on company-leads as a total: it is per company.
- Judging from the name alone. A "dental" in the name is not evidence; the description, the
  industry or the website is.
- Saving people before their company, or under a company you judged `not_fit`.
- Asking the person to approve in chat. Only the button on the search's page approves.
- Putting the plan for the person in Generect's terms. Write "about 300 dental clinics in Texas,
  10–50 people, $1.35 at most", not filter names.
