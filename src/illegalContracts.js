const { chooseFromList } = require("./input");
const { rollDie } = require("./dice");
const style = require("./style");
const {
  isKurovianEntry,
  chooseWeightedEntry,
  isFilledEntry,
  getCleanText,
  normaliseTagText,
  asSubject,
  asAction,
  resolveContractText,
  getWeirdPaymentText,
  getRewardModifier,
  shouldAddAdditionalWeirdPayment,
  getForcedTagsText
} = require("./tagUtils");

const {
  TAG_TABLES: LEGITIMATE_TAG_TABLES,
  TAG_LABELS: LEGITIMATE_TAG_LABELS
} = require("./legitimateContracts");

// Illegal contracts reuse contract and dangerousContract from legitimate contracts.
// The new tags in this file are:
//   criminalContract
//   criminalEmployer
//   shadyCondition

// These are rough placeholder values and must total 100.
const ILLEGAL_SEEDS = [
  {
    id: 1,
    name: "Illegal - Shady",
    percent: 25,
    formulaText: "contract OR dangerousContract + shadyCondition + criminalEmployer",
    contractTagOptions: ["contract", "dangerousContract"],
    extraTagKeys: ["shadyCondition", "criminalEmployer"]
  },
  {
    id: 2,
    name: "Illegal - Simple Criminal",
    percent: 40,
    formulaText: "criminalContract + criminalEmployer",
    tagKeys: ["criminalContract", "criminalEmployer"]
  },
  {
    id: 3,
    name: "Illegal - Complicated Criminal",
    percent: 35,
    formulaText: "criminalContract + shadyCondition + criminalEmployer",
    tagKeys: ["criminalContract", "shadyCondition", "criminalEmployer"]
  }
];

// -----------------------------------------------------------------------------
// NEW ILLEGAL TAG TABLES
// -----------------------------------------------------------------------------
//
// Do not fill these here unless you want to.
// These are intentionally blank for you to populate later.
//
// criminalContract uses:
//   text: "your contract text here"
//   baseRewardGp: 300
//   weight: 10
//
// criminalEmployer uses:
//   text: "your employer text here"
//   rewardModifierPercent: 10
//   weight: 10
//
// shadyCondition uses:
//   text: "your condition text here"
//   rewardModifierPercent: 10
//   weight: 10
//
// Higher weight means more common.
// Weight does not need to add to 100.
// Example:
//   weight: 30  very common
//   weight: 10  normal
//   weight: 3   uncommon
//   weight: 1   rare
//
// Any entry can use:
//   kurovian: true
// to make it only appear when Kurovian Flavour is enabled.
//
// Any entry can use:
//   additionalWeirdPayment: true
// to also roll a weird payment alongside the normal GP reward.
//
// Automatic rolling will prefer filled entries. If some entries are still blank,
// they will be ignored unless the whole table is blank.

const criminalContract = [
  // Roll d20. Total weight = 20. (4 common @ 3, 3 medium @ 2, 2 rare @ 1)
  { text: "steal an item from {theftLocation}", baseRewardGp: 100, weight: 3, subTableKey: "theftLocation" },
  { text: "spy on a person or meeting", baseRewardGp: 125, weight: 3 },
  { text: "plant an item or false message", baseRewardGp: 75, weight: 3 },
  { text: "'Convince' an offical", baseRewardGp: 150, weight: 3 },
  { text: "smuggle {contraband}", baseRewardGp: 200, weight: 2, subTableKey: "contraband" },
  { text: "destroy, alter or steal official records", baseRewardGp: 75, weight: 2 },
  { text: "sabotage a rival's business", baseRewardGp: 400, weight: 2 },
  { text: "arrange an assassination, disappearance or fatal accident", baseRewardGp: 500, weight: 1 },
  { text: "commit a crime during a public ceremony", baseRewardGp: 350, weight: 1 }
];

const criminalEmployer = [
  // Roll d100. Total weight = 100.
  { text: "fixer", rewardModifierPercent: 5, weight: 11 },
  { text: "anonymous individual", rewardModifierPercent: 0, weight: 11 },
  { text: "desperate local", rewardModifierPercent: -10, weight: 9 },
  { text: "indebeted worker", rewardModifierPercent: -10, weight: 9 },
  { text: "wronged individual", rewardModifierPercent: 15, weight: 9 },
  { text: "corrupt guard", rewardModifierPercent: 10, weight: 9 },
  { text: "fence", rewardModifierPercent: 20, weight: 8 },
  { text: "gang representative", rewardModifierPercent: 0, weight: 7 },
  { text: "corrupt city official", rewardModifierPercent: 20, weight: 6 },
  { text: "nobels ancient", rewardModifierPercent: 5, weight: 6 },
  { text: "vigilante", rewardModifierPercent: -5, weight: 5 },
  { text: "crime boss", rewardModifierPercent: 10, weight: 4 },
  { text: "noble", rewardModifierPercent: 15, weight: 4 },
  { text: "cult member", rewardModifierPercent: 0, weight: 2 }
];

const shadyCondition = [
  // Roll d20. Total weight = 20.
  { text: "complete the job in X days", rewardModifierPercent: 30, weight: 6 },
  { text: "in the cover of night", rewardModifierPercent: 25, weight: 5 },
  { text: "make it look like an accident", rewardModifierPercent: 75, weight: 4 },
  { text: "ensure there are no witnesses", rewardModifierPercent: 75, weight: 3 },
  { text: "you must wear a disguse", rewardModifierPercent: 30, weight: 1 },
  { text: "do not say a word on the job", rewardModifierPercent: 50, weight: 1 },
];

const contraband = [
  // Roll d6. Total weight = 6.
  { text: "drugs", weight: 2 },
  { text: "weapons", weight: 2 },
  { text: "a fugitive", weight: 1 },
  { text: "cursed items", weight: 1 }
];

const theftLocation = [
  // Roll d6. Total weight = 6.
  { text: "a house", weight: 2 },
  { text: "a shop", weight: 2 },
  { text: "a guildhall", weight: 1 },
  { text: "an estate", weight: 1 }
];

const ILLEGAL_TAG_TABLES = {
  criminalContract,
  criminalEmployer,
  shadyCondition
};

const ILLEGAL_TAG_LABELS = {
  criminalContract: "Criminal Contract",
  criminalEmployer: "Criminal Employer",
  shadyCondition: "Shady Condition"
};

// Sub-tables are rolled automatically when a parent entry has a matching subTableKey.
// They are not validated like tag tables and do not affect reward calculation.
const SUB_TABLES = {
  contraband,
  theftLocation
};

const SUB_TABLE_LABELS = {
  contraband: "Contraband",
  theftLocation: "Theft Location"
};

async function generateIllegalContract(mode, options = {}) {
  validateIllegalTables();

  const kurovianFlavour = options.kurovianFlavour === true;

  const seed =
    mode === "automatic"
      ? rollIllegalSeed()
      : await chooseIllegalSeed();

  const selectedTags = {};
  let contractTagKey;

  if (seed.contractTagOptions !== undefined) {
    contractTagKey =
      mode === "manual"
        ? await chooseContractTagKey(seed)
        : chooseContractTagKeyAutomatically(seed);

    selectedTags[contractTagKey] =
      mode === "manual"
        ? await chooseTagManually(contractTagKey, kurovianFlavour)
        : chooseTagAutomatically(contractTagKey, kurovianFlavour);

    applyForcedTags(selectedTags, selectedTags[contractTagKey], kurovianFlavour);
    await applySubTable(selectedTags, selectedTags[contractTagKey], mode, kurovianFlavour);

    for (const tagKey of seed.extraTagKeys) {
      if (selectedTags[tagKey] !== undefined) {
        continue;
      }

      selectedTags[tagKey] =
        mode === "manual"
          ? await chooseTagManually(tagKey, kurovianFlavour)
          : chooseTagAutomatically(tagKey, kurovianFlavour);

      applyForcedTags(selectedTags, selectedTags[tagKey], kurovianFlavour);
      await applySubTable(selectedTags, selectedTags[tagKey], mode, kurovianFlavour);
    }
  } else {
    contractTagKey = seed.tagKeys.find((k) => k.toLowerCase().includes("contract"));

    for (const tagKey of seed.tagKeys) {
      if (selectedTags[tagKey] !== undefined) {
        continue;
      }

      selectedTags[tagKey] =
        mode === "manual"
          ? await chooseTagManually(tagKey, kurovianFlavour)
          : chooseTagAutomatically(tagKey, kurovianFlavour);

      applyForcedTags(selectedTags, selectedTags[tagKey], kurovianFlavour);
      await applySubTable(selectedTags, selectedTags[tagKey], mode, kurovianFlavour);
    }
  }

  if (shouldAddAdditionalWeirdPayment(seed, selectedTags)) {
    selectedTags.weirdPayment =
      mode === "manual"
        ? await chooseTagManually("weirdPayment", kurovianFlavour)
        : chooseTagAutomatically("weirdPayment", kurovianFlavour);
  }

  return buildIllegalContractFromTags(seed, contractTagKey, selectedTags, kurovianFlavour);
}

function validateIllegalTables() {
  const seedTotal = ILLEGAL_SEEDS.reduce((sum, seed) => sum + seed.percent, 0);

  if (seedTotal !== 100) {
    throw new Error(`Illegal seed chances must total 100%, but currently total ${seedTotal}%.`);
  }

  for (const [tagKey, entries] of Object.entries(ILLEGAL_TAG_TABLES)) {
    if (entries.length < 5) {
      throw new Error(`${tagKey} must have at least 5 entries.`);
    }
  }
}

async function chooseIllegalSeed() {
  const chosenId = await chooseFromList({
    title: "Illegal Contract Seed",
    prompt: "Choose seed",
    items: ILLEGAL_SEEDS.map((seed) => {
      return {
        label: seed.name,
        description: seed.formulaText,
        colour: style.colours.blood
      };
    })
  });

  const result = ILLEGAL_SEEDS.find((seed) => seed.id === chosenId);

  if (result === undefined) {
    throw new Error(`No illegal seed found for option ${chosenId}.`);
  }

  return result;
}

function rollIllegalSeed() {
  const roll = rollDie(100);
  let minimum = 1;

  for (const seed of ILLEGAL_SEEDS) {
    const maximum = minimum + seed.percent - 1;

    if (roll >= minimum && roll <= maximum) {
      return seed;
    }

    minimum = maximum + 1;
  }

  throw new Error(`No illegal seed found for d100 roll ${roll}.`);
}

async function chooseContractTagKey(seed) {
  const chosenIndex = await chooseFromList({
    title: "Illegal Contract Base",
    prompt: "Choose contract base",
    items: seed.contractTagOptions.map((tagKey) => {
      return {
        label: getTagLabel(tagKey),
        description: "This decides which existing contract table is used.",
        colour: style.colours.oldBone
      };
    })
  });

  return seed.contractTagOptions[chosenIndex - 1];
}

function chooseContractTagKeyAutomatically(seed) {
  const chosenIndex = rollDie(seed.contractTagOptions.length) - 1;

  return seed.contractTagOptions[chosenIndex];
}

async function chooseTagManually(tagKey, kurovianFlavour) {
  const availableEntries = getAvailableTagEntries(tagKey, kurovianFlavour);

  const chosenIndex = await chooseFromList({
    title: getTagLabel(tagKey),
    statusLines: kurovianFlavour
      ? [
          style.subtitle("Kurovian Flavour enabled: Kurovian-only options are available.")
        ]
      : [],
    prompt: "Choose tag",
    items: availableEntries.map((entry, index) => {
      return {
        label: getTagMenuText(tagKey, entry, index),
        colour: getTagColour(tagKey, entry)
      };
    })
  });

  return availableEntries[chosenIndex - 1];
}

function chooseTagAutomatically(tagKey, kurovianFlavour) {
  const availableEntries = getAvailableTagEntries(tagKey, kurovianFlavour);
  const filledEntries = availableEntries.filter((entry) => isFilledEntry(entry));
  const usableTable = filledEntries.length > 0 ? filledEntries : availableEntries;

  return chooseWeightedEntry(usableTable);
}

function getAvailableTagEntries(tagKey, kurovianFlavour) {
  const table = getTagTable(tagKey);

  const availableEntries = table.filter((entry) => {
    if (isKurovianEntry(entry)) {
      return kurovianFlavour;
    }
    return true;
  });

  if (availableEntries.length === 0) {
    throw new Error(`${getTagLabel(tagKey)} has no available entries.`);
  }

  return availableEntries;
}

function getTagTable(tagKey) {
  if (ILLEGAL_TAG_TABLES[tagKey] !== undefined) {
    return ILLEGAL_TAG_TABLES[tagKey];
  }

  if (SUB_TABLES[tagKey] !== undefined) {
    return SUB_TABLES[tagKey];
  }

  if (LEGITIMATE_TAG_TABLES[tagKey] !== undefined) {
    return LEGITIMATE_TAG_TABLES[tagKey];
  }

  throw new Error(`Unknown tag table: ${tagKey}.`);
}

function getTagLabel(tagKey) {
  return (
    ILLEGAL_TAG_LABELS[tagKey] ??
    SUB_TABLE_LABELS[tagKey] ??
    LEGITIMATE_TAG_LABELS[tagKey] ??
    tagKey
  );
}

async function applySubTable(selectedTags, sourceEntry, mode, kurovianFlavour) {
  if (sourceEntry.subTableKey === undefined) {
    return;
  }
  const subKey = sourceEntry.subTableKey;
  if (selectedTags[subKey] !== undefined) {
    return;
  }
  selectedTags[subKey] =
    mode === "manual"
      ? await chooseTagManually(subKey, kurovianFlavour)
      : chooseTagAutomatically(subKey, kurovianFlavour);
}

function applyForcedTags(selectedTags, sourceEntry, kurovianFlavour) {
  if (sourceEntry.forcedTags === undefined) {
    return;
  }

  for (const [tagKey, forcedText] of Object.entries(sourceEntry.forcedTags)) {
    selectedTags[tagKey] = findForcedTagEntry(tagKey, forcedText, kurovianFlavour);
  }
}

function findForcedTagEntry(tagKey, forcedText, kurovianFlavour) {
  const availableEntries = getAvailableTagEntries(tagKey, kurovianFlavour);
  const normalisedForcedText = normaliseTagText(forcedText);

  const result = availableEntries.find((entry) => {
    return normaliseTagText(entry.text) === normalisedForcedText;
  });

  if (result === undefined) {
    throw new Error(
      `Forced tag "${forcedText}" was not found in ${getTagLabel(tagKey)}.`
    );
  }

  return result;
}

function getTagMenuText(tagKey, entry, index) {
  const text = getCleanText(entry.text);
  const rewardText = getCleanText(entry.rewardText);
  const markers = [];

  if (entry.weight !== undefined) {
    markers.push(`weight ${entry.weight}`);
  }

  if (isKurovianEntry(entry)) {
    markers.push("Kurovian");
  }

  if (entry.additionalWeirdPayment === true) {
    markers.push("adds weird payment");
  }

  if (entry.subTableKey !== undefined) {
    markers.push(`rolls ${getTagLabel(entry.subTableKey)}`);
  }

  if (entry.forcedTags !== undefined) {
    markers.push(getForcedTagsText(entry.forcedTags, getTagLabel));
  }

  const markerText = markers.length > 0
    ? ` ${style.dim(`[${markers.join(", ")}]`)}`
    : "";

  if (text !== "") {
    return `${text}${markerText}`;
  }

  if (rewardText !== "") {
    return `${rewardText}${markerText}`;
  }

  return `[empty ${getTagLabel(tagKey)} option ${index + 1}]${markerText}`;
}

function buildIllegalSentence(seed, contractTagKey, tags) {
  const subject = asSubject(tags.criminalEmployer, "criminal employer");
  const contractText = resolveContractText(tags[contractTagKey], tags);

  if (seed.name === "Illegal - Shady") {
    return `${subject} is asking for someone to ${contractText}, but ${asAction(tags.shadyCondition, "shady condition")}.`;
  }

  if (seed.name === "Illegal - Simple Criminal") {
    return `${subject} is looking for someone to ${resolveContractText(tags.criminalContract, tags)}.`;
  }

  if (seed.name === "Illegal - Complicated Criminal") {
    return `${subject} is looking for someone to ${resolveContractText(tags.criminalContract, tags)}, but ${asAction(tags.shadyCondition, "shady condition")}.`;
  }

  return `${subject} posts an illegal contract.`;
}

function calculateReward(contractTagKey, tags) {
  const baseRewardGp = Number(tags[contractTagKey].baseRewardGp);

  if (!Number.isFinite(baseRewardGp) || baseRewardGp <= 0) {
    return {
      rewardText: "[reward value not filled]",
      details: {
        reason: `${contractTagKey} has no baseRewardGp value.`
      }
    };
  }

  const totalTagModifierPercent = Object.entries(tags)
    .filter(([tagKey]) => tagKey !== contractTagKey && tagKey !== "weirdPayment")
    .reduce((sum, [_tagKey, entry]) => {
      return sum + getRewardModifier(entry);
    }, 0);

  const finalRewardGp = Math.max(
    1,
    Math.floor(baseRewardGp * (1 + totalTagModifierPercent / 100))
  );

  const baseRewardText = `${finalRewardGp} GP`;

  if (tags.weirdPayment !== undefined) {
    return {
      rewardText: `${baseRewardText} + ${getWeirdPaymentText(tags.weirdPayment)}`,
      details: {
        baseRewardGp,
        totalTagModifierPercent,
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
      finalRewardGp
    }
  };
}

function getTagColour(tagKey, entry) {
  if (entry.additionalWeirdPayment === true) {
    return style.colours.cursedViolet;
  }

  if (isKurovianEntry(entry)) {
    return style.colours.cursedViolet;
  }

  if (tagKey === "criminalEmployer") {
    return style.colours.blood;
  }

  if (tagKey === "shadyCondition") {
    return style.colours.rust;
  }

  if (tagKey.toLowerCase().includes("contract")) {
    return style.colours.oldBone;
  }

  return style.colours.graveAsh;
}

function buildIllegalContractFromTags(seed, contractTagKey, tags, kurovianFlavour) {
  const reward = calculateReward(contractTagKey, tags);

  return {
    seedName: seed.name,
    kurovianFlavour: kurovianFlavour === true,
    contractTagKey,
    sentence: buildIllegalSentence(seed, contractTagKey, tags),
    rewardText: reward.rewardText,
    rewardDetails: reward.details,
    tags
  };
}

module.exports = {
  generateIllegalContract,
  validateIllegalTables,
  buildIllegalContractFromTags,

  ILLEGAL_SEEDS,
  ILLEGAL_TAG_TABLES,
  ILLEGAL_TAG_LABELS,
  SUB_TABLES,
  SUB_TABLE_LABELS
};
