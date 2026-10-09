---
name: getting-started
description: Opens and closes every working session on a Belkins Home 2.0 client project with bh2 - checks the connection, picks the project the person named, reads the project brief, and leaves a hand-over before stopping. Use at the start of any session on a client project, whenever it is unclear which project is in use or what state it is in, whenever bh2 says you are not signed in, and before stopping work.
---

# Getting started

Each session works one client project through `bh2`. Teammates, and other sessions of the same
person, work the same projects before and after you, and nothing in this chat or in local files
reaches them. So: read the project from Belkins Home at the start, write back at the end. Never
assume an earlier session did or did not do something; read it.

## Start of a session

1. `bh2 whoami`: the connection works, and as whom.
    - `not_signed_in`, `token_not_valid`, `token_expired`: connect first (next section).
    - `no_access`: the person's Belkins Home account is not active Belkins, Revit or Test staff. Tell them
      to ask an admin of their organization, and stop.
    - `no_api`: bh2 does not know which Belkins Home to talk to. Ask the person for the address the
      team gave them, then `bh2 login --api <url>`.
2. Which project. The person names the client in their own words; `bh2 projects --q <word>` finds
   it. If they did not say, or two projects match, ask. A client named in passing, a project from
   an earlier session or the only project you know is not a choice, and none is ever defaulted.
3. `bh2 use <slug>`, then name the project back in one line, with its slug: "Working on Acme
   (acme)." A wrong pick is caught before anything is done on it. When the person moves to
   another project mid-session, `bh2 use` it again; `--project <slug>` reads another project for
   one command without switching.
4. `bh2 brief`: read all of it before doing anything (below).

## Connecting (`bh2 login`)

1. `bh2 login` answers `{"open": "<link>", "code": "ABCD-EFGH", "next": "bh2 login --wait"}`.
2. Give the person the link as a clickable link and the code, and tell them: open it, sign in to
   Belkins Home if it asks, check the page shows the same code, press **Connect**.
3. Run `bh2 login --wait` with a 10-minute timeout. It returns as soon as they pressed Connect and
   saves the connection itself. If it says the link expired, start again from step 1.

Never ask the person for a password or a token, and never put one in a command: the link is the
only way in.

## Reading `bh2 brief`

| Part                    | What it is                                                                                                     | What to do with it                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `project`               | Name, organization, status, industry, country, website, and `yourRole` there                                   | The client you work for. Status other than `active` (`pending`, `on_hold`, `closed`): ask the person before doing work for it. |
| `audiences`             | The project's title lists: who to look for (`jobTitles`) and who not (`excludedJobTitles`), with a description | The people this client wants. Empty: ask the person who to target before looking for anyone.                                   |
| `doNotContact.outreach` | How many companies and people the project must never be written to                                             | Nobody on it is ever added or contacted.                                                                                       |
| `doNotContact.client`   | The client's own list of companies and people to leave alone                                                   | Same: nobody on it is added.                                                                                                   |
| `inProject`             | Companies and contacts already in the project, and the contacts by the status of their email                   | Do not find again what is there. `valid` and `catchAll` emails can be written to; `checking` are still being verified.         |
| `makeUp`                | What the project holds by industry, country and size, and its contacts by title                                | A new search adds to it, never repeats it. `bh2 sql` reads the rows behind it (references/sql.md).                             |
| `insights`              | The client's products, and its Insights pages (ideal client, value proposition, case studies, call notes)      | Read the pages that say who the client sells to, whole, before looking for anyone (`bh2 sql`, references/sql.md).              |
| `earlierSearches`       | The team's last ten searches, with the filters they ran with and what they found                               | Reuse what worked; do not run the same search again.                                                                           |
| `handovers`             | What the last sessions left, newest first: done, left, to watch                                                | Pick up "Left" first and check every "Watch" item.                                                                             |

### Reading anything else: `bh2 sql`

Everything Belkins Home holds that the brief does not show is one read-only query away: the rows
behind `makeUp`, the companies that booked meetings and the people who wrote back, an Insights page
whole, older hand-overs, the project's smart searches. `bh2 sql "<select …>"`, with `@project` for
this project. Passwords, keys, tokens and sessions are never readable. The tables, the counting rules
the app uses and ready queries are in references/sql.md; read it before your first query.

### The client's website

Read it before you suggest who to look for: the home page and the pages that say what the client
sells and to whom. It is public, so read it with your web tools; it is the one read that does not
go through `bh2`. When `project.website` is empty, suggest the person adds it to the project in
Belkins Home, and ask them for the address only when the rest of the project does not say who the
client sells to. Never send anything from Belkins Home to a website.

## End of a session

`bh2 handover --summary "<text>"`: mandatory, even after a short session. Three parts in plain
sentences, with numbers and names:

- **Done**: what changed in the project.
- **Left**: what the next session should pick up, in order, and what it waits on.
- **Watch**: what may go wrong or needs a check on a given day, and anything bh2 did wrong (what
  you ran, what came back) so the team can fix it.

A long summary goes in a file: `bh2 handover --file clients/<slug>/handover.md`.

## When bh2 refuses

Every refusal is `{code, message, hint}` on stderr: do what the hint says. Do not go around bh2:
no other tool calls the Belkins Home API, and no file holds what the project should hold. When
bh2 cannot do something or answers wrong, say so plainly to the person, carry on with what it can
do, and write it in the hand-over's Watch part.

## What this version of bh2 does

It connects, finds and opens projects, reads the brief and anything else in Belkins Home
(`bh2 sql`, read only), keeps hand-overs, and runs smart searches: finding companies and the people
in them, from our own database and from Generect, and finding and checking those people's emails,
inside a budget a person approves (the smart-search skill). Campaigns are not run from here: say
so when asked rather than working around it.

## Common mistakes

- Starting work before reading the whole brief, or trusting the last hand-over without checking.
- Guessing the project, or carrying one over from another session.
- Asking for a token or a password, or pasting one into a command.
- A hand-over like "worked on the project": say what, how many, what is left.
