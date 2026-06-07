const DEFAULT_SETTINGS = {
  mode: "manual",
  kurovianFlavour: false,
  interfaceMode: "cli"
};

const appState = {
  data: null,
  settings: { ...DEFAULT_SETTINGS },
  stage: "home",
  board: newBoard(),
  activeChoice: null,
  selectedChoiceIndex: 0,
  typedNumber: "",
  typedNumberTimer: null
};

const settingsPanel = document.getElementById("settingsPanel");
const stagePanel = document.getElementById("stagePanel");
const boardPanel = document.getElementById("boardPanel");
const heroSubtitle = document.getElementById("heroSubtitle");

startApp();

async function startApp() {
  try {
    appState.data = await window.noticeboardAPI.getData();
    appState.settings = await window.noticeboardAPI.getSettings();

    bindEvents();
    render();
  } catch (error) {
    document.body.innerHTML = `<pre style="color:#e8dac0;padding:24px;white-space:pre-wrap;">Failed to load generator data.\n\n${escapeHtml(error.stack ?? error.message)}</pre>`;
  }
}

function bindEvents() {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");

    if (button === null) {
      return;
    }

    const action = button.dataset.action;

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
      startGeneration();
      return;
    }

    if (action === "reset") {
      resetGenerator();
      return;
    }

    if (action === "choice") {
      handleChoice(button.dataset.choiceAction, Number.parseInt(button.dataset.index, 10));
    }
  });

  document.addEventListener("keydown", (event) => {
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
      appState.typedNumber = appState.typedNumber.slice(0, -1);
      renderStage();
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

async function reloadData() {
  appState.data = await window.noticeboardAPI.getData();
  resetGenerator();
}

function render() {
  appState.activeChoice = null;
  renderHero();
  renderSettings();
  renderStage();
  renderBoard();
}

function renderHero() {
  if (heroSubtitle === null) {
    return;
  }

  if (appState.data === null) {
    heroSubtitle.innerHTML =
      "A generator designed to provide a growing library of different contracts.";
    return;
  }

  const contractCount = calculateAvailableContractCount();

  if (contractCount <= 0) {
    heroSubtitle.innerHTML =
      "A generator designed to provide a growing library of different contracts.";
    return;
  }

  heroSubtitle.innerHTML =
    `A generator designed to provide over <span class="contract-count">${contractCount.toLocaleString()}</span> different contracts.`;
}

function renderSettings() {
  settingsPanel.innerHTML = `
    <div class="setting-block">
      <span class="setting-label">Generation Mode</span>

      <div class="mode-stack">
        ${renderModeButton(
          "manual",
          "Manual",
          "Choose board, notice types, seeds, and tags."
        )}
        ${renderModeButton(
          "semiAutomatic",
          "Semi-automatic",
          "Choose quality and size. Pick contract seeds; tags roll automatically."
        )}
        ${renderModeButton(
          "automatic",
          "Automatic",
          "Everything rolls immediately."
        )}
      </div>
    </div>

    <div class="setting-block">
      <span class="setting-label">Launch Next Time</span>

      <div class="mode-stack">
        ${renderInterfaceButton(
          "cli",
          "CLI",
          "Open the terminal version when you run npm start."
        )}
        ${renderInterfaceButton(
          "gui",
          "GUI",
          "Open this desktop app when you run npm start."
        )}
      </div>
    </div>

    <div class="setting-block">
      <span class="setting-label">World Flavour</span>

      <button class="toggle-button ${appState.settings.kurovianFlavour ? "enabled" : ""}" data-action="toggle-kurovian">
        <span class="toggle-copy">
          <strong>Kurovian Flavour: ${appState.settings.kurovianFlavour ? "Enabled" : "Disabled"}</strong>
          <span>
            ${
              appState.settings.kurovianFlavour
                ? "Kurovian-only entries may appear in generation."
                : "Kurovian-only entries are hidden."
            }
          </span>
        </span>
        <span class="toggle-orb"></span>
      </button>
    </div>

    <div class="setting-block">
      <button class="primary-button" data-action="start">Generate Noticeboard</button>
      <button class="secondary-button" data-action="reset">Clear Current Board</button>
      <button class="secondary-button" data-action="reload-data">Reload JS Table Data</button>

      <p class="keyboard-help">
        Current launch preference: <span class="kbd">${formatInterfaceMode(appState.settings.interfaceMode)}</span><br><br>
        Use <span class="kbd">npm start</span> to open your saved preference.<br>
        Use <span class="kbd">npm run cli</span> or <span class="kbd">npm run desktop</span> to force one version.
      </p>
    </div>
  `;
}

function renderModeButton(mode, title, description) {
  const active = appState.settings.mode === mode ? "active" : "";

  return `
    <button class="mode-button ${active}" data-action="set-mode" data-mode="${mode}">
      <span class="mode-title">${escapeHtml(title)}</span>
      <span class="mode-desc">${escapeHtml(description)}</span>
    </button>
  `;
}

function renderInterfaceButton(interfaceMode, title, description) {
  const active = appState.settings.interfaceMode === interfaceMode ? "active" : "";

  return `
    <button class="mode-button ${active}" data-action="set-interface" data-interface="${interfaceMode}">
      <span class="mode-title">${escapeHtml(title)}</span>
      <span class="mode-desc">${escapeHtml(description)}</span>
    </button>
  `;
}

function renderStage() {
  appState.activeChoice = null;

  if (appState.stage === "home") {
    stagePanel.innerHTML = `
      <div class="begin-stage">
        <button class="primary-button begin-button" data-action="start">Begin</button>
      </div>
    `;
    return;
  }

  if (appState.stage === "quality") {
    renderChoiceStage({
      title: "Quality",
      copy: "Choose the quality and reputation of the noticeboard.",
      action: "choose-quality",
      items: appState.data.qualityTable.map((quality) => ({
        label: quality.name,
        description: quality.description ?? "",
        value: quality.id,
        colourClass: getQualityClass(quality.name)
      }))
    });
    return;
  }

  if (appState.stage === "size") {
    renderChoiceStage({
      title: "Size",
      copy: "Choose how crowded the board is.",
      action: "choose-size",
      items: appState.data.sizeTable.map((size) => ({
        label: size.name,
        description: size.description ?? "",
        value: size.id,
        colourClass: getSizeClass(size.id)
      }))
    });
    return;
  }

  if (appState.stage === "noticeCount") {
    const [minimum, maximum] = getDiceRange(appState.board.size.contractDice);
    const items = [];

    for (let count = minimum; count <= maximum; count += 1) {
      items.push({
        label: String(count),
        description: `${count} notice${count === 1 ? "" : "s"}`,
        value: count
      });
    }

    renderChoiceStage({
      title: "Notice Count",
      copy: `Choose how many notices are on this ${appState.board.size.name.toLowerCase()} board.`,
      action: "choose-count",
      items
    });
    return;
  }

  if (appState.stage === "noticeKind") {
    renderChoiceStage({
      title: `Notice ${appState.board.currentNoticeNumber}`,
      copy: "Manual mode: choose what this posting is.",
      action: "choose-notice-kind",
      items: [
        {
          label: "World-building Note",
          description: "A rumour, warning, lore fragment, announcement, or city detail.",
          value: "note",
          colourClass: "note"
        },
        {
          label: "Contract",
          description: "A job, request, commission, or adventure hook.",
          value: "contract"
        }
      ]
    });
    return;
  }

  if (appState.stage === "contractType") {
    renderChoiceStage({
      title: `Notice ${appState.board.currentNoticeNumber} Contract Type`,
      copy: "Choose the type of contract.",
      action: "choose-contract-type",
      items: [
        {
          label: "Illegal",
          description: "Criminal, forbidden, or openly unlawful work.",
          value: "Illegal",
          colourClass: "illegal"
        },
        {
          label: "Illegitimate",
          description: "Dubious, unofficial, exploitative, or morally suspect work.",
          value: "Illegitimate",
          colourClass: "illegitimate"
        },
        {
          label: "Legitimate",
          description: "Lawful or socially accepted work.",
          value: "Legitimate",
          colourClass: "legitimate"
        }
      ]
    });
    return;
  }

  if (appState.stage === "legitimateSeed") {
    renderChoiceStage({
      title: "Legitimate Contract Seed",
      copy: appState.settings.mode === "semiAutomatic"
        ? "Semi-automatic mode: choose the seed. Tags will be rolled automatically."
        : "Manual mode: choose the seed, then choose each tag.",
      action: "choose-legit-seed",
      items: appState.data.legitimateSeeds.map((seed) => ({
        label: seed.name,
        description: seed.formulaText,
        value: seed.id
      }))
    });
    return;
  }

  if (appState.stage === "legitimateTag") {
    const pending = appState.board.pendingLegitimate;
    const tagKey = pending.seed.tagKeys[pending.tagIndex];
    const availableEntries = getAvailableTagEntries(tagKey);

    renderChoiceStage({
      title: getTagLabel(tagKey),
      copy: appState.settings.kurovianFlavour
        ? "Kurovian Flavour is enabled. Kurovian-only options are available."
        : "Kurovian-only options are hidden.",
      action: "choose-legit-tag",
      items: availableEntries.map((entry, index) => ({
        label: getTagMenuText(tagKey, entry, index),
        description: getTagDescription(tagKey, entry),
        value: index,
        kurovian: entry.kurovian === true,
        colourClass: entry.kurovian === true ? "kurovian" : undefined
      }))
    });
    return;
  }

  if (appState.stage === "legitimateAdditionalWeirdPayment") {
    const availableEntries = getAvailableTagEntries("weirdPayment");

    renderChoiceStage({
      title: "Additional Weird Payment",
      copy: "This contract includes normal GP and an additional weird payment.",
      action: "choose-additional-weird-payment",
      items: availableEntries.map((entry, index) => ({
        label: getTagMenuText("weirdPayment", entry, index),
        description: getTagDescription("weirdPayment", entry),
        value: index,
        kurovian: entry.kurovian === true,
        colourClass: "kurovian"
      }))
    });
    return;
  }

  if (appState.stage === "illegitimateSeed") {
    renderChoiceStage({
      title: "Illegitimate Contract Seed",
      copy: appState.settings.mode === "semiAutomatic"
        ? "Semi-automatic mode: choose the seed. Tags will be rolled automatically."
        : "Manual mode: choose the seed, then choose the base and tags.",
      action: "choose-illegit-seed",
      items: appState.data.illegitimateSeeds.map((seed) => ({
        label: seed.name,
        description: seed.formulaText,
        value: seed.id,
        colourClass: "illegitimate"
      }))
    });
    return;
  }

  if (appState.stage === "illegitimateBase") {
    const pending = appState.board.pendingIllegitimate;

    renderChoiceStage({
      title: "Illegitimate Contract Base",
      copy: "Choose which existing contract table this illegitimate contract pretends to be.",
      action: "choose-illegit-base",
      items: pending.seed.contractTagOptions.map((tagKey) => ({
        label: getTagLabel(tagKey),
        description: "This decides which existing contract table is used.",
        value: tagKey,
        colourClass: "illegitimate"
      }))
    });
    return;
  }

  if (appState.stage === "illegitimateTag") {
    const pending = appState.board.pendingIllegitimate;
    const tagKey = pending.tagKeys[pending.tagIndex];
    const availableEntries = getAvailableTagEntries(tagKey);

    renderChoiceStage({
      title: getTagLabel(tagKey),
      copy: appState.settings.kurovianFlavour
        ? "Kurovian Flavour is enabled. Kurovian-only options are available."
        : "Kurovian-only options are hidden.",
      action: "choose-illegit-tag",
      items: availableEntries.map((entry, index) => ({
        label: getTagMenuText(tagKey, entry, index),
        description: getTagDescription(tagKey, entry),
        value: index,
        kurovian: entry.kurovian === true,
        colourClass: entry.kurovian === true ? "kurovian" : "illegitimate"
      }))
    });
    return;
  }

  if (appState.stage === "illegitimateAdditionalWeirdPayment") {
    const availableEntries = getAvailableTagEntries("weirdPayment");

    renderChoiceStage({
      title: "Additional Weird Payment",
      copy: "This contract includes normal GP and an additional weird payment.",
      action: "choose-illegit-additional-weird-payment",
      items: availableEntries.map((entry, index) => ({
        label: getTagMenuText("weirdPayment", entry, index),
        description: getTagDescription("weirdPayment", entry),
        value: index,
        kurovian: entry.kurovian === true,
        colourClass: "kurovian"
      }))
    });
    return;
  }

  if (appState.stage === "result") {
    stagePanel.innerHTML = `
      <div class="stage-intro">
        <h2 class="stage-title">The board is complete.</h2>
        <p class="stage-copy">Review the generated notices on the right, or generate another board.</p>
        <div class="divider"></div>
        <button class="primary-button" data-action="start">Generate Another Board</button>
      </div>
    `;
  }
}

function renderChoiceStage(config) {
  appState.activeChoice = {
    action: config.action,
    items: config.items
  };

  appState.selectedChoiceIndex = clamp(
    appState.selectedChoiceIndex,
    0,
    config.items.length - 1
  );

  stagePanel.innerHTML = `
    <div class="stage-intro">
      <h2 class="stage-title">${escapeHtml(config.title)}</h2>
      <p class="stage-copy">${escapeHtml(config.copy)}</p>
    </div>

    <div class="choice-grid">
      ${config.items.map((item, index) => renderChoiceCard(item, index, config.action)).join("")}
    </div>

    <div class="choice-hint">
      ${getChoiceInstruction(config.items.length)}
      ${appState.typedNumber !== "" ? `<br><strong>Typed:</strong> ${escapeHtml(appState.typedNumber)}` : ""}
    </div>
  `;
}

function renderChoiceCard(item, index, action) {
  const selected = index === appState.selectedChoiceIndex ? "selected" : "";
  const flavourClass = item.colourClass ?? "";
  const kurovianTag = item.kurovian ? `<span class="tag kurovian">Kurovian</span>` : "";

  return `
    <button class="choice-card ${selected} ${flavourClass}" data-action="choice" data-choice-action="${action}" data-index="${index}">
      <span class="choice-number">${index + 1}.</span>
      <span class="choice-title">${escapeHtml(item.label)}</span>
      ${item.description ? `<span class="choice-desc">${escapeHtml(item.description)}</span>` : ""}
      ${kurovianTag}
    </button>
  `;
}

function renderBoard() {
  if (appState.board.quality === null) {
    boardPanel.innerHTML = `<p class="empty-results">No board has been generated yet.</p>`;
    return;
  }

  boardPanel.innerHTML = `
    <div class="summary-grid">
      <div class="summary-row"><span>Mode</span><strong>${formatMode(appState.settings.mode)}</strong></div>
      <div class="summary-row"><span>Kurovian Flavour</span><strong>${appState.settings.kurovianFlavour ? "Enabled" : "Disabled"}</strong></div>
      <div class="summary-row"><span>Quality</span><strong>${escapeHtml(appState.board.quality.name)}</strong></div>
      <div class="summary-row"><span>Size</span><strong>${escapeHtml(appState.board.size.name)}</strong></div>
      <div class="summary-row"><span>Notice Count</span><strong>${appState.board.noticeCount ?? "—"}</strong></div>
    </div>

    <div class="divider"></div>

    <div class="result-list">
      ${renderNoticeCards()}
    </div>
  `;
}

function renderNoticeCards() {
  if (appState.board.noticeCount === null) {
    return `<div class="notice-card empty">The board has not been filled yet.</div>`;
  }

  const cards = [];

  for (let number = 1; number <= appState.board.noticeCount; number += 1) {
    const notice = appState.board.notices[number - 1];

    if (notice === undefined) {
      cards.push(`<div class="notice-card empty">Notice ${number} has not been chosen yet.</div>`);
    } else {
      cards.push(renderNoticeCard(notice));
    }
  }

  return cards.join("");
}

function renderNoticeCard(notice) {
  return `
    <div class="notice-card">
      <div class="notice-heading">
        <span class="notice-number">${notice.number}.</span>
        <span class="notice-type ${getNoticeTypeClass(notice.outcome)}">${escapeHtml(formatNoticeOutcome(notice.outcome))}</span>
      </div>

      ${notice.legitimateContract ? renderGeneratedContract(notice.legitimateContract) : ""}
      ${notice.illegitimateContract ? renderGeneratedContract(notice.illegitimateContract) : ""}
    </div>
  `;
}

function renderGeneratedContract(contract) {
  return `
    <p class="notice-text">${escapeHtml(contract.sentence)}</p>
    <div class="reward">Reward: ${escapeHtml(contract.rewardText)}</div>
    <div class="small-detail">Seed: ${escapeHtml(contract.seedName)}${contract.kurovianFlavour ? " • Kurovian Flavour enabled" : ""}</div>
  `;
}

function startGeneration() {
  appState.board = newBoard();
  appState.selectedChoiceIndex = 0;
  appState.typedNumber = "";

  if (appState.settings.mode === "automatic") {
    generateAutomaticBoard();
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

function handleChoice(action, index) {
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

  if (action === "choose-notice-kind") {
    chooseNoticeKind(item.value);
    return;
  }

  if (action === "choose-contract-type") {
    chooseContractType(item.value);
    return;
  }

  if (action === "choose-legit-seed") {
    chooseLegitimateSeedById(item.value);
    return;
  }

  if (action === "choose-legit-tag") {
    chooseLegitimateTag(item.value);
    return;
  }

  if (action === "choose-additional-weird-payment") {
    chooseAdditionalWeirdPayment(item.value);
    return;
  }

  if (action === "choose-illegit-seed") {
    chooseIllegitimateSeedById(item.value);
    return;
  }

  if (action === "choose-illegit-base") {
    chooseIllegitimateBase(item.value);
    return;
  }

  if (action === "choose-illegit-tag") {
    chooseIllegitimateTag(item.value);
    return;
  }

  if (action === "choose-illegit-additional-weird-payment") {
    chooseIllegitimateAdditionalWeirdPayment(item.value);
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
  appState.stage = "noticeKind";
  render();
}

function chooseNoticeKind(kind) {
  if (kind === "note") {
    appState.board.notices.push({
      number: appState.board.currentNoticeNumber,
      outcome: "World-building Note"
    });
    advanceManualNotice();
    return;
  }

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

function chooseLegitimateSeedById(seedId) {
  const seed = appState.data.legitimateSeeds.find((entry) => entry.id === seedId);

  if (seed === undefined) {
    return;
  }

  if (appState.settings.mode === "semiAutomatic") {
    const tags = chooseLegitimateTagsAutomaticallyForSeed(seed);

    appState.board.notices.push({
      ...appState.board.pendingNotice,
      legitimateContract: buildLegitimateContract(seed, tags)
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

function chooseLegitimateTag(availableEntryIndex) {
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

  finalizePendingLegitimateContract();
}

function chooseAdditionalWeirdPayment(availableEntryIndex) {
  const pending = appState.board.pendingLegitimate;
  const availableEntries = getAvailableTagEntries("weirdPayment");

  pending.tags.weirdPayment = availableEntries[availableEntryIndex];

  finalizePendingLegitimateContract();
}

function finalizePendingLegitimateContract() {
  const pending = appState.board.pendingLegitimate;

  appState.board.notices.push({
    ...appState.board.pendingNotice,
    legitimateContract: buildLegitimateContract(pending.seed, pending.tags)
  });

  appState.board.pendingNotice = null;
  appState.board.pendingLegitimate = null;

  advanceManualNotice();
}

function chooseIllegitimateSeedById(seedId) {
  const seed = appState.data.illegitimateSeeds.find((entry) => entry.id === seedId);

  if (seed === undefined) {
    return;
  }

  if (appState.settings.mode === "semiAutomatic") {
    const result = chooseIllegitimateTagsAutomaticallyForSeed(seed);

    appState.board.notices.push({
      ...appState.board.pendingNotice,
      illegitimateContract: buildIllegitimateContract(seed, result.contractTagKey, result.tags)
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

function chooseIllegitimateTag(availableEntryIndex) {
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

  finalizePendingIllegitimateContract();
}

function chooseIllegitimateAdditionalWeirdPayment(availableEntryIndex) {
  const pending = appState.board.pendingIllegitimate;
  const availableEntries = getAvailableTagEntries("weirdPayment");

  pending.tags.weirdPayment = availableEntries[availableEntryIndex];

  finalizePendingIllegitimateContract();
}

function finalizePendingIllegitimateContract() {
  const pending = appState.board.pendingIllegitimate;

  appState.board.notices.push({
    ...appState.board.pendingNotice,
    illegitimateContract: buildIllegitimateContract(
      pending.seed,
      pending.contractTagKey,
      pending.tags
    )
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
    : "noticeKind";

  render();
}

function runSemiAutomaticUntilChoiceNeeded() {
  while (appState.board.currentNoticeNumber <= appState.board.noticeCount) {
    const number = appState.board.currentNoticeNumber;

    if (rollDie(100) <= appState.board.size.noteChancePercent) {
      appState.board.notices.push({ number, outcome: "World-building Note" });
      appState.board.currentNoticeNumber += 1;
      continue;
    }

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

function generateAutomaticBoard() {
  appState.board.quality = getMasterTableResult(appState.data.qualityTable, rollDie(10));
  appState.board.size = getMasterTableResult(appState.data.sizeTable, rollDie(10));
  appState.board.noticeCount = rollDice(appState.board.size.contractDice).total;

  for (let number = 1; number <= appState.board.noticeCount; number += 1) {
    appState.board.notices.push(generateAutomaticNotice(number));
  }
}

function generateAutomaticNotice(number) {
  if (rollDie(100) <= appState.board.size.noteChancePercent) {
    return { number, outcome: "World-building Note" };
  }

  const contractType = rollOnPercentTable(appState.board.quality.contractTypeTable, rollDie(100));

  if (contractType === "Legitimate") {
    const seed = rollLegitimateSeed();
    const tags = chooseLegitimateTagsAutomaticallyForSeed(seed);

    return {
      number,
      outcome: "Legitimate",
      legitimateContract: buildLegitimateContract(seed, tags)
    };
  }

  if (contractType === "Illegitimate") {
    const seed = rollIllegitimateSeed();
    const result = chooseIllegitimateTagsAutomaticallyForSeed(seed);

    return {
      number,
      outcome: "Illegitimate",
      illegitimateContract: buildIllegitimateContract(seed, result.contractTagKey, result.tags)
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

function buildLegitimateContract(seed, tags) {
  const reward = calculateRewardFromContractTag(
    seed,
    tags,
    seed.tagKeys.find((tagKey) => tagKey.toLowerCase().includes("contract"))
  );

  return {
    seedName: seed.name,
    kurovianFlavour: appState.settings.kurovianFlavour,
    sentence: buildLegitimateSentence(seed, tags),
    rewardText: reward.rewardText,
    rewardDetails: reward.details,
    tags
  };
}

function buildIllegitimateContract(seed, contractTagKey, tags) {
  const reward = calculateRewardFromContractTag(seed, tags, contractTagKey);

  return {
    seedName: seed.name,
    kurovianFlavour: appState.settings.kurovianFlavour,
    contractTagKey,
    sentence: buildIllegitimateSentence(seed, contractTagKey, tags),
    rewardText: reward.rewardText,
    rewardDetails: reward.details,
    tags
  };
}

function buildLegitimateSentence(seed, tags) {
  if (seed.name === "Legitimate Simple") {
    return `${asSubject(tags.employer, "employer")} is asking for people to ${asAction(tags.contract, "contract")}.`;
  }

  if (seed.name === "Legitimate Complicated") {
    return `${asSubject(tags.employer, "employer")} is asking for people to ${asAction(tags.contract, "contract")}, but ${asAction(tags.externalComplication, "external complication")}.`;
  }

  if (seed.name === "Legitimate Dangerous") {
    return `${asSubject(tags.employer, "employer")} is asking for people to ${asAction(tags.dangerousContract, "dangerous contract")}.`;
  }

  if (seed.name === "Legitimate Weird") {
    return `${asSubject(tags.employer, "employer")} is asking for people to ${asAction(tags.weirdContract, "weird contract")}.`;
  }

  if (seed.name === "Legitimate Social") {
    return `${asSubject(tags.employer, "employer")} is asking for help to ${asAction(tags.socialContract, "social contract")}.`;
  }

  if (seed.name === "Legitimate Investigation") {
    return `${asSubject(tags.employer, "employer")} is asking for people to ${asAction(tags.investigationContract, "investigation contract")}.`;
  }

  if (seed.name === "Legitimate Weird Payment") {
    return `A notice asks for people to ${asAction(tags.dangerousContract, "dangerous contract")}.`;
  }

  return "A legitimate contract has been posted.";
}

function buildIllegitimateSentence(seed, contractTagKey, tags) {
  const subject = tags.employer === undefined
    ? "A notice"
    : asSubject(tags.employer, "employer");

  const contractText = asAction(tags[contractTagKey], getTagLabel(contractTagKey));

  if (seed.name === "Illegitimate False Premise") {
    return `${subject} asks for people to ${contractText}, but the real purpose is ${asAction(tags.realPurpose, "real purpose")}.`;
  }

  if (seed.name === "Illegitimate Betrayal") {
    return `${subject} asks for people to ${contractText}, but ${asAction(tags.betrayal, "betrayal")}.`;
  }

  return `${subject} posts an illegitimate contract.`;
}

function calculateRewardFromContractTag(seed, tags, contractTagKey) {
  if (seed.rewardOverrideTag !== undefined) {
    return {
      rewardText: getWeirdPaymentText(tags[seed.rewardOverrideTag]),
      details: { overriddenBy: seed.rewardOverrideTag }
    };
  }

  if (contractTagKey === undefined) {
    return {
      rewardText: "[reward value not filled]",
      details: { reason: "No contract tag found in seed." }
    };
  }

  const baseRewardGp = Number(tags[contractTagKey]?.baseRewardGp);

  if (!Number.isFinite(baseRewardGp) || baseRewardGp <= 0) {
    return {
      rewardText: "[reward value not filled]",
      details: { reason: `${contractTagKey} has no baseRewardGp value.` }
    };
  }

  const totalTagModifierPercent = Object.entries(tags)
    .filter(([tagKey]) => tagKey !== contractTagKey && tagKey !== "weirdPayment")
    .reduce((sum, [_tagKey, entry]) => {
      return sum + getRewardModifier(entry);
    }, 0);

  const driftPercent = getRandomRewardDriftPercent();
  const tagModifierGp = calculateVisibleGpModifier(baseRewardGp, totalTagModifierPercent);
  const afterTagModifiersGp = baseRewardGp + tagModifierGp;
  const driftModifierGp = calculateVisibleGpModifier(afterTagModifiersGp, driftPercent);
  const finalRewardGp = Math.max(1, Math.floor(afterTagModifiersGp + driftModifierGp));

  const baseRewardText = `${finalRewardGp} GP`;

  if (tags.weirdPayment !== undefined) {
    return {
      rewardText: `${baseRewardText} + ${getWeirdPaymentText(tags.weirdPayment)}`,
      details: {
        baseRewardGp,
        totalTagModifierPercent,
        tagModifierGp,
        afterTagModifiersGp,
        driftPercent,
        driftModifierGp,
        finalRewardGp,
        additionalWeirdPayment: true,
        weirdPayment: tags.weirdPayment
      }
    };
  }

  return {
    rewardText: baseRewardText,
    details: {
      baseRewardGp,
      totalTagModifierPercent,
      tagModifierGp,
      afterTagModifiersGp,
      driftPercent,
      driftModifierGp,
      finalRewardGp
    }
  };
}

function calculateVisibleGpModifier(baseRewardGp, modifierPercent) {
  if (!Number.isFinite(modifierPercent) || modifierPercent === 0) {
    return 0;
  }

  const exactChange = baseRewardGp * (modifierPercent / 100);
  const visibleChange = Math.max(1, Math.floor(Math.abs(exactChange)));

  return modifierPercent > 0 ? visibleChange : -visibleChange;
}

function getRandomRewardDriftPercent() {
  const range = Number(appState.data.rewardDriftRangePercent);

  if (!Number.isFinite(range) || range <= 0) {
    return 0;
  }

  return rollDie(range * 2 + 1) - (range + 1);
}

function getRewardModifier(entry) {
  const modifier = Number(entry.rewardModifierPercent);
  return Number.isFinite(modifier) ? modifier : 0;
}

function getWeirdPaymentText(entry) {
  const rewardText = getCleanText(entry.rewardText);
  const text = getCleanText(entry.text);

  if (rewardText !== "") {
    return rewardText;
  }

  if (text !== "") {
    return text;
  }

  return "[weird payment not filled]";
}

function getAvailableTagEntries(tagKey) {
  const table = getTagTable(tagKey);

  return table.filter((entry) => {
    if (entry.kurovian === true) {
      return appState.settings.kurovianFlavour;
    }

    return true;
  });
}

function getTagTable(tagKey) {
  return (
    appState.data.tagTables[tagKey] ??
    appState.data.illegitimateTagTables[tagKey] ??
    []
  );
}

function getTagLabel(tagKey) {
  return (
    appState.data.tagLabels[tagKey] ??
    appState.data.illegitimateTagLabels[tagKey] ??
    tagKey
  );
}

function getTagMenuText(tagKey, entry, index) {
  const text = getCleanText(entry.text);
  const rewardText = getCleanText(entry.rewardText);

  if (text !== "") {
    return text;
  }

  if (rewardText !== "") {
    return rewardText;
  }

  return `[empty ${getTagLabel(tagKey)} option ${index + 1}]`;
}

function getTagDescription(tagKey, entry) {
  const parts = [];

  if (entry.weight !== undefined) {
    parts.push(`Weight ${getEntryWeight(entry)}`);
  }

  if (entry.rewardModifierPercent !== undefined) {
    parts.push(`Reward modifier ${entry.rewardModifierPercent}%`);
  }

  if (entry.baseRewardGp !== undefined) {
    parts.push(`Base reward ${entry.baseRewardGp} GP`);
  }

  if (entry.additionalWeirdPayment === true) {
    parts.push("Adds weird payment");
  }

  if (entry.forcedTags !== undefined) {
    parts.push(getForcedTagsText(entry.forcedTags));
  }

  if (entry.kurovian === true) {
    parts.push("Kurovian-only");
  }

  return parts.join(" • ");
}

function isFilledEntry(entry) {
  return getCleanText(entry.text) !== "" ||
    getCleanText(entry.rewardText) !== "" ||
    Number(entry.baseRewardGp) > 0;
}

function chooseWeightedEntry(entries) {
  const totalWeight = entries.reduce((sum, entry) => sum + getEntryWeight(entry), 0);

  if (totalWeight <= 0) {
    return entries[rollDie(entries.length) - 1];
  }

  let roll = rollDie(totalWeight);

  for (const entry of entries) {
    roll -= getEntryWeight(entry);

    if (roll <= 0) {
      return entry;
    }
  }

  return entries[entries.length - 1];
}

function getEntryWeight(entry) {
  const weight = Number(entry.weight);
  return Number.isFinite(weight) && weight > 0 ? Math.floor(weight) : 1;
}

function shouldAddAdditionalWeirdPayment(seed, tags) {
  if (seed.rewardOverrideTag !== undefined) {
    return false;
  }

  if (tags.weirdPayment !== undefined) {
    return false;
  }

  return Object.values(tags).some((entry) => {
    return entry.additionalWeirdPayment === true;
  });
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

function normaliseTagText(value) {
  return String(value).trim().toLowerCase();
}

function getForcedTagsText(forcedTags) {
  return Object.entries(forcedTags)
    .map(([tagKey, forcedText]) => {
      return `forces ${getTagLabel(tagKey)}: ${forcedText}`;
    })
    .join("; ");
}

function calculateAvailableContractCount() {
  const legitimateCount = appState.data.legitimateSeeds.reduce((total, seed) => {
    let combinations = 1;

    for (const tagKey of seed.tagKeys) {
      const filledEntryCount = getFilledTagEntryCount(tagKey);

      if (filledEntryCount <= 0) {
        return total;
      }

      combinations *= filledEntryCount;
    }

    return total + combinations;
  }, 0);

  const illegitimateCount = appState.data.illegitimateSeeds.reduce((total, seed) => {
    const baseCount = seed.contractTagOptions.reduce((sum, tagKey) => {
      return sum + getFilledTagEntryCount(tagKey);
    }, 0);

    const extraCount = getFilledTagEntryCount(seed.extraTagKey);

    if (baseCount <= 0 || extraCount <= 0) {
      return total;
    }

    return total + baseCount * extraCount;
  }, 0);

  return legitimateCount + illegitimateCount;
}

function getFilledTagEntryCount(tagKey) {
  return getAvailableTagEntries(tagKey).filter((entry) => isFilledEntry(entry)).length;
}

function asSubject(entry, fallbackName) {
  return sentenceCase(getTagText(entry, fallbackName));
}

function asAction(entry, fallbackName) {
  return getTagText(entry, fallbackName);
}

function getTagText(entry, fallbackName) {
  const text = getCleanText(entry.text);
  return text !== "" ? text : `[${fallbackName} not filled]`;
}

function getCleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sentenceCase(text) {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(formula) {
  const rolls = [];

  for (let i = 0; i < formula.numberOfDice; i += 1) {
    rolls.push(rollDie(formula.sides));
  }

  return {
    rolls,
    total: rolls.reduce((sum, roll) => sum + roll, 0) + formula.modifier
  };
}

function getDiceRange(formula) {
  return [
    formula.numberOfDice + formula.modifier,
    formula.numberOfDice * formula.sides + formula.modifier
  ];
}

function getMasterTableResult(table, d10Roll) {
  return table.find((entry) => {
    const minimum = entry.id * 2 - 1;
    const maximum = entry.id * 2;

    return d10Roll >= minimum && d10Roll <= maximum;
  }) ?? table[0];
}

function rollOnPercentTable(table, roll) {
  let minimum = 1;

  for (const row of table) {
    const maximum = minimum + row.percent - 1;

    if (roll >= minimum && roll <= maximum) {
      return row.result;
    }

    minimum = maximum + 1;
  }

  return table[table.length - 1].result;
}

function newBoard() {
  return {
    quality: null,
    size: null,
    noticeCount: null,
    currentNoticeNumber: 1,
    notices: [],
    pendingNotice: null,
    pendingLegitimate: null,
    pendingIllegitimate: null
  };
}

async function saveSettings() {
  appState.settings = await window.noticeboardAPI.saveSettings(appState.settings);
}

function getChoiceInstruction(count) {
  if (count <= 9) {
    return `Use <strong>↑ / ↓</strong> and <strong>Enter</strong>, click a card, or press a number key.`;
  }

  return `Use <strong>↑ / ↓</strong> and <strong>Enter</strong>, click a card, or type a full number then press <strong>Enter</strong>.`;
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

function formatInterfaceMode(interfaceMode) {
  if (interfaceMode === "gui") {
    return "GUI";
  }

  return "CLI";
}

function formatNoticeOutcome(outcome) {
  return outcome === "World-building Note" ? "World-building Note" : `${outcome} Contract`;
}

function getNoticeTypeClass(outcome) {
  if (outcome === "Illegal") {
    return "illegal";
  }

  if (outcome === "Illegitimate") {
    return "illegitimate";
  }

  if (outcome === "Legitimate") {
    return "legitimate";
  }

  if (outcome === "World-building Note") {
    return "note";
  }

  return "";
}

function getQualityClass(name) {
  if (name === "Underground") {
    return "illegal";
  }

  if (name === "Decrepit") {
    return "illegitimate";
  }

  if (name === "Good") {
    return "legitimate";
  }

  if (name === "Pristine") {
    return "note";
  }

  return "";
}

function getSizeClass(id) {
  if (id === 5) {
    return "note";
  }

  if (id === 4) {
    return "illegitimate";
  }

  return "";
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}