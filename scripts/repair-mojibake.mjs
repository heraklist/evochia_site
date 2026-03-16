import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { repoRoot } from "./qa-config.mjs";

const decoder = new TextDecoder("windows-1253");
const reverseMap = new Map();

for (let index = 0; index < 256; index += 1) {
  const char = decoder.decode(Uint8Array.from([index]));
  if (!reverseMap.has(char)) {
    reverseMap.set(char, index);
  }
}

const targets = [
  ...htmlTargets("en"),
  ...htmlTargets("el"),
  "js/cookieconsent-config.js",
  "middleware.ts",
];

let changedFiles = 0;

for (const relativePath of targets) {
  const absolutePath = path.join(repoRoot, relativePath);
  const input = readFileSync(absolutePath, "utf8");
  const output = repairFile(relativePath, input);

  if (output !== input) {
    writeFileSync(absolutePath, output, "utf8");
    changedFiles += 1;
    console.log(`repaired ${relativePath}`);
  }
}

console.log(`changedFiles=${changedFiles}`);

function htmlTargets(localeDir) {
  return [
    `${localeDir}/404.html`,
    `${localeDir}/about.html`,
    `${localeDir}/athens-private-chef.html`,
    `${localeDir}/catering.html`,
    `${localeDir}/contact.html`,
    `${localeDir}/corporate-catering.html`,
    `${localeDir}/faq.html`,
    `${localeDir}/greek-islands-private-chef.html`,
    `${localeDir}/index.html`,
    `${localeDir}/lookbook.html`,
    `${localeDir}/menus.html`,
    `${localeDir}/privacy.html`,
    `${localeDir}/private-chef.html`,
    `${localeDir}/villa-private-chef.html`,
    `${localeDir}/wedding-catering.html`,
    `${localeDir}/yacht-private-chef.html`,
  ];
}

function repairFile(relativePath, input) {
  let output = stripBom(input);

  if (relativePath.endsWith(".html")) {
    output = syncLocalizedFallbacks(relativePath, output);
    output = output.replace(/"([^"\r\n]*)"/g, (match, value) => `"${maybeRecover(value)}"`);
    output = output.replace(/>([^<]+)</g, (match, value) => `>${maybeRecover(value)}<`);
    return output;
  }

  output = output.replace(/'([^'\r\n]*)'/g, (match, value) => `'${maybeRecover(value)}'`);
  output = output.replace(/"([^"\r\n]*)"/g, (match, value) => `"${maybeRecover(value)}"`);
  output = output.replace(/`([^`]+)`/g, (match, value) => `\`${maybeRecover(value)}\``);

  return output;
}

function maybeRecover(value) {
  if (!looksLikeMojibake(value)) {
    return value;
  }

  const recovered = recoverFrom1253(value);
  if (!recovered || recovered.includes("\uFFFD")) {
    return value;
  }

  if (badScore(recovered) >= badScore(value)) {
    return value;
  }

  if (goodScore(recovered) < Math.floor(goodScore(value) * 0.6)) {
    return value;
  }

  return recovered;
}

function looksLikeMojibake(value) {
  if (!value) {
    return false;
  }

  return /[\u039E\u039F\u03B2]/u.test(value) &&
    /[\u0080-\u00ff\u0192\u2020\u2021\u2026\u2030\u20ac\u2122]/u.test(value);
}

function syncLocalizedFallbacks(relativePath, input) {
  const locale = relativePath.startsWith("el/") ? "el" : relativePath.startsWith("en/") ? "en" : null;

  if (!locale) {
    return input;
  }

  const htmlAttribute = `data-${locale}-html`;
  const textAttribute = `data-${locale}`;
  const htmlPattern = new RegExp(`(<([a-z0-9-]+)\\b[^>]*\\s${htmlAttribute}="([^"]+)"[^>]*>)(.*?)(<\\/\\2>)`, "gi");
  const textPattern = new RegExp(`(<([a-z0-9-]+)\\b[^>]*\\s${textAttribute}="([^"]+)"[^>]*>)([^<]*)(<\\/\\2>)`, "gi");

  return input
    .split(/\r?\n/u)
    .map((line) => {
      let output = line.replace(htmlPattern, (match, start, tagName, localizedValue, currentValue, end) => {
        return shouldSyncFallback(currentValue, localizedValue)
          ? `${start}${localizedValue}${end}`
          : match;
      });

      output = output.replace(textPattern, (match, start, tagName, localizedValue, currentValue, end) => {
        return shouldSyncFallback(currentValue, localizedValue)
          ? `${start}${localizedValue}${end}`
          : match;
      });

      return output;
    })
    .join("\n");
}

function shouldSyncFallback(currentValue, localizedValue) {
  const current = currentValue.trim();
  const localized = localizedValue.trim();

  if (!localized || current === localized) {
    return false;
  }

  if (!current) {
    return true;
  }

  return containsForbiddenCodePoints(current) ||
    (looksLikeMojibake(current) && !looksLikeMojibake(localized));
}

function recoverFrom1253(value) {
  const bytes = [];

  for (const char of value) {
    const byte = reverseMap.get(char);
    if (byte == null) {
      return null;
    }

    bytes.push(byte);
  }

  return Buffer.from(bytes).toString("utf8");
}

function badScore(value) {
  return (value.match(/[\u039E\u039F\u03B2]/gu)?.length ?? 0) +
    (value.match(/[\u0080-\u00ff\u0192\u2020\u2021\u2026\u2030\u20ac\u2122]/gu)?.length ?? 0);
}

function goodScore(value) {
  return value.match(/[\u0370-\u03ffA-Za-z0-9]/gu)?.length ?? 0;
}

function stripBom(value) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function containsForbiddenCodePoints(value) {
  for (const char of value) {
    const codePoint = char.codePointAt(0);

    if (codePoint == null) {
      continue;
    }

    if ((codePoint >= 0x00 && codePoint <= 0x1f) || (codePoint >= 0x7f && codePoint <= 0x9f)) {
      return true;
    }
  }

  return false;
}
