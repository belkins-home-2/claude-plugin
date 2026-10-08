import type { Bh2Config } from './config.ts'

/**
 * Where bh2 talks to when nothing says otherwise: production. The publish step writes the address
 * over the placeholder (CLAUDE_PLUGIN_API_URL in api-2's pipeline); a copy run straight from the
 * repository has none, and `bh2 login --api <url>` (or BH2_API) names the API instead.
 */
const PUBLISHED_API = 'https://api.belkins-home-2.belkins.io'
export const DEFAULT_API = PUBLISHED_API.startsWith('__') ? '' : PUBLISHED_API

/** What a failed command prints on stderr, as JSON: the API's own words, plus what to do next. */
export interface Bh2Failure {
	request?: string
	status?: number
	code: string
	message: string
	hint: string
}

/** A refusal or a failure. `payload` is printed as it is; the exit code is 1, or 2 for misuse. */
export class Bh2Error extends Error {
	readonly payload: Bh2Failure
	readonly exitCode: number

	constructor(message: string, payload: Omit<Bh2Failure, 'request'>, exitCode = 1) {
		super(message)
		this.payload = { request: message, ...payload }
		this.exitCode = exitCode
	}
}

/** The API address in use: BH2_API, then the saved one, then production. */
export function apiOf(config: Bh2Config): string {
	const api = process.env.BH2_API || config.api || DEFAULT_API
	if (!api) {
		throw new Bh2Error(
			'No API address',
			{
				code: 'no_api',
				message: 'bh2 does not know which Belkins Home API to use',
				hint: 'Run bh2 login --api <url> with the address the team gave you',
			},
			2,
		)
	}
	return api.replace(/\/+$/, '')
}

/**
 * One request to the API. Errors come back with the API's code and message, and a hint: the API's
 * own when it gave one, else what that status usually needs.
 */
export async function call(
	config: Bh2Config,
	method: string,
	path: string,
	body?: unknown,
	/** Sent without a token: a login starts before there is one, and a stale one would be refused. */
	anonymous = false,
): Promise<unknown> {
	const api = apiOf(config)
	const token = anonymous ? undefined : process.env.BH2_TOKEN || config.token
	const headers: Record<string, string> = { accept: 'application/json' }
	if (token) {
		headers.authorization = `Bearer ${token}`
	}
	if (body !== undefined) {
		headers['content-type'] = 'application/json'
	}

	let response: Response
	try {
		// Joined as text, not new URL(path, api): an absolute path would drop a prefix such as /api.
		response = await fetch(`${api}${path}`, {
			method,
			headers,
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
		})
	} catch (error) {
		throw new Bh2Error(`${method} ${path}`, {
			code: 'api_unreachable',
			message: `The API at ${api} did not answer: ${error instanceof Error ? error.message : String(error)}`,
			hint: 'Check the internet connection and run the command again',
		})
	}

	const text = await response.text()
	let payload: unknown = null
	try {
		payload = text ? JSON.parse(text) : null
	} catch {
		payload = { message: text.slice(0, 500) }
	}

	if (!response.ok) {
		throw new Bh2Error(
			`${method} ${path} → ${response.status}`,
			failureOf(response.status, payload),
		)
	}
	return payload
}

/** The API's error body (`{status, message[], code, details: {hint}}`) as bh2 prints it. */
export function failureOf(status: number, payload: unknown): Omit<Bh2Failure, 'request'> {
	const body = (payload ?? {}) as {
		message?: unknown
		code?: unknown
		details?: { hint?: unknown }
	}
	const message = Array.isArray(body.message)
		? body.message.join('; ')
		: typeof body.message === 'string'
			? body.message
			: `The API answered ${status}`

	return {
		status,
		code: typeof body.code === 'string' ? body.code : `http_${status}`,
		message,
		hint: typeof body.details?.hint === 'string' ? body.details.hint : hintFor(status),
	}
}

function hintFor(status: number): string {
	if (status === 401) {
		return 'Run bh2 login'
	}
	if (status === 403) {
		return 'You have no access to this; bh2 projects lists what you can work on'
	}
	if (status === 404) {
		return 'Check the name or id; bh2 projects lists your projects'
	}
	if (status === 400) {
		return 'Check the command against bh2 --help'
	}
	if (status >= 500) {
		return 'The API failed: try again in a minute; if it keeps failing, tell the team with what you ran'
	}
	return 'Check the command against bh2 --help'
}
