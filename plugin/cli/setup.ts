import { execFileSync } from 'node:child_process'
import { access, appendFile, cp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Bh2Error } from './client.ts'

/** The settings keys the template owns: the marketplace, kept up to date, and the plugin in it. */
const PLUGIN_KEYS = ['extraKnownMarketplaces', 'enabledPlugins'] as const

export interface SetupResult {
	workspace: string
	created?: true
	kept?: true
	settings: 'updated' | 'kept'
	path: Record<string, unknown>
	next: string
}

/**
 * `bh2 setup`, once the plugin is installed: the person's work folder from the template, and `bh2`
 * on the PATH of their own terminal (Claude Code already puts the plugin's bin/ on its shell's). It
 * runs as `node <plugin>/cli/cli.ts setup`, so the agent setting a teammate up never has to download
 * and run a script, which its permission check refuses. Each part checks first, so running it again
 * changes nothing, except that a folder made from an older template gets what the template's
 * settings now say about the plugin.
 */
export async function setup(dir?: string): Promise<SetupResult> {
	const { bin, workspace: template } = await layout()
	const target = resolve(dir ?? join(homedir(), 'work', 'belkins-home-2'))

	const existed = await exists(join(target, 'CLAUDE.md'))
	if (!existed) {
		await mkdir(target, { recursive: true })
		await cp(template, target, { recursive: true })
	}
	const settings = await pluginSettings(template, target)
	const terminalBin = await stableBin(bin)
	const path =
		process.platform === 'win32' ? windowsPath(terminalBin) : await posixPath(terminalBin)

	return {
		workspace: target,
		...(existed ? { kept: true as const } : { created: true as const }),
		settings,
		path,
		next: 'bh2 login',
	}
}

/**
 * The template's plugin entries written into the folder's .claude/settings.json, so Claude Code
 * started there keeps the plugin current by itself. Everything else in the file (permissions a
 * person added) is left as it is.
 */
async function pluginSettings(template: string, target: string): Promise<'updated' | 'kept'> {
	const file = join(target, '.claude', 'settings.json')
	const wanted = JSON.parse(
		await readFile(join(template, '.claude', 'settings.json'), 'utf8'),
	) as Record<string, Record<string, unknown>>
	const text = await readFile(file, 'utf8').catch(() => '{}')
	const current = JSON.parse(text) as Record<string, Record<string, unknown> | undefined>
	for (const key of PLUGIN_KEYS) {
		current[key] = { ...current[key], ...wanted[key] }
	}
	const next = `${JSON.stringify(current, null, 2)}\n`
	if (next === text) {
		return 'kept'
	}
	await mkdir(join(target, '.claude'), { recursive: true })
	await writeFile(file, next)
	return 'updated'
}

/**
 * bin/ and the work-folder template, both inside the plugin beside this file. Claude Code installs a
 * plugin by copying its folder alone, so anything setup needs must live in it.
 */
async function layout(): Promise<{ bin: string; workspace: string }> {
	const here = fileURLToPath(new URL('.', import.meta.url))
	const found = { bin: join(here, '..', 'bin'), workspace: join(here, '..', 'workspace') }
	if ((await exists(join(found.bin, 'bh2'))) && (await exists(found.workspace))) {
		return found
	}
	throw new Bh2Error(
		'bh2 setup',
		{
			code: 'no_plugin',
			message: 'There is no installed plugin around this bh2',
			hint: 'Install the plugin first: claude plugin install belkins-home-2@belkins-home-2',
		},
		2,
	)
}

/**
 * The bin/ the person's own terminal should run. Claude Code runs a plugin from a copy named after
 * its version, which an update replaces, so a link into it would break after the first update. The
 * marketplace's own clone (`<config>/plugins/marketplaces/belkins-home-2`) is updated in place: link
 * there when it is installed that way, else to the copy running now.
 */
async function stableBin(bin: string): Promise<string> {
	const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')
	const marketplaceBin = join(
		configDir,
		'plugins',
		'marketplaces',
		'belkins-home-2',
		'plugin',
		'bin',
	)
	return (await exists(join(marketplaceBin, 'bh2'))) ? marketplaceBin : bin
}

/** A link in ~/.local/bin, and that folder on the PATH in the login shell's rc file. */
async function posixPath(bin: string): Promise<Record<string, unknown>> {
	const dir = join(homedir(), '.local', 'bin')
	const link = join(dir, 'bh2')
	await mkdir(dir, { recursive: true })
	await rm(link, { force: true })
	await symlink(join(bin, 'bh2'), link)
	const rc = join(homedir(), basename(process.env.SHELL ?? '') === 'zsh' ? '.zshrc' : '.bashrc')
	const line = 'export PATH="$HOME/.local/bin:$PATH"'
	const text = await readFile(rc, 'utf8').catch(() => '')
	if (!text.includes(line)) {
		await appendFile(rc, `\n${line}\n`)
	}
	return { link, rc, newTerminal: !(process.env.PATH ?? '').split(':').includes(dir) }
}

/** The plugin's bin/ (with bh2.cmd) on the user's PATH, which every new terminal reads. */
function windowsPath(bin: string): Record<string, unknown> {
	const ps = (script: string): string =>
		execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
			encoding: 'utf8',
		}).trim()
	const current = ps("[Environment]::GetEnvironmentVariable('Path', 'User')")
	const entries = current.split(';').filter(Boolean)
	const added = !entries.some(entry => entry.toLowerCase() === bin.toLowerCase())
	if (added) {
		const next = [...entries, bin].join(';').replaceAll("'", "''")
		ps(`[Environment]::SetEnvironmentVariable('Path', '${next}', 'User')`)
	}
	return { userPath: bin, added, newTerminal: true }
}

async function exists(path: string): Promise<boolean> {
	return access(path).then(
		() => true,
		() => false,
	)
}
