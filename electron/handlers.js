import { appState, newBoard } from "./state.js";
import {
  render,
  renderStage,
  getAvailableTagEntries,
  getTagLabel,
  rollDie,
  rollDice,
  getMasterTableResult,
  rollOnPercentTable,
  isFilledEntry,
  getEntryWeight,
  chooseWeightedEntry,
  normaliseTagText,
  shouldAddAdditionalWeirdPayment
} from "./render.js";

export function bindEvents() {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");

    if (button === null) {
      return;
    }

    const action = button.dataset.action;

    if (action === "open-about") {
      document.getElementById("aboutOverlay").classList.remove("hidden");
      return;
    }

    if (action === "close-about") {
      document.getElementById("aboutOverlay").classList.add("hidden");
      return;
    }

    if (action === "set-mode") {
      appState.settings.mode = button.dataset.mode;
      await saveSettings();
      render();
      return;
    }

    if (action === "set-interface") {
      appState.settings.interfaceMode = button.dataset.interface;
      await saveSettings();
      render();
      return;
    }

    if (action === "toggle-kurovian") {
      appState.settings.kurovianFlavour = !appState.settings.kurovianFlavour;
      await saveSettings();
      render();
      return;
    }

    if (action === "reload-data") {
      await reloadData();
      return;
    }

    if (action === "start") {
      await startGeneration();
      return;
    }

    if (action === "reset") {
      resetGenerator();
      return;
    }

    if (action === "export") {
      await exportToFile();
      return;
    }

    if (action === "choice") {
      await handleChoice(button.dataset.choiceAction, Number.parseInt(button.dataset.index, 10));
    }
  });

  // Close about overlay when clicking the backdrop
  document.getElementById("aboutOverlay").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      event.currentTarget.classList.add("hidden");
    }
  });

  document.addEventListener("keydown", (event) => {
    // About overlay takes over — only Esc passes through (to close it)
    const overlay = document.getElementById("aboutOverlay");
    if (overlay && !overlay.classList.contains("hidden")) {
      if (event.key === "Escape") {
        event.preventDefault();
        overlay.classList.add("hidden");
      }
      return;
    }

    // Esc and R work at any stage (not just during a choice panel)
    if (event.key === "Escape") {
      event.preventDefault();
      skipToResults();
      return;
    }

    if ((event.key === "r" || event.key === "R") &&
        event.target.tagName !== "INPUT" &&
        event.target.tagName !== "TEXTAREA") {
      event.preventDefault();
      completeRemainingAutomatically();
      return;
    }

    if (appState.activeChoice === null) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      appState.typedNumber = "";
      appState.selectedChoiceIndex =
        appState.selectedChoiceIndex >= appState.activeChoice.items.length - 1
          ? 0
          : appState.selectedChoiceIndex + 1;
      renderStage();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      appState.typedNumber = "";
      appState.selectedChoiceIndex =
        appState.selectedChoiceIndex <= 0
          ? appState.activeChoice.items.length - 1
          : appState.selectedChoiceIndex - 1;
      renderStage();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (appState.typedNumber !== "") {
        const typedChoice = Number.parseInt(appState.typedNumber, 10);

        if (typedChoice >= 1 && typedChoice <= appState.activeChoice.items.length) {
          handleChoice(appState.activeChoice.action, typedChoice - 1);
        }

        appState.typedNumber = "";
        return;
      }

      handleChoice(appState.activeChoice.action, appState.selectedChoiceIndex);
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      if (appState.typedNumber !== "") {
        appState.typedNumber = appState.typedNumber.slice(0, -1);
        renderStage();
      } else {
        goBack();
      }
      return;
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault();

      if (appState.activeChoice.items.length <= 9) {
        const index = Number.parseInt(event.key, 10) - 1;

        if (index >= 0 && index < appState.activeChoice.items.length) {
          handleChoice(appState.activeChoice.action, index);
        }

        return;
      }

      appState.typedNumber += event.key;

      const typedChoice = Number.parseInt(appState.typedNumber, 10);

      if (typedChoice >= 1 && typedChoice <= appState.activeChoice.items.length) {
        appState.selectedChoiceIndex = typedChoice - 1;
      }

      clearTimeout(appState.typedNumberTimer);

      appState.typedNumberTimer = setTimeout(() => {
        appState.typedNumber = "";
        renderStage();
      }, 3000);

      renderStage();
    }
  });
}

function goBack() {
  const stage = appState.stage;

  if (stage === "home" || stage === "result") {
    return;
  }

  if (stage === "quality") {
    appState.board = newBoard();
    appState.stage = "home";
    render();
    return;
  }

  if (stage === "size") {
    appState.board.quality = null;
    appState.stage = "quality";
    render();
    return;
  }

  if (stage === "noticeCount") {
    appState.board.size = null;
    appState.stage = "size";
    render();
    return;
  }

  if (stage === "contractType") {
    if (appState.board.notices.length === 0) {
      appState.board.noticeCount = null;
      appState.board.currentNoticeNumber = 1;
      appState.stage = "noticeCount";
    } else {
      appState.board.notices.pop();
      appState.board.currentNoticeNumber -= 1;
    }
    render();
    return;
  }

  if (stage === "legitimateSeed" || stage === "illegitimateSeed") {
    appState.board.pendingNotice = null;
    appState.stage = "contractType";
    render();
    return;
  }

  if (stage === "legitimateTag" || stage === "legitimateAdditionalWeirdPayment") {
    appState.board.pendingLegitimate = null;
    appState.stage = "legitimateSeed";
    render();
    return;
  }

  if (stage === "illegitimateBase") {
    appState.board.pendingIllegitimate = null;
    appState.stage = "illegitimateSeed";
    render();
    return;
  }

  if (stage === "illegitimateTag" || stage === "illegitimateAdditionalWeirdPayment") {
    const pending = appState.board.pendingIllegitimate;
    pending.contractTagKey = null;
    pending.tagKeys = [];
    pending.tagIndex = 0;
    pending.tags = {};
    appState.stage = "illegitimateBase";
    render();
    return;
  }
}

function skipToResults() {
  if (appState.board.quality === null) {
    resetGenerator();
    return;
  }

  appState.board.pendingNotice = null;
  appState.board.pendingLegitimate = null;
  appState.board.pendingIllegitimate = null;
  appState.exportMessage = null;
  appState.stage = "result";
  renderStage();
}

async function completeRemainingAutomatically() {
  if (appState.stage === "result") {
    return;
  }

  // Complete any missing board setup
  if (appState.board.quality === null) {
    appState.board.quality = getMasterTableResult(appState.data.qualityTable, rollDie(10));
  }

  if (appState.board.size === null) {
    appState.board.size = getMasterTableResult(appState.data.sizeTable, rollDie(10));
  }

  if (appState.board.noticeCount === null) {
    appState.board.noticeCount = rollDice(appState.board.size.contractDice).total;
    appState.board.currentNoticeNumber = 1;
  }

  // Complete any pending notice
  if (appState.board.pendingNotice !== null) {
    if (appState.board.pendingNotice.outcome === "Legitimate") {
      let seed, tags;

      if (appState.board.pendingLegitimate === null) {
        seed = rollLegitimateSeed();
        tags = chooseLegitimateTagsAutomaticallyForSeed(seed);
      } else {
        const pending = appState.board.pendingLegitimate;
        seed = pending.seed;

        while (pending.tagIndex < pending.seed.tagKeys.length) {
          const tagKey = pending.seed.tagKeys[pending.tagIndex];
          if (pending.tags[tagKey] === undefined) {
            const entry = chooseTagAutomatically(tagKey);
            pending.tags[tagKey] = entry;
            applyForcedTagsToSelection(pending.tags, entry);
          }
          pending.tagIndex += 1;
          advancePendingLegitimateTagIndex(pending);
        }

        if (shouldAddAdditionalWeirdPayment(seed, pending.tags) && pending.tags.weirdPayment === undefined) {
          pending.tags.weirdPayment = chooseTagAutomatically("weirdPayment");
        }

        tags = pending.tags;
      }

      const contract = await buildLegitimateContract(seed, tags);
      appState.board.notices.push({ ...appState.board.pendingNotice, legitimateContract: contract });
    } else if (appState.board.pendingNotice.outcome === "Illegitimate") {
      let seed, contractTagKey, tags;

      if (appState.board.pendingIllegitimate === null) {
        seed = rollIllegitimateSeed();
        const result = chooseIllegitimateTagsAutomaticallyForSeed(seed);
        contractTagKey = result.contractTagKey;
        tags = result.tags;
      } else {
        const pending = appState.board.pendingIllegitimate;
        seed = pending.seed;

        if (pending.contractTagKey === null) {
          pending.contractTagKey = seed.contractTagOptions[rollDie(seed.contractTagOptions.length) - 1];
          pending.tagKeys = [pending.contractTagKey, seed.extraTagKey];
          pending.tagIndex = 0;
        }

        while (pending.tagIndex < pending.tagKeys.length) {
          const tagKey = pending.tagKeys[pending.tagIndex];
          if (pending.tags[tagKey] === undefined) {
            const entry = chooseTagAutomatically(tagKey);
            pending.tags[tagKey] = entry;
            applyForcedTagsToSelection(pending.tags, entry);
          }
          pending.tagIndex += 1;
          advancePendingIllegitimateTagIndex(pending);
        }

        if (shouldAddAdditionalWeirdPayment(seed, pending.tags) && pending.tags.weirdPayment === undefined) {
          pending.tags.weirdPayment = chooseTagAutomatically("weirdPayment");
        }

        contractTagKey = pending.contractTagKey;
        tags = pending.tags;
      }

      const contract = await buildIllegitimateContract(seed, contractTagKey, tags);
      appState.board.notices.push({ ...appState.board.pendingNotice, illegitimateContract: contract });
    }

    appState.board.pendingNotice = null;
    appState.board.pendingLegitimate = null;
    appState.board.pendingIllegitimate = null;
    appState.board.currentNoticeNumber += 1;
  }

  // Generate all remaining notices
  while (appState.board.currentNoticeNumber <= appState.board.noticeCount) {
    appState.board.notices.push(await generateAutomaticNotice(appState.board.currentNoticeNumber));
    appState.board.currentNoticeNumber += 1;
  }

  appState.exportMessage = null;
  appState.stage = "result";
  render();
}

async function reloadData() {
  appState.data = await window.noticeboardAPI.reloadData();
  resetGenerator();
}

async function startGeneration() {
  appState.board = newBoard();
  appState.selectedChoiceIndex = 0;
  appState.typedNumber = "";

  if (appState.settings.mode === "automatic") {
    await generateAutomaticBoard();
    appState.stage = "result";
    render();
    return;
  }

  appState.stage = "quality";
  render();
}

function resetGenerator() {
  appState.board = newBoard();
  appState.stage = "home";
  appState.selectedChoiceIndex = 0;
  appState.typedNumber = "";
  render();
}

async function handleChoice(action, index) {
  const item = appState.activeChoice?.items[index];

  if (item === undefined) {
    return;
  }

  appState.selectedChoiceIndex = 0;
  appState.typedNumber = "";

  if (action === "choose-quality") {
    chooseQuality(item.value);
    return;
  }

  if (action === "choose-size") {
    chooseSize(item.value);
    return;
  }

  if (action === "choose-count") {
    chooseNoticeCount(item.value);
    return;
  }

  if (action === "choose-contract-type") {
    chooseContractType(item.value);
    return;
  }

  if (action === "choose-legit-seed") {
    await chooseLegitimateSeedById(item.value);
    return;
  }

  if (action === "choose-legit-tag") {
    await chooseLegitimateTag(item.value);
    return;
  }

  if (action === "choose-additional-weird-payment") {
    await chooseAdditionalWeirdPayment(item.value);
    return;
  }

  if (action === "choose-illegit-seed") {
    await chooseIllegitimateSeedById(item.value);
    return;
  }

  if (action === "choose-illegit-base") {
    chooseIllegitimateBase(item.value);
    return;
  }

  if (action === "choose-illegit-tag") {
    await chooseIllegitimateTag(item.value);
    return;
  }

  if (action === "choose-illegit-additional-weird-payment") {
    await chooseIllegitimateAdditionalWeirdPayment(item.value);
    return;
  }
}

function chooseQuality(qualityId) {
  appState.board.quality = appState.data.qualityTable.find((quality) => quality.id === qualityId);
  appState.stage = "size";
  render();
}

function chooseSize(sizeId) {
  appState.board.size = appState.data.sizeTable.find((size) => size.id === sizeId);

  if (appState.settings.mode === "semiAutomatic") {
    appState.board.noticeCount = rollDice(appState.board.size.contractDice).total;
    appState.board.currentNoticeNumber = 1;
    runSemiAutomaticUntilChoiceNeeded();
    return;
  }

  appState.stage = "noticeCount";
  render();
}

function chooseNoticeCount(count) {
  appState.board.noticeCount = count;
  appState.board.currentNoticeNumber = 1;
  appState.stage = "contractType";
  render();
}

function chooseContractType(contractType) {
  if (contractType === "Legitimate") {
    appState.board.pendingNotice = {
      number: appState.board.currentNoticeNumber,
      outcome: "Legitimate"
    };

    appState.stage = "legitimateSeed";
    render();
    return;
  }

  if (contractType === "Illegitimate") {
    appState.board.pendingNotice = {
      number: appState.board.currentNoticeNumber,
      outcome: "Illegitimate"
    };

    appState.stage = "illegitimateSeed";
    render();
    return;
  }

  appState.board.notices.push({
    number: appState.board.currentNoticeNumber,
    outcome: contractType
  });

  advanceManualNotice();
}

async function chooseLegitimateSeedById(seedId) {
  const seed = appState.data.legitimateSeeds.find((entry) => entry.id === seedId);

  if (seed === undefined) {
    return;
  }

  if (appState.settings.mode === "semiAutomatic") {
    const tags = chooseLegitimateTagsAutomaticallyForSeed(seed);
    const contract = await buildLegitimateContract(seed, tags);

    appState.board.notices.push({
      ...appState.board.pendingNotice,
      legitimateContract: contract
    });

    appState.board.pendingNotice = null;
    appState.board.currentNoticeNumber += 1;

    runSemiAutomaticUntilChoiceNeeded();
    return;
  }

  appState.board.pendingLegitimate = {
    seed,
    tagIndex: 0,
    tags: {}
  };

  appState.stage = "legitimateTag";
  render();
}

async function chooseLegitimateTag(availableEntryIndex) {
  const pending = appState.board.pendingLegitimate;
  const tagKey = pending.seed.tagKeys[pending.tagIndex];
  const availableEntries = getAvailableTagEntries(tagKey);
  const selectedEntry = availableEntries[availableEntryIndex];

  pending.tags[tagKey] = selectedEntry;
  applyForcedTagsToSelection(pending.tags, selectedEntry);

  pending.tagIndex += 1;
  advancePendingLegitimateTagIndex(pending);

  if (pending.tagIndex < pending.seed.tagKeys.length) {
    appState.stage = "legitimateTag";
    render();
    return;
  }

  if (
    shouldAddAdditionalWeirdPayment(pending.seed, pending.tags) &&
    pending.tags.weirdPayment === undefined
  ) {
    appState.stage = "legitimateAdditionalWeirdPayment";
    render();
    return;
  }

  await finalizePendingLegitimateContract();
}

async function chooseAdditionalWeirdPayment(availableEntryIndex) {
  const pending = appState.board.pendingLegitimate;
  const availableEntries = getAvailableTagEntries("weirdPayment");

  pending.tags.weirdPayment = availableEntries[availableEntryIndex];

  await finalizePendingLegitimateContract();
}

async function finalizePendingLegitimateContract() {
  const pending = appState.board.pendingLegitimate;
  const contract = await buildLegitimateContract(pending.seed, pending.tags);

  appState.board.notices.push({
    ...appState.board.pendingNotice,
    legitimateContract: contract
  });

  appState.board.pendingNotice = null;
  appState.board.pendingLegitimate = null;

  advanceManualNotice();
}

async function chooseIllegitimateSeedById(seedId) {
  const seed = appState.data.illegitimateSeeds.find((entry) => entry.id === seedId);

  if (seed === undefined) {
    return;
  }

  if (appState.settings.mode === "semiAutomatic") {
    const result = chooseIllegitimateTagsAutomaticallyForSeed(seed);
    const contract = await buildIllegitimateContract(seed, result.contractTagKey, result.tags);

    appState.board.notices.push({
      ...appState.board.pendingNotice,
      illegitimateContract: contract
    });

    appState.board.pendingNotice = null;
    appState.board.currentNoticeNumber += 1;

    runSemiAutomaticUntilChoiceNeeded();
    return;
  }

  appState.board.pendingIllegitimate = {
    seed,
    contractTagKey: null,
    tagKeys: [],
    tagIndex: 0,
    tags: {}
  };

  appState.stage = "illegitimateBase";
  render();
}

function chooseIllegitimateBase(contractTagKey) {
  const pending = appState.board.pendingIllegitimate;

  pending.contractTagKey = contractTagKey;
  pending.tagKeys = [contractTagKey, pending.seed.extraTagKey];
  pending.tagIndex = 0;

  appState.stage = "illegitimateTag";
  render();
}

async function chooseIllegitimateTag(availableEntryIndex) {
  const pending = appState.board.pendingIllegitimate;
  const tagKey = pending.tagKeys[pending.tagIndex];
  const availableEntries = getAvailableTagEntries(tagKey);
  const selectedEntry = availableEntries[availableEntryIndex];

  pending.tags[tagKey] = selectedEntry;
  applyForcedTagsToSelection(pending.tags, selectedEntry);

  pending.tagIndex += 1;
  advancePendingIllegitimateTagIndex(pending);

  if (pending.tagIndex < pending.tagKeys.length) {
    appState.stage = "illegitimateTag";
    render();
    return;
  }

  if (
    shouldAddAdditionalWeirdPayment(pending.seed, pending.tags) &&
    pending.tags.weirdPayment === undefined
  ) {
    appState.stage = "illegitimateAdditionalWeirdPayment";
    render();
    return;
  }

  await finalizePendingIllegitimateContract();
}

async function chooseIllegitimateAdditionalWeirdPayment(availableEntryIndex) {
  const pending = appState.board.pendingIllegitimate;
  const availableEntries = getAvailableTagEntries("weirdPayment");

  pending.tags.weirdPayment = availableEntries[availableEntryIndex];

  await finalizePendingIllegitimateContract();
}

async function finalizePendingIllegitimateContract() {
  const pending = appState.board.pendingIllegitimate;
  const contract = await buildIllegitimateContract(
    pending.seed,
    pending.contractTagKey,
    pending.tags
  );

  appState.board.notices.push({
    ...appState.board.pendingNotice,
    illegitimateContract: contract
  });

  appState.board.pendingNotice = null;
  appState.board.pendingIllegitimate = null;

  advanceManualNotice();
}

function advancePendingLegitimateTagIndex(pending) {
  while (
    pending.tagIndex < pending.seed.tagKeys.length &&
    pending.tags[pending.seed.tagKeys[pending.tagIndex]] !== undefined
  ) {
    pending.tagIndex += 1;
  }
}

function advancePendingIllegitimateTagIndex(pending) {
  while (
    pending.tagIndex < pending.tagKeys.length &&
    pending.tags[pending.tagKeys[pending.tagIndex]] !== undefined
  ) {
    pending.tagIndex += 1;
  }
}

function advanceManualNotice() {
  appState.board.currentNoticeNumber += 1;

  appState.stage = appState.board.currentNoticeNumber > appState.board.noticeCount
    ? "result"
    : "contractType";

  render();
}

function runSemiAutomaticUntilChoiceNeeded() {
  while (appState.board.currentNoticeNumber <= appState.board.noticeCount) {
    const number = appState.board.currentNoticeNumber;

    const contractType = rollOnPercentTable(appState.board.quality.contractTypeTable, rollDie(100));

    if (contractType === "Legitimate") {
      appState.board.pendingNotice = { number, outcome: "Legitimate" };
      appState.stage = "legitimateSeed";
      render();
      return;
    }

    if (contractType === "Illegitimate") {
      appState.board.pendingNotice = { number, outcome: "Illegitimate" };
      appState.stage = "illegitimateSeed";
      render();
      return;
    }

    appState.board.notices.push({ number, outcome: contractType });
    appState.board.currentNoticeNumber += 1;
  }

  appState.stage = "result";
  render();
}

async function generateAutomaticBoard() {
  appState.board.quality = getMasterTableResult(appState.data.qualityTable, rollDie(10));
  appState.board.size = getMasterTableResult(appState.data.sizeTable, rollDie(10));
  appState.board.noticeCount = rollDice(appState.board.size.contractDice).total;

  for (let number = 1; number <= appState.board.noticeCount; number += 1) {
    appState.board.notices.push(await generateAutomaticNotice(number));
  }
}

async function generateAutomaticNotice(number) {
  const contractType = rollOnPercentTable(appState.board.quality.contractTypeTable, rollDie(100));

  if (contractType === "Legitimate") {
    const seed = rollLegitimateSeed();
    const tags = chooseLegitimateTagsAutomaticallyForSeed(seed);

    return {
      number,
      outcome: "Legitimate",
      legitimateContract: await buildLegitimateContract(seed, tags)
    };
  }

  if (contractType === "Illegitimate") {
    const seed = rollIllegitimateSeed();
    const result = chooseIllegitimateTagsAutomaticallyForSeed(seed);

    return {
      number,
      outcome: "Illegitimate",
      illegitimateContract: await buildIllegitimateContract(seed, result.contractTagKey, result.tags)
    };
  }

  return { number, outcome: contractType };
}

function rollLegitimateSeed() {
  const roll = rollDie(100);
  let minimum = 1;

  for (const seed of appState.data.legitimateSeeds) {
    const maximum = minimum + seed.percent - 1;

    if (roll >= minimum && roll <= maximum) {
      return seed;
    }

    minimum = maximum + 1;
  }

  return appState.data.legitimateSeeds[appState.data.legitimateSeeds.length - 1];
}

function rollIllegitimateSeed() {
  const roll = rollDie(100);
  let minimum = 1;

  for (const seed of appState.data.illegitimateSeeds) {
    const maximum = minimum + seed.percent - 1;

    if (roll >= minimum && roll <= maximum) {
      return seed;
    }

    minimum = maximum + 1;
  }

  return appState.data.illegitimateSeeds[appState.data.illegitimateSeeds.length - 1];
}

function chooseLegitimateTagsAutomaticallyForSeed(seed) {
  const tags = {};

  for (const tagKey of seed.tagKeys) {
    if (tags[tagKey] !== undefined) {
      continue;
    }

    const selectedEntry = chooseTagAutomatically(tagKey);
    tags[tagKey] = selectedEntry;

    applyForcedTagsToSelection(tags, selectedEntry);
  }

  if (
    shouldAddAdditionalWeirdPayment(seed, tags) &&
    tags.weirdPayment === undefined
  ) {
    tags.weirdPayment = chooseTagAutomatically("weirdPayment");
  }

  return tags;
}

function chooseIllegitimateTagsAutomaticallyForSeed(seed) {
  const tags = {};
  const contractTagKey = seed.contractTagOptions[rollDie(seed.contractTagOptions.length) - 1];
  const tagKeys = [contractTagKey, seed.extraTagKey];

  for (const tagKey of tagKeys) {
    if (tags[tagKey] !== undefined) {
      continue;
    }

    const selectedEntry = chooseTagAutomatically(tagKey);
    tags[tagKey] = selectedEntry;

    applyForcedTagsToSelection(tags, selectedEntry);
  }

  if (
    shouldAddAdditionalWeirdPayment(seed, tags) &&
    tags.weirdPayment === undefined
  ) {
    tags.weirdPayment = chooseTagAutomatically("weirdPayment");
  }

  return {
    contractTagKey,
    tags
  };
}

function chooseTagAutomatically(tagKey) {
  const availableEntries = getAvailableTagEntries(tagKey);
  const filledEntries = availableEntries.filter((entry) => isFilledEntry(entry));
  const usableEntries = filledEntries.length > 0 ? filledEntries : availableEntries;

  return chooseWeightedEntry(usableEntries);
}

function applyForcedTagsToSelection(tags, sourceEntry) {
  if (sourceEntry.forcedTags === undefined) {
    return;
  }

  for (const [tagKey, forcedText] of Object.entries(sourceEntry.forcedTags)) {
    tags[tagKey] = findForcedTagEntry(tagKey, forcedText);
  }
}

function findForcedTagEntry(tagKey, forcedText) {
  const availableEntries = getAvailableTagEntries(tagKey);
  const normalisedForcedText = normaliseTagText(forcedText);

  const result = availableEntries.find((entry) => {
    return normaliseTagText(entry.text) === normalisedForcedText;
  });

  if (result === undefined) {
    throw new Error(`Forced tag "${forcedText}" was not found in ${getTagLabel(tagKey)}.`);
  }

  return result;
}

// Routes contract building through the main process so the GUI and CLI share
// the same sentence and reward logic in src/legitimateContracts.js.
async function buildLegitimateContract(seed, tags) {
  return window.noticeboardAPI.buildLegitimateContract({
    seed,
    tags,
    kurovianFlavour: appState.settings.kurovianFlavour
  });
}

// Routes contract building through the main process so the GUI and CLI share
// the same sentence and reward logic in src/illegitimateContracts.js.
async function buildIllegitimateContract(seed, contractTagKey, tags) {
  return window.noticeboardAPI.buildIllegitimateContract({
    seed,
    contractTagKey,
    tags,
    kurovianFlavour: appState.settings.kurovianFlavour
  });
}

async function exportToFile() {
  const result = {
    quality: appState.board.quality,
    size: appState.board.size,
    mode: appState.settings.mode,
    kurovianFlavour: appState.settings.kurovianFlavour,
    noticeCount: appState.board.noticeCount,
    notices: appState.board.notices
  };

  try {
    const filepath = await window.noticeboardAPI.exportNoticeboard(result);
    appState.exportMessage = `Saved: ${filepath}`;
  } catch (err) {
    appState.exportMessage = `Export failed: ${err.message}`;
  }

  renderStage();
}

async function saveSettings() {
  appState.settings = await window.noticeboardAPI.saveSettings(appState.settings);
}
