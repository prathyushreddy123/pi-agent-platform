import assert from "node:assert/strict";
import test from "node:test";

import { requestApproval, type ApprovalContext } from "./approval.ts";
import type { SafetyMatch } from "./policy.ts";

const matches: SafetyMatch[] = [
  { category: "force-push", reason: "force-pushing can overwrite remote history" },
];

function mockContext(mode: string, approved: boolean) {
  let confirmations = 0;
  let notifications = 0;
  const ctx: ApprovalContext = {
    mode,
    ui: {
      async confirm() {
        confirmations += 1;
        return approved;
      },
      notify() {
        notifications += 1;
      },
    },
  };
  return {
    ctx,
    counts: () => ({ confirmations, notifications }),
  };
}

for (const mode of ["rpc", "print", "json"]) {
  test(`${mode} mode fails closed without prompting`, async () => {
    const mock = mockContext(mode, true);
    assert.equal((await requestApproval(mock.ctx, matches))?.block, true);
    assert.deepEqual(mock.counts(), { confirmations: 0, notifications: 0 });
  });
}

test("TUI approval prompts exactly once and allows one call", async () => {
  const mock = mockContext("tui", true);
  assert.equal(await requestApproval(mock.ctx, matches), undefined);
  assert.deepEqual(mock.counts(), { confirmations: 1, notifications: 0 });
});

test("TUI cancellation blocks and notifies", async () => {
  const mock = mockContext("tui", false);
  assert.equal((await requestApproval(mock.ctx, matches))?.block, true);
  assert.deepEqual(mock.counts(), { confirmations: 1, notifications: 1 });
});

test("confirmation text contains reasons but no raw command or path", async () => {
  let message = "";
  const ctx: ApprovalContext = {
    mode: "tui",
    ui: {
      async confirm(_title, value) {
        message = value;
        return false;
      },
      notify() {},
    },
  };
  await requestApproval(ctx, matches);
  assert.match(message, /force-pushing can overwrite remote history/);
  assert.doesNotMatch(message, /git push|token|\/home\//i);
});
