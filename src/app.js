const { askNumber, pause } = require("./input");
const { generateNoticeboard } = require("./generator");
const style = require("./style");

let currentMode = "manual";

async function runApp() {
  while (true) {
    printMainMenu();

    const choice = await askNumber("Choose an option: ", 1, 3);

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
    console.log(`${style.menuNumber(1)} ${style.optionName("Manual", style.colours.brightBlue)}`);
    console.log(`${style.menuNumber(2)} ${style.optionName("Semi-automatic", style.colours.brightMagenta)}`);
    console.log(`${style.menuNumber(3)} ${style.optionName("Automatic", style.colours.brightGreen)}`);
    console.log(`${style.menuNumber(4)} ${style.optionName("Back", style.colours.white)}`);
    console.log("");

    const choice = await askNumber("Choose an option: ", 1, 4);

    if (choice === 1) {
      currentMode = "manual";
    }

    if (choice === 2) {
      currentMode = "semiAutomatic";
    }

    if (choice === 3) {
      currentMode = "automatic";
    }

    if (choice === 4) {
      return;
    }

    console.log(style.success(`Mode set to ${formatMode(currentMode)}.`));
    await pause();
  }
}

function printMainMenu() {
  console.clear();

  console.log(style.line());
  console.log(style.title(" DND Noticeboard Generator"));
  console.log(style.line());
  console.log(`${style.dim("Current mode:")} ${colourMode(currentMode)}`);
  console.log("");
  console.log(`${style.menuNumber(1)} ${style.optionName("Start", style.colours.brightGreen)}`);
  console.log(`${style.menuNumber(2)} ${style.optionName("Options", style.colours.brightCyan)}`);
  console.log(`${style.menuNumber(3)} ${style.optionName("Exit", style.colours.brightRed)}`);
  console.log("");
}

function printNoticeboardResult(result) {
  console.log("");
  console.log(style.line());
  console.log(style.title(" Generated Noticeboard"));
  console.log(style.line());
  console.log(`${style.dim("Mode:")} ${colourMode(result.mode)}`);
  console.log(`${style.dim("Quality:")} ${style.optionName(result.quality.name, style.colours.brightCyan)}`);
  console.log(`${style.dim("Size:")} ${style.optionName(result.size.name, style.colours.brightYellow)}`);
  console.log(`${style.dim("Notice count:")} ${style.bold(String(result.noticeCount))}`);
  console.log("");
  console.log(style.title("Notices"));

  for (const notice of result.notices) {
    console.log(`${style.menuNumber(notice.number)} ${style.contractType(notice.outcome)}`);
  }

  console.log("");
}

function colourMode(mode) {
  if (mode === "manual") {
    return style.optionName("Manual", style.colours.brightBlue);
  }

  if (mode === "semiAutomatic") {
    return style.optionName("Semi-automatic", style.colours.brightMagenta);
  }

  return style.optionName("Automatic", style.colours.brightGreen);
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