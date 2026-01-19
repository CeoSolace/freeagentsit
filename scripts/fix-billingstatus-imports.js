#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build", "out"]);

function shouldSkipDir(dirName) {
  return SKIP_DIRS.has(dirName);
}

function isTextFile(p) {
  return /\.(js|cjs|mjs|ts|tsx|jsx)$/.test(p);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      walk(full, files);
      continue;
    }

    if (entry.isFile() && isTextFile(full)) {
      files.push(full);
    }
  }
  return files;
}

function replaceInFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");

  // Replace: const BillingStatus = require("...BillingStatus");
  // With:    const BillingStatus = require("...BillingStatus");
  // Preserves the original require path and quote style.
  const replaced = original.replace(
    /const\s*\{\s*BillingStatus\s*\}\s*=\s*require\s*\(\s*(['"])([^'"]*BillingStatus)\1\s*\)\s*;?/g,
    (m, quote, reqPath) => `const BillingStatus = require(${quote}${reqPath}${quote});`
  );

  if (replaced !== original) {
    fs.writeFileSync(filePath, replaced, "utf8");
    return true;
  }
  return false;
}

function main() {
  const files = walk(ROOT);
  let changed = 0;

  for (const f of files) {
    try {
      if (replaceInFile(f)) {
        changed++;
        console.log(`[fixed] ${path.relative(ROOT, f)}`);
      }
    } catch (e) {
      console.warn(`[skip] ${path.relative(ROOT, f)}: ${e.message}`);
    }
  }

  console.log(`\nDone. Files changed: ${changed}`);
}

main();
