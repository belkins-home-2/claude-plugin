---
name: smart-search
description: Finds the companies and people a person asks for on a Belkins Home 2.0 client project with a bh2 smart search - looks in our own database first, plans what to buy from Generect (and Apollo, and web pages) with a budget the person approves in Belkins Home, judges every company with a reason, and saves the people at the fit companies into the project, each with their company. Use whenever the person asks to find, build or add a list of companies, leads, contacts or people for a client, to look on a directory, exhibitor, member or team page, or to continue or check a smart search.
---

# Smart search

You find what the person asked for: the right people at companies that fit. The route is yours to
choose. This skill gives you what you cannot see from here (what each source holds, what it costs,
how bh2 answers) and the few things that always hold.

Read `bh2 brief` first (the getting-started skill). Everything below acts on the project in use.

## What always holds

- **The person holds the money.** Every paid call runs inside a budget a person approves on the
  search's page in Belkins Home. You write the plan and ask for the budget; you never approve it,
  and you stop buying when it runs out. The server refuses a paid call the budget cannot hold.
- **Free before paid.** Our own database and Generect's database counts cost nothing. Never buy a
  page a count says is empty.
- **The person decides** the titles, the regions and anything that changes the budget. Take what
  the brief already says first: `audiences` are the project's title lists, `insights.pages` the
  client's own words (read them before judging anyone), `earlierSearches` and `makeUp` what the
  team already has, not to be repeated. Then ask the rest in one message.
- **What you find is kept through bh2**: verdicts, people, the plan, the hand-over. Files under
  `clients/<project>/` are your working copies; the next session sees only what bh2 saved.

## What a finished search has

- A search, `bh2 search new --name "<short name>" --ask "<the person's words>"` (keep its `slug`
  and `link`, the search's page), with a plan in plain words and a budget the person approved.
- A verdict on every company you looked at: `fit`, `not_fit` or `unsure`, with a reason a person
  can check (references/judging.md). It is what the person reads, and what keeps the next page new.
- The people the person asked for, saved under fit companies. Their emails are found and checked on
  the server.
- A hand-over (getting-started): the search's slug and link, spent against approved, companies by
  verdict, people added, what is left and what it would cost.

It is done when the people are there or the budget is spent, not when every source was tried.

## Choosing the route

Choose by what the ask turns on, and switch or mix when the counts say so.

- **Companies first**, when what makes a company fit is the hard part ("practices with three or
  more dentists that do implants"): find and judge companies, then look for people inside the fit
  ones.
- **People first**, when the title and the place carry the ask ("owners of dental clinics in
  Texas"): search people, then judge each person's company before saving them. Fewer companies get
  judged that never get a lead. A company our database holds is judged by its LinkedIn id
  (`{"linkedinId"}`); for one it does not (`company_not_found`), buy its row first
  (`/enrich/database/company/` with its `id`, $0.0045) and judge it from that call.
- **From a list on a web page**, when the ask names one (exhibitors, members, a team page):
  references/web-pages.md.
- **Picking a search up**, yours or a teammate's: `bh2 search show <search>` for the money and the
  counts; `bh2 companies list <search> --verdict fit` for each fit company's `peopleStatus`:
  `saved`, `searched` (a company-leads call listed it and nobody was saved; `peopleFound` is how
  many people it returned) or `not_searched`. A free `bh2 db people` lookup does not count as a
  search.

## Sources and prices

Free:

- `bh2 db companies --industry … --location … --size …`: companies our database holds, refreshed
  within 3 months, not in the project, not judged. `total` says how many match.
- `bh2 db people --company <id> … --title <words>`, or by industry and place: people with a
  checked email we already hold.
- Generect's database counts, `/search/database/companies/count/` and
  `/search/database/leads/count/`: net of what the project holds.

Paid, through `bh2 call <search> <provider> <path> --body '{…}'` (references/generect.md has the
bodies, the fields each call takes, and what was measured):

- Companies in Generect's database: `/search/database/companies/`, $0.0045 a row.
- People in Generect's database: `/search/database/leads/`, $0.0045 a person, the cheapest. Rows
  can be old: check each `updated_at`.
- People on LinkedIn now: `/search/realtime/leads/` across companies, $0.007 a person (its count
  costs $0.007 too); `/search/realtime/company-leads/` inside up to 50 listed companies a call,
  $0.007 a person, where `limit_by` is people **per company** (50 companies × 3 people is 150
  people, $1.05 at most).
- One record: `/enrich/database/company/` or `/enrich/database/lead/`, $0.0045. Apollo's
  `/people/match`, $0.0083 when it finds the person, gives their profile and often their work
  address.
- A web page: `bh2 read <search> <url>`, $0.0005, or $0.0025 with `--protected`
  (references/web-pages.md).

`bh2 calls` lists every call with its price. A page longer than bh2 prints is saved to
`clients/<project>/calls/<callId>.json`; read it from there. `bh2 call show <callId>` reads a bought
answer again for free.

## Good defaults

Defaults, not rules: change them when the ask needs it, and say why in the hand-over.

- **A call you have not used in this search**: try it on the smallest page first and check the rows
  are what you asked for. An ignored filter is paid for row by row (references/generect.md).
- **Page size**: what lets you decide. 50–200 companies is usually enough to judge; thousands never
  are.
- **Out of budget**: a smaller page that still answers the question, or stop buying and ask for
  more with `bh2 search plan <search> --budget <usd>`, saying how much and why.
- **`already_bought`**: the same call was bought for this project within 30 days. `bh2 call show`
  reads it for free; `--again` only when the data must be fresher than that.
- **`unsure` is a valid verdict.** A company you cannot judge from what you have is `unsure`, with
  what is missing. Do not guess `fit`.

## The plan and the budget

Write the plan for the person, in plain words (references are not for them): what you will look at,
what you will buy, how many rows, at what price, and the most it can cost, counting up to $0.027 for
each person you plan to save (their email search). Write "about 300 dental clinics in Texas, 10–50
people, $1.35 at most", not filter names. Then
`bh2 search plan <search> --file clients/<project>/<search>-plan.md --budget <usd>`, and tell the
person in one message: the plan in three lines, the amount, and the link: "Open it and press
Approve". Free work can go on while you wait; `bh2 search show <search>` says when
`budgetApproved` is set. Only the button on the search's page approves, never a word in chat.

## Saving

- **Verdicts**: `bh2 companies save <search> --file clients/<project>/<search>-verdicts.json`, up to
  500 at a time. A verdict adds nothing to the project: a fit company joins it with the first person
  saved there, so the project holds only companies with a lead. A judged company is never bought
  again.
- **People**: `bh2 people save <search> --file clients/<project>/<search>-people.json`, a list of
  `{"contactId"}` (from `bh2 db people`) or `{"callId", "salesId"}` (from a bought answer). A
  person goes in only under a company the project holds or one you judged fit.
- **An address you saw**: when an Apollo match or a page you read shows the person's own address,
  add `"email"` and `"emailCallId"` (that call). The server checks it first and asks its sources
  only if it fails, so Apollo is not paid twice. Never a guess, never a shared inbox (`info@`,
  `office@`).
- **Emails**: saving starts each person's email search at once, on the server: patterns, Hunter,
  Apollo, then the quick check and, when it cannot tell, the deep check (a test email, up to ~10
  minutes an address). Each person holds up to $0.027 of the budget until their email settles; most
  cost under one cent. People the budget left cannot hold are refused (`email_budget`) and not
  saved: ask for more budget, then save them again from the same answer. Nothing is bought twice.
- **Closing**: `bh2 search show <search>` for the numbers, then `bh2 search done <search>`. Emails
  settle on their own within minutes to an hour (`counts.emails.inProgress`); closing stops the
  buying, not the email searches.

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
| `refused`                                          | a save            | Inputs left out, by their place in your list, with a code                                                                                                                     | `employer_not_fit`: judge their company first, or leave them out; `employer_archived`: their company is archived in the project, so leave them out; `do_not_contact`: leave it; `row_not_found`: check the id; `row_not_savable`: the row names no employer, so find the person inside their company (company-leads, a persona for their title) and save that row; `email_not_in_answer`, `email_other_person`, `shared_inbox`: save them without `email`, or with the call that shows their own address. |

## Common mistakes

- Buying a page before its count, or a 1,000-row page to judge 50 companies.
- Reading `limit_by` on company-leads as a total: it is per company.
- Judging from the name alone. A "dental" in the name is not evidence; the description, the
  industry or the website is.
- Judging hundreds of companies for a handful of people, when a people search would have needed
  far fewer verdicts.
