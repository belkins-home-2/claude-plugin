#!/usr/bin/env bash
# Sets up bh2 for Belkins Home 2.0 on macOS or Linux. In a terminal:
#
#   curl -fsSL https://raw.githubusercontent.com/belkins-home-2/claude-plugin/main/install.sh | bash
#
# Installs what is missing (git, Node 22.18+, Claude Code), then the plugin, puts bh2 on the PATH,
# copies the work folder to ~/work/belkins-home-2 (~/bh2-work when that folder holds other files)
# and, in a terminal, connects bh2 through a link to approve in Belkins Home. Every step checks
# first, so running it again only finishes what is left.
set -euo pipefail

marketplace=$HOME/.claude/plugins/marketplaces/belkins-home-2
export PATH=$HOME/.local/bin:$PATH

step() { printf '\033[36m==> %s\033[0m\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }
fail() {
  printf 'install: %s\n' "$1" >&2
  exit 1
}
# Succeeds when the node on the PATH is 22.18 or newer: it runs bh2's TypeScript as it is.
node_ok() {
  have node || return 1
  v=$(node -v)
  major=${v#v}
  major=${major%%.*}
  rest=${v#v*.}
  minor=${rest%%.*}
  [ "$major" -gt 22 ] || { [ "$major" -eq 22 ] && [ "$minor" -ge 18 ]; }
}

step 'git'
if ! have git; then
  case $(uname -s) in
  Darwin)
    xcode-select --install || true
    fail 'a system window installs git: click Install, wait for it to finish, then run this again'
    ;;
  *)
    have apt-get || fail 'install git with your package manager, then run this again'
    sudo apt-get update && sudo apt-get install -y git
    ;;
  esac
fi

step 'Node 22.18 or newer'
if ! node_ok; then
  if have brew; then
    brew install node
  else
    export NVM_DIR=$HOME/.nvm
    [ -s "$NVM_DIR/nvm.sh" ] || curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
    set +eu
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm install --lts && nvm alias default 'lts/*'
    set -eu
  fi
fi
node_ok || fail "node on the PATH is still $(node -v 2>/dev/null || echo missing): which -a node shows which one comes first"

step 'Claude Code'
have claude || curl -fsSL https://claude.ai/install.sh | bash
have claude || fail 'claude is not on the PATH: open a new terminal and run this again'

step 'The belkins-home-2 plugin'
if [ -d "$marketplace" ]; then
  claude plugin marketplace update belkins-home-2
else
  claude plugin marketplace add https://github.com/belkins-home-2/claude-plugin.git
fi
claude plugin install belkins-home-2@belkins-home-2
[ -x "$marketplace/plugin/bin/bh2" ] || fail "the plugin did not install: no $marketplace/plugin/bin/bh2"

step 'The work folder, and bh2 on the PATH'
setup=$(node --disable-warning=ExperimentalWarning "$marketplace/plugin/cli/cli.ts" setup)
workspace=$(node -p 'JSON.parse(process.argv[1]).workspace' "$setup")
taken=$(node -p '(JSON.parse(process.argv[1]).taken ?? []).join(", ")' "$setup")

step 'Connect bh2 to your account'
if bh2 whoami >/dev/null 2>&1; then
  echo 'Already connected.'
elif [ -t 1 ]; then
  bh2 login || fail 'bh2 login did not finish: run "bh2 login" again'
else
  echo 'Run "bh2 login" to connect.'
fi

printf '\n'
[ -z "$taken" ] || printf '%s already holds other files, so setup left it as it is.\n' "$taken"
printf '\033[32mDone. Open Claude Code in %s and name the client in your first message.\033[0m\n' "$workspace"
