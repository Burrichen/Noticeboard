const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// Settings module reads JSON fresh on every loadSettings() call,
// so it only needs to be required once.
const { loadSettings, saveSettings } = require("../src/settings");

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
  ipcMain.handle("noticeboard:reload-data", () => getGeneratorDataFresh());
  ipcMain.handle("noticeboard:get-settings", () => loadSettings());

  ipcMain.handle("noticeboard:save-settings", (_event, settings) => {
    saveSettings(settings);
    return loadSettings();
  });

  ipcMain.handle("noticeboard:build-legitimate", (_event, { seed, tags, kurovianFlavour }) => {
    const { buildContractFromTags } = require("../src/legitimateContracts");
    return buildContractFromTags(seed, tags, kurovianFlavour);
  });

  ipcMain.handle("noticeboard:build-illegitimate", (_event, { seed, contractTagKey, tags, kurovianFlavour }) => {
    const { buildIllegitimateContractFromTags } = require("../src/illegitimateContracts");
    return buildIllegitimateContractFromTags(seed, contractTagKey, tags, kurovianFlavour);
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
  const { QUALITY_TABLE, SIZE_TABLE } = require("../src/tables");

  const {
    LEGITIMATE_SEEDS,
    TAG_TABLES,
    TAG_LABELS,
    REWARD_DRIFT_RANGE_PERCENT
  } = require("../src/legitimateContracts");

  const {
    ILLEGITIMATE_SEEDS,
    ILLEGITIMATE_TAG_TABLES,
    ILLEGITIMATE_TAG_LABELS
  } = require("../src/illegitimateContracts");

  return {
    qualityTable: QUALITY_TABLE,
    sizeTable: SIZE_TABLE,
    legitimateSeeds: LEGITIMATE_SEEDS,
    tagTables: TAG_TABLES,
    tagLabels: TAG_LABELS,
    rewardDriftRangePercent: REWARD_DRIFT_RANGE_PERCENT,
    illegitimateSeeds: ILLEGITIMATE_SEEDS,
    illegitimateTagTables: ILLEGITIMATE_TAG_TABLES,
    illegitimateTagLabels: ILLEGITIMATE_TAG_LABELS
  };
}

// Used by the "Reload JS Table Data" button to pick up edits to table files
// without restarting the app.
function getGeneratorDataFresh() {
  const { QUALITY_TABLE, SIZE_TABLE } = freshRequire("../src/tables");

  const {
    LEGITIMATE_SEEDS,
    TAG_TABLES,
    TAG_LABELS,
    REWARD_DRIFT_RANGE_PERCENT
  } = freshRequire("../src/legitimateContracts");

  const {
    ILLEGITIMATE_SEEDS,
    ILLEGITIMATE_TAG_TABLES,
    ILLEGITIMATE_TAG_LABELS
  } = freshRequire("../src/illegitimateContracts");

  return {
    qualityTable: QUALITY_TABLE,
    sizeTable: SIZE_TABLE,
    legitimateSeeds: LEGITIMATE_SEEDS,
    tagTables: TAG_TABLES,
    tagLabels: TAG_LABELS,
    rewardDriftRangePercent: REWARD_DRIFT_RANGE_PERCENT,
    illegitimateSeeds: ILLEGITIMATE_SEEDS,
    illegitimateTagTables: ILLEGITIMATE_TAG_TABLES,
    illegitimateTagLabels: ILLEGITIMATE_TAG_LABELS
  };
}

function freshRequire(modulePath) {
  const resolvedPath = require.resolve(modulePath);
  delete require.cache[resolvedPath];
  return require(modulePath);
}
