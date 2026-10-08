import { readFile } from 'node:fs/promises'

/** A text file, or stdin when the path is "-": a summary piped straight from another command. */
export function readText(path: string): Promise<string> {
	return path === '-' ? stdin() : readFile(path, 'utf8')
}

async function stdin(): Promise<string> {
	const chunks: Buffer[] = []
	for await (const chunk of process.stdin) {
		chunks.push(chunk as Buffer)
	}
	return Buffer.concat(chunks).toString('utf8')
}
