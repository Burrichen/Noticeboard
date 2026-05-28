const { askSingleKeyNumber, pause } = require("./input");
const { generateNoticeboard } = require("./generator");
const { loadSettings, saveSettings } = require("./settings");
const style = require("./style");

let currentMode = loadSettings().mode;

async function runApp() {
  while (true) {
    printMainMenu();

    const choice = await askSingleKeyNumber("Choose an option: ", 1, 3);

    if (choice === 1) {
      await startGenerator();
    }

    if (choice === 2) {
      await openOptions();
    }

    if (choice === 3) {
      console.log(style.dim("Goodbye."));
      return;
    }
  }
}

async function startGenerator() {
  console.clear();

  const result = await generateNoticeboard(currentMode);

  printNoticeboardResult(result);

  await pause();
}

async function openOptions() {
  while (true) {
    console.clear();

    console.log(style.line());
    console.log(style.title(" Options"));
    console.log(style.line());
    console.log(`${style.dim("Current mode:")} ${colourMode(currentMode)}`);
    console.log("");
    console.log(`${style.menuNumber(1)} ${style.optionName("Manual", style.colours.midnightBlue)}`);
    console.log(`${style.menuNumber(2)} ${style.optionName("Semi-automatic", style.colours.cursedViolet)}`);
    console.log(`${style.menuNumber(3)} ${style.optionName("Automatic", style.colours.witchGreen)}`);
    console.log(`${style.menuNumber(4)} ${style.optionName("Back", style.colours.oldBone)}`);
    console.log("");

    const choice = await askSingleKeyNumber("Choose an option: ", 1, 4);

    if (choice === 4) {
      return;
    }

    if (choice === 1) {
      currentMode = "manual";
    }

    if (choice === 2) {
      currentMode = "semiAutomatic";
    }

    if (choice === 3) {
      currentMode = "automatic";
    }

    saveSettings({ mode: currentMode });

    console.log(style.success(`Mode set to ${formatMode(currentMode)}.`));

    // No pause here.
    // The menu refreshes immediately, which avoids readline/raw-input weirdness.
  }
}

function printMainMenu() {
  console.clear();

  console.log(style.line());
  console.log(style.title(" DND Noticeboard Generator"));
  console.log(style.line());
  console.log(`${style.dim("Current mode:")} ${colourMode(currentMode)}`);
  console.log("");
  console.log(`${style.menuNumber(1)} ${style.optionName("Start", style.colours.witchGreen)}`);
  console.log(`${style.menuNumber(2)} ${style.optionName("Options", style.colours.ghostCyan)}`);
  console.log(`${style.menuNumber(3)} ${style.optionName("Exit", style.colours.blood)}`);
  console.log("");
}

function printNoticeboardResult(result) {
  console.log("");
  console.log(style.line());
  console.log(style.title(" Generated Noticeboard"));
  console.log(style.line());
  console.log(`${style.dim("Mode:")} ${colourMode(result.mode)}`);
  console.log(`${style.dim("Quality:")} ${style.optionName(result.quality.name, style.colours.oldBone)}`);
  console.log(`${style.dim("Size:")} ${style.optionName(result.size.name, style.colours.tarnishedGold)}`);
  console.log(`${style.dim("Notice count:")} ${style.optionName(String(result.noticeCount), style.colours.oldBone)}`);
  console.log("");
  console.log(style.title("Notices"));

  for (const notice of result.notices) {
    console.log(`${style.menuNumber(notice.number)} ${style.contractType(notice.outcome)}`);
  }

  console.log("");
}

function colourMode(mode) {
  if (mode === "manual") {
    return style.optionName("Manual", style.colours.midnightBlue);
  }

  if (mode === "semiAutomatic") {
    return style.optionName("Semi-automatic", style.colours.cursedViolet);
  }

  return style.optionName("Automatic", style.colours.witchGreen);
}

function formatMode(mode) {
  if (mode === "manual") {
    return "Manual";
  }

  if (mode === "semiAutomatic") {
    return "Semi-automatic";
  }

  return "Automatic";
}

module.exports = {
  runApp,
  formatMode
};