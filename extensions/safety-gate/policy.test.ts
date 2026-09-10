import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  commandMatches,
  isSecretRead,
  isShellReadCommand,
  protectedPathMatch,
} from "./policy.ts";

const dangerousCommands = [
  "rm -rf target",
  "/bin/rm -v -rf target",
  "(rm --recursive --force target)",
  "true\nrm -rf target",
  "git push --force origin main",
  "git -C repo push --force-with-lease origin main",
  "git push origin +main:main",
  "git push origin --delete obsolete",
  "git worktree remove -f /tmp/tree",
  "git restore .",
  "aws s3 rm --recursive s3://bucket",
  "tofu apply -auto-approve",
  "pulumi destroy --yes",
  "doas apt remove package",
  "kubectl delete namespace production",
  "printf 'DROP TABLE users' | psql app",
  "gcloud compute instances delete server",
  "printf secret > ~/.env",
  "printf secret > \".env\"",
  "source .env",
  ". .env",
  "cat ~/.docker/config.json",
  "cat secrets/token.txt",
  "printf token > ~/.docker/config.json",
  "cp token secrets/token.txt",
];

for (const command of dangerousCommands) {
  test(`classifies dangerous command: ${command}`, () => {
    assert.ok(commandMatches(command).length > 0);
  });
}

const safeCommands = [
  "printf 'safe output'",
  "echo 'git push --force is forbidden'",
  "echo 'cp .env /tmp/example'",
  "printf 'example: secret > .env'",
  "git push origin main",
  "git status --short",
  "terraform plan",
  "kubectl get pods",
  "gh auth status",
  "aws configure list",
  "gcloud auth list",
];

for (const command of safeCommands) {
  test(`allows representative safe command: ${command}`, () => {
    assert.deepEqual(commandMatches(command), []);
  });
}

test("recognizes protected shell reads", () => {
  const matches = commandMatches("cat ~/.aws/credentials");
  assert.equal(isSecretRead(matches), true);
  assert.equal(isShellReadCommand("grep -R fixture ."), true);
  assert.equal(isShellReadCommand("ls"), true);
  assert.equal(isShellReadCommand("find . -type f"), true);
  assert.equal(isShellReadCommand("printf safe"), false);
});

test("recognizes lexical protected paths", async () => {
  assert.ok(await protectedPathMatch(".env.local", "/tmp/project"));
  assert.ok(await protectedPathMatch("~/.ssh/id_rsa", "/tmp/project"));
  assert.ok(await protectedPathMatch("/home/user/.docker/config.json", "/tmp/project"));
  assert.ok(await protectedPathMatch("service-account.key", "/tmp/project"));
  assert.equal(await protectedPathMatch("src/config.ts", "/tmp/project"), undefined);
});

test("recognizes a protected working directory for pathless searches", async () => {
  assert.ok(await protectedPathMatch(".", "/tmp/project/secrets"));
});

test("recognizes a symlink to a protected file", async () => {
  const root = await mkdtemp(join(tmpdir(), "safety-policy-"));
  try {
    const secretDir = join(root, ".ssh");
    const secret = join(secretDir, "credentials");
    const alias = join(root, "ordinary.txt");
    await mkdir(secretDir);
    await writeFile(secret, "test fixture\n");
    await symlink(secret, alias);
    assert.ok(await protectedPathMatch(alias, root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recognizes a symlinked protected parent for a new file", async () => {
  const root = await mkdtemp(join(tmpdir(), "safety-policy-"));
  try {
    const secretDir = join(root, ".aws");
    const aliasDir = join(root, "ordinary");
    await mkdir(secretDir);
    await symlink(secretDir, aliasDir);
    assert.ok(await protectedPathMatch(join(aliasDir, "new-profile"), root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
