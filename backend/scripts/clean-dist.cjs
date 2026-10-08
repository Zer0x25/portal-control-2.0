const fs = require("node:fs");
const path = require("node:path");

// TypeScript does not remove outputs whose source was deleted.
fs.rmSync(path.resolve(__dirname, "../dist"), { recursive: true, force: true });
