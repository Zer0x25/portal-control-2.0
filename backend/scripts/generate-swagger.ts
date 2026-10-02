import fs from "fs";
import path from "path";
import { swaggerSpec } from "../src/utils/swagger";

const outputPath = path.join(__dirname, "../docs/swagger.json");

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`✅ Swagger JSON exported to ${outputPath}`);
