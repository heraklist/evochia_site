import { existsSync } from "node:fs";
import path from "node:path";

import { localizedContentPages } from "./content-routes.mjs";
import {
  createSkipReport,
  hasCommand,
  runCommand,
  writeJsonReport,
  writeTextReport,
} from "./audit-utils.mjs";
import { repoRoot } from "./qa-config.mjs";

const jarPath = path.join(repoRoot, "node_modules", "vnu-jar", "build", "dist", "vnu.jar");
const files = [
  "404.html",
  "privacy.html",
  "en/404.html",
  "el/404.html",
  ...localizedContentPages.map((entry) => entry.file),
];

if (!existsSync(jarPath)) {
  const summary = createSkipReport("run-vnu", "vnu-jar is not installed.");
  writeJsonReport(["vnu", "summary.json"], summary);
  process.exit(0);
}

const javaExecutable = resolveJavaExecutable();

if (!javaExecutable) {
  const summary = createSkipReport("run-vnu", "Java is not installed. Nu Html Checker requires JDK 21.");
  writeJsonReport(["vnu", "summary.json"], summary);
  process.exit(0);
}

const result = await runCommand(javaExecutable, ["-jar", jarPath, "--format", "json", ...files], {
  cwd: repoRoot,
});
const rawJson = result.stdout.trim() || result.stderr.trim();
let payload = { messages: [] };

try {
  payload = rawJson ? JSON.parse(rawJson) : payload;
} catch (error) {
  payload = {
    messages: [],
    parseError: error instanceof Error ? error.message : String(error),
  };
}

const messages = Array.isArray(payload.messages) ? payload.messages : [];
const errors = messages.filter((message) => message.type === "error");
const warnings = messages.filter((message) => message.type !== "error");
const summary = {
  tool: "run-vnu",
  status: errors.length ? "failed" : warnings.length ? "warning" : "passed",
  exitCode: result.code,
  checkedFiles: files.length,
  errorCount: errors.length,
  warningCount: warnings.length,
  messages,
  parseError: payload.parseError ?? null,
};

writeJsonReport(["vnu", "summary.json"], summary);
writeTextReport(["vnu", "vnu.log"], rawJson);

console.table([
  {
    checkedFiles: summary.checkedFiles,
    errors: summary.errorCount,
    warnings: summary.warningCount,
    exitCode: summary.exitCode,
  },
]);

if (errors.length || payload.parseError) {
  process.exit(1);
}

function resolveJavaExecutable() {
  const javaHome = process.env.JAVA_HOME?.trim();
  if (javaHome) {
    const javaFromHome = path.join(javaHome, "bin", process.platform === "win32" ? "java.exe" : "java");
    if (existsSync(javaFromHome)) {
      return javaFromHome;
    }
  }

  if (hasCommand("java")) {
    return "java";
  }

  const windowsCandidates = [
    "C:/Program Files/Eclipse Adoptium/jdk-21.0.10.7-hotspot/bin/java.exe",
    "C:/Program Files/Eclipse Adoptium/jdk-21/bin/java.exe",
    "C:/Program Files/Java/jdk-21/bin/java.exe",
    "C:/Program Files/Java/jdk-21.0.10/bin/java.exe",
  ];

  return windowsCandidates.find((candidate) => existsSync(candidate)) ?? null;
}
