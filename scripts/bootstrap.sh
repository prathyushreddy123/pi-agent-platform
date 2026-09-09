#!/usr/bin/env bash
#
# bootstrap.sh — link this repo's portable assets into ~/.pi/agent/.
#
# Makes agent-platform the single source of truth (Phase 14): prompts, skills,
# and the global AGENTS.md are symlinked from here into the live Pi config so
# edits in the repo take effect immediately with no drift.
#
# It ONLY touches portable assets. It never creates, reads, or overwrites
# secrets/runtime state in ~/.pi/agent/ (auth.json, models-store.json,
# sessions/, settings.json, etc.).
#
# Usage:
#   bootstrap.sh            # link, backing up any existing real files
#   bootstrap.sh --dry-run  # show what would happen, change nothing
#   bootstrap.sh --check    # verify links are correct; nonzero if not

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PI_HOME="${PI_HOME:-$HOME/.pi/agent}"
DRY_RUN=0
CHECK=0

case "${1:-}" in
  --dry-run) DRY_RUN=1 ;;
  --check)   CHECK=1 ;;
  ""|--link) ;;
  -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) printf 'error: unknown option: %s\n' "$1" >&2; exit 2 ;;
esac

info() { printf '%s\n' "$*" >&2; }

# Each entry: <source-in-repo> <destination-in-PI_HOME>
LINKS=(
  "prompts:prompts"
  "skills:skills"
  "templates/global-AGENTS.md:AGENTS.md"
)

status=0

link_one() {
  local src="$REPO_ROOT/$1" dst="$PI_HOME/$2"

  [[ -e "$src" ]] || { info "skip: missing source $src"; return; }

  if [[ $CHECK -eq 1 ]]; then
    if [[ -L "$dst" && "$(readlink -f "$dst")" == "$(readlink -f "$src")" ]]; then
      info "ok:   $dst -> $src"
    else
      info "DRIFT: $dst is not linked to $src"
      status=1
    fi
    return
  fi

  if [[ -L "$dst" && "$(readlink -f "$dst")" == "$(readlink -f "$src")" ]]; then
    info "ok:   $dst already linked"
    return
  fi

  if [[ $DRY_RUN -eq 1 ]]; then
    info "would link: $dst -> $src"
    [[ -e "$dst" && ! -L "$dst" ]] && info "  (would back up existing $dst)"
    return
  fi

  mkdir -p "$(dirname "$dst")"
  # Back up a real (non-symlink) file/dir before replacing it.
  if [[ -e "$dst" && ! -L "$dst" ]]; then
    local backup="$dst.bak.$(date +%Y%m%d%H%M%S)"
    info "backing up existing $dst -> $backup"
    mv "$dst" "$backup"
  fi
  ln -sfn "$src" "$dst"
  info "linked: $dst -> $src"
}

info "repo: $REPO_ROOT"
info "pi home: $PI_HOME"
mkdir -p "$PI_HOME"

for entry in "${LINKS[@]}"; do
  link_one "${entry%%:*}" "${entry##*:}"
done

exit $status
