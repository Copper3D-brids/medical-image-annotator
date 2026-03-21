#!/usr/bin/env node
/**
 * switch-copper-import.js
 *
 * Toggles Copper import between:
 *   import * as Copper from "copper3d"      (npm package)
 *   import * as Copper from "@/ts/index"    (local source)
 *
 * Usage:
 *   node docs/switch-copper-import.js              # auto-detect and toggle
 *   node docs/switch-copper-import.js copper3d     # force switch to npm package
 *   node docs/switch-copper-import.js local        # force switch to local source
 */

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(__dirname, "../src");
// Match with or without trailing semicolon
const IMPORT_COPPER3D_RE = /^import \* as Copper from "copper3d";?$/;
const IMPORT_LOCAL_RE = /^import \* as Copper from "@\/ts\/index";?$/;
const IMPORT_COPPER3D = `import * as Copper from "copper3d";`;
const IMPORT_LOCAL = `import * as Copper from "@/ts/index";`;

const FILE_EXTENSIONS = [".ts", ".vue"];

function walkDir(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (FILE_EXTENSIONS.includes(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

function detectCurrentMode(files) {
  let copper3dCount = 0;
  let localCount = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (IMPORT_COPPER3D_RE.test(trimmed)) copper3dCount++;
      if (IMPORT_LOCAL_RE.test(trimmed)) localCount++;
    }
  }

  if (copper3dCount > 0 && localCount === 0) return "copper3d";
  if (localCount > 0 && copper3dCount === 0) return "local";
  if (copper3dCount > 0 && localCount > 0) return "mixed";
  return "none";
}

function switchImports(files, targetMode) {
  const [fromRe, toImport] =
    targetMode === "copper3d"
      ? [IMPORT_LOCAL_RE, IMPORT_COPPER3D]
      : [IMPORT_COPPER3D_RE, IMPORT_LOCAL];

  const changed = [];

  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    const lines = original.split("\n");
    let modified = false;

    const newLines = lines.map((line) => {
      const trimmed = line.trim();
      if (fromRe.test(trimmed)) {
        // Preserve leading whitespace/indentation
        const indent = line.slice(0, line.length - line.trimStart().length);
        modified = true;
        return indent + toImport;
      }
      return line;
    });

    if (modified) {
      fs.writeFileSync(file, newLines.join("\n"), "utf8");
      const rel = path.relative(path.resolve(__dirname, ".."), file);
      changed.push(rel);
    }
  }

  return changed;
}

function main() {
  const arg = process.argv[2];

  const files = walkDir(SRC_DIR);
  console.log(`\nScanning ${files.length} files in src/...\n`);

  let targetMode;

  if (arg === "copper3d") {
    targetMode = "copper3d";
    console.log('Forcing switch to npm package: "copper3d"');
  } else if (arg === "local") {
    targetMode = "local";
    console.log('Forcing switch to local source: "@/ts/index"');
  } else {
    const current = detectCurrentMode(files);
    console.log(`Current mode detected: ${current}`);

    if (current === "none") {
      console.log("No Copper imports found. Nothing to do.");
      return;
    }
    if (current === "mixed") {
      console.log(
        'Mixed state detected. Use an explicit argument: "copper3d" or "local".'
      );
      console.log("  node docs/switch-copper-import.js copper3d");
      console.log("  node docs/switch-copper-import.js local");
      return;
    }

    // Toggle
    targetMode = current === "copper3d" ? "local" : "copper3d";
    const targetLabel =
      targetMode === "copper3d" ? '"copper3d"' : '"@/ts/index"';
    console.log(`Switching to: ${targetLabel}`);
  }

  const changed = switchImports(files, targetMode);

  if (changed.length === 0) {
    console.log("\nNo files needed changes (already in target mode).");
  } else {
    console.log(`\nUpdated ${changed.length} file(s):`);
    changed.forEach((f) => console.log(`  ✓ ${f}`));
  }

  const finalLabel =
    targetMode === "copper3d"
      ? 'import * as Copper from "copper3d"'
      : 'import * as Copper from "@/ts/index"';
  console.log(`\nAll Copper imports now use: ${finalLabel}\n`);
}

main();
