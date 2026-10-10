import { existsSync } from "node:fs";
import os from "node:os";
import puppeteer from "puppeteer-core";

const CANDIDATES = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  ],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ],
  win32: [
    `${process.env["PROGRAMFILES"]}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env["LOCALAPPDATA"]}\\Google\\Chrome\\Application\\chrome.exe`,
  ],
};

/**
 * Locate a Chrome/Chromium binary. Override with CHROME_PATH or
 * PUPPETEER_EXECUTABLE_PATH. Returns null if none is found.
 */
export function findChrome() {
  const override = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (override) return override;
  const list = CANDIDATES[os.platform()] ?? [];
  return list.find((p) => p && existsSync(p)) ?? null;
}

/**
 * Launch the system browser. Puppeteer-core ships no browser, so we either use
 * a detected binary or ask Puppeteer to find the installed Chrome channel.
 */
export function launchBrowser() {
  const executablePath = findChrome();
  const common = { headless: true, args: ["--no-first-run", "--disable-gpu"] };
  return executablePath
    ? puppeteer.launch({ ...common, executablePath })
    : puppeteer.launch({ ...common, channel: "chrome" });
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
