import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const npmCli = process.env.npm_execpath;
const packages = [
  {
    name: "@openjobs/sdk",
    workspace: "@openjobs/sdk",
    dir: "packages/sdk-js",
    requiredFiles: [
      "package.json",
      "README.md",
      "dist/index.cjs",
      "dist/index.mjs",
      "dist/index.d.ts",
      "src/index.ts",
    ],
  },
  {
    name: "@openjobs/cli",
    workspace: "@openjobs/cli",
    dir: "packages/cli",
    requiredFiles: [
      "package.json",
      "README.md",
      "dist/bin.cjs",
      "dist/bin.mjs",
      "dist/index.cjs",
      "dist/index.mjs",
      "dist/index.d.ts",
      "skill/SKILL.md",
      "skill/HEARTBEAT.md",
      "skill/INSTALL.md",
      "skill/references/COMMANDS.md",
      "skill/references/PROTOCOL.md",
      "skill/references/SKILL.md",
    ],
  },
  {
    name: "@openjobs/langchain",
    workspace: "@openjobs/langchain",
    dir: "packages/langchain-js",
    requiredFiles: [
      "package.json",
      "README.md",
      "dist/index.js",
      "dist/index.d.ts",
      "src/index.ts",
    ],
  },
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    encoding: "utf8",
    shell: process.platform === "win32" && command.endsWith(".cmd"),
  });

  if (result.status !== 0) {
    const renderedCommand = `${command} ${args.join(" ")}`;
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${renderedCommand} failed\n${output}`);
  }

  return result.stdout;
}

function runNpm(args, options) {
  if (npmCli) {
    return run(process.execPath, [npmCli, ...args], options);
  }
  return run(npmCmd, args, options);
}

function buildPackage(pkg) {
  runNpm(["--workspace", pkg.workspace, "run", "build"]);
}

function parsePackJson(output, pkg) {
  try {
    const parsed = JSON.parse(output);
    const packInfo = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!packInfo?.files) {
      throw new Error("missing files array");
    }
    return packInfo.files.map((file) => file.path).sort();
  } catch (error) {
    throw new Error(`Unable to parse npm pack JSON for ${pkg.name}: ${error.message}\n${output}`);
  }
}

function verifyFiles(pkg, files) {
  const packed = new Set(files);
  const missing = pkg.requiredFiles.filter((file) => !packed.has(file));
  if (missing.length > 0) {
    throw new Error(
      `${pkg.name} npm pack output is missing required file(s): ${missing.join(", ")}`
    );
  }
}

for (const pkg of packages) {
  console.log(`Building ${pkg.name}...`);
  buildPackage(pkg);

  console.log(`Checking npm pack --dry-run for ${pkg.name}...`);
  const output = runNpm(["pack", "--dry-run", "--json"], {
    cwd: path.join(rootDir, pkg.dir),
  });
  const files = parsePackJson(output, pkg);
  verifyFiles(pkg, files);
  console.log(`OK ${pkg.name}: ${files.length} files would be packed.`);
}
