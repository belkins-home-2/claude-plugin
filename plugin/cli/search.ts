import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import { Bh2Error, call } from './client.ts'
import type { Bh2Config } from './config.ts'
import { readText } from './input.ts'

/** The options the smart search commands read, as parseArgs gives them. */
export interface SearchOptions {
	name?: string
	ask?: string
	plan?: string
	file?: string
	budget?: string
	body?: string
	again?: boolean
	out?: string
	protected?: boolean
	industry?: string[]
	location?: string[]
	size?: string[]
	type?: string[]
	company?: string[]
	title?: string[]
	'exclude-title'?: string[]
	audience?: string[]
	'company-location'?: string[]
	'revenue-min'?: string
	'revenue-max'?: string
	page?: string
	'per-page'?: string
	verdict?: string
	people?: string
}

/**
 * An answer this long is printed; a longer one is written to a file and its path printed, so a
 * page of companies never floods the session (Claude Code cuts a command's output near 30,000
 * characters). The file is the work folder's place for the client's files.
 */
const INLINE_MAX_CHARS = 20_000

const usage = (message: string, hint: string): Bh2Error =>
	new Bh2Error(message, { code: 'usage', message, hint }, 2)

const enc = encodeURIComponent

/** `bh2 search …` and `bh2 searches`. */
export async function searchCommand(
	config: Bh2Config,
	project: string,
	args: string[],
	o: SearchOptions,
): Promise<unknown> {
	const [action, slug] = args
	const base = `/cli/projects/${enc(project)}/searches`
	const needSlug = (): string => {
		if (!slug) {
			throw usage(
				`bh2 search ${action} needs the search`,
				'bh2 searches lists the project’s smart searches by slug',
			)
		}
		return `${base}/${enc(slug)}`
	}

	switch (action) {
		case 'new': {
			if (!o.name?.trim()) {
				throw usage(
					'A smart search needs a name',
					'bh2 search new --name "<what is searched>" --ask "<the person’s words>"',
				)
			}
			return call(config, 'POST', base, { name: o.name, ...(o.ask ? { ask: o.ask } : {}) })
		}
		case 'show':
			return call(config, 'GET', needSlug())
		case 'plan': {
			const plan = o.file ? await readText(o.file) : o.plan
			const budgetUsd = o.budget === undefined ? undefined : amount(o.budget, '--budget')
			if (plan === undefined && budgetUsd === undefined && !o.name) {
				throw usage(
					'Nothing to change',
					'bh2 search plan <search> --plan "<text>" (or --file <path|->) --budget <usd>',
				)
			}
			return call(config, 'PATCH', needSlug(), {
				...(plan === undefined ? {} : { plan }),
				...(budgetUsd === undefined ? {} : { budgetUsd }),
				...(o.name ? { name: o.name } : {}),
			})
		}
		case 'done':
			return call(config, 'PATCH', needSlug(), { done: true })
		default:
			throw usage(
				`Unknown: bh2 search ${action ?? ''}`.trim(),
				'bh2 --help lists the search commands: new, show, plan, done',
			)
	}
}

export function listSearches(
	config: Bh2Config,
	project: string,
	o: SearchOptions,
): Promise<unknown> {
	const query = new URLSearchParams()
	if (o.page) {
		query.set('page', String(whole(o.page, '--page') - 1))
	}
	if (o['per-page']) {
		query.set('perPage', String(whole(o['per-page'], '--per-page')))
	}
	const suffix = query.size ? `?${query}` : ''
	return call(config, 'GET', `/cli/projects/${enc(project)}/searches${suffix}`)
}

/** `bh2 call <search> <provider> <path>` and `bh2 call show <id>`. */
export async function callCommand(
	config: Bh2Config,
	project: string,
	args: string[],
	o: SearchOptions,
): Promise<unknown> {
	const [first, second, third] = args
	if (first === 'show') {
		if (!second) {
			throw usage(
				'bh2 call show needs the call id',
				'The id is callId in the answer of bh2 call',
			)
		}
		const shown = await call(
			config,
			'GET',
			`/cli/projects/${enc(project)}/calls/${enc(second)}`,
		)
		return keep(shown as Answer, project, o.out)
	}

	if (!first || !second || !third) {
		throw usage(
			'bh2 call needs the search, the provider and the path',
			"bh2 call <search> generect /search/database/companies/count/ --body '{…}'; bh2 calls lists them",
		)
	}
	const text = o.file ? await readText(o.file) : o.body
	if (!text) {
		throw usage('A call needs its body', "Pass --body '<json>' or --file <path|->")
	}
	const answer = await call(
		config,
		'POST',
		`/cli/projects/${enc(project)}/searches/${enc(first)}/calls`,
		{ provider: second, path: third, body: json(text, 'the body'), again: Boolean(o.again) },
	)
	return keep(answer as Answer, project, o.out)
}

/** `bh2 read <search> <url>`. */
export async function readCommand(
	config: Bh2Config,
	project: string,
	args: string[],
	o: SearchOptions,
): Promise<unknown> {
	const [slug, url] = args
	if (!slug || !url) {
		throw usage('bh2 read needs the search and the page', 'bh2 read <search> https://…')
	}
	const answer = await call(
		config,
		'POST',
		`/cli/projects/${enc(project)}/searches/${enc(slug)}/read`,
		{ url, protected: Boolean(o.protected), again: Boolean(o.again) },
	)
	return keep(answer as Answer, project, o.out)
}

/** `bh2 db companies` and `bh2 db people`: free lookups in our own database. */
export function dbCommand(
	config: Bh2Config,
	project: string,
	args: string[],
	o: SearchOptions,
): Promise<unknown> {
	const [kind] = args
	const page = {
		...(o.page ? { page: whole(o.page, '--page') } : {}),
		...(o['per-page'] ? { perPage: whole(o['per-page'], '--per-page') } : {}),
		...(o.industry ? { industries: o.industry } : {}),
		...(o.size ? { headcountRanges: o.size } : {}),
	}

	if (kind === 'companies') {
		return call(config, 'POST', `/cli/projects/${enc(project)}/db/companies`, {
			...page,
			...(o.location ? { locations: o.location } : {}),
			...(o.type ? { companyTypes: o.type } : {}),
			...(o['revenue-min'] ? { revenueMin: amount(o['revenue-min'], '--revenue-min') } : {}),
			...(o['revenue-max'] ? { revenueMax: amount(o['revenue-max'], '--revenue-max') } : {}),
		})
	}
	if (kind === 'people') {
		return call(config, 'POST', `/cli/projects/${enc(project)}/db/people`, {
			...page,
			...(o.company ? { companyIds: o.company } : {}),
			...(o.title ? { titles: o.title } : {}),
			...(o['exclude-title'] ? { excludeTitles: o['exclude-title'] } : {}),
			...(o.audience ? { audienceIds: o.audience } : {}),
			...(o.location ? { locations: o.location } : {}),
			...(o['company-location'] ? { companyLocations: o['company-location'] } : {}),
		})
	}
	throw usage(
		`Unknown: bh2 db ${kind ?? ''}`.trim(),
		'bh2 db companies or bh2 db people; bh2 --help lists their filters',
	)
}

/** `bh2 companies list <search>`: the verdicts, with how far each company's people got. */
export function listCompanies(
	config: Bh2Config,
	project: string,
	args: string[],
	o: SearchOptions,
): Promise<unknown> {
	const [, slug] = args
	if (!slug) {
		throw usage(
			'bh2 companies list needs the search',
			'bh2 searches lists the project’s smart searches by slug',
		)
	}
	const query = new URLSearchParams()
	if (o.verdict) {
		query.set('verdict', o.verdict)
	}
	if (o.people) {
		query.set('people', o.people)
	}
	if (o.page) {
		query.set('page', String(whole(o.page, '--page') - 1))
	}
	if (o['per-page']) {
		query.set('perPage', String(whole(o['per-page'], '--per-page')))
	}
	const suffix = query.size ? `?${query}` : ''
	return call(
		config,
		'GET',
		`/cli/projects/${enc(project)}/searches/${enc(slug)}/companies${suffix}`,
	)
}

/** `bh2 companies save <search>` and `bh2 people save <search>`. */
export async function saveCommand(
	config: Bh2Config,
	project: string,
	what: 'companies' | 'people',
	args: string[],
	o: SearchOptions,
): Promise<unknown> {
	const [action, slug] = args
	if (action !== 'save' || !slug) {
		throw usage(
			`bh2 ${what} save needs the search`,
			`bh2 ${what} save <search> --file <path|->, the list as JSON`,
		)
	}
	if (!o.file) {
		throw usage(`bh2 ${what} save needs the list`, 'Pass --file <path>, or --file - to pipe it')
	}
	const parsed = json(await readText(o.file), `the ${what} list`)
	const list = Array.isArray(parsed) ? parsed : (parsed as Record<string, unknown> | null)?.[what]
	if (!Array.isArray(list) || !list.length) {
		throw usage(`The file holds no ${what}`, `A JSON list, or {"${what}": [ … ]}`)
	}
	return call(config, 'POST', `/cli/projects/${enc(project)}/searches/${enc(slug)}/${what}`, {
		[what]: list,
	})
}

/** `bh2 dnc check <value>…`. */
export async function dncCommand(
	config: Bh2Config,
	project: string,
	args: string[],
	o: SearchOptions,
): Promise<unknown> {
	const [action, ...rest] = args
	if (action !== 'check') {
		throw usage(`Unknown: bh2 dnc ${action ?? ''}`.trim(), 'bh2 dnc check <email|domain>…')
	}
	const fromFile = o.file ? await readText(o.file) : ''
	const fromList = fromFile.trim().startsWith('[')
		? (json(fromFile, 'the list') as unknown[]).map(String)
		: fromFile.split(/\r?\n/)
	const values = [...rest, ...fromList].map(value => value.trim()).filter(Boolean)
	if (!values.length) {
		throw usage('Nothing to check', 'bh2 dnc check <email|domain>… or --file <path|->')
	}
	return call(config, 'POST', `/cli/projects/${enc(project)}/dnc/check`, { values })
}

/** `bh2 insights read <id>`. */
export function insightsCommand(
	config: Bh2Config,
	project: string,
	args: string[],
): Promise<unknown> {
	const [action, id] = args
	if (action !== 'read' || !id) {
		throw usage(
			'bh2 insights read needs the page id',
			'bh2 brief lists the pages under insights.pages',
		)
	}
	return call(config, 'GET', `/cli/projects/${enc(project)}/insights/${enc(id)}`)
}

// ── Helpers ─────────────────────────────────────────────────────────

interface Answer {
	callId: string
	data: unknown
	[key: string]: unknown
}

/**
 * A bought answer as it is printed: whole when short; otherwise, or when `--out` says where, its
 * `data` is written to a file and the rest printed with the file's path.
 */
async function keep(answer: Answer, project: string, out?: string): Promise<unknown> {
	const text = JSON.stringify(answer.data, null, 2)
	if (!out && text.length <= INLINE_MAX_CHARS) {
		return answer
	}
	const file = resolve(out ?? join('clients', project, 'calls', `${answer.callId}.json`))
	await mkdir(dirname(file), { recursive: true })
	await writeFile(file, `${text}\n`)
	const { data: _data, ...rest } = answer
	return { ...rest, savedTo: file, chars: text.length }
}

function json(text: string, what: string): unknown {
	try {
		return JSON.parse(text)
	} catch (error) {
		throw usage(
			`${what} is not JSON: ${error instanceof Error ? error.message : String(error)}`,
			'Write it as JSON (double quotes, no trailing commas); a file with --file <path> avoids shell quoting',
		)
	}
}

function amount(text: string, option: string): number {
	const value = Number(text)
	if (!Number.isFinite(value) || value < 0) {
		throw usage(`${option} must be a number of dollars`, `${option} 25 or ${option} 12.50`)
	}
	return value
}

function whole(text: string, option: string): number {
	const value = Number(text)
	if (!Number.isInteger(value) || value < 1) {
		throw usage(`${option} must be a whole number from 1`, `${option} 2`)
	}
	return value
}
