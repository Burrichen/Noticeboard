const fs = require("fs");
const path = require("path");

const SETTINGS_PATH = path.join(process.cwd(), "settings.json");

const DEFAULT_SETTINGS = {
  mode: "manual",
  kurovianFlavour: false
};

function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return { ...DEFAULT_SETTINGS };
    }

    const raw = fs.readFileSync(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw);

    return {
      mode: isValidMode(parsed.mode) ? parsed.mode : DEFAULT_SETTINGS.mode,
      kurovianFlavour:
        typeof parsed.kurovianFlavour === "boolean"
          ? parsed.kurovianFlavour
          : DEFAULT_SETTINGS.kurovianFlavour
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  const safeSettings = {
    mode: isValidMode(settings.mode) ? settings.mode : DEFAULT_SETTINGS.mode,
    kurovianFlavour:
      typeof settings.kurovianFlavour === "boolean"
        ? settings.kurovianFlavour
        : DEFAULT_SETTINGS.kurovianFlavour
  };

  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(safeSettings, null, 2));
}

function isValidMode(mode) {
  return mode === "manual" || mode === "semiAutomatic" || mode === "automatic";
}

module.exports = {
  loadSettings,
  saveSettings
};