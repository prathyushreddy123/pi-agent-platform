# Fresh-machine bootstrap

Phase 14 makes the repository-owned Pi assets reproducible on WSL/Linux while
keeping credentials, settings, sessions, and runtime state local to each
machine.

## Responsibilities

The bootstrap links these portable assets into `~/.pi/agent/`:

- prompts;
- skills;
- the global `AGENTS.md`;
- the Herdr orchestrator, task manager, safety gate, and cockpit extensions.

It also installs the cockpit Herdr sidebar config into `~/.herdr/config.toml`,
but only when no config exists (a copy, never a symlink, never an overwrite).

It checks required commands and the Herdr Pi integration. It does not install
software, authenticate providers, or overwrite existing files owned by Pi or
Herdr.

## Prerequisites

Install these commands using the method appropriate for the machine:

- `git`
- `node`
- `pi`
- `herdr`

The current setup has been validated with Git 2.43.0, Node.js 24.20.0, Pi
0.85.1, and Herdr 0.9.0. These are tested versions, not permanent minimums.
Consult the upstream Pi and Herdr installation documentation when provisioning a
new machine; do not reinstall working tools merely to match these exact values.

## Initial setup

Clone the repository into a personal source directory, then inspect and apply
the links:

```bash
git clone git@github.com:prathyushreddy123/pi-agent-platform.git ~/src/agent-platform
cd ~/src/agent-platform
scripts/bootstrap.sh --dry-run
scripts/bootstrap.sh
```

Install Herdr's generated Pi state integration explicitly:

```bash
herdr integration install pi
```

Then verify the complete setup:

```bash
scripts/bootstrap.sh --check
```

Start a new Pi session after bootstrapping. Existing Pi sessions require
`/reload` to discover changed extensions, prompts, or skills.

## Provider configuration

Configure model providers using Pi's supported authentication flow on the local
machine. Never add provider credentials, `auth.json`, settings containing
sensitive endpoints, or environment values to this repository.

The bootstrap intentionally does not read, copy, link, or overwrite:

- `~/.pi/agent/auth.json`;
- `~/.pi/agent/settings.json`;
- provider/model stores;
- Pi sessions or logs;
- task-manager runtime state;
- an existing Herdr `config.toml` or generated integration files (it creates
  `~/.herdr/config.toml` from `templates/herdr-config.toml` only when none
  exists, and never modifies one that is already there).

## Safe behavior

- `--dry-run` reports proposed links and creates nothing.
- `--check` validates dependencies, links, and the Herdr Pi integration without
  modifying the filesystem.
- Normal execution is idempotent when links already point to this repository.
- A conflicting file, directory, foreign symlink, or dangling symlink is moved
  to a timestamped `.bak.*` path before the repository link is created.
- Missing required commands stop a normal bootstrap before it changes links.

Set `PI_HOME` to validate or stage links outside the default location:

```bash
PI_HOME=/tmp/pi-bootstrap-test scripts/bootstrap.sh --dry-run
```

## Updating

Pull reviewed repository changes, preview the current state, relink if needed,
and verify:

```bash
cd ~/src/agent-platform
git pull --ff-only
scripts/bootstrap.sh --dry-run
scripts/bootstrap.sh
scripts/bootstrap.sh --check
```

Review backups before deleting them. Bootstrap never removes backups, provider
state, branches, worktrees, or task history.

## Recovery

If verification reports drift, inspect the destination and any adjacent
`.bak.*` entry before rerunning bootstrap. Restore a backup only after confirming
that doing so will not overwrite newer local configuration. Run
`herdr integration install pi` separately when its status is missing or
outdated.
