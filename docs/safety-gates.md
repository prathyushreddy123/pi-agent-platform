# Safety gates

## Purpose

Phase 10 adds an enforceable interception layer before Pi executes dangerous
built-in shell, read, grep, find, `ls`, write, or edit tool calls. It supplements the behavioral rules
in `AGENTS.md`; prompting alone is not a security boundary.

## Behavior

- Interactive TUI: display only categories/reasons and request one-time
  confirmation for dangerous mutations.
- RPC, print, and JSON modes: block by default because a human TUI approval
  cannot be established.
- Reads/searches of recognized secret paths are always blocked, including in
  the interactive TUI, so credentials cannot enter model or session context.
- Rejection: block the tool call and return a reason to the agent.
- Approval is not persisted. A later dangerous call asks again.

The confirmation deliberately omits the raw command and file contents to avoid
copying credentials into the dialog or logs.

## Command categories

The initial classifier gates:

- recursive/forced filesystem deletion;
- force pushes, hard resets, forced branch deletion, aggressive Git cleaning,
  forced worktree removal, and broad checkout/restore operations;
- Terraform/OpenTofu apply/destroy, Pulumi up/destroy, and Ansible playbooks;
- Kubernetes deletion/node disruption and production-looking mutations;
- Helm removal and production-looking upgrades/rollbacks;
- destructive SQL/Redis statements sent through common database clients;
- cloud deletion and termination commands;
- authentication/configuration changes;
- `sudo`, `doas`, and broad recursive ownership/permission changes.

## Protected paths

Pi write/edit calls—and recognizable shell commands that mutate or copy these
paths—require approval for common secret locations including:

- `.env`, `.netrc`, `.npmrc`, `.pypirc`, and `.git-credentials` variants;
- SSH, AWS, Azure, Kubernetes, gcloud, and Docker credential locations;
- `auth.json`, credential files, common private-key names, `*.pem`, `*.key`,
  and secret directories;
- Pi authentication state.

Built-in read, grep, find, and `ls` calls against these paths are blocked
outright. Common shell readers such as `cat`, `head`, `tail`, `grep`, `rg`,
`awk`, and `sed` are also classified when a protected path is visible in the
command.

## Important limitations

This is defense in depth, not a complete shell parser or sandbox. It cannot
reliably inspect behavior hidden inside arbitrary scripts, aliases, binaries,
encoded commands, build hooks, or third-party dependencies. Direct commands
typed by the human with Pi's `!` syntax are treated as explicit human actions
and are not intercepted by this agent-tool gate.

The `tool_call` event covers Pi tool calls. It does not wrap commands executed
internally by another extension through `pi.exec()` or arbitrary custom tools.
Also, a later-loaded `tool_call` handler could mutate a command after this gate
checks it. Keep this extension late in the configured load order and treat
Phase 11 process isolation as the stronger boundary.

Use restricted credentials now. Phase 11 adds Docker-based execution isolation
for unknown repositories, risky dependencies, and highly autonomous work.

## Tests

Run the table-driven classifier and symlink tests with:

```bash
node --test extensions/safety-gate/policy.test.ts
```

Tests cover dangerous and representative safe commands, protected shell reads,
lexical paths, existing-file symlinks, and symlinked parents for new files.

## No bypass persistence

V1 intentionally has no allowlist file, global disable flag, or “always allow”
button. Update the version-controlled classifier deliberately if policy needs
to change.
