# Companies and people listed on web pages

Exhibitor lists, member directories, award lists and team pages often name exactly the companies
or people the person wants. `bh2 read <search> <url>` opens a public page in a real browser and
returns its title, its text and its links.

## Reading

- The cheap mode costs $0.0005 a page. Use it first.
- `--protected` adds anti-blocking proxies, five times the price ($0.0025). Use it only when the
  cheap answer is a block page: a captcha, "access denied", or almost no text.
- The same page in the same mode within 30 days is `already_bought`: `bh2 call show <callId>`.
- Public pages only. A page behind a login is not read.
- A long list spreads over pages: follow its next-page links from `links`, one read each, and stop
  when you have what the plan needs.

## From a listed company to a verdict

1. Note what the page says about it (name, website, city, booth, category): that is evidence.
2. If you have its domain, try the verdict straight away with `{"domain": "<domain>", …}`. Our
   database often holds it; `company_not_found` in `refused` means it does not.
3. Otherwise buy its row: `/enrich/database/company/` with `{"domain": "<domain>"}` (or `{"name":
…}` when there is no website), $0.0045, then save the verdict with that `callId` and the domain.
4. Judge it as any other company (references/judging.md); put the page in the evidence:
   `{"fact": "Exhibits at", "value": "Texas Dental Expo 2026", "url": "<page>"}`.

## From a listed person to the project

A team page gives names and titles. To save a person you need their row:

1. Their company must be in the project (a fit verdict first).
2. Find their profile: Generect people inside that company
   (`/search/realtime/company-leads/` with a persona for their title, `limit_by` 1–3), or Apollo
   `/people/match` with their name and the company's domain.
3. A Generect row saves with `{"callId", "salesId"}`. An Apollo answer gives the LinkedIn link,
   and often the person's work address: buy their Generect row with `/enrich/database/lead/` and
   `{"linkedin_url": …}`, then save from that, handing the address over (`"email"`, and
   `"emailCallId"`: the Apollo call).
4. When the page itself lists the person's own address, hand that one over instead, with
   `"emailCallId"`: the read call. A shared inbox (`info@`, `office@`, `contact@`) is not theirs:
   leave it out.

Write in the hand-over which pages were read and what they gave, so the next session does not
read them again.
