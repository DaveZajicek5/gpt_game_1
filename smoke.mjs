import { chromium } from "playwright";
import fs from "node:fs";
import vm from "node:vm";

const diagnostics = [];
const runtime = fs.readFileSync("game.js", "utf8");
try {
  new vm.Script(runtime, { filename: "game.js" });
  console.log(`SYNTAX PASS: game.js (${runtime.length} chars)`);
} catch (error) {
  console.error(error.stack || error);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Runtime.enable");
cdp.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
  const line = `[cdp-exception] ${exceptionDetails.url}:${exceptionDetails.lineNumber + 1}:${exceptionDetails.columnNumber + 1} ${exceptionDetails.exception?.description || exceptionDetails.text}`;
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
  const response = await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle", timeout: 15000 });
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
  const origin = page.locator("#origin-grid .origin-card").first();
  await origin.waitFor({ state: "visible", timeout: 5000 });
  await origin.click();
  await expectVisible("#hud:not(.hidden)", "origin selection starts a run");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(800);
  await page.keyboard.up("KeyD");
  await page.keyboard.press("Space");
  await page.waitForTimeout(1200);

  await page.click("#pause-button");
  await expectVisible("#pause-screen.visible", "pause menu opens during run");
  await page.click("#resume-button");
  await expectVisible("#hud:not(.hidden)", "run resumes");

  const hudTime = await page.locator("#hud-time").textContent();
  if (!hudTime || hudTime === "00:00") throw new Error(`Game clock did not advance: ${hudTime}`);

  await page.screenshot({ path: "smoke-success.png", fullPage: true });
  const fatal = diagnostics.filter(line => line.startsWith("[pageerror]") || line.startsWith("[requestfailed]") || line.startsWith("[cdp-exception]") || line.includes("console:error"));
  if (fatal.length) throw new Error(`Browser diagnostics contained fatal errors:\n${fatal.join("\n")}`);
  console.log("MENU_AND_GAMEPLAY_SMOKE_TEST_PASSED");
} catch (error) {
  await page.screenshot({ path: "smoke-failure.png", fullPage: true }).catch(() => {});
  fs.writeFileSync("browser-diagnostics.txt", `${diagnostics.join("\n")}\n\nTEST ERROR\n${error.stack || error}\n`);
  console.error(error.stack || error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
