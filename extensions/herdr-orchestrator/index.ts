import { stat } from "node:fs/promises";
import { resolve } from "node:path";

import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

type ExecResult = {
  code: number;
  stdout: string;
  stderr: string;
};

type JsonObject = Record<string, unknown>;

const directionSchema = StringEnum(["right", "down"] as const);
const settledStateSchema = StringEnum(["idle", "done", "blocked"] as const);

function requireHerdr(): void {
  if (process.env.HERDR_ENV !== "1" || !process.env.HERDR_PANE_ID) {
    throw new Error("Herdr orchestration requires Pi to run inside a Herdr-managed pane");
  }
}

function parseJsonObject(text: string, command: string): JsonObject {
  try {
    const value = JSON.parse(text) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as JsonObject;
    }
  } catch {
    // Report a useful command-specific error below.
  }
  throw new Error(`herdr ${command} returned invalid JSON`);
}

function nestedObject(value: unknown, key: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Herdr response is missing ${key}`);
  }
  return value as JsonObject;
}

function asText(value: unknown, key: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Herdr response is missing ${key}`);
  }
  return value;
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function herdrOrchestrator(pi: ExtensionAPI) {
  async function runHerdr(
    args: string[],
    signal?: AbortSignal,
    timeout = 30_000,
  ): Promise<ExecResult> {
    requireHerdr();
    const result = await pi.exec("herdr", args, { signal, timeout });
    if (result.code !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.code}`;
      throw new Error(`herdr ${args.join(" ")} failed: ${detail}`);
    }
    return result;
  }

  async function chooseSplitDirection(signal?: AbortSignal): Promise<"right" | "down"> {
    const paneId = process.env.HERDR_PANE_ID!;
    const result = await runHerdr(["pane", "layout", "--pane", paneId], signal);
    const envelope = parseJsonObject(result.stdout, "pane layout");
    const layoutResult = nestedObject(envelope.result, "result");
    const layout = nestedObject(layoutResult.layout, "result.layout");
    const panes = Array.isArray(layout.panes) ? layout.panes : [];
    const current = panes.find(
      (candidate) =>
        candidate &&
        typeof candidate === "object" &&
        !Array.isArray(candidate) &&
        (candidate as JsonObject).pane_id === paneId,
    ) as JsonObject | undefined;
    const rect = current ? nestedObject(current.rect, "current pane rect") : undefined;
    const width = rect?.width;
    const height = rect?.height;
    return typeof width === "number" && typeof height === "number" && width >= height * 2
      ? "right"
      : "down";
  }

  pi.registerTool({
    name: "herdr_spawn_agent",
    label: "Spawn Herdr Agent",
    description:
      "Create a sibling Herdr pane, start a supported agent kind in it, and submit an assigned role and task. Returns the stable agent name and pane ID.",
    promptSnippet: "Start a named worker or reviewer in an isolated Herdr pane",
    promptGuidelines: [
      "Use herdr_spawn_agent only when the user requests delegation or multi-agent work, and give each agent a unique name and explicit scope.",
    ],
    parameters: Type.Object({
      name: Type.String({
        description: "Unique live-agent name",
        pattern: "^[a-z][a-z0-9_-]{0,31}$",
      }),
      agentType: Type.String({
        description: "Agent kind supported by the installed Herdr version, such as pi, codex, or claude",
      }),
      role: Type.String({ description: "Role such as worker or reviewer", minLength: 1 }),
      task: Type.String({ description: "Focused task assignment", minLength: 1 }),
      workingDirectory: Type.Optional(
        Type.String({ description: "Existing directory; defaults to the lead Pi session directory" }),
      ),
      direction: Type.Optional(directionSchema),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const cwd = resolve(ctx.cwd, params.workingDirectory ?? ".");
      const cwdStat = await stat(cwd).catch(() => undefined);
      if (!cwdStat?.isDirectory()) {
        throw new Error(`Working directory does not exist or is not a directory: ${cwd}`);
      }

      onUpdate?.({
        content: [{ type: "text", text: `Creating Herdr pane for ${params.name}...` }],
        details: {},
      });

      const direction = params.direction ?? (await chooseSplitDirection(signal));
      const split = await runHerdr(
        [
          "pane",
          "split",
          "--current",
          "--direction",
          direction,
          "--cwd",
          cwd,
          "--no-focus",
        ],
        signal,
      );
      const splitEnvelope = parseJsonObject(split.stdout, "pane split");
      const splitResult = nestedObject(splitEnvelope.result, "result");
      const pane = nestedObject(splitResult.pane, "result.pane");
      const paneId = asText(pane.pane_id, "result.pane.pane_id");

      onUpdate?.({
        content: [{ type: "text", text: `Starting ${params.agentType} in ${paneId}...` }],
        details: { paneId },
      });

      try {
        await runHerdr(
          [
            "agent",
            "start",
            params.name,
            "--kind",
            params.agentType,
            "--pane",
            paneId,
            "--timeout",
            "60000",
          ],
          signal,
          65_000,
        );

        const assignment = [
          `Role: ${params.role}`,
          `Task: ${params.task}`,
          "Stay within this task's scope. Report assumptions, changed files, checks run, and unresolved issues.",
        ].join("\n\n");
        await runHerdr(["agent", "prompt", params.name, assignment], signal);
      } catch (error) {
        throw new Error(
          `Agent setup failed after creating pane ${paneId}; the pane was kept for inspection. ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      return {
        content: [
          {
            type: "text",
            text: `Started ${params.agentType} agent '${params.name}' in ${paneId} and submitted its task.`,
          },
        ],
        details: { name: params.name, agentType: params.agentType, paneId, cwd },
      };
    },
  });

  pi.registerTool({
    name: "herdr_prompt_agent",
    label: "Prompt Herdr Agent",
    description: "Submit additional non-keyboard text to a named Herdr agent. Refuses if it is blocked on an approval or question.",
    parameters: Type.Object({
      target: Type.String({ description: "Unique agent name or pane ID" }),
      text: Type.String({ minLength: 1 }),
      wait: Type.Optional(Type.Boolean({ description: "Wait until the agent settles" })),
      timeoutMs: Type.Optional(Type.Integer({ minimum: 1_000, maximum: 300_000 })),
    }),
    async execute(_toolCallId, params, signal) {
      const args = ["agent", "prompt", params.target, params.text];
      if (params.wait) {
        args.push("--wait", "--timeout", String(params.timeoutMs ?? 120_000));
      }
      const result = await runHerdr(args, signal, params.timeoutMs ?? 125_000);
      return {
        content: [{ type: "text", text: result.stdout.trim() || `Prompt submitted to ${params.target}` }],
        details: { target: params.target },
      };
    },
  });

  pi.registerTool({
    name: "herdr_agent_status",
    label: "Herdr Agent Status",
    description: "Get the current Herdr lifecycle state and metadata for a named agent or pane ID.",
    parameters: Type.Object({
      target: Type.String({ description: "Unique agent name or pane ID" }),
    }),
    async execute(_toolCallId, params, signal) {
      const result = await runHerdr(["agent", "get", params.target], signal);
      const payload = parseJsonObject(result.stdout, "agent get");
      return {
        content: [{ type: "text", text: pretty(payload) }],
        details: payload,
      };
    },
  });

  pi.registerTool({
    name: "herdr_wait_for_agent",
    label: "Wait for Herdr Agent",
    description: "Wait for a named Herdr agent to reach idle, done, or blocked state.",
    parameters: Type.Object({
      target: Type.String({ description: "Unique agent name or pane ID" }),
      until: Type.Optional(settledStateSchema),
      timeoutMs: Type.Optional(Type.Integer({ minimum: 1_000, maximum: 300_000 })),
    }),
    async execute(_toolCallId, params, signal) {
      const timeout = params.timeoutMs ?? 120_000;
      const args = ["agent", "wait", params.target, "--timeout", String(timeout)];
      if (params.until) args.push("--until", params.until);
      const result = await runHerdr(args, signal, timeout + 5_000);
      const payload = parseJsonObject(result.stdout, "agent wait");
      return {
        content: [{ type: "text", text: pretty(payload) }],
        details: payload,
      };
    },
  });

  pi.registerTool({
    name: "herdr_read_agent_output",
    label: "Read Herdr Agent Output",
    description: "Read recent unwrapped terminal output from a named Herdr agent, limited to at most 500 lines.",
    parameters: Type.Object({
      target: Type.String({ description: "Unique agent name or pane ID" }),
      lines: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
    }),
    async execute(_toolCallId, params, signal) {
      const result = await runHerdr(
        [
          "agent",
          "read",
          params.target,
          "--source",
          "recent-unwrapped",
          "--lines",
          String(params.lines ?? 120),
        ],
        signal,
      );
      return {
        content: [{ type: "text", text: result.stdout }],
        details: { target: params.target, lines: params.lines ?? 120 },
      };
    },
  });
}
