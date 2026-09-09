import { randomBytes } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const TASK_SCHEMA_VERSION = 1;
const LOCK_STALE_MS = 30_000;
const LOCK_RETRIES = 40;
const LOCK_RETRY_MS = 100;

const statuses = [
  "planned",
  "assigned",
  "working",
  "blocked",
  "review",
  "completed",
  "failed",
] as const;
type TaskStatus = (typeof statuses)[number];

const verdicts = ["approve", "approve-with-changes", "request-changes"] as const;
type ReviewVerdict = (typeof verdicts)[number];

const handoffTypes = ["worker-to-reviewer", "reviewer-to-lead", "general"] as const;
type HandoffType = (typeof handoffTypes)[number];

interface TaskResult {
  summary: string;
  changedFiles: string[];
  checks: string[];
  unresolvedIssues: string[];
  gitStatus?: string;
  recordedAt: string;
}

interface ReviewResult extends TaskResult {
  verdict: ReviewVerdict;
}

interface TaskRecord {
  schemaVersion: number;
  revision: number;
  id: string;
  project: string;
  description: string;
  status: TaskStatus;
  role?: string;
  agentName?: string;
  agentType?: string;
  worktree?: string;
  branch?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  endedAt?: string;
  workerResult?: TaskResult;
  reviewResult?: ReviewResult;
}

const transitions: Record<TaskStatus, readonly TaskStatus[]> = {
  planned: ["assigned", "failed"],
  assigned: ["working", "blocked", "failed"],
  working: ["blocked", "review", "failed"],
  blocked: ["assigned", "working", "review", "failed"],
  review: ["working", "blocked", "completed", "failed"],
  completed: [],
  failed: ["planned", "assigned"],
};

const statusSchema = StringEnum(statuses);
const verdictSchema = StringEnum(verdicts);
const handoffTypeSchema = StringEnum(handoffTypes);
const taskIdSchema = Type.String({
  description: "Stable task ID using letters, digits, dots, underscores, or hyphens",
  pattern: "^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$",
});
const shortTextSchema = Type.String({ minLength: 1, maxLength: 10_000 });
const stringListSchema = Type.Array(Type.String({ maxLength: 1_000 }), { maxItems: 200 });

function now(): string {
  return new Date().toISOString();
}

function createTaskId(): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `task-${stamp}-${randomBytes(3).toString("hex")}`;
}

function stateRoot(): string {
  const configured = process.env.AGENT_PLATFORM_STATE_DIR;
  if (configured) return resolve(configured);
  const xdgState = process.env.XDG_STATE_HOME || join(process.env.HOME || ".", ".local", "state");
  return join(xdgState, "agent-platform");
}

function tasksDir(): string {
  return join(stateRoot(), "tasks");
}

function taskPath(id: string): string {
  return join(tasksDir(), `${id}.json`);
}

function lockPath(id: string): string {
  return join(tasksDir(), `${id}.lock`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function ensureStateDir(): Promise<void> {
  await mkdir(tasksDir(), { recursive: true, mode: 0o700 });
}

async function acquireLock(id: string): Promise<() => Promise<void>> {
  await ensureStateDir();
  const path = lockPath(id);

  for (let attempt = 0; attempt < LOCK_RETRIES; attempt += 1) {
    try {
      await mkdir(path, { mode: 0o700 });
      return async () => rm(path, { recursive: true, force: true });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw error;

      const lockStat = await stat(path).catch(() => undefined);
      if (lockStat && Date.now() - lockStat.mtimeMs > LOCK_STALE_MS) {
        await rm(path, { recursive: true, force: true });
        continue;
      }
      await sleep(LOCK_RETRY_MS);
    }
  }

  throw new Error(`Task '${id}' is busy; retry after the current update completes`);
}

function validateTask(value: unknown, id: string): TaskRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Task '${id}' contains invalid JSON data`);
  }
  const task = value as Partial<TaskRecord>;
  if (
    task.schemaVersion !== TASK_SCHEMA_VERSION ||
    task.id !== id ||
    typeof task.revision !== "number" ||
    typeof task.project !== "string" ||
    typeof task.description !== "string" ||
    !statuses.includes(task.status as TaskStatus)
  ) {
    throw new Error(`Task '${id}' does not match schema version ${TASK_SCHEMA_VERSION}`);
  }
  return task as TaskRecord;
}

async function readTask(id: string): Promise<TaskRecord> {
  let text: string;
  try {
    text = await readFile(taskPath(id), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Task not found: ${id}`);
    }
    throw error;
  }

  try {
    return validateTask(JSON.parse(text) as unknown, id);
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`Task '${id}' contains malformed JSON`);
    throw error;
  }
}

async function writeTask(task: TaskRecord): Promise<void> {
  await ensureStateDir();
  const destination = taskPath(task.id);
  const temporary = join(dirname(destination), `.${task.id}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`);
  await writeFile(temporary, `${JSON.stringify(task, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, destination);
}

async function mutateTask(
  id: string,
  expectedRevision: number | undefined,
  mutate: (task: TaskRecord) => TaskRecord,
): Promise<TaskRecord> {
  const release = await acquireLock(id);
  try {
    const current = await readTask(id);
    if (expectedRevision !== undefined && current.revision !== expectedRevision) {
      throw new Error(
        `Task '${id}' revision conflict: expected ${expectedRevision}, current ${current.revision}`,
      );
    }
    const updated = mutate(structuredClone(current));
    updated.revision = current.revision + 1;
    updated.updatedAt = now();
    await writeTask(updated);
    return updated;
  } finally {
    await release();
  }
}

function resultFromParams(params: {
  summary: string;
  changedFiles?: string[];
  checks?: string[];
  unresolvedIssues?: string[];
  gitStatus?: string;
}): TaskResult {
  return {
    summary: params.summary,
    changedFiles: params.changedFiles ?? [],
    checks: params.checks ?? [],
    unresolvedIssues: params.unresolvedIssues ?? [],
    gitStatus: params.gitStatus,
    recordedAt: now(),
  };
}

function textResult(task: TaskRecord) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }],
    details: task,
  };
}

export default function taskManager(pi: ExtensionAPI) {
  pi.registerTool({
    name: "task_create",
    label: "Create Task",
    description: "Create a durable planned task record. Runtime state is stored outside Git.",
    promptSnippet: "Create and track durable multi-agent task records",
    promptGuidelines: [
      "Use task_create before delegated implementation work when task tracking is requested, then update the record as the workflow progresses.",
    ],
    parameters: Type.Object({
      id: Type.Optional(taskIdSchema),
      project: Type.String({ minLength: 1, maxLength: 1_000 }),
      description: shortTextSchema,
      worktree: Type.Optional(Type.String({ maxLength: 4_096 })),
      branch: Type.Optional(Type.String({ maxLength: 1_000 })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const id = params.id ?? createTaskId();
      const release = await acquireLock(id);
      try {
        if (await stat(taskPath(id)).then(() => true).catch(() => false)) {
          throw new Error(`Task already exists: ${id}`);
        }
        const timestamp = now();
        const task: TaskRecord = {
          schemaVersion: TASK_SCHEMA_VERSION,
          revision: 1,
          id,
          project: params.project,
          description: params.description,
          status: "planned",
          worktree: params.worktree ? resolve(ctx.cwd, params.worktree) : undefined,
          branch: params.branch,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        await writeTask(task);
        return textResult(task);
      } finally {
        await release();
      }
    },
  });

  pi.registerTool({
    name: "task_get",
    label: "Get Task",
    description: "Read one task record by ID.",
    parameters: Type.Object({ id: taskIdSchema }),
    async execute(_toolCallId, params) {
      return textResult(await readTask(params.id));
    },
  });

  pi.registerTool({
    name: "task_list",
    label: "List Tasks",
    description: "List task summaries, optionally filtered by status or project.",
    parameters: Type.Object({
      status: Type.Optional(statusSchema),
      project: Type.Optional(Type.String({ maxLength: 1_000 })),
    }),
    async execute(_toolCallId, params) {
      await ensureStateDir();
      const names = (await readdir(tasksDir())).filter((name) => name.endsWith(".json")).sort();
      const tasks: TaskRecord[] = [];
      for (const name of names) {
        const id = name.slice(0, -5);
        const task = await readTask(id);
        if (params.status && task.status !== params.status) continue;
        if (params.project && task.project !== params.project) continue;
        tasks.push(task);
      }
      tasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const summaries = tasks.map(({ id, project, status, revision, updatedAt, description }) => ({
        id,
        project,
        status,
        revision,
        updatedAt,
        description,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(summaries, null, 2) }],
        details: { tasks: summaries },
      };
    },
  });

  pi.registerTool({
    name: "task_update",
    label: "Update Task",
    description: "Apply a validated lifecycle transition or update task assignment metadata.",
    parameters: Type.Object({
      id: taskIdSchema,
      expectedRevision: Type.Optional(Type.Integer({ minimum: 1 })),
      status: Type.Optional(statusSchema),
      role: Type.Optional(Type.String({ maxLength: 200 })),
      agentName: Type.Optional(Type.String({ maxLength: 200 })),
      agentType: Type.Optional(Type.String({ maxLength: 200 })),
      worktree: Type.Optional(Type.String({ maxLength: 4_096 })),
      branch: Type.Optional(Type.String({ maxLength: 1_000 })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const task = await mutateTask(params.id, params.expectedRevision, (current) => {
        if (params.status && params.status !== current.status) {
          if (!transitions[current.status].includes(params.status)) {
            throw new Error(`Invalid task transition: ${current.status} -> ${params.status}`);
          }
          current.status = params.status;
          if (params.status === "working" && !current.startedAt) current.startedAt = now();
          if (params.status === "completed" || params.status === "failed") current.endedAt = now();
          if (params.status === "planned" || params.status === "assigned") current.endedAt = undefined;
        }
        if (params.role !== undefined) current.role = params.role;
        if (params.agentName !== undefined) current.agentName = params.agentName;
        if (params.agentType !== undefined) current.agentType = params.agentType;
        if (params.worktree !== undefined) current.worktree = resolve(ctx.cwd, params.worktree);
        if (params.branch !== undefined) current.branch = params.branch;
        return current;
      });
      return textResult(task);
    },
  });

  pi.registerTool({
    name: "task_record_worker_result",
    label: "Record Worker Result",
    description: "Record a structured worker result without automatically approving or completing the task.",
    parameters: Type.Object({
      id: taskIdSchema,
      expectedRevision: Type.Optional(Type.Integer({ minimum: 1 })),
      summary: shortTextSchema,
      changedFiles: Type.Optional(stringListSchema),
      checks: Type.Optional(stringListSchema),
      unresolvedIssues: Type.Optional(stringListSchema),
      gitStatus: Type.Optional(Type.String({ maxLength: 10_000 })),
    }),
    async execute(_toolCallId, params) {
      const task = await mutateTask(params.id, params.expectedRevision, (current) => {
        if (current.status !== "working" && current.status !== "blocked") {
          throw new Error(`Worker results require working or blocked status, not ${current.status}`);
        }
        current.workerResult = resultFromParams(params);
        return current;
      });
      return textResult(task);
    },
  });

  pi.registerTool({
    name: "task_record_review_result",
    label: "Record Review Result",
    description: "Record a structured reviewer result without automatically completing the task.",
    parameters: Type.Object({
      id: taskIdSchema,
      expectedRevision: Type.Optional(Type.Integer({ minimum: 1 })),
      verdict: verdictSchema,
      summary: shortTextSchema,
      changedFiles: Type.Optional(stringListSchema),
      checks: Type.Optional(stringListSchema),
      unresolvedIssues: Type.Optional(stringListSchema),
      gitStatus: Type.Optional(Type.String({ maxLength: 10_000 })),
    }),
    async execute(_toolCallId, params) {
      const task = await mutateTask(params.id, params.expectedRevision, (current) => {
        if (current.status !== "review") {
          throw new Error(`Review results require review status, not ${current.status}`);
        }
        current.reviewResult = { ...resultFromParams(params), verdict: params.verdict };
        return current;
      });
      return textResult(task);
    },
  });

  pi.registerTool({
    name: "task_build_handoff",
    label: "Build Task Handoff",
    description: "Build a structured handoff packet from durable task state and read-only Git evidence.",
    parameters: Type.Object({
      id: taskIdSchema,
      type: handoffTypeSchema,
    }),
    async execute(_toolCallId, params, signal) {
      const task = await readTask(params.id);
      let gitEvidence: Record<string, string> | undefined;

      if (task.worktree && (await stat(task.worktree).then((value) => value.isDirectory()).catch(() => false))) {
        const runGit = async (args: string[]): Promise<string> => {
          const result = await pi.exec("git", ["-C", task.worktree!, ...args], { signal, timeout: 10_000 });
          if (result.code !== 0) {
            throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
          }
          return result.stdout.trim();
        };
        gitEvidence = {
          status: await runGit(["status", "--short", "--branch"]),
          unstagedDiffStat: await runGit(["diff", "--stat"]),
          stagedDiffStat: await runGit(["diff", "--cached", "--stat"]),
        };
      }

      const instructions: Record<HandoffType, string[]> = {
        "worker-to-reviewer": [
          "Treat the worker report as unverified input.",
          "Inspect the actual diff and Git status independently.",
          "Run relevant tests and report findings without modifying the implementation.",
        ],
        "reviewer-to-lead": [
          "Verify the review findings against the diff.",
          "Do not merge, push, deploy, or delete the worktree without human approval.",
        ],
        general: ["Verify current repository state before continuing work."],
      };

      const handoff = {
        schemaVersion: TASK_SCHEMA_VERSION,
        handoffType: params.type,
        generatedAt: now(),
        task,
        gitEvidence,
        recipientInstructions: instructions[params.type],
      };
      return {
        content: [{ type: "text", text: JSON.stringify(handoff, null, 2) }],
        details: handoff,
      };
    },
  });
}
