const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const assets = path.join(root, "src/assets/fonts");
const manifest = JSON.parse(fs.readFileSync(path.join(assets, "font-subsets.json"), "utf8"));
const digest = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
assert.equal(manifest.schemaVersion, 1);
assert.equal(
  digest(path.join(root, "scripts/fonts/build_subsets.py")),
  manifest.generatorSha256,
  "Regenerate font subsets after changing the generator",
);
assert.equal(
  digest(path.join(assets, "fonts.css")),
  manifest.cssSha256,
  "Generated font CSS changed",
);
assert.equal(manifest.fonts.length, 5);
for (const font of manifest.fonts) {
  for (const kind of ["source", "subset"]) {
    const file = path.join(assets, font[kind]);
    assert.equal(digest(file), font[`${kind}Sha256`], `${font[kind]} changed`);
    assert.equal(fs.statSync(file).size, font[`${kind}Bytes`]);
  }
  assert(font.subsetBytes < font.sourceBytes, `${font.subset} must reduce transfer size`);
  assert(font.subsetCharacters > 0 && font.subsetCharacters < font.sourceCharacters);
}
for (const license of ["Inter", "RobotoMono"]) {
  assert(
    fs
      .readFileSync(path.join(root, `public/fonts/LICENSE-${license}.txt`), "utf8")
      .includes("SIL OPEN FONT LICENSE Version 1.1"),
  );
}
const dashboardBytes = manifest.fonts
  .filter((font) => font.source !== "RobotoMono-Regular.woff2")
  .reduce((total, font) => total + font.subsetBytes, 0);
assert(dashboardBytes < 150_000, `Dashboard font budget exceeded: ${dashboardBytes}`);
process.stdout.write(
  `[FONTS] 5 verified subsets; Dashboard font payload ${dashboardBytes} bytes.\n`,
);
