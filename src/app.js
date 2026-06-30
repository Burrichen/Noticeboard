const { chooseFromList, pause, GoBackError, SkipToResultsError, resetAutoRoll } = require("./input");
const { generateNoticeboard } = require("./generator");
const { exportNoticeboard } = require("./exporter");
const { loadSettings, saveSettings } = require("./settings");
const style = require("./style");

const loadedSettings = loadSettings();

let currentMode = loadedSettings.mode;
let kurovianFlavour = loadedSettings.kurovianFlavour;
let interfaceMode = loadedSettings.interfaceMode;

async function runApp() {
  while (true) {
    let choice;

    try {
      choice = await chooseFromList({
        title: "DND Noticeboard Generator",
        statusLines: [
          `${style.dim("Generation mode:")} ${colourMode(currentMode)}`,
          `${style.dim("Kurovian Flavour:")} ${colourKurovianFlavour(kurovianFlavour)}`,
          `${style.dim("Launch next time:")} ${colourInterfaceMode(interfaceMode)}`
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
            label: "About",
            colour: style.colours.deepGreen
          },
          {
            label: "Exit",
            colour: style.colours.blood
          }
        ]
      });
    } catch (e) {
      if (e instanceof GoBackError || e instanceof SkipToResultsError) {
        continue; // Can't go back further — just redisplay the main menu
      }
      throw e;
    }

    if (choice === 1) {
      await startGenerator();
    }

    if (choice === 2) {
      await openOptions();
    }

    if (choice === 3) {
      await showAbout();
    }

    if (choice === 4) {
      console.clear();
      console.log(style.dim("Goodbye."));
      return;
    }
  }
}

async function startGenerator() {
  console.clear();
  resetAutoRoll();

  let result;

  try {
    result = await generateNoticeboard(currentMode, { kurovianFlavour });
  } catch (e) {
    resetAutoRoll();
    if (e instanceof GoBackError || e instanceof SkipToResultsError) {
      return; // Nothing generated yet — go back to main menu
    }
    throw e;
  }

  printNoticeboardResult(result);
  resetAutoRoll(); // Prevent auto-roll from affecting the Done menu

  let action;

  try {
    action = await chooseFromList({
      title: "Done",
      prompt: "Choose an action",
      items: [
        {
          label: "Export to File",
          description: "Save the noticeboard to noticeboards/noticeboard.txt.",
          colour: style.colours.tarnishedGold
        },
        {
          label: "Continue",
          colour: style.colours.graveAsh
        }
      ]
    });
  } catch (e) {
    if (e instanceof GoBackError || e instanceof SkipToResultsError) {
      return; // Treat back/escape as "Continue"
    }
    throw e;
  }

  if (action === 1) {
    const filepath = exportNoticeboard(result);
    console.log("");
    console.log(`${style.success("Saved:")} ${style.dim(filepath)}`);
    await pause();
  }
}

async function openOptions() {
  while (true) {
    let choice;

    try {
      choice = await chooseFromList({
        title: "Options",
        statusLines: [
          `${style.dim("Generation mode:")} ${colourMode(currentMode)}`,
          `${style.dim("Kurovian Flavour:")} ${colourKurovianFlavour(kurovianFlavour)}`,
          `${style.dim("Launch next time:")} ${colourInterfaceMode(interfaceMode)}`
        ],
        prompt: "Choose an option",
        items: [
          {
            label: `Generation Mode: ${formatMode(currentMode)}`,
            description: getGenerationModeDescription(currentMode),
            colour: getModeColour(currentMode)
          },
          {
            label: `Launch Next Time: ${formatInterfaceMode(interfaceMode)}`,
            description: getInterfaceModeDescription(interfaceMode),
            colour: interfaceMode === "gui" ? style.colours.ghostCyan : style.colours.tarnishedGold
          },
          {
            label: `Kurovian Flavour: ${kurovianFlavour ? "Enabled" : "Disabled"}`,
            description: kurovianFlavour
              ? "Kurovian-only entries may appear. Select to disable."
              : "Kurovian-only entries are hidden. Select to enable.",
            colour: kurovianFlavour ? style.colours.cursedViolet : style.colours.graveAsh
          },
          {
            label: "Back",
            colour: style.colours.oldBone
          }
        ]
      });
    } catch (e) {
      if (e instanceof GoBackError || e instanceof SkipToResultsError) {
        return; // Back/Escape inside options = exit options
      }
      throw e;
    }

    if (choice === 4) {
      return;
    }

    if (choice === 1) {
      currentMode = getNextGenerationMode(currentMode);
    }

    if (choice === 2) {
      interfaceMode = interfaceMode === "gui" ? "cli" : "gui";
    }

    if (choice === 3) {
      kurovianFlavour = !kurovianFlavour;
    }

    saveCurrentSettings();
  }
}

async function showAbout() {
  console.clear();
  const g = style.colours.deepGreen;
  const b = style.colours.bold;
  const r = style.colours.reset;
  const ln = `${g}${b}${"=".repeat(47)}${r}`;

  console.log(ln);
  console.log(`${g}${b}  ✒   DND Noticeboard Generator${r}`);
  console.log(ln);
  console.log(`${g}  Made by Burrichen${r}`);
  console.log("");
  console.log(`${g}${b}  KEYBOARD SHORTCUTS${r}`);
  console.log(`${g}  ↑ / ↓ ................... Navigate choices${r}`);
  console.log(`${g}  Enter ................... Confirm selection${r}`);
  console.log(`${g}  1 – 9 ................... Quick select${r}`);
  console.log(`${g}  ← (Backspace) ........... Go back one step${r}`);
  console.log(`${g}  Esc ..................... Skip to results${r}`);
  console.log(`${g}  R ....................... Auto-roll the rest${r}`);
  console.log(ln);
  await pause();
}

function saveCurrentSettings() {
  saveSettings({
    mode: currentMode,
    kurovianFlavour,
    interfaceMode
  });
}

function printNoticeboardResult(result) {
  console.clear();

  console.log(style.line());
  console.log(style.title(" Generated Noticeboard"));
  console.log(style.line());
  console.log(`${style.dim("Mode:")} ${colourMode(result.mode)}`);
  console.log(`${style.dim("Kurovian Flavour:")} ${colourKurovianFlavour(result.kurovianFlavour)}`);
  console.log(`${style.dim("Launch next time:")} ${colourInterfaceMode(interfaceMode)}`);
  console.log(`${style.dim("Quality:")} ${style.optionName(result.quality.name, style.colours.oldBone)}`);
  console.log(`${style.dim("Size:")} ${style.optionName(result.size.name, style.colours.tarnishedGold)}`);
  console.log(`${style.dim("Notice count:")} ${style.optionName(String(result.noticeCount), style.colours.oldBone)}`);
  console.log("");
  console.log(style.title("Notices"));

  for (const notice of result.notices) {
    console.log(`${style.menuNumber(notice.number)} ${style.contractType(notice.outcome)}`);

    if (notice.legitimateContract !== undefined) {
      printGeneratedContract(notice.legitimateContract);
    }

    if (notice.illegitimateContract !== undefined) {
      printGeneratedContract(notice.illegitimateContract);
    }

    if (notice.illegalContract !== undefined) {
      printGeneratedContract(notice.illegalContract);
    }
  }

  console.log("");
}

function printGeneratedContract(contract) {
  console.log(`   ${style.subtitle(contract.sentence)}`);
  console.log(
    `   ${style.optionName("Reward:", style.colours.tarnishedGold)} ${style.optionName(contract.rewardText, style.colours.oldBone)}`
  );
}

function getNextGenerationMode(mode) {
  if (mode === "manual") {
    return "semiAutomatic";
  }

  if (mode === "semiAutomatic") {
    return "automatic";
  }

  return "manual";
}

function getGenerationModeDescription(mode) {
  if (mode === "manual") {
    return "Choose board, notice types, contract types, legitimate seeds, and tags yourself.";
  }

  if (mode === "semiAutomatic") {
    return "Choose quality and size. Pick contract seeds; tags roll automatically.";
  }

  return "Everything rolls immediately.";
}

function getInterfaceModeDescription(value) {
  if (value === "gui") {
    return "Running npm start will open the desktop GUI.";
  }

  return "Running npm start will open the terminal CLI.";
}

function colourMode(mode) {
  return style.optionName(formatMode(mode), getModeColour(mode));
}

function colourKurovianFlavour(enabled) {
  if (enabled) {
    return style.optionName("Enabled", style.colours.cursedViolet);
  }

  return style.optionName("Disabled", style.colours.graveAsh);
}

function colourInterfaceMode(value) {
  if (value === "gui") {
    return style.optionName("GUI", style.colours.ghostCyan);
  }

  return style.optionName("CLI", style.colours.tarnishedGold);
}

function getModeColour(mode) {
  if (mode === "manual") {
    return style.colours.midnightBlue;
  }

  if (mode === "semiAutomatic") {
    return style.colours.cursedViolet;
  }

  return style.colours.witchGreen;
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

function formatInterfaceMode(value) {
  if (value === "gui") {
    return "GUI";
  }

  return "CLI";
}

module.exports = {
  runApp,
  formatMode
};