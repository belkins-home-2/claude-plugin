import { parseArgs } from 'node:util'

import { apiOf, Bh2Error, call } from './client.ts'
import {
	CONFIG_PATH,
	currentProject,
	loadConfig,
	loadSessionProject,
	saveConfig,
	saveSessionProject,
	SESSION,
} from './config.ts'
import { readText } from './input.ts'
import { startLogin, waitForLogin } from './login.ts'
import {
	callCommand,
	dbCommand,
	dncCommand,
	insightsCommand,
	listSearches,
	readCommand,
	saveCommand,
	searchCommand,
} from './search.ts'
import { setup } from './setup.ts'

/** Every command with its shape. Skills may name only commands listed here (tests/contract.test.ts). */
export const USAGE = `bh2 <command> [options]: JSON on stdout. A refusal goes to stderr as {code, message, hint}
with exit 1 (2 for a misused command); the hint says what to do next.

  setup [--dir <path>]                 once, after the plugin is installed: the work folder
                                        (~/work/belkins-home-2, or ~/bh2-work when that one holds
                                        other files) and bh2 on your terminal's PATH
  login [--api <url>] [--no-browser]   connect this computer: prints a link to approve in Belkins Home.
                                        In a terminal it waits; elsewhere run bh2 login --wait after
                                        the person pressed Connect
  login --wait                         collect the token once the link is approved
  logout                               disconnect this computer: its token stops working
  whoami                               who bh2 acts as, the API it uses, the project in use

  projects [--q <text>]                the projects you can work on
  use [<project>]                      the project this Claude Code session works on; with no slug,
                                        which one and why. Each session keeps its own and none is ever
                                        defaulted. Outside Claude Code: --project or BH2_PROJECT
  project                              the current project
  brief                                read it first, every session: the project, its title lists,
                                        its do-not-contact lists, what it holds, the last hand-overs
  handover --summary <text> | --file <path|->
                                       what this session leaves for the next: done, left, to watch
  handovers [--limit <n>]              the project's hand-overs, newest first (10; at most 50)
  insights read <id>                   one Insights page the brief lists, whole

Smart search: you find the companies and people the person asked for. Paid calls run only inside
a budget a person approves on the search's page in Belkins Home; you cannot approve it.
  search new --name <text> [--ask <text>]
                                        start one; prints its page link
  searches [--page <n>] [--per-page <n>]
                                        the project's smart searches
  search show <search>                 its plan, budget, spend, verdict counts and page link
  search plan <search> [--plan <text> | --file <path|->] [--budget <usd>] [--name <text>]
                                        the plan the person reads and the budget you ask for; then
                                        ask the person to press Approve on the search's page
  search done <search>                 close it: nothing more is bought for it
  calls                                every call a search can make, with its price
  call <search> <provider> <path> (--body <json> | --file <path|->) [--again] [--out <file>]
                                        one listed Generect or Apollo call, inside the budget. The
                                        project's companies, people and do-not-contact lists are
                                        added to it for you. A long answer goes to a file
                                        (clients/<project>/calls/<id>.json) and its path is printed
  call show <id> [--out <file>]        an answer already bought, again, for free
  read <search> <url> [--protected] [--again] [--out <file>]
                                        one web page as text and links. --protected is for a site
                                        that blocks the cheap mode: five times the price
  db companies [--industry <name>]... [--location <place>]... [--size <band>]... [--type <type>]...
               [--revenue-min <usd>] [--revenue-max <usd>] [--page <n>] [--per-page <n>]
                                        companies our database holds, free: refreshed within 3
                                        months, not in the project, not judged, not do-not-contact
  db people [--company <id>]... [--title <words>]... [--exclude-title <words>]... [--audience <id>]...
            [--industry <name>]... [--size <band>]... [--location <place>]... [--company-location <place>]...
            [--page <n>] [--per-page <n>]
                                        people with a valid email our database holds, free:
                                        refreshed within 3 months, not in the project
  companies save <search> --file <path|->
                                        your verdicts, a JSON list of {companyId | callId with
                                        linkedinId or domain | linkedinId | domain, verdict:
                                        fit|not_fit|unsure, reason, evidence?: [{fact, value?, url?}]}.
                                        Fit companies go into the project
  people save <search> --file <path|->
                                        a JSON list of {contactId} or {callId, salesId}: filed under
                                        companies the project holds. Their email searches start at
                                        once, each holding up to $0.027 of the budget until it settles.
                                        Add email + emailCallId when an Apollo match or a page read
                                        shows the person's own address: it is checked first
  dnc check <value>... | --file <path|->
                                        which addresses, domains or websites the project must not
                                        contact

Every project command takes --project <slug> to act on another project for that one command.
BH2_API, BH2_TOKEN, BH2_CONFIG and BH2_PROJECT override the saved settings.
`

const out = (value: unknown): void => {
	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

const usageError = (message: string, hint: string): Bh2Error =>
	new Bh2Error(message, { code: 'usage', message, hint }, 2)

const noProject = (): Bh2Error =>
	new Bh2Error(
		'No project',
		{
			code: 'no_project',
			message: 'No project is chosen for this session',
			hint: SESSION
				? 'Ask the person which client to work on, then bh2 use <slug> (bh2 projects lists them)'
				: 'Pass --project <slug> or set BH2_PROJECT (bh2 projects lists them)',
		},
		2,
	)

export async function main(argv: string[]): Promise<void> {
	let parsed
	try {
		parsed = parseArgs({
			args: argv,
			allowPositionals: true,
			strict: true,
			options: {
				help: { type: 'boolean', short: 'h' },
				api: { type: 'string' },
				wait: { type: 'boolean' },
				'no-browser': { type: 'boolean' },
				project: { type: 'string' },
				q: { type: 'string' },
				summary: { type: 'string' },
				file: { type: 'string' },
				limit: { type: 'string' },
				dir: { type: 'string' },
				name: { type: 'string' },
				ask: { type: 'string' },
				plan: { type: 'string' },
				budget: { type: 'string' },
				body: { type: 'string' },
				again: { type: 'boolean' },
				out: { type: 'string' },
				protected: { type: 'boolean' },
				industry: { type: 'string', multiple: true },
				location: { type: 'string', multiple: true },
				size: { type: 'string', multiple: true },
				type: { type: 'string', multiple: true },
				company: { type: 'string', multiple: true },
				title: { type: 'string', multiple: true },
				'exclude-title': { type: 'string', multiple: true },
				audience: { type: 'string', multiple: true },
				'company-location': { type: 'string', multiple: true },
				'revenue-min': { type: 'string' },
				'revenue-max': { type: 'string' },
				page: { type: 'string' },
				'per-page': { type: 'string' },
			},
		})
	} catch (error) {
		throw usageError(
			error instanceof Error ? error.message : String(error),
			'bh2 --help lists every command and option',
		)
	}

	const { positionals, values: o } = parsed
	const [cmd, sub] = positionals
	if (!cmd || cmd === 'help' || o.help) {
		process.stdout.write(USAGE)
		return
	}

	const config = await loadConfig()
	const current = currentProject(o.project, await loadSessionProject())
	const p = (): string => {
		if (!current) {
			throw noProject()
		}
		return encodeURIComponent(current.slug)
	}
	/** The project's slug as it is, for the commands that build their own paths and files. */
	const slug = (): string => {
		if (!current) {
			throw noProject()
		}
		return current.slug
	}
	const rest = positionals.slice(1)

	switch (cmd) {
		case 'setup':
			return out(await setup(o.dir))

		case 'login': {
			if (!o.wait) {
				const api = o.api ? o.api.replace(/\/+$/, '') : apiOf(config)
				const pending = await startLogin(api, !o['no-browser'])
				const minutes = Math.round(
					(new Date(pending.expiresAt).getTime() - Date.now()) / 60_000,
				)
				if (!process.stdout.isTTY) {
					return out({
						open: pending.link,
						code: pending.userCode,
						expiresInMinutes: minutes,
						next: 'bh2 login --wait',
					})
				}
				process.stderr.write(
					`Open this link, sign in and press Connect (valid ${minutes} minutes):\n\n  ${pending.link}\n\nThe page shows the code ${pending.userCode}. Waiting…\n`,
				)
			}
			const { email, ...next } = await waitForLogin(config)
			await saveConfig(next)
			return out({ connected: true, as: email, api: next.api, saved: CONFIG_PATH })
		}

		case 'logout': {
			try {
				await call(config, 'POST', '/cli/auth/logout')
			} catch (error) {
				// A token the API no longer knows is as good as signed out: forget it all the same.
				if (!(error instanceof Bh2Error && error.payload.status === 401)) {
					throw error
				}
			}
			await saveConfig({ api: config.api })
			return out({ signedOut: true })
		}

		case 'whoami': {
			const me = await call(config, 'GET', '/cli/me')
			return out({ ...(me as object), api: apiOf(config), project: current })
		}

		case 'projects':
			return out(
				await call(
					config,
					'GET',
					`/cli/projects${o.q ? `?q=${encodeURIComponent(o.q)}` : ''}`,
				),
			)

		case 'use': {
			if (!sub) {
				if (!current) {
					throw noProject()
				}
				return out({ project: current.slug, from: current.from })
			}
			if (!SESSION) {
				throw usageError(
					'bh2 use works inside Claude Code only',
					'Outside Claude Code, pass --project <slug> or set BH2_PROJECT',
				)
			}
			const found = await call(config, 'GET', `/cli/projects/${encodeURIComponent(sub)}`)
			await saveSessionProject(sub)
			return out({ project: found, for: 'this Claude Code session' })
		}

		case 'project':
			return out(await call(config, 'GET', `/cli/projects/${p()}`))

		case 'brief':
			return out(await call(config, 'GET', `/cli/projects/${p()}/brief`))

		case 'handover': {
			const summary = o.file ? await readText(o.file) : o.summary
			if (!summary?.trim()) {
				throw usageError(
					'A hand-over needs its text',
					'bh2 handover --summary "<done, left, to watch>" or --file <path|->',
				)
			}
			return out(await call(config, 'POST', `/cli/projects/${p()}/handovers`, { summary }))
		}

		case 'handovers':
			return out(
				await call(
					config,
					'GET',
					`/cli/projects/${p()}/handovers${o.limit ? `?limit=${encodeURIComponent(o.limit)}` : ''}`,
				),
			)

		case 'insights':
			return out(await insightsCommand(config, slug(), rest))

		case 'search':
			return out(await searchCommand(config, slug(), rest, o))

		case 'searches':
			return out(await listSearches(config, slug(), o))

		case 'calls':
			return out(await call(config, 'GET', '/cli/calls'))

		case 'call':
			return out(await callCommand(config, slug(), rest, o))

		case 'read':
			return out(await readCommand(config, slug(), rest, o))

		case 'db':
			return out(await dbCommand(config, slug(), rest, o))

		case 'companies':
		case 'people':
			return out(await saveCommand(config, slug(), cmd, rest, o))

		case 'dnc':
			return out(await dncCommand(config, slug(), rest, o))

		default:
			throw usageError(`Unknown command: ${cmd}`, 'bh2 --help lists every command')
	}
}

/** Runs one command; a failure is printed on stderr as JSON and sets the exit code. */
export async function run(argv: string[]): Promise<void> {
	try {
		await main(argv)
	} catch (error) {
		if (error instanceof Bh2Error) {
			process.stderr.write(`${JSON.stringify(error.payload, null, 2)}\n`)
			process.exitCode = error.exitCode
		} else {
			process.stderr.write(
				`${JSON.stringify({
					code: 'bh2_failed',
					message: error instanceof Error ? error.message : String(error),
					hint: 'This is a defect in bh2: tell the team what you ran',
				})}\n`,
			)
			process.exitCode = 1
		}
	}
}
