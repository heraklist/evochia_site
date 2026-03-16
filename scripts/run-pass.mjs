import path from "node:path";

import { runCommand, writeJsonReport } from "./audit-utils.mjs";
import { repoRoot } from "./qa-config.mjs";

const pass = process.argv[2] === "pass2" ? "pass2" : "pass1";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const scripts = {
  pass1: [
    "qa:lint",
    "qa:repo",
    "qa:browser",
    "qa:pa11y",
    "qa:seo:rules",
    "qa:hreflang:local",
    "qa:structured-data:local",
    "qa:links",
    "qa:vnu",
    "qa:lhci:local",
  ],
  pass2: [
    "qa:lhci:live",
    "qa:crux",
    "qa:gsc",
    "qa:headers",
    "qa:hreflang:live",
    "qa:structured-data:live",
    "qa:zap",
  ],
};
const results = [];

for (const scriptName of scripts[pass]) {
  console.log(`\n>>> Running ${scriptName}`);
  const result = await runCommand(npmCommand, ["run", scriptName], {
    cwd: repoRoot,
    env: process.env,
    shell: process.platform === "win32",
  });
  console.log(result.stdout);
  if (result.stderr.trim()) {
    console.error(result.stderr);
  }

  results.push({
    script: scriptName,
    exitCode: result.code,
  });
}

writeJsonReport(["summary", `${pass}-command-status.json`], {
  pass,
  results,
});

const summaryResult = await runCommand(process.execPath, [path.join(repoRoot, "scripts", "summarize-reports.mjs"), pass], {
  cwd: repoRoot,
  env: process.env,
});

console.log(summaryResult.stdout);
if (summaryResult.stderr.trim()) {
  console.error(summaryResult.stderr);
}

writeJsonReport(["summary", `${pass}-command-status.json`], {
  pass,
  results,
  summaryExitCode: summaryResult.code,
});

if (results.some((entry) => entry.exitCode)) {
  process.exit(1);
}
