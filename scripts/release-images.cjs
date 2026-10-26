const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const services = ["backend", "frontend", "gateway"];
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8" }).trim();
function validateReference(ref, service, owner) {
  const prefix = `ghcr.io/${owner.toLowerCase()}/portal-control-2-0-${service}@sha256:`;
  if (!ref?.startsWith(prefix) || !/^[a-f0-9]{64}$/.test(ref.slice(prefix.length))) throw new Error(`Invalid digest reference for ${service}`);
  return ref;
}
function main(command, filename = "release-images.json", runDocker = docker) {
  const owner = (process.env.GITHUB_REPOSITORY_OWNER || process.env.IMAGE_OWNER || "").toLowerCase();
  if (command === "validate") {
    for (const service of services) validateReference(process.env[`${service.toUpperCase()}_IMAGE`], service, owner);
    return;
  }
  if (command === "record") {
    const source = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const images = Object.fromEntries(
      services.map((service) => {
        const local = process.env[`${service.toUpperCase()}_IMAGE`];
        return [service, { local, id: runDocker("image", "inspect", "--format", "{{.Id}}", local) }];
      }),
    );
    fs.writeFileSync(filename, JSON.stringify({ source, owner, images }, null, 2));
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(filename, "utf8"));
  if (command === "publish") {
    const tag = process.env.TAG_INPUT;
    if (tag && !/^[\w][\w.-]{0,127}$/.test(tag)) throw new Error("Invalid release tag");
    // Verify every image before the first push, so a replaced candidate fails closed.
    for (const image of Object.values(manifest.images)) if (runDocker("image", "inspect", "--format", "{{.Id}}", image.local) !== image.id) throw new Error("Tested image was replaced");
    for (const service of services) {
      const image = manifest.images[service];
      const repo = `ghcr.io/${manifest.owner}/portal-control-2-0-${service}`;
      const target = `${repo}:sha-${manifest.source}`;
      runDocker("tag", image.local, target);
      const output = runDocker("push", "--quiet", target);
      const digest = output.match(/digest:\s*(sha256:[a-f0-9]{64})/i)?.[1] ?? output.match(/^sha256:[a-f0-9]{64}$/m)?.[0];
      if (!digest) throw new Error("Registry did not return a digest");
      image.published = `${repo}@${digest}`;
    }
    for (const service of services) {
      const image = manifest.images[service];
      const repo = image.published.split("@")[0];
      for (const alias of new Set([tag, "latest"].filter(Boolean))) {
        runDocker("tag", image.local, `${repo}:${alias}`);
        runDocker("push", `${repo}:${alias}`);
      }
    }
    manifest.publishedAt = new Date().toISOString();
    fs.writeFileSync(filename, JSON.stringify(manifest, null, 2));
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Validated source: ${manifest.source}\n\n` + services.map((s) => `- ${s}: \`${manifest.images[s].published}\``).join("\n") + "\n");
  } else if (command === "pin") {
    if (!manifest.publishedAt) throw new Error("Manifest is not published");
    let compose = fs.readFileSync("compose.yaml", "utf8");
    for (const service of services) {
      const ref = validateReference(manifest.images[service].published, service, manifest.owner);
      const pattern = new RegExp(String.raw`image: \$\{${service.toUpperCase()}_IMAGE:-[^}]+\}(?::[^\s]+)?`);
      if (!pattern.test(compose)) throw new Error(`Missing compose image: ${service}`);
      compose = compose.replace(pattern, `image: \${${service.toUpperCase()}_IMAGE:-${ref}}`);
    }
    fs.writeFileSync("compose.yaml", compose);
  } else throw new Error("Unknown command");
}
module.exports = { validateReference, main };
if (require.main === module) main(...process.argv.slice(2));
