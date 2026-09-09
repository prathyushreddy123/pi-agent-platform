#!/usr/bin/env bash
#
# worktree.sh — safe per-task Git worktree automation.
#
# Encodes the conventions in skills/git-worktree/SKILL.md:
#   - worktrees live at ~/worktrees/<project>/<task>
#   - branch convention agent/<task>
#   - never nest inside the main checkout
#   - never clobber an existing branch, never --force away uncommitted work
#
# Usage:
#   worktree.sh create <task> [base-branch]   # default base: default branch
#   worktree.sh list
#   worktree.sh inspect <task>
#   worktree.sh remove <task>                 # refuses if work is not clean
#
# Run from inside the target repository's main checkout.

set -euo pipefail

WORKTREE_ROOT="${WORKTREE_ROOT:-$HOME/worktrees}"
BRANCH_PREFIX="${BRANCH_PREFIX:-agent}"

die()  { printf 'error: %s\n' "$*" >&2; exit 1; }
info() { printf '%s\n' "$*" >&2; }

require_repo() {
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
    || die "not inside a git repository (run from the repo's main checkout)"
}

project_name() {
  basename "$(git rev-parse --show-toplevel)"
}

default_branch() {
  # Prefer the remote HEAD if set, else fall back to the current branch.
  local ref
  ref="$(git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null || true)"
  if [[ -n "$ref" ]]; then
    printf '%s' "${ref#refs/remotes/origin/}"
  else
    git rev-parse --abbrev-ref HEAD
  fi
}

worktree_path() {
  printf '%s/%s/%s' "$WORKTREE_ROOT" "$(project_name)" "$1"
}

branch_name() {
  printf '%s/%s' "$BRANCH_PREFIX" "$1"
}

cmd_create() {
  local task="${1:-}"; local base="${2:-}"
  [[ -n "$task" ]] || die "usage: worktree.sh create <task> [base-branch]"
  require_repo

  local branch path
  branch="$(branch_name "$task")"
  path="$(worktree_path "$task")"

  # Never clobber an existing branch (SKILL: reuse deliberately or rename).
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    die "branch '$branch' already exists — reuse it deliberately or pick a new task name"
  fi
  [[ -e "$path" ]] && die "path already exists: $path"

  if [[ -z "$base" ]]; then
    base="$(default_branch)"
  fi

  # Refresh from remote if one exists, so the base is current.
  if git remote | grep -q .; then
    info "fetching..."
    git fetch --quiet || info "warning: fetch failed, using local refs"
  fi

  info "creating worktree: $path  (branch $branch, base $base)"
  git worktree add "$path" -b "$branch" "$base"
  info "done. cd $path"
}

cmd_list() {
  require_repo
  git worktree list
}

cmd_inspect() {
  local task="${1:-}"
  [[ -n "$task" ]] || die "usage: worktree.sh inspect <task>"
  require_repo
  local path; path="$(worktree_path "$task")"
  [[ -d "$path" ]] || die "no worktree at $path"
  ( cd "$path" && git status && echo && git log --oneline -5 )
}

cmd_remove() {
  local task="${1:-}"
  [[ -n "$task" ]] || die "usage: worktree.sh remove <task>"
  require_repo
  local path; path="$(worktree_path "$task")"
  [[ -d "$path" ]] || die "no worktree at $path"

  # Safety: refuse to remove a worktree with uncommitted changes.
  # git worktree remove already refuses without --force; we double-check
  # and never pass --force (SKILL: not without explicit authorization).
  if [[ -n "$( cd "$path" && git status --porcelain )" ]]; then
    die "worktree has uncommitted changes: $path
commit or discard them first; this script will not --force"
  fi

  info "removing worktree: $path"
  git worktree remove "$path"
  git worktree prune
  info "done. branch '$(branch_name "$task")' kept — delete with: git branch -d $(branch_name "$task")"
}

main() {
  local sub="${1:-}"; shift || true
  case "$sub" in
    create)  cmd_create  "$@" ;;
    list)    cmd_list    "$@" ;;
    inspect) cmd_inspect "$@" ;;
    remove)  cmd_remove  "$@" ;;
    ""|-h|--help|help)
      sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
      ;;
    *) die "unknown command: $sub (try --help)" ;;
  esac
}

main "$@"
