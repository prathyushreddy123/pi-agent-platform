#!/usr/bin/env bash
#
# bootstrap.sh — link this repo's portable assets into ~/.pi/agent/.
#
# Makes agent-platform the single source of truth (Phase 14): prompts, skills,
# the global AGENTS.md, and repository-owned extensions are symlinked from here
# into the live Pi config so edits take effect immediately with no drift.
#
# It ONLY touches portable assets. It never creates, reads, or overwrites
# secrets/runtime state in ~/.pi/agent/ (auth.json, models-store.json,
# sessions/, settings.json, etc.).
#
# Usage:
#   bootstrap.sh            # link, backing up conflicting destinations
#   bootstrap.sh --dry-run  # show what would happen, change nothing
#   bootstrap.sh --check    # verify prerequisites, integration, and links

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

path_exists() {
  [[ -e "$1" || -L "$1" ]]
}

check_prerequisites() {
  local cmd missing=0
  for cmd in git node pi herdr; do
    if command -v "$cmd" >/dev/null 2>&1; then
      info "ok:   dependency $cmd"
    else
      info "MISSING: required command '$cmd'"
      missing=1
      status=1
    fi
  done

  if [[ $missing -eq 1 ]]; then
    info "install missing prerequisites, then rerun bootstrap (see docs/bootstrap.md)"
    return 1
  fi
}

check_herdr_integration() {
  local integration_status
  integration_status="$(herdr integration status 2>/dev/null || true)"
  if grep -q '^pi: current ' <<<"$integration_status"; then
    info "ok:   Herdr Pi integration is current"
    return
  fi

  info "NEEDS ACTION: Herdr Pi integration is not current"
  info "run: herdr integration install pi"
  [[ $CHECK -eq 1 ]] && status=1
}

# Each entry: <source-in-repo> <destination-in-PI_HOME>
LINKS=(
  "prompts:prompts"
  "skills:skills"
  "templates/global-AGENTS.md:AGENTS.md"
  "extensions/herdr-orchestrator:extensions/herdr-orchestrator"
  "extensions/task-manager:extensions/task-manager"
  "extensions/safety-gate:extensions/safety-gate"
)

status=0

link_one() {
  local src="$REPO_ROOT/$1" dst="$PI_HOME/$2"

  if [[ ! -e "$src" ]]; then
    info "MISSING: source $src"
    status=1
    return
  fi

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
    if path_exists "$dst"; then
      info "  (would back up conflicting $dst)"
    fi
    return 0
  fi

  mkdir -p "$(dirname "$dst")"
  # Preserve files, directories, and foreign/dangling symlinks before replacing.
  if path_exists "$dst"; then
    local backup
    backup="$dst.bak.$(date +%Y%m%d%H%M%S).$$"
    info "backing up existing $dst -> $backup"
    mv "$dst" "$backup"
  fi
  ln -s "$src" "$dst"
  info "linked: $dst -> $src"
}

info "repo: $REPO_ROOT"
info "pi home: $PI_HOME"

prerequisites_ok=1
check_prerequisites || prerequisites_ok=0

# Avoid a partially configured installation when a normal bootstrap lacks tools.
# Dry-run and check continue so they can report all expected links.
if [[ $prerequisites_ok -eq 0 && $DRY_RUN -eq 0 && $CHECK -eq 0 ]]; then
  exit "$status"
fi

if [[ $DRY_RUN -eq 0 && $CHECK -eq 0 ]]; then
  mkdir -p "$PI_HOME"
fi

for entry in "${LINKS[@]}"; do
  link_one "${entry%%:*}" "${entry##*:}"
done

if [[ $prerequisites_ok -eq 1 ]]; then
  check_herdr_integration
fi

exit "$status"
