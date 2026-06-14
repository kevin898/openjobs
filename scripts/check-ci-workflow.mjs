import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = path.join(rootDir, ".github", "workflows", "ci.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");

function expectIncludes(snippet, message) {
  assert.match(workflow, snippet, message);
}

expectIncludes(/^jobs:\s*$/m, "CI workflow should define jobs.");
expectIncludes(/^  js-health:\s*$/m, "CI workflow should define a dedicated js-health job.");
expectIncludes(/^  python-health:\s*$/m, "CI workflow should define a dedicated python-health job.");
expectIncludes(/npm run check:versions/m, "CI workflow should run the version consistency check.");
expectIncludes(/npm run check:hygiene/m, "CI workflow should run the hygiene check.");
expectIncludes(/npm run check:npm-pack/m, "CI workflow should run the npm pack verification check.");
expectIncludes(/npm run check:sdk-js-tests/m, "CI workflow should run the SDK JS behavioral checks.");
expectIncludes(/npm run check:cli-smoke/m, "CI workflow should run the CLI smoke check.");
expectIncludes(/npm run lint:ts/m, "CI workflow should run TypeScript linting explicitly.");
expectIncludes(/npm run check:examples/m, "CI workflow should run example smoke checks explicitly.");
expectIncludes(/npm run check:python-packages/m, "CI workflow should run the Python package build/check flow.");
expectIncludes(/python -m compileall -q packages\/sdk-python packages\/openjobs-langchain packages\/openjobs-crewai packages\/openjobs-openai/m, "CI workflow should compile Python packages.");

console.log("OK CI workflow wires the required repo health checks.");
