import { resolve } from "node:path";

import {
  isToolCallEventType,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

import { blockedReason, requestApproval } from "./approval.ts";
import {
  commandMatches,
  isSecretRead,
  isShellReadCommand,
  protectedPathMatch,
} from "./policy.ts";

export default function safetyGate(pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (isToolCallEventType("bash", event)) {
      const matches = commandMatches(event.input.command);
      const cwdMatch = await protectedPathMatch(".", ctx.cwd);
      if (cwdMatch && isShellReadCommand(event.input.command)) {
        matches.push({
          category: "protected-shell-read",
          reason: "shell reader is running from a protected working directory",
        });
      }
      if (matches.length === 0) return undefined;

      if (isSecretRead(matches)) {
        return {
          block: true,
          reason: blockedReason(matches, "secret-bearing shell reads are not allowed"),
        };
      }
      return requestApproval(ctx, matches);
    }

    if (
      isToolCallEventType("read", event) ||
      isToolCallEventType("write", event) ||
      isToolCallEventType("edit", event)
    ) {
      const match = await protectedPathMatch(event.input.path, ctx.cwd);
      if (!match) return undefined;

      if (event.toolName === "read") {
        return {
          block: true,
          reason: blockedReason([match], "reading secret-bearing paths is not allowed"),
        };
      }
      return requestApproval(ctx, [match]);
    }

    if (
      isToolCallEventType("grep", event) ||
      isToolCallEventType("find", event) ||
      isToolCallEventType("ls", event)
    ) {
      const match = await protectedPathMatch(event.input.path ?? ".", ctx.cwd);
      if (match) {
        return {
          block: true,
          reason: blockedReason([match], "searching or listing secret-bearing paths is not allowed"),
        };
      }
    }

    return undefined;
  });
}
