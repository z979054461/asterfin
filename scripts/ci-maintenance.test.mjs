// Run: node --experimental-vm-modules --test scripts/ci-maintenance.test.mjs
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const { parseDocument } = require("yaml");
const source = readFileSync(
  path.join(root, "scripts/update-issue-form.mjs"),
  "utf8",
);
const form =
  "body:\n  - type: dropdown\n    id: version\n    attributes:\n      options:\n        - 0.1.0\n        - older\n        - TestFlight/Development build\n";
async function runForm(raw, { error, dry = false } = {}) {
  const writes = [];
  let code;
  const context = vm.createContext({
    console: { log() {}, error() {} },
    process: {
      env: { GITHUB_REPOSITORY: "fixture/repo", GITHUB_OUTPUT: "output" },
      argv: dry ? ["--dry-run"] : [],
      exit(value) {
        throw { exit: value };
      },
    },
  });
  const module = new vm.SourceTextModule(source, { context });
  await module.link((name) => {
    const values =
      name === "node:child_process"
        ? {
            execFileSync(command, args, options) {
              assert.equal(command, "gh");
              assert.ok(args.includes("--exclude-drafts"));
              assert.ok(args.includes("--exclude-pre-releases"));
              assert.equal(options.timeout, 30_000);
              if (error) throw error;
              return args.includes("--jq")
                ? JSON.parse(raw)
                    .map((r) => r.tagName)
                    .join("\n")
                : raw;
            },
          }
        : {
            readFileSync: () => form,
            writeFileSync: (...args) => writes.push(args),
            appendFileSync: (...args) => writes.push(args),
          };
    return new vm.SyntheticModule(
      Object.keys(values),
      function () {
        for (const [key, value] of Object.entries(values))
          this.setExport(key, value);
      },
      { context },
    );
  });
  try {
    await module.evaluate();
    code = 0;
  } catch (error) {
    code = error.exit ?? 1;
  }
  return { code, writes };
}

test("only successful empty releases are a clean no-write exit", async () => {
  assert.deepEqual(await runForm("[]"), { code: 0, writes: [] });
  for (const raw of [
    "",
    "invalid",
    "null",
    "{}",
    "[{}]",
    '[{"tagName":7}]',
    JSON.stringify([{ tagName: "v1.2.3\nextra" }]),
    '[{"tagName":"nightly"}]',
  ]) {
    const result = await runForm(raw);
    assert.equal(result.code, 1, raw);
    assert.deepEqual(result.writes, []);
  }
  for (const message of ["HTTP 401", "HTTP 403", "HTTP 500", "timeout"]) {
    const result = await runForm("[]", { error: new Error(message) });
    assert.equal(result.code, 1);
    assert.deepEqual(result.writes, []);
  }
});

test("valid releases retain dedupe, sentinels, output and dry-run behavior", async () => {
  const raw = JSON.stringify([
    { tagName: "v1.2.3" },
    { tagName: "1.2.3" },
    { tagName: "v1.2.2" },
  ]);
  const result = await runForm(raw);
  assert.equal(result.code, 0);
  assert.equal(result.writes.length, 2);
  assert.match(
    result.writes[0][1],
    /- 1.2.3\n {8}- 1.2.2\n {8}- older\n {8}- TestFlight/,
  );
  assert.equal(result.writes[1][1], "versions=1.2.3, 1.2.2\n");
  const dry = await runForm(raw, { dry: true });
  assert.equal(dry.code, 0);
  assert.equal(dry.writes.length, 1);
  assert.equal(dry.writes[0][0], "output");
});

const doc = parseDocument(
  readFileSync(path.join(root, ".github/workflows/build-apps.yml"), "utf8"),
  { uniqueKeys: true },
);
assert.deepEqual(doc.errors, []);
const workflow = doc.toJS();
function enabled(
  job,
  event,
  optIn,
  from = "",
  result = "skipped",
  cancelled = false,
  skip = false,
) {
  const expression = workflow.jobs[job].if
    .slice(3, -2)
    .replace(/needs\.([\w-]+)/g, 'needs["$1"]');
  const evaluate = new Function(
    "github",
    "inputs",
    "needs",
    "always",
    "cancelled",
    "contains",
    `return !!(${expression});`,
  );
  return evaluate(
    {
      event_name: event,
      event: {
        head_commit: { message: skip ? "[skip ci]" : "fix" },
        pull_request: { head: { repo: { full_name: "fixture/repo" } } },
      },
    },
    { signed_ios: optIn },
    {
      fingerprint: { outputs: { ios_phone_source: from } },
      "repack-ios-phone": { result },
    },
    () => true,
    () => cancelled,
    (a, b) => a.includes(b),
  );
}
test("signed build and repack require explicit boolean dispatch opt-in", () => {
  assert.equal(workflow.on.workflow_dispatch.inputs.signed_ios.type, "boolean");
  assert.equal(workflow.on.workflow_dispatch.inputs.signed_ios.default, false);
  assert.equal(workflow.on.workflow_dispatch.inputs.full_build.default, false);
  for (const event of [
    "schedule",
    "push",
    "pull_request",
    "merge_group",
    "workflow_dispatch",
  ]) {
    for (const optIn of [undefined, false, true]) {
      const eligible = event === "workflow_dispatch" && optIn === true;
      assert.equal(enabled("build-ios-phone", event, optIn), eligible);
      assert.equal(enabled("repack-ios-phone", event, optIn, "123"), eligible);
    }
  }
  assert.equal(enabled("repack-ios-phone", "workflow_dispatch", true), false);
  assert.equal(
    enabled("build-ios-phone", "workflow_dispatch", true, "123", "success"),
    false,
  );
  for (const status of ["failure", "skipped", "cancelled"]) {
    assert.equal(
      enabled("build-ios-phone", "workflow_dispatch", true, "123", status),
      true,
    );
  }
  for (const job of ["build-ios-phone", "repack-ios-phone"]) {
    assert.equal(
      enabled(job, "workflow_dispatch", true, "123", "failure", true),
      false,
    );
    assert.equal(
      enabled(job, "workflow_dispatch", true, "123", "failure", false, true),
      false,
    );
  }
  for (const [name, job] of Object.entries(workflow.jobs)) {
    if (name !== "build-ios-phone" && name !== "repack-ios-phone")
      assert.ok(!String(job.if).includes("signed_ios"));
  }
});

test("actual lint-staged: ignored-only and mixed JSON pass; invalid regular JSON fails", () => {
  const staged = path.resolve(
    path.dirname(require.resolve("lint-staged")),
    "../bin/lint-staged.js",
  );
  const biomeBin = path.dirname(require.resolve("@biomejs/biome/package.json"));
  const cliDir = path.resolve(biomeBin, "../../.bin");
  const env = {
    ...process.env,
    PATH: cliDir + path.delimiter + process.env.PATH,
    HUSKY: "0",
  };
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const config = JSON.parse(
    readFileSync(path.join(root, "biome.json"), "utf8"),
  );
  // Source config is used unchanged; copy the referenced plugin as well.
  for (const kind of ["ignored", "mixed", "invalid"]) {
    const dir = mkdtempSync(path.join(os.tmpdir(), "asterfin-ci-json-"));
    mkdirSync(path.join(dir, "utils/seerr/generated"), { recursive: true });
    mkdirSync(path.join(dir, "biome-plugins"));
    writeFileSync(
      path.join(dir, "biome-plugins/tv-no-hardcoded-font-size.grit"),
      readFileSync(
        path.join(root, "biome-plugins/tv-no-hardcoded-font-size.grit"),
      ),
    );
    writeFileSync(path.join(dir, "biome.json"), JSON.stringify(config));
    writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ "lint-staged": pkg["lint-staged"] }),
    );
    execFileSync("git", ["init", "--quiet"], { cwd: dir });
    writeFileSync(
      path.join(dir, "utils/seerr/generated/pin.json"),
      '{"ref":"v1.0.0"}\n',
    );
    execFileSync("git", ["add", "--", "utils/seerr/generated/pin.json"], {
      cwd: dir,
    });
    if (kind !== "ignored") {
      writeFileSync(
        path.join(dir, "regular.json"),
        kind === "invalid" ? '{ "broken": ' : '{"valid":true}',
      );
      execFileSync("git", ["add", "--", "regular.json"], { cwd: dir });
    }
    const result = spawnSync(
      process.execPath,
      [staged, "--no-stash", "--config", "package.json"],
      { cwd: dir, env, encoding: "utf8" },
    );
    if (kind === "invalid")
      assert.notEqual(result.status, 0, result.stdout + result.stderr);
    else assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(
      readFileSync(path.join(dir, "utils/seerr/generated/pin.json"), "utf8"),
      '{"ref":"v1.0.0"}\n',
    );
    if (kind === "mixed")
      assert.equal(
        readFileSync(path.join(dir, "regular.json"), "utf8"),
        '{ "valid": true }\n',
      );
  }
});
