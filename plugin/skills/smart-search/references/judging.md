# Judging a company

A verdict is what the person reads on the search's page, and what decides whether a company's
people can be saved: a fit company joins the project with its first person. It must be checkable:
a reason someone can verify in a minute, and evidence for every fit.

## The test

Settle what makes a company fit before judging, from the ask and the brief (ideal client profile
pages, audiences, earlier searches): the must-haves (industry, size, place, what the company does)
and the exclusions (what the person or the client ruled out). Hold every company of the search to
the same test, so its verdicts agree with each other.

- `fit`: meets every must-have, hits no exclusion, and each must-have has evidence.
- `not_fit`: fails a must-have or hits an exclusion. The reason names which.
- `unsure`: a must-have cannot be checked from what you have. The reason says what is missing.

## Where evidence comes from

Use whatever settles the company most cheaply:

- **The row itself**: industry, size, place, description, specialities, the website's domain. It
  settles most companies, for free.
- **The project's Insights**: what the client sells and to whom; a case study names who bought.
- **The company's website**, when nothing else settles it and the company is worth it:
  `bh2 read <search> https://<domain>`. Each page costs money; the home or about page usually
  says enough.

The name alone is never evidence: "Smile Dental Group" can be a 500-dentist chain or a lab.

## What a verdict looks like

```json
{
	"callId": "6b0b5c1e-…",
	"linkedinId": "1234567",
	"verdict": "fit",
	"reason": "A 25-person family dental practice in Austin, TX, owner-run.",
	"evidence": [
		{ "fact": "Industry", "value": "Dentists" },
		{ "fact": "Size", "value": "11-50" },
		{
			"fact": "Website says",
			"value": "family and cosmetic dentistry, 3 dentists",
			"url": "https://acme-dental.example/about"
		}
	]
}
```

- The reason is one sentence in plain words, the fact that decided it first.
- Evidence: at most 10 facts, each with its value; a `url` where it was read.
- A company from our database is named by `companyId` instead of `callId` and `linkedinId`.

## Working through a page

Judge the whole page, save its verdicts in one `bh2 companies save`, then go on. Saved verdicts are
what keeps the next page new: the server leaves judged companies out of the next Generect call and
out of `bh2 db companies`.

Judging a company again replaces its verdict. A company that turns out not to fit after its
people were saved stays in the project with them: say so in the hand-over.
