const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");

const { validateReference } = require("./release-images.cjs");
const script = path.resolve(__dirname, "release-images.cjs");
const digest = "sha256:" + "a".repeat(64);
test("manual audit rejects tags, other owners, wrong services and shell input", () => {
  const good = `ghcr.io/owner/portal-control-2-0-frontend@${digest}`;
  assert.equal(validateReference(good, "frontend", "Owner"), good);
  for (const ref of [good.replace("@" + digest, ":latest"), good.replace("/owner/", "/other/"), good.replace("-frontend", "-backend"), good + ";echo bad", undefined]) assert.throws(() => validateReference(ref, "frontend", "owner"));
});
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-images-"));
  const manifest = { source: "b".repeat(40), owner: "owner", images: Object.fromEntries(["backend", "frontend", "gateway"].map((s) => [s, { local: s + ":candidate", id: "tested" }])) };
  const filename = path.join(dir, "release-images.json");
  fs.writeFileSync(filename, JSON.stringify(manifest));
  const commands = [];
  const previous = process.cwd();
  const oldTag = process.env.TAG_INPUT;
  const oldSummary = process.env.GITHUB_STEP_SUMMARY;
  process.env.TAG_INPUT = "v1.2.3";
  delete process.env.GITHUB_STEP_SUMMARY;
  process.chdir(dir);
  t.after(() => {
    process.chdir(previous);
    if (oldTag === undefined) delete process.env.TAG_INPUT;
    else process.env.TAG_INPUT = oldTag;
    if (oldSummary !== undefined) process.env.GITHUB_STEP_SUMMARY = oldSummary;
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const run = (cmd, replaced = false) =>
    require("./release-images.cjs").main(cmd, filename, (...args) => {
      commands.push(args);
      if (args[0] === "image") return replaced ? "other" : "tested";
      return args[0] === "push" ? `image: digest: ${digest} size: 123` : digest;
    });
  return { dir, run, commands, previous };
}
test("replaced tested image prevents every push", (t) => {
  const f = fixture(t);
  assert.throws(() => f.run("publish", true), /replaced/);
  assert.equal(
    f.commands.some((args) => args[0] === "push"),
    false,
  );
});
test("publish only tags and pushes tested images; pin digests is repeatable", (t) => {
  const f = fixture(t);
  f.run("publish");
  assert.equal(
    f.commands.some((args) => args.includes("build")),
    false,
  );
  const manifest = JSON.parse(fs.readFileSync(path.join(f.dir, "release-images.json")));
  assert.ok(manifest.publishedAt);
  fs.copyFileSync(path.join(f.previous, "compose.yaml"), path.join(f.dir, "compose.yaml"));
  f.run("pin");
  const first = fs.readFileSync("compose.yaml", "utf8");
  assert.equal((first.match(/@sha256:/g) || []).length, 3);
  f.run("pin");
  assert.equal(fs.readFileSync("compose.yaml", "utf8"), first);
});
test("unpublished manifest cannot change compose", (t) => {
  const f = fixture(t);
  fs.writeFileSync("compose.yaml", "original");
  assert.throws(() => f.run("pin"), /not published/);
  assert.equal(fs.readFileSync("compose.yaml", "utf8"), "original");
});
