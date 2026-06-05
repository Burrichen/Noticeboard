const childProcess = require("child_process");
const path = require("path");
const { loadSettings } = require("./settings");

const settings = loadSettings();

if (settings.interfaceMode === "gui") {
  launchGui();
} else {
  launchCli();
}

function launchCli() {
  const cliPath = path.join(__dirname, "main.js");

  const child = childProcess.spawn(process.execPath, [cliPath], {
    stdio: "inherit"
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

function launchGui() {
  let electronPath;

  try {
    electronPath = require("electron");
  } catch {
    console.error("");
    console.error("Electron is not installed.");
    console.error("Run this first:");
    console.error("");
    console.error("  npm install --save-dev electron");
    console.error("");
    process.exit(1);
  }

  const mainPath = path.join(__dirname, "..", "electron", "main.js");

  const child = childProcess.spawn(electronPath, [mainPath], {
    stdio: "inherit"
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}