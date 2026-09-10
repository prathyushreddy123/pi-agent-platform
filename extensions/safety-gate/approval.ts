import type { SafetyMatch } from "./policy.ts";

export type ApprovalContext = {
  mode: string;
  ui: {
    confirm(title: string, message: string): Promise<boolean>;
    notify(message: string, level: "warning"): void;
  };
};

export type BlockResult = { block: true; reason: string };

export function blockedReason(matches: SafetyMatch[], suffix: string): string {
  const categories = matches.map((match) => match.category).join(", ");
  return `Safety gate blocked ${categories}: ${suffix}`;
}

export async function requestApproval(
  ctx: ApprovalContext,
  matches: SafetyMatch[],
): Promise<BlockResult | undefined> {
  if (ctx.mode !== "tui") {
    return { block: true, reason: blockedReason(matches, "interactive TUI approval is required") };
  }

  const categories = matches.map((match) => match.category).join(", ");
  const reasons = matches.map((match) => `• ${match.reason}`).join("\n");
  const approved = await ctx.ui.confirm(
    "Safety approval required",
    `Categories: ${categories}\n${reasons}\n\nAllow this operation once?`,
  );
  if (!approved) {
    ctx.ui.notify("Operation blocked by safety gate", "warning");
    return { block: true, reason: "Operation rejected by user at safety gate" };
  }
  return undefined;
}
