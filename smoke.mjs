import { chromium } from "playwright";
import fs from "node:fs";
import vm from "node:vm";

const diagnostics = [];
const packedFiles = [
  "packed/chunk-01.js",
  "packed/chunk-02.js",
  "packed/chunk-03.js",
  "packed/chunk-04.js",
  "packed/chunk-05.js",
  "packed/chunk-06.js",
  "packed/tail/part-01.js",
];

const pieces = [];
for (const file of [...packedFiles, "game.js"]) {
  const source = fs.readFileSync(file, "utf8");
  try {
    new vm.Script(source, { filename: file });
    console.log(`SYNTAX PASS: ${file} (${source.length} chars)`);
  } catch (error) {
    const line = `[syntax:${file}] ${error.stack || error.message}`;
    diagnostics.push(line);
    console.error(line);
  }

  if (packedFiles.includes(file)) {
    const match = source.match(/\.push\(([\s\S]*)\);\s*$/);
    if (!match) {
      const line = `[wrapper:${file}] Could not extract push argument; start=${JSON.stringify(source.slice(0, 80))} end=${JSON.stringify(source.slice(-80))}`;
      diagnostics.push(line);
      console.error(line);
      continue;
    }
    try {
      const piece = vm.runInNewContext(`(${match[1]})`, {}, { filename: `${file}:argument` });
      pieces.push({ file, piece });
      console.log(`BASE64 PIECE: ${file} length=${piece.length}`);
    } catch (error) {
      const line = `[argument:${file}] ${error.stack || error.message}`;
      diagnostics.push(line);
      console.error(line);
    }
  }
}

const encoded = pieces.map(({ piece }) => piece).join("");
console.log(`BASE64 TOTAL: length=${encoded.length}, modulo4=${encoded.length % 4}`);
const invalid = [...encoded.matchAll(/[^A-Za-z0-9+/=]/g)].slice(0, 20);
if (invalid.length) {
  const line = `[base64] Invalid characters: ${invalid.map(match => `${JSON.stringify(match[0])}@${match.index}`).join(", ")}`;
  diagnostics.push(line);
  console.error(line);
}
try {
  const decoded = atob(encoded);
  fs.writeFileSync("decoded-runtime.js", Buffer.from(decoded, "binary"));
  console.log(`ATOB PASS: decoded=${decoded.length} bytes`);
  try {
    new vm.Script(Buffer.from(decoded, "binary").toString("utf8"), { filename: "decoded-runtime.js" });
    console.log("DECODED SYNTAX PASS");
  } catch (error) {
    const line = `[decoded-syntax] ${error.stack || error.message}`;
    diagnostics.push(line);
    console.error(line);
  }
} catch (error) {
  const line = `[atob] ${error.stack || error.message}`;
  diagnostics.push(line);
  console.error(line);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Runtime.enable");
cdp.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
  const line = `[cdp-exception] ${exceptionDetails.url}:${exceptionDetails.lineNumber + 1}:${exceptionDetails.columnNumber + 1} ${exceptionDetails.text} ${exceptionDetails.exception?.description || ""}`;
  diagnostics.push(line);
  console.error(line);
});

page.on("console", message => {
  const line = `[console:${message.type()}] ${message.text()}`;
  diagnostics.push(line);
  console.log(line);
});
page.on("pageerror", error => {
  const line = `[pageerror] ${error.stack || error.message}`;
  diagnostics.push(line);
  console.error(line);
});
page.on("requestfailed", request => {
  const line = `[requestfailed] ${request.url()} — ${request.failure()?.errorText}`;
  diagnostics.push(line);
  console.error(line);
});

async function expectVisible(selector, label) {
  await page.locator(selector).waitFor({ state: "visible", timeout: 5000 });
  console.log(`PASS: ${label}`);
}

try {
  const response = await page.goto("http://127.0.0.1:4173/", {
    waitUntil: "networkidle",
    timeout: 15000,
  });
  console.log(`HTTP: ${response?.status()}`);
  await expectVisible("#menu-screen.visible", "main menu rendered");
  await expectVisible("#play-button", "play button rendered");

  await page.click("#help-button");
  await expectVisible("#help-screen.visible", "How to Play opens");
  await page.click("#close-help-button");
  await expectVisible("#menu-screen.visible", "How to Play closes");

  await page.click("#lab-button");
  await expectVisible("#lab-screen.visible", "Genome Lab opens");
  await page.click('#lab-screen [data-back="menu"]');
  await expectVisible("#menu-screen.visible", "Genome Lab returns to menu");

  await page.click("#play-button");
  await expectVisible("#origin-screen.visible", "Begin Incubation opens origin selection");

  const origin = page.locator("#origin-grid button, #origin-grid .origin-card").first();
  await origin.waitFor({ state: "visible", timeout: 5000 });
  await origin.click();
  await page.waitForTimeout(500);
  await expectVisible("#hud:not(.hidden)", "origin selection starts a run");

  await page.screenshot({ path: "smoke-success.png", fullPage: true });

  const fatal = diagnostics.filter(line =>
    line.startsWith("[syntax:") ||
    line.startsWith("[argument:") ||
    line.startsWith("[base64]") ||
    line.startsWith("[atob]") ||
    line.startsWith("[decoded-syntax]") ||
    line.startsWith("[pageerror]") ||
    line.startsWith("[requestfailed]") ||
    line.includes("console:error")
  );
  if (fatal.length) throw new Error(`Browser diagnostics contained fatal errors:\n${fatal.join("\n")}`);

  console.log("MENU_SMOKE_TEST_PASSED");
} catch (error) {
  await page.screenshot({ path: "smoke-failure.png", fullPage: true }).catch(() => {});
  fs.writeFileSync("browser-diagnostics.txt", `${diagnostics.join("\n")}\n\nTEST ERROR\n${error.stack || error}\n`);
  console.error(error.stack || error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
