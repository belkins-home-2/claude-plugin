#!/usr/bin/env node
// bh2: the team's command for Belkins Home 2.0 (api-2: src/modules/cli/CLI.md). JSON out; a refusal
// comes with a hint. Run by bin/bh2 (bin/bh2.cmd on Windows); the commands are in commands.ts.

import { run } from './commands.ts'

await run(process.argv.slice(2))
