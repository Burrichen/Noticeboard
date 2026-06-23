import { appState } from "./state.js";

const settingsPanel = document.getElementById("settingsPanel");
const stagePanel = document.getElementById("stagePanel");
const boardPanel = document.getElementById("boardPanel");
const heroSubtitle = document.getElementById("heroSubtitle");

export function render() {
  appState.activeChoice = null;
  renderHero();
  renderSettings();
  renderStage();
  renderBoard();
}

export function renderStage() {
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

// -----------------------------------------------------------------------------
// Data access helpers (exported for use in handlers.js)
// -----------------------------------------------------------------------------

export function getAvailableTagEntries(tagKey) {
  const table = getTagTable(tagKey);

  return table.filter((entry) => {
    if (entry.kurovian === true) {
      return appState.settings.kurovianFlavour;
    }
    return true;
  });
}

export function getTagLabel(tagKey) {
  return (
    appState.data.tagLabels[tagKey] ??
    appState.data.illegitimateTagLabels[tagKey] ??
    tagKey
  );
}

function getTagTable(tagKey) {
  return (
    appState.data.tagTables[tagKey] ??
    appState.data.illegitimateTagTables[tagKey] ??
    []
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

// -----------------------------------------------------------------------------
// Utility functions (exported for use in handlers.js)
// -----------------------------------------------------------------------------

export function getCleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isFilledEntry(entry) {
  return getCleanText(entry.text) !== "" ||
    getCleanText(entry.rewardText) !== "" ||
    Number(entry.baseRewardGp) > 0;
}

export function getEntryWeight(entry) {
  const weight = Number(entry.weight);
  return Number.isFinite(weight) && weight > 0 ? Math.floor(weight) : 1;
}

export function chooseWeightedEntry(entries) {
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

export function normaliseTagText(value) {
  return String(value).trim().toLowerCase();
}

export function shouldAddAdditionalWeirdPayment(seed, tags) {
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

export function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDice(formula) {
  const rolls = [];

  for (let i = 0; i < formula.numberOfDice; i += 1) {
    rolls.push(rollDie(formula.sides));
  }

  return {
    rolls,
    total: rolls.reduce((sum, roll) => sum + roll, 0) + formula.modifier
  };
}

export function getMasterTableResult(table, d10Roll) {
  return table.find((entry) => {
    const minimum = entry.id * 2 - 1;
    const maximum = entry.id * 2;
    return d10Roll >= minimum && d10Roll <= maximum;
  }) ?? table[0];
}

export function rollOnPercentTable(table, roll) {
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

export function getDiceRange(formula) {
  return [
    formula.numberOfDice + formula.modifier,
    formula.numberOfDice * formula.sides + formula.modifier
  ];
}

export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// -----------------------------------------------------------------------------
// Formatting helpers
// -----------------------------------------------------------------------------

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

function getChoiceInstruction(count) {
  if (count <= 9) {
    return `Use <strong>↑ / ↓</strong> and <strong>Enter</strong>, click a card, or press a number key.`;
  }

  return `Use <strong>↑ / ↓</strong> and <strong>Enter</strong>, click a card, or type a full number then press <strong>Enter</strong>.`;
}
