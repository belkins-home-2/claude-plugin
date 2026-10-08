import { chmod, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export interface Bh2Config {
	api?: string
	token?: string
}

export const CONFIG_PATH =
	process.env.BH2_CONFIG ?? join(homedir(), '.config', 'bh2', 'config.json')

export async function loadConfig(): Promise<Bh2Config> {
	try {
		return JSON.parse(await readFile(CONFIG_PATH, 'utf8')) as Bh2Config
	} catch {
		return {}
	}
}

/** The API address and the token, readable by this user only. */
export async function saveConfig(config: Bh2Config): Promise<void> {
	const kept: Bh2Config = { api: config.api, token: config.token }
	await mkdir(dirname(CONFIG_PATH), { recursive: true })
	await writeFile(CONFIG_PATH, `${JSON.stringify(kept, null, 2)}\n`, { mode: 0o600 })
	await chmod(CONFIG_PATH, 0o600)
}

/**
 * The Claude Code session bh2 runs in, if any. A person may run several sessions side by side, one
 * per client, so `bh2 use` is remembered for its own session only: one file per session beside the
 * config, never the shared config, which two sessions would overwrite under each other. Claude Code
 * sets this variable for the commands it runs; it is not documented, so without it `bh2 use` is
 * refused and --project or BH2_PROJECT names the project instead.
 */
export const SESSION = /^[\w-]{1,128}$/.test(process.env.CLAUDE_CODE_SESSION_ID ?? '')
	? process.env.CLAUDE_CODE_SESSION_ID
	: undefined

const SESSIONS_DIR = join(dirname(CONFIG_PATH), 'sessions')
/** A session's choice is forgotten this long after it was made. */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export async function loadSessionProject(): Promise<string | undefined> {
	if (!SESSION) {
		return undefined
	}
	try {
		return (await readFile(join(SESSIONS_DIR, SESSION), 'utf8')).trim() || undefined
	} catch {
		return undefined
	}
}

export async function saveSessionProject(slug: string): Promise<void> {
	if (!SESSION) {
		throw new Error('Not in a Claude Code session')
	}
	await mkdir(SESSIONS_DIR, { recursive: true })
	await writeFile(join(SESSIONS_DIR, SESSION), `${slug}\n`)
	// Sessions end without telling anyone; the files of old ones are swept on the way.
	const now = Date.now()
	for (const name of await readdir(SESSIONS_DIR)) {
		const path = join(SESSIONS_DIR, name)
		const { mtimeMs } = await stat(path).catch(() => ({ mtimeMs: now }))
		if (now - mtimeMs > SESSION_TTL_MS) {
			await rm(path, { force: true })
		}
	}
}

export interface CurrentProject {
	slug: string
	from: string
}

/** The project a command acts on: --project, then BH2_PROJECT, then this session's `bh2 use`. Never a default. */
export function currentProject(
	flag: string | undefined,
	sessionProject: string | undefined,
): CurrentProject | null {
	if (flag) {
		return { slug: flag, from: '--project' }
	}
	if (process.env.BH2_PROJECT) {
		return { slug: process.env.BH2_PROJECT, from: 'BH2_PROJECT' }
	}
	return sessionProject ? { slug: sessionProject, from: 'bh2 use, this session' } : null
}
