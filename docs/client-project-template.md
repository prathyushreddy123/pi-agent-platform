# Client project template

Phase 13 provides a small project-specific overlay for client repositories. It
does not create an application scaffold or replace a repository's existing
documentation.

## Source template

[`templates/client-project/AGENTS.md`](../templates/client-project/AGENTS.md)
contains the project facts an agent cannot safely infer: exact commands,
architecture boundaries, data restrictions, and delivery requirements. Global
rules continue to come from `~/.pi/agent/AGENTS.md`.

## Repository isolation

Keep each client and project in its own path:

```text
~/src/clients/<client>/<project>
```

Create task worktrees under:

```text
~/worktrees/<project>/<task-id>
```

A shared project name can collide under the default worktree convention. If two
clients have repositories with the same basename, give their local repositories
unique names or set a client-specific `WORKTREE_ROOT` before creating
worktrees.

Never copy code, data, credentials, configuration, task output, or project
instructions between client repositories.

## Adopt in a new repository

1. Copy the source template to `<project>/AGENTS.md`.
2. Replace every `{{PLACEHOLDER}}` with verified project information.
3. Use `Not applicable` plus a reason where a field does not apply.
4. Confirm setup, test, lint, type-check, build, and run commands locally.
5. Have the project owner confirm security, delivery, deployment, and rollback
   sections where relevant.
6. Review and commit the completed `AGENTS.md` in the client repository through
   that repository's normal approval process.

Do not place secrets, tokens, environment values, private client data, or
machine-specific absolute paths in the file.

## Adopt in an existing repository

Read the repository's current `AGENTS.md`, README, contribution guide, CI
configuration, and package/build files first. Do not overwrite existing
instructions. Merge only missing project-specific facts, preserve stricter
rules, and resolve contradictions with the owner.

The template deliberately does not supply a `.gitignore`, dependency manifest,
CI workflow, Dockerfile, or deployment configuration. Those are stack- and
client-specific and should follow the repository's established conventions.

## Use with the multi-agent workflow

- The lead starts from the project's main checkout in the Herdr `control` tab.
- Each implementation task gets durable task state and an isolated worktree.
- Worker and reviewer agents receive the project `AGENTS.md` through their
  working directory and must remain within its scope.
- Structured handoffs include actual Git evidence and the checks required by
  both the project and global instructions.
- Human approval remains required for commits when requested by policy, merges,
  pushes, deployments, production access, and destructive cleanup.

See the [Herdr workspace layout](herdr-workspace-layout.md) and
[task-state workflow](task-state.md) for the related conventions.

## Readiness checklist

Before beginning client work, confirm:

- all placeholders have been resolved;
- the repository and worktree paths belong to the correct client;
- setup and validation commands are current;
- approved test data is identified;
- protected paths and external-system restrictions are documented;
- no secret values are present in tracked instructions;
- delivery and rollback expectations are clear for the task.

If any required fact is unknown, ask rather than infer it.
