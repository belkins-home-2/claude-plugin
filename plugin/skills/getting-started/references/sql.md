# Reading Belkins Home with `bh2 sql`

One SELECT (or `WITH … SELECT`), read only, over every table of Belkins Home but the secrets.
`@project` stands for the current project's id. 200 rows unless `--limit` (at most 1000), and a
query stops after 60 seconds. A long answer is kept in `clients/<project>/sql/`; read it from there.

## What to know first

- **Secrets are never readable**: passwords, keys, tokens and credentials, sessions and the
  activity log. On a table where some columns are hidden (`projects`, `users`, `mailboxes`,
  `calendars` and a few more), `select *` is refused: name the columns you need.
- **Tables and columns**: `select table_name from information_schema.tables where table_schema =
  'public'`, then `select column_name, data_type from information_schema.columns where table_name =
  '<table>'`. What you cannot read is not listed.
- **Any project can be read**, not only this one. Filter by project (`project_id = @project`)
  unless the person asked for more.
- **Big tables** (`project_contacts`, `project_companies`, `inbox_threads`, `campaign_messages`):
  filter by project first and aggregate before joining.
- Read people's addresses and phone numbers only when the task needs them, and never copy them
  into a hand-over.

## Counting rules the app uses

- **Archived rows** (`is_archived`) are out of what a project holds today.
- **Meetings** are soft-deleted: always `deleted_at is null`. Cancelled ones still count as booked.
- **A reply** is a live campaign conversation the person wrote back in: `inbox_threads` with
  `campaign_id is not null`, `deleted_at is null` and `first_reply_at is not null` (auto-replies,
  bounces and spam never set it). Its `status` is the Inbox's label; the app counts `Appointment`,
  `Interested`, `Talking` and `Forwarded` as positive. People are linked through
  `inbox_thread_contacts`.
- **Email status**: `contact_emails.status` through `project_contacts.contact_email_id`: `VALID`,
  `CATCH_ALL`, `UNKNOWN`, `INVALID`, `NOT_FOUND`, `PROCESSING` (still being checked); none = no
  search ran.
- A company's name is `coalesce(name, raw_name)`.

## Recipes

What the project holds, newest first, with people and meetings counted:

```sql
select pc.id, coalesce(pc.name, pc.raw_name) as name, pc.domain, pc.industry, pc.headcount_range,
       pc.country,
       (select count(*) from project_contacts p where p.project_company_id = pc.id and not p.is_archived) as people,
       (select count(*) from meetings m where m.project_company_id = pc.id and m.deleted_at is null) as meetings
  from project_companies pc
 where pc.project_id = @project and not pc.is_archived
 order by pc.created_at desc
```

Its people, with their company and how far their email got:

```sql
select p.id, p.full_name, p.job_title, coalesce(c.name, c.raw_name) as company, e.status as email
  from project_contacts p
  left join project_companies c on c.id = p.project_company_id
  left join contact_emails e on e.id = p.contact_email_id
 where p.project_id = @project and not p.is_archived
 order by p.created_at desc
```

What worked: the companies that booked meetings, and the people who wrote back:

```sql
select coalesce(c.name, c.raw_name) as company, c.industry, c.headcount_range, c.country,
       count(*) as meetings
  from meetings m join project_companies c on c.id = m.project_company_id
 where m.project_id = @project and m.deleted_at is null
 group by 1, 2, 3, 4 order by meetings desc
```

```sql
select p.full_name, p.job_title, coalesce(c.name, c.raw_name) as company, t.status as reply,
       t.first_reply_at
  from inbox_threads t
  join inbox_thread_contacts l on l.inbox_thread_id = t.id
  join project_contacts p on p.id = l.project_contact_id
  left join project_companies c on c.id = p.project_company_id
 where t.project_id = @project and t.campaign_id is not null and t.deleted_at is null
   and t.first_reply_at is not null
 order by t.first_reply_at desc
```

Results by segment: each industry's share of the people against its share of the meetings. A
segment with 8% of the people and 30% of the meetings is a strong one. For size, country or title,
use `c.headcount_range`, `c.country` or `lower(p.job_title)` in both parts:

```sql
with held as (
  select c.industry as segment, count(*) as people
    from project_contacts p join project_companies c on c.id = p.project_company_id
   where p.project_id = @project and not p.is_archived
   group by 1
), met as (
  select c.industry as segment, count(*) as meetings
    from meetings m join project_companies c on c.id = m.project_company_id
   where m.project_id = @project and m.deleted_at is null
   group by 1
)
select held.segment, held.people, coalesce(met.meetings, 0) as meetings,
       round(100.0 * held.people / sum(held.people) over (), 1) as pct_of_people,
       round(100.0 * coalesce(met.meetings, 0) / nullif(sum(met.meetings) over (), 0), 1) as pct_of_meetings
  from held left join met using (segment)
 order by meetings desc, people desc
```

An Insights page the brief lists, whole:

```sql
select title, content from pages where id = '<id>' and project_id = @project and status = 'active'
```

Hand-overs older than the brief's last five:

```sql
select h.created_at, u.email, h.summary
  from cli_handovers h left join users u on u.id = h.user_id
 where h.project_id = @project
 order by h.created_at desc
```

The project's smart searches, newest first (then `bh2 search show <slug>`):

```sql
select slug, name, status, budget_approved, total_price, created_at
  from smart_search_requests
 where project_id = @project
 order by created_at desc
```

## Requests the team made

A request's link names its type and slug: `…/projects/<project>/requests/<type>/<slug>`. Each type
has its own table, all with `id`, `slug`, `name`, `created_at`, `user_id`, `total_price` and
`is_archived` (their `project_id` is text; `@project` matches it). The companies and people a
request added carry its `id`:

| Type in the link                      | Table                                      | Its companies                                 | Its people                                                    |
| ------------------------------------- | ------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------- |
| `find-companies`                      | `find_companies_requests`                  | `project_companies.find_companies_request_id` |                                                               |
| `find-contacts`                       | `find_contacts_requests`                   | `project_companies.find_contacts_request_id`  | `project_contacts.find_contacts_request_id`                   |
| `find-contacts-in-companies`          | `find_contacts_in_companies_requests`      |                                               | `project_contacts.find_contacts_in_companies_request_id`      |
| `find-contacts-by-past-companies`     | `find_contacts_by_past_companies_requests` |                                               | `project_contacts.find_contacts_by_past_companies_request_id` |
| `import-companies`, `import-contacts` | `import_requests`                          | `project_companies.import_request_id`         | `project_contacts.import_request_id`                          |
| `smart-search`                        | `smart_search_requests`                    | `project_companies.smart_search_request_id`   | `project_contacts.smart_search_request_id`                    |

- **Their filters**: `companies_filter` and `contacts_filter` on `find_companies_requests` and
  `find_contacts_requests`. A contacts-in-companies or past-companies request keeps them on its
  searches: `find_contacts_in_companies_searches` and `find_contacts_by_past_companies_searches`,
  whose request id is text (`… = r.id::text`), the latest one last.
- **What they cost**: `usages`, by the same request id as text (`find_companies_request_id`,
  `import_request_id`, `smart_search_request_id`, …), `total_cost` in dollars.
- **Other requests** in the app (company AI analysis, LinkedIn activity, phone and column
  enrichment) have their tables too: `criteria_analysis_requests`, `contact_linkedin_activity_requests`,
  `contact_phone_enrichment_requests`, `columns_enrichment_requests`.

A request from its link, here an import called `corporate`:

```sql
select id, slug, name, created_at, companies_found, contacts_found, total_price
  from import_requests
 where project_id = @project and slug = 'corporate'
```

Its companies, with what a people search needs: our database's `company_id` (for
`bh2 db people --company`), the LinkedIn id (for a search inside companies) and the domain:

```sql
select pc.company_id, coalesce(pc.name, pc.raw_name) as name, pc.domain, pc.linkedin_id,
       pc.linkedin_url, pc.is_archived
  from project_companies pc
  join import_requests r on r.id = pc.import_request_id
 where r.project_id = @project and r.slug = 'corporate'
 order by name
```

The people a request found and how they did: their email, meetings and replies:

```sql
select p.full_name, p.job_title, coalesce(c.name, c.raw_name) as company, e.status as email,
       (select count(*) from meetings m where m.project_contact_id = p.id and m.deleted_at is null) as meetings,
       exists (select 1 from inbox_thread_contacts l join inbox_threads t on t.id = l.inbox_thread_id
                where l.project_contact_id = p.id and t.campaign_id is not null
                  and t.deleted_at is null and t.first_reply_at is not null) as replied
  from project_contacts p
  join find_contacts_requests r on r.id = p.find_contacts_request_id
  left join project_companies c on c.id = p.project_company_id
  left join contact_emails e on e.id = p.contact_email_id
 where r.project_id = @project and r.slug = '<slug>' and not p.is_archived
```

What a request cost, by tool:

```sql
select u.tool, u.type, count(*) as calls, sum(u.total_cost) as usd
  from usages u join find_companies_requests r on u.find_companies_request_id = r.id::text
 where r.project_id = @project and r.slug = '<slug>'
 group by 1, 2 order by usd desc
```

To find people at a request's companies, run a smart search over them (the smart-search skill):
our database first with `bh2 db people --company <company_id>`, then a search inside the companies
by their LinkedIn ids. They are already in the project, so their verdicts take `{"companyId"}`.
