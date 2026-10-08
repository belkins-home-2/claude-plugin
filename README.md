# Belkins Home 2.0 for Claude Code

The team's skills and the `bh2` command, for working Belkins Home 2.0 client projects in Claude
Code. This repository is **published automatically** from the platform's repository on every
release; do not edit it here, the next release overwrites it.

## Install

Install Claude Code (https://claude.com/claude-code: the desktop app or the command line; on
Windows no WSL is needed), open it, and give it this one line:

```
Set me up for Belkins Home 2.0: follow https://raw.githubusercontent.com/belkins-home-2/claude-plugin/main/SETUP.md
```

Claude installs whatever is missing (Node, git), the plugin, `bh2` and your work folder
`~/work/belkins-home-2`. Then it gives you a link: open it, sign in to Belkins Home as you always do,
check the code and press **Connect**. You type no password into Claude, and nobody copies a token.

In Auto mode, Claude Code's safety check stops two of these steps, installing the plugin and saving
your sign-in, because only you may approve them. When that happens Claude asks you to switch the
permission mode to **Manual** (the mode selector next to Send in the desktop app; Shift+Tab in the
terminal) and say "continue"; you then approve the step with a click and can switch back to Auto.

Without Claude Code yet, one command does the same, Claude Code included:

```sh
curl -fsSL https://raw.githubusercontent.com/belkins-home-2/claude-plugin/main/install.sh | bash   # macOS, Linux
```

```powershell
irm https://raw.githubusercontent.com/belkins-home-2/claude-plugin/main/install.ps1 | iex          # Windows PowerShell
```

## Every day

Open Claude Code in `~/work/belkins-home-2` and name the client in your first message. Claude picks
the project, reads what is there and what the last session left, and works through `bh2`.

## Updating

Nothing to do: Claude Code started in the work folder keeps the plugin current by itself. A new
version arrives in the background and applies from the next session. By hand, any time:

```sh
claude plugin marketplace update belkins-home-2
```

## Something is wrong

Tell the team what you asked, what Claude ran and what came back. Claude also writes it in the
project's hand-over.

## For developers

The source is `claude-plugin/` in the api-2 repository; the API behind `bh2` is
`src/modules/cli/` there (CLI.md). `bh2` is TypeScript that Node 22.18 or newer runs as it is: no
dependencies and nothing to build.
