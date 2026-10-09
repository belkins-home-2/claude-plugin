# Generect and Apollo through bh2

Every call goes through `bh2 call <search> <provider> <path> --body '<json>'` (or `--file`), with
the body exactly as the vendor names its fields. `bh2 calls` lists the calls and their prices. The
server adds the project's own lists to Generect calls before sending them (the companies it holds
or judged, both do-not-contact lists, the people it holds), so you never send them yourself.

What follows was measured on our account; where Generect's documentation disagrees, this wins.

## Before any call you have not used in this search

Send it once with `limit_by` 1 (or the smallest page it takes) and check the row is what you asked
for. A field Generect does not know is sometimes refused (free) and sometimes ignored, and an
ignored filter is paid for row by row. A free count shows an ignored filter as an unchanged total.

A refusal (`vendor_refused`) carries Generect's own words and costs nothing: fix the body.

## Companies in Generect's database

`/search/database/companies/count/` (free) and `/search/database/companies/` ($0.0045 a row).

```json
{
	"industries": ["Dentists"],
	"locations": ["Texas, United States"],
	"headcounts": ["11-50", "51-200"],
	"company_types": ["Privately Held"],
	"limit_by": 100,
	"offset_by": 0
}
```

- Taken: `locations`, `exclude_locations`, `industries`, `exclude_industries`, `headcounts`,
  `company_types`, `exclude_ids`, `exclude_domains`.
- Refused in this mode: `keywords`, `num_of_followers`, `revenues_range`, `department_headcount`,
  `technologies`. Judge those from the rows instead.
- Places are `City, Region, Country`: `"Austin, Texas, United States"`, `"Texas, United States"`,
  `"United States"`. An unknown place, industry or company type fails the whole call (free).
- A parent industry takes its children in. `"sub_industries": true` stops that.
- Sizes: `1-10`, `11-50`, `51-200`, `201-500`, `501-1000`, `1001-5000`, `5001-10000`, `10 000+`.
  Even all eight leave out companies with no known size: leave `headcounts` out to keep them.
- Pages: `limit_by` 1–10,000, `offset_by` up to 9,999. An empty page costs nothing.
  `results_count` is net of what the server left out, so asking the same filters again brings the
  next rows once you saved verdicts on the first ones.
- A count over a whole country can take 25 seconds.
- A row has `linkedin_id`, `linkedin_link`, `name`, `domain`, `website`, `industry`,
  `headcount_range`, `hq_city`, `hq_state`, `hq_country`, `description`, `specialities` and more.
  Save a verdict on it with `{"callId", "linkedinId": <linkedin_id>}`.

## People on LinkedIn now (realtime)

`/search/realtime/leads/count/` ($0.007 a count) and `/search/realtime/leads/` ($0.007 a person).

```json
{
	"personas": [["Owner", ["Owner", "Co-Owner", "Practice Owner"], [], ["Assistant"], 1]],
	"company_locations": ["Texas, United States"],
	"company_headcounts": ["11-50"],
	"limit_by": 25,
	"offset_by": 0
}
```

- A persona is `[name, titles, seniorities, words a title must not have, priority]`; 1 is the
  highest priority. Each title at most 59 characters. Two personas with the same name fail the
  call. Too many personas fail it too ("too many functions/personas": 40 went through, 82 did not):
  split them over calls.
- Titles match loosely, as on LinkedIn ("Director, Global Marketing Operations" for "Director of
  Operations"): judge each person's `job_title` before saving.
- `locations` is where the person lives, `company_locations` where the employer has its seat.
  `company_industries` is ignored: use `lead_industries` (the person's own) and check the employer.
- Also: `company_types`, `years_in_company` (1 under a year … 5 over ten), `filter_empty_vars`
  (`["profile_photo"]`), `posted_on_linkedin`.
- `offset_by + limit_by` stays within 2,400. The count ignores what the server leaves out.
- A row has `sales_id` (save it with `{"callId", "salesId"}`), `full_name`, `job_title`, `location`,
  and its employer as `lead_company_id` / `lead_company_name`. The employer must be in the project
  or judged fit before the person can be saved.

## People inside listed companies

`/search/realtime/company-leads/`: $0.007 a person; a company with nobody costs nothing, but a
call that finds nobody at all costs $0.007 (Generect may report more for it; the server records
$0.007).

```json
{
	"company_search_criteria": {
		"linkedins_links": ["https://www.linkedin.com/company/acme-dental/"],
		"limit_by": 1
	},
	"lead_search_criteria": {
		"personas": [["Owner", ["Owner", "Practice Owner"], [], [], 1]],
		"limit_by": 3
	}
}
```

- Up to 50 companies a call (`company_search_criteria.limit_by` = how many you listed).
- `lead_search_criteria.limit_by` is people **per company**, 1–50. The most a call costs is
  companies × that × $0.007.
- It ignores the people the project already holds, so they can come back and are paid for again:
  ask only at companies where you still need people. The save skips anyone already in.
- The links are the companies' LinkedIn pages: `linkedinUrl` from `bh2 db companies`, or
  `linkedin_link` on a bought row.
- A row has `sales_id`, `full_name`, `job_title`, `persona` (the persona it matched) and its
  employer as `linkedin_company_id` (a number). `data.companies` pairs your links with ids.

## People in Generect's database

`/search/database/leads/count/` (free, under a second) and `/search/database/leads/` ($0.0045 a
person). The cheapest way to people, and the place to start for people outside a fixed list of
companies. Measured 2026-10-07:

```json
{
	"job_titles": ["Owner", "Practice Owner"],
	"company_locations": ["Texas, United States"],
	"company_headcounts": ["11-50"],
	"limit_by": 50,
	"offset_by": 0
}
```

- Taken: `job_titles`, `seniorities` (`owner`, `founder`, `partner`, `vp`, `head`, `director`;
  `c_suite` is broken), `company_locations`, `company_industries`, `company_headcounts`,
  `company_types`, `locations` (where the person lives), `company_id` (one company's LinkedIn id,
  as a number), `exclude_ids`, `limit_by`, `offset_by`.
- Refused, by name and for free: `personas`, `exclude_job_titles`, and every date or freshness
  field. Judge titles from the rows instead.
- A title matches when the person's title holds all its words, in any order ("of" ignored); a
  shorter title matches longer ones ("Owner" finds "Co-Owner", "President" finds "Vice
  President").
- With `company_id`, `offset_by` is refused and each page takes about 20 seconds; without it,
  pages answer in seconds.
- The server leaves out the people the project holds (`exclude_ids`), so counts and pages are net
  of them.
- **Rows can be old.** Each has `updated_at`: within 30 days 2% were out of date, 1–3 months 11%,
  3–6 months 30%, 6–12 months 64% (measured on 376 people). Prefer rows refreshed within 3 months;
  for an older one that matters, check the person on LinkedIn now (company-leads) before saving.
- A row has `sales_id` (save it with `{"callId", "salesId"}`), `full_name`, `job_title`,
  `company_name`, `company_location`, `updated_at`, and its employer as `linkedin_company_id` (a
  number). The employer must be in the project or judged fit before the person can be saved.

## One record

- `/enrich/database/company/` ($0.0045): one company, by exactly one of `id` (its LinkedIn id),
  `domain`, `linkedin_url` or `name`. The answer's `data` is the company's row: save its verdict
  with `{"callId", "domain": …}` or `{"callId", "linkedinId": …}`. The way to a company found on a
  web page.
- `/enrich/database/lead/` ($0.0045): one person, by exactly one of `id` (their `sales_id`),
  `linkedin_url` or `email`. Save the person with `{"callId", "salesId"}`. A record that does not
  link the person to a company is refused as `row_not_savable`: find them inside their company
  instead (company-leads with a persona for their title).
- `/search/realtime/companies/` ($0.007 a row): companies by name, `{"keywords": ["Acme Dental"],
"limit_by": 3}`; it also takes `industries`, `locations` and `headcounts`. Rows are company rows
  with `linkedin_id`, `linkedin_link` and `domain`.

A record Generect does not hold is refused as "does not exist", for free.

## Apollo

`/people/match` ($0.0083 when it finds the person, nothing when it does not): a named person to
their profile, LinkedIn link included. Only `first_name`, `last_name`, `name`, `organization_name`,
`domain`, `linkedin_url` and `email` are sent. `apollo_off` means it is switched off: use Generect.

The answer's `person.email` (with Apollo's `email_status`) is the person's work address when Apollo
has one, at no extra cost. Hand it over when you save the person (`"email"`, and `"emailCallId"`:
this call): the server checks it first instead of asking Apollo again.
