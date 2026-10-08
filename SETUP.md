# Setting up bh2 for Belkins Home 2.0: instructions for the agent

You are Claude, running in a new teammate's Claude Code. Take them from a bare machine to a working
`bh2`, step by step. Check before you change anything; skip a step whose check already passes. Say
in one line what you are doing before each step. Speak to the person in the language they write in.
They are not engineers: explain what they need to click, never what a command does inside.

Rules for the whole setup:

- **Never ask for a password or a token in chat.** The person connects by pressing Connect on a page
  of Belkins Home (step 2); nobody copies a token.
- Tell the person before anything that needs their password or opens a system window; the rest you
  run yourself.
- Do not clone or read any repository, and do not write code. If a step fails in a way this file
  does not cover, stop and show the person the exact error.

## 1. Install

**Never download a script and run it** (`curl … | bash`, `irm … | iex`, a saved `.ps1`): this
session's permission check refuses it. Every step below is a plain command you run yourself, one at
a time, checking first. Run `uname -s` to know the machine: `Darwin` is macOS, `Linux` is Linux,
`MINGW…` / `MSYS…` (or no `uname`, in PowerShell) is Windows.

### a. Node 22.18 or newer

Check: `node -v` prints `v22.18` or higher (any `v23`, `v24` or later is fine).

- Windows: `winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-package-agreements --accept-source-agreements`.
  This shell does not see the new PATH until Claude Code restarts: for the rest of the setup put
  `export PATH="/c/Program Files/nodejs:$PATH";` in front of each command (in PowerShell:
  `$env:Path = "C:\Program Files\nodejs;$env:Path";`).
- macOS with Homebrew (`brew -v` works): `brew install node`.
- macOS or Linux without it: Node's official build into `~/.local`, nothing run from the download:

  ```sh
  arch=$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/'); os=$(uname -s | tr A-Z a-z)
  file=$(curl -fsSL https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt | grep -o "node-v[0-9.]*-$os-$arch.tar.gz" | head -1)
  mkdir -p ~/.local && curl -fsSL "https://nodejs.org/dist/latest-v24.x/$file" | tar -xz -C ~/.local --strip-components=1
  ```

  Then put `export PATH="$HOME/.local/bin:$PATH";` in front of each later command.

An old Node earlier on the PATH is the most common failure later: `which -a node` must show the new
one first.

### b. git

Check: `git --version`. Claude Code installs the plugin with it.

- Windows: `winget install --id Git.Git --exact --silent --accept-package-agreements --accept-source-agreements`
  (then `/c/Program Files/Git/cmd` on the PATH, as above).
- macOS: `xcode-select --install` opens a system window: the person clicks **Install** and waits a
  few minutes.
- Linux: `sudo apt-get install -y git` (tell the person the password prompt is theirs).

### c. The plugin

Check: `claude --version`. If this shell has no `claude` (the desktop app keeps its own), install
the command line: `npm install -g @anthropic-ai/claude-code`. Then:

```sh
claude plugin marketplace add https://github.com/belkins-home-2/claude-plugin.git
claude plugin install belkins-home-2@belkins-home-2
```

If the marketplace is already there, run `claude plugin marketplace update belkins-home-2` instead
of `add`.

### d. The work folder, and `bh2` on the PATH

```sh
node $HOME/.claude/plugins/marketplaces/belkins-home-2/plugin/cli/cli.ts setup
```

It copies the work folder to `~/work/belkins-home-2` and puts `bh2` on the PATH of the person's own
terminal; running it again changes nothing. This session's shell does not see it yet: **in the
steps below, `bh2` means `node $HOME/.claude/plugins/marketplaces/belkins-home-2/plugin/cli/cli.ts`**.

## 2. Connect `bh2` to their account

The person signs in with their own Belkins Home account: the one they use for the app every day.
Only active Belkins and Revit staff can connect.

Run `bh2 login`. It answers with a link and a code:

```json
{ "open": "https://…/cli/BCDF-GHJK", "code": "BCDF-GHJK", "expiresInMinutes": 10, "next": "bh2 login --wait" }
```

Give the person the link as a clickable link and tell them: open it, sign in to Belkins Home if it
asks, check the page shows the same code, and press **Connect**. Then run `bh2 login --wait` with a
timeout of ten minutes: it returns as soon as they pressed Connect, and saves the connection itself.
If it answers that the link expired, run `bh2 login` again and give them the new link.

If `bh2 login` answers `no_api`, ask the person for the Belkins Home API address the team gave
them, and run `bh2 login --api <that address>`.

## 3. It works

```sh
bh2 whoami
bh2 projects
```

- `whoami` shows their email address: connected.
- `401`, `not_signed_in` or `token_not_valid`: back to step 2.
- `no_access`: their account is not active Belkins or Revit staff; they ask an admin.
- `projects` is empty: they are on no project's team yet; their manager adds them in Belkins Home.

## 4. Done

Tell the person, in a few lines: setup is complete. From now on they open Claude Code in
`~/work/belkins-home-2` (`cd ~/work/belkins-home-2 && claude`, or choose that folder in the desktop
app) and name the client in their first message. The plugin updates itself there.
