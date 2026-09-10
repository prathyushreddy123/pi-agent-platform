import { basename, dirname, join, resolve, sep } from "node:path";
import { realpath } from "node:fs/promises";

export type SafetyMatch = {
  category: string;
  reason: string;
};

type CommandRule = SafetyMatch & {
  pattern: RegExp;
};

const commandRules: CommandRule[] = [
  {
    category: "recursive-delete",
    reason: "recursive or forced filesystem deletion",
    pattern: /\b(?:[^\s;&|()]+\/)?rm\b[^;&|]*(?:-[a-z]*[rf][a-z]*\b|--recursive\b|--force\b)/i,
  },
  {
    category: "force-push",
    reason: "force-pushing can overwrite remote history",
    pattern:
      /\bgit\b[^;&|]*\bpush\b[^;&|]*(?:--force(?:-with-lease)?\b|-f(?:\s|$)|--delete\b|(?:^|\s)\+(?:refs\/heads\/)?\S+|(?:^|\s):\S+)/i,
  },
  {
    category: "destructive-git",
    reason: "destructive Git operation can discard or orphan work",
    pattern:
      /\bgit\b[^;&|]*\b(?:reset\s+--hard\b|clean\s+(?:-[a-z]*[fdx][a-z]*\b|[^;&|]*--force\b)|branch\s+-D\b|worktree\s+remove\b[^;&|]*(?:--force\b|-f(?:\s|$))|checkout\s+--\s+|restore\b)/i,
  },
  {
    category: "infrastructure-change",
    reason: "infrastructure apply or destroy changes managed resources",
    pattern:
      /\b(?:(?:terraform|tofu)\s+(?:apply|destroy)\b|pulumi\s+(?:up|destroy)\b|ansible-playbook\b)/i,
  },
  {
    category: "kubernetes-delete",
    reason: "Kubernetes deletion or node disruption can affect running services",
    pattern: /\bkubectl\b[^;&|]*\b(?:delete|drain|cordon)\b/i,
  },
  {
    category: "kubernetes-production-change",
    reason: "Kubernetes mutation appears to target production",
    pattern:
      /\bkubectl\b(?=[^;&|]*(?:\bprod(?:uction)?\b|--context(?:=|\s+)\S*prod))[^;&|]*\b(?:apply|patch|replace|scale|rollout)\b/i,
  },
  {
    category: "helm-change",
    reason: "Helm removal or production change can affect running services",
    pattern:
      /\bhelm\s+(?:uninstall\b|(?:(?:upgrade|rollback)\b[^;&|]*(?:\bprod(?:uction)?\b|--kube-context(?:=|\s+)\S*prod)))/i,
  },
  {
    category: "database-destructive",
    reason: "command contains a destructive database statement",
    pattern:
      /(?=.*\b(?:psql|mysql|mariadb|mongosh|mongo|redis-cli)\b)(?=.*\b(?:drop\s+(?:database|schema|table)|truncate\s+(?:table\s+)?|delete\s+from|flushall|flushdb)\b)/i,
  },
  {
    category: "cloud-destructive",
    reason: "cloud deletion or termination can destroy remote resources",
    pattern:
      /\b(?:aws\b[^;&|]*(?:\bdelete\b|\bterminate\b|\bderegister\b|s3\s+rm\b[^;&|]*--recursive\b)|gcloud\b[^;&|]*\bdelete\b|az\b[^;&|]*\bdelete\b|doctl\b[^;&|]*\bdelete\b|fly\s+apps\s+destroy\b)/i,
  },
  {
    category: "credential-change",
    reason: "authentication or credential configuration change",
    pattern:
      /\b(?:gh\s+auth\s+(?:login|logout|refresh|setup-git)\b|aws\s+configure\s+(?:set|import)\b|gcloud\s+auth\s+(?:login|revoke|activate-service-account|application-default\s+login)\b|kubectl\s+config\s+set-credentials\b|docker\s+login\b|npm\s+login\b)/i,
  },
  {
    category: "privilege-change",
    reason: "privileged command or broad permission/ownership change",
    pattern: /\b(?:sudo\b|doas\b|chmod\b[^;&|]*(?:777|-[a-z]*R[a-z]*)|chown\b[^;&|]*-[a-z]*R[a-z]*)/i,
  },
  {
    category: "protected-shell-path",
    reason: "shell command may create, copy, modify, or remove credential data",
    pattern:
      /\b(?:cp|mv|install|tee|touch|truncate|rm|chmod|chown)\b[^\n]*(?:\.env(?:\.[\w.-]+)?|\.netrc|\.npmrc|\.pypirc|\.git-credentials|auth\.json|credentials(?:\.json)?|id_rsa|id_ed25519|[^\s/]+\.(?:pem|key)|\.ssh\/|\.aws\/|\.azure\/|\.kube\/|\.docker\/config\.json|\.config\/gcloud\/|\.pi\/agent\/(?:auth|models-store)\.json|(?:^|[\s/])secrets\/)/i,
  },
  {
    category: "protected-shell-read",
    reason: "shell command may expose credential or secret contents",
    pattern:
      /(?:\b(?:cat|head|tail|less|more|grep|rg|find|ls|awk|sed|cut|source)\b|(?:^|\s)\.\s+)[^\n;&|]*(?:\.env(?:\.[\w.-]+)?|\.netrc|\.npmrc|\.pypirc|\.git-credentials|auth\.json|credentials(?:\.json)?|id_rsa|id_ed25519|[^\s/]+\.(?:pem|key)|\.ssh\/|\.aws\/|\.azure\/|\.kube\/|\.docker\/config\.json|\.config\/gcloud\/|\.pi\/agent\/(?:auth|models-store)\.json|(?:^|[\s/])secrets\/)/i,
  },
];

const protectedBasenames = new Set([
  ".env",
  ".git-credentials",
  ".netrc",
  ".npmrc",
  ".pypirc",
  "auth.json",
  "credentials",
  "credentials.json",
  "id_rsa",
  "id_ed25519",
]);

const protectedSegments = [
  "/.ssh/",
  "/.aws/",
  "/.azure/",
  "/.kube/",
  "/.config/gcloud/",
  "/secrets/",
];

function normalize(path: string): string {
  return path.split(sep).join("/");
}

function pathReason(path: string): SafetyMatch | undefined {
  const normalized = normalize(path);
  const name = basename(path).toLowerCase();

  if (
    protectedBasenames.has(name) ||
    /^\.env(?:\.|$)/i.test(name) ||
    /\.(?:pem|key)$/i.test(name)
  ) {
    return { category: "protected-path", reason: "path may contain secrets or credentials" };
  }
  if (protectedSegments.some((segment) => `${normalized}/`.includes(segment))) {
    return { category: "protected-path", reason: "path is inside a credential or secret directory" };
  }
  if (/\/\.docker\/config\.json$/i.test(normalized)) {
    return { category: "protected-path", reason: "path contains Docker authentication state" };
  }
  if (/\/\.pi\/agent\/(?:auth\.json|models-store\.json)$/i.test(normalized)) {
    return { category: "protected-path", reason: "path contains Pi authentication state" };
  }
  return undefined;
}

async function canonicalize(path: string): Promise<string> {
  const missing: string[] = [];
  let candidate = path;

  while (true) {
    try {
      const existing = await realpath(candidate);
      return join(existing, ...missing);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
      const parent = dirname(candidate);
      if (parent === candidate) throw error;
      missing.unshift(basename(candidate));
      candidate = parent;
    }
  }
}

function actionableSegments(command: string): string[] {
  const segments: string[] = [];
  let current = "";
  let quote: "'" | '"' | undefined;
  let escaped = false;

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      current += character;
      escaped = true;
      continue;
    }
    if (quote) {
      current += character;
      if (character === quote) quote = undefined;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      current += character;
      continue;
    }
    if (character === "#" && (index === 0 || /\s/.test(command[index - 1]))) {
      while (index < command.length && command[index] !== "\n") index += 1;
      if (current.trim()) segments.push(current.trim());
      current = "";
      continue;
    }
    if (/[;&|()\n]/.test(character)) {
      if (current.trim()) segments.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  if (current.trim()) segments.push(current.trim());

  return segments.filter((segment) => {
    const withoutAssignments = segment.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*/, "");
    return !/^(?:echo|printf)\b/.test(withoutAssignments);
  });
}

function hasProtectedRedirection(command: string): boolean {
  let quote: "'" | '"' | undefined;
  let escaped = false;

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = undefined;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character !== ">") continue;

    const offset = command[index + 1] === ">" ? 2 : 1;
    const target = command.slice(index + offset).split(/[;&|()\n]/, 1)[0];
    const protectedFile =
      /(?:^|\/)\s*["']?(?:\.env(?:\.[\w.-]+)?|\.netrc|\.npmrc|\.pypirc|\.git-credentials|auth\.json|credentials(?:\.json)?|id_rsa|id_ed25519|[^\s/'"]+\.(?:pem|key))(?:[\s'"]|$)/i;
    if (
      protectedFile.test(target) ||
      /(?:\/|^\s*["']?)(?:\.ssh|\.aws|\.azure|\.kube|secrets)\//i.test(target) ||
      /\/(?:\.docker\/config\.json|\.config\/gcloud\/|\.pi\/agent\/(?:auth|models-store)\.json)/i.test(target)
    ) {
      return true;
    }
  }
  return false;
}

export function commandMatches(command: string): SafetyMatch[] {
  const segments = actionableSegments(command);
  const matches = commandRules
    .filter((rule) => segments.some((segment) => rule.pattern.test(segment)))
    .map(({ category, reason }) => ({ category, reason }));

  const databaseStatement = /\b(?:drop\s+(?:database|schema|table)|truncate\s+(?:table\s+)?|delete\s+from|flushall|flushdb)\b/i;
  const databaseClient = /\b(?:psql|mysql|mariadb|mongosh|mongo|redis-cli)\b/i;
  if (
    databaseStatement.test(command) &&
    segments.some((segment) => databaseClient.test(segment))
  ) {
    matches.push({
      category: "database-destructive",
      reason: "command contains a destructive database statement",
    });
  }
  if (hasProtectedRedirection(command)) {
    matches.push({
      category: "protected-shell-path",
      reason: "shell command may create, copy, modify, or remove credential data",
    });
  }

  return matches.filter(
    (match, index) => matches.findIndex((candidate) => candidate.category === match.category) === index,
  );
}

export async function protectedPathMatch(
  path: string,
  cwd: string,
): Promise<SafetyMatch | undefined> {
  const lexical = resolve(cwd, path.replace(/^@/, ""));
  const lexicalMatch = pathReason(lexical);
  if (lexicalMatch) return lexicalMatch;

  const canonical = await canonicalize(lexical);
  return pathReason(canonical);
}

export function isSecretRead(matches: SafetyMatch[]): boolean {
  return matches.some((match) => match.category === "protected-shell-read");
}

export function isShellReadCommand(command: string): boolean {
  return actionableSegments(command).some((segment) =>
    /(?:\b(?:cat|head|tail|less|more|grep|rg|find|ls|awk|sed|cut|source)\b|(?:^|\s)\.\s+)/i.test(segment),
  );
}
