import { chromium } from "playwright";
import fs from "node:fs";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const diagnostics = [];

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
