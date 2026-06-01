const { chooseFromList, pause } = require("./input");
const { generateNoticeboard } = require("./generator");
const { loadSettings, saveSettings } = require("./settings");
const style = require("./style");

const loadedSettings = loadSettings();

let currentMode = loadedSettings.mode;
let kurovianFlavour = loadedSettings.kurovianFlavour;

async function runApp() {
  while (true) {
    const choice = await chooseFromList({
      title: "DND Noticeboard Generator",
      statusLines: [
        `${style.dim("Generation mode:")} ${colourMode(currentMode)}`,
        `${style.dim("Kurovian Flavour:")} ${colourKurovianFlavour(kurovianFlavour)}`
      ],
      prompt: "Choose an option",
      items: [
        {
          label: "Start",
          colour: style.colours.witchGreen
        },
        {
          label: "Options",
          colour: style.colours.ghostCyan
        },
        {
          label: "Exit",
          colour: style.colours.blood
        }
      ]
    });

    if (choice === 1) {
      await startGenerator();
    }

    if (choice === 2) {
      await openOptions();
    }

    if (choice === 3) {
      console.clear();
      console.log(style.dim("Goodbye."));
      return;
    }
  }
}

async function startGenerator() {
  console.clear();

  const result = await generateNoticeboard(currentMode, {
    kurovianFlavour
  });

  printNoticeboardResult(result);

  await pause();
}

async function openOptions() {
  while (true) {
    const choice = await chooseFromList({
      title: "Options",
      statusLines: [
        `${style.dim("Generation mode:")} ${colourMode(currentMode)}`,
        `${style.dim("Kurovian Flavour:")} ${colourKurovianFlavour(kurovianFlavour)}`
      ],
      prompt: "Choose an option",
      items: [
        {
          label: "Manual",
          colour: style.colours.midnightBlue
        },
        {
          label: "Semi-automatic",
          colour: style.colours.cursedViolet
        },
        {
          label: "Automatic",
          colour: style.colours.witchGreen
        },
        {
          label: "Toggle Kurovian Flavour",
          colour: style.colours.tarnishedGold
        },
        {
          label: "Back",
          colour: style.colours.oldBone
        }
      ]
    });

    if (choice === 5) {
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

    if (choice === 4) {
      kurovianFlavour = !kurovianFlavour;
    }

    saveCurrentSettings();
  }
}

function saveCurrentSettings() {
  saveSettings({
    mode: currentMode,
    kurovianFlavour
  });
}

function printNoticeboardResult(result) {
  console.clear();

  console.log(style.line());
  console.log(style.title(" Generated Noticeboard"));
  console.log(style.line());
  console.log(`${style.dim("Mode:")} ${colourMode(result.mode)}`);
  console.log(`${style.dim("Kurovian Flavour:")} ${colourKurovianFlavour(result.kurovianFlavour)}`);
  console.log(`${style.dim("Quality:")} ${style.optionName(result.quality.name, style.colours.oldBone)}`);
  console.log(`${style.dim("Size:")} ${style.optionName(result.size.name, style.colours.tarnishedGold)}`);
  console.log(`${style.dim("Notice count:")} ${style.optionName(String(result.noticeCount), style.colours.oldBone)}`);
  console.log("");
  console.log(style.title("Notices"));

  for (const notice of result.notices) {
    console.log(`${style.menuNumber(notice.number)} ${style.contractType(notice.outcome)}`);

    if (notice.legitimateContract !== undefined) {
      printLegitimateContract(notice.legitimateContract);
    }
  }

  console.log("");
}

function printLegitimateContract(contract) {
  console.log(`   ${style.subtitle(contract.sentence)}`);
  console.log(
    `   ${style.optionName("Reward:", style.colours.tarnishedGold)} ${style.optionName(contract.rewardText, style.colours.oldBone)}`
  );
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

function colourKurovianFlavour(enabled) {
  if (enabled) {
    return style.optionName("Enabled", style.colours.cursedViolet);
  }

  return style.optionName("Disabled", style.colours.graveAsh);
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