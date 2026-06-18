import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tscScript = path.join(rootDir, "node_modules", "typescript", "bin", "tsc");
const packageKey = process.argv[2];

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const rendered = `${command} ${args.join(" ")}`;
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${rendered} failed with exit ${result.status}\n${output}`);
  }
}

function removeDir(pkgDir, dirName) {
  fs.rmSync(path.join(pkgDir, dirName), { recursive: true, force: true });
}

function move(pkgDir, from, to) {
  fs.renameSync(path.join(pkgDir, from), path.join(pkgDir, to));
}

function copy(pkgDir, from, to) {
  fs.copyFileSync(path.join(pkgDir, from), path.join(pkgDir, to));
}

function rewrite(pkgDir, file, from, to) {
  const target = path.join(pkgDir, file);
  const contents = fs.readFileSync(target, "utf8");
  fs.writeFileSync(target, contents.split(from).join(to));
}

function ensureShebang(pkgDir, file) {
  const target = path.join(pkgDir, file);
  const shebang = "#!/usr/bin/env node\n";
  const contents = fs.readFileSync(target, "utf8");
  if (!contents.startsWith(shebang)) {
    fs.writeFileSync(target, shebang + contents);
  }
  fs.chmodSync(target, 0o755);
}

function tsc(pkgDir, project) {
  run(process.execPath, [tscScript, "-p", project], pkgDir);
}

function buildSdk() {
  const pkgDir = path.join(rootDir, "packages", "sdk-js");
  removeDir(pkgDir, "dist");
  removeDir(pkgDir, "dist-cjs");
  removeDir(pkgDir, "docs");
  tsc(pkgDir, "tsconfig.json");
  move(pkgDir, "dist/index.js", "dist/index.mjs");
  tsc(pkgDir, "tsconfig.cjs.json");
  move(pkgDir, "dist-cjs/index.js", "dist/index.cjs");
  removeDir(pkgDir, "dist-cjs");
}

function buildCli() {
  const pkgDir = path.join(rootDir, "packages", "cli");
  removeDir(pkgDir, "dist");
  removeDir(pkgDir, "dist-cjs");
  tsc(pkgDir, "tsconfig.json");
  move(pkgDir, "dist/index.js", "dist/index.mjs");
  move(pkgDir, "dist/bin.js", "dist/bin.mjs");
  tsc(pkgDir, "tsconfig.cjs.json");
  copy(pkgDir, "dist-cjs/index.js", "dist/index.cjs");
  copy(pkgDir, "dist-cjs/bin.js", "dist/bin.cjs");
  removeDir(pkgDir, "dist-cjs");
  rewrite(pkgDir, "dist/bin.cjs", JSON.stringify("./index.js"), JSON.stringify("./index.cjs"));
  rewrite(pkgDir, "dist/bin.mjs", JSON.stringify("./index.js"), JSON.stringify("./index.mjs"));
  ensureShebang(pkgDir, "dist/bin.cjs");
}

switch (packageKey) {
  case "sdk-js":
    buildSdk();
    break;
  case "cli":
    buildCli();
    break;
  default:
    throw new Error(`Unknown package key: ${packageKey}`);
}
