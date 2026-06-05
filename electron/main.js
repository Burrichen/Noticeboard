const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#080609",
    title: "DND Noticeboard Generator",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle("noticeboard:get-data", () => getGeneratorData());
  ipcMain.handle("noticeboard:get-settings", () => getSettings());
  ipcMain.handle("noticeboard:save-settings", (_event, settings) => {
    saveSettingsFromRenderer(settings);
    return getSettings();
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function getGeneratorData() {
  const { QUALITY_TABLE, SIZE_TABLE } = freshRequire("../src/tables");
  const {
    LEGITIMATE_SEEDS,
    TAG_TABLES,
    TAG_LABELS,
    REWARD_DRIFT_RANGE_PERCENT
  } = freshRequire("../src/legitimateContracts");

  return {
    qualityTable: QUALITY_TABLE,
    sizeTable: SIZE_TABLE,
    legitimateSeeds: LEGITIMATE_SEEDS,
    tagTables: TAG_TABLES,
    tagLabels: TAG_LABELS,
    rewardDriftRangePercent: REWARD_DRIFT_RANGE_PERCENT
  };
}

function getSettings() {
  const { loadSettings } = freshRequire("../src/settings");
  return loadSettings();
}

function saveSettingsFromRenderer(settings) {
  const { saveSettings } = freshRequire("../src/settings");
  saveSettings(settings);
}

function freshRequire(modulePath) {
  const resolvedPath = require.resolve(modulePath);
  delete require.cache[resolvedPath];
  return require(modulePath);
}