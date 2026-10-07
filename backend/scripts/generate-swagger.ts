import fs from "fs";
import path from "path";
import { format, resolveConfig } from "prettier";
import { swaggerSpec } from "../src/utils/openapi";

async function generateSwagger() {
  const outputPath = path.join(__dirname, "../docs/swagger.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const config = await resolveConfig(outputPath);
  const content = await format(JSON.stringify(swaggerSpec), { ...config, filepath: outputPath });
  fs.writeFileSync(outputPath, content);
  console.log(`✅ Swagger JSON exported to ${outputPath}`);
}

generateSwagger().catch((error: unknown) => {
  console.error("Could not generate Swagger", error);
  process.exitCode = 1;
});
