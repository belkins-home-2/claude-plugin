import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { hostname } from 'node:os'
import { dirname, join } from 'node:path'

import { Bh2Error, call } from './client.ts'
import { CONFIG_PATH, type Bh2Config } from './config.ts'

// `bh2 login`: the API's device flow. bh2 starts a login and prints a link; the person opens it,
// signs in to Belkins Home and presses Connect; bh2 collects its token. Nobody copies a token.
//
// An agent sees a command's output only when the command ends, so outside a terminal the two
// halves are two commands: `bh2 login` prints the link and exits, `bh2 login --wait` collects. In a
// terminal `bh2 login` does both.

const PENDING_PATH = join(dirname(CONFIG_PATH), 'login.json')

interface Started {
	deviceCode: string
	userCode: string
	verificationUrl: string
	expiresAt: string
	interval: number
}

export interface PendingLogin {
	api: string
	deviceCode: string
	userCode: string
	link: string
	expiresAt: string
	interval: number
}

type Polled = { status: 'pending' } | { status: 'approved'; token: string; email: string | null }

/** Starts a login; its secret stays on disk beside the config, readable by this user, until collected. */
export async function startLogin(api: string, openBrowser: boolean): Promise<PendingLogin> {
	const started = (await call(
		{ api },
		'POST',
		'/cli/auth/start',
		{ clientName: hostname() },
		true,
	)) as Started

	const pending: PendingLogin = {
		api,
		deviceCode: started.deviceCode,
		userCode: started.userCode,
		link: started.verificationUrl,
		expiresAt: started.expiresAt,
		interval: started.interval,
	}
	await mkdir(dirname(PENDING_PATH), { recursive: true })
	await writeFile(PENDING_PATH, `${JSON.stringify(pending)}\n`, { mode: 0o600 })
	if (openBrowser) {
		open(pending.link)
	}
	return pending
}

/** Polls until the person presses Connect; returns the config with the token, and forgets the login. */
export async function waitForLogin(
	config: Bh2Config,
): Promise<Bh2Config & { email: string | null }> {
	let pending: PendingLogin
	try {
		pending = JSON.parse(await readFile(PENDING_PATH, 'utf8')) as PendingLogin
	} catch {
		throw new Bh2Error(
			'No login to wait for',
			{
				code: 'no_login',
				message: 'There is no login in progress',
				hint: 'Run bh2 login first',
			},
			2,
		)
	}

	const deadline = new Date(pending.expiresAt).getTime()
	for (;;) {
		let answer: Polled
		try {
			answer = (await call(
				{ api: pending.api },
				'POST',
				'/cli/auth/token',
				{ deviceCode: pending.deviceCode },
				true,
			)) as Polled
		} catch (error) {
			// Expired, cancelled, already collected or unknown: this login is over either way.
			if (error instanceof Bh2Error && error.payload.code !== 'api_unreachable') {
				await rm(PENDING_PATH, { force: true })
			}
			throw error
		}

		if (answer.status === 'approved') {
			await rm(PENDING_PATH, { force: true })
			return { ...config, api: pending.api, token: answer.token, email: answer.email }
		}
		if (Date.now() > deadline + 5_000) {
			throw new Bh2Error('Login not approved', {
				code: 'login_expired',
				message: 'The link expired before it was approved',
				hint: 'Run bh2 login again',
			})
		}
		await new Promise(resolve => setTimeout(resolve, pending.interval * 1000))
	}
}

/** Opens the link in the person's browser where there is one; a failure only loses a shortcut. */
function open(link: string): void {
	const [command, ...args] =
		process.platform === 'darwin'
			? ['open']
			: process.platform === 'win32'
				? ['rundll32', 'url.dll,FileProtocolHandler']
				: process.platform === 'linux' &&
					  (process.env.DISPLAY || process.env.WAYLAND_DISPLAY)
					? ['xdg-open']
					: []
	if (!command) {
		return
	}
	try {
		spawn(command, [...args, link], { stdio: 'ignore', detached: true })
			.on('error', () => {})
			.unref()
	} catch {
		// No browser to open; the link is printed anyway.
	}
}
