const fs = require("fs");
const path = require("path");

const SETTINGS_PATH = path.join(process.cwd(), "settings.json");

const DEFAULT_SETTINGS = {
  mode: "manual",
  kurovianFlavour: false,
  interfaceMode: "cli"
};

function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return { ...DEFAULT_SETTINGS };
    }

    const raw = fs.readFileSync(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw);

    return sanitizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  const currentSettings = loadSettings();

  const safeSettings = sanitizeSettings({
    ...currentSettings,
    ...settings
  });

  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(safeSettings, null, 2));
}

function sanitizeSettings(settings) {
  return {
    mode: isValidMode(settings.mode) ? settings.mode : DEFAULT_SETTINGS.mode,

    kurovianFlavour:
      typeof settings.kurovianFlavour === "boolean"
        ? settings.kurovianFlavour
        : DEFAULT_SETTINGS.kurovianFlavour,

    interfaceMode:
      isValidInterfaceMode(settings.interfaceMode)
        ? settings.interfaceMode
        : DEFAULT_SETTINGS.interfaceMode
  };
}

function isValidMode(mode) {
  return mode === "manual" || mode === "semiAutomatic" || mode === "automatic";
}

function isValidInterfaceMode(interfaceMode) {
  return interfaceMode === "cli" || interfaceMode === "gui";
}

module.exports = {
  loadSettings,
  saveSettings
};