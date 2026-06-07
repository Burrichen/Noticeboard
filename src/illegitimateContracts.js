const { chooseFromList } = require("./input");
const { rollDie } = require("./dice");
const style = require("./style");

const {
  TAG_TABLES: LEGITIMATE_TAG_TABLES,
  TAG_LABELS: LEGITIMATE_TAG_LABELS
} = require("./legitimateContracts");

// Illegitimate contracts reuse several legitimate contract tags.
// The new tags in this file are:
//   realPurpose
//   betrayal

// These are rough placeholder values and must total 100.
const ILLEGITIMATE_SEEDS = [
  {
    id: 1,
    name: "Illegitimate False Premise",
    percent: 75,
    formulaText: "dangerousContract OR socialContract OR investigationContract + realPurpose",
    contractTagOptions: ["dangerousContract", "socialContract", "investigationContract"],
    extraTagKey: "realPurpose"
  },
  {
    id: 2,
    name: "Illegitimate Betrayal",
    percent: 25,
    formulaText: "dangerousContract OR socialContract OR investigationContract + betrayal",
    contractTagOptions: ["dangerousContract", "socialContract", "investigationContract"],
    extraTagKey: "betrayal"
  }
];

// -----------------------------------------------------------------------------
// NEW ILLEGITIMATE TAG TABLES
// -----------------------------------------------------------------------------
//
// Do not fill these here unless you want to.
// These are intentionally blank for you to populate later.
//
// Use:
//   text: "your flavour text here"
//   rewardModifierPercent: 0
//   weight: 10
//
// You can also add:
//   kurovian: true
// if an entry should only appear when Kurovian Flavour is enabled.

const realPurpose = [
  // TODO: Fill in real purpose option 1.
  { text: "completing the contract implicates the party in a larger problem", rewardModifierPercent: 0, weight: 4 },

  { text: "a rival party is already involved", rewardModifierPercent: -5, weight: 4 },

  { text: "", rewardModifierPercent: 0, weight: 1 },

  { text: "", rewardModifierPercent: 0, weight: 1 },

  { text: "", rewardModifierPercent: 0, weight: 1 }
];

const betrayal = [
  // TODO: Fill in betrayal option 1.
  { text: "the employer will refuse to pay", rewardModifierPercent: 25, weight: 4 },
  { text: "the employer vanishes after job completion", rewardModifierPercent: 25, weight: 4 },

  { text: "completing the contract forces the party to be involved in a larger problem", rewardModifierPercent: 10, weight: 2 },

  { text: "the job is an ambush", rewardModifierPercent: 0, weight: 1 },

  { text: "", rewardModifierPercent: 0, weight: 1 }
];

const ILLEGITIMATE_TAG_TABLES = {
  realPurpose,
  betrayal
};

const ILLEGITIMATE_TAG_LABELS = {
  realPurpose: "Real Purpose",
  betrayal: "Betrayal"
};

async function generateIllegitimateContract(mode, options = {}) {
  validateIllegitimateTables();

  const kurovianFlavour = options.kurovianFlavour === true;

  const seed =
    mode === "automatic"
      ? rollIllegitimateSeed()
      : await chooseIllegitimateSeed();

  const contractTagKey =
    mode === "manual"
      ? await chooseContractTagKey(seed)
      : chooseContractTagKeyAutomatically(seed);

  const selectedTags = {};

  selectedTags[contractTagKey] =
    mode === "manual"
      ? await chooseTagManually(contractTagKey, kurovianFlavour)
      : chooseTagAutomatically(contractTagKey, kurovianFlavour);

  applyForcedTags(selectedTags, selectedTags[contractTagKey], kurovianFlavour);

  selectedTags[seed.extraTagKey] =
    mode === "manual"
      ? await chooseTagManually(seed.extraTagKey, kurovianFlavour)
      : chooseTagAutomatically(seed.extraTagKey, kurovianFlavour);

  applyForcedTags(selectedTags, selectedTags[seed.extraTagKey], kurovianFlavour);

  if (shouldAddAdditionalWeirdPayment(seed, selectedTags)) {
    selectedTags.weirdPayment =
      mode === "manual"
        ? await chooseTagManually("weirdPayment", kurovianFlavour)
        : chooseTagAutomatically("weirdPayment", kurovianFlavour);
  }

  const sentence = buildIllegitimateSentence(seed, contractTagKey, selectedTags);
  const reward = calculateReward(seed, contractTagKey, selectedTags);

  return {
    seedName: seed.name,
    kurovianFlavour,
    contractTagKey,
    sentence,
    rewardText: reward.rewardText,
    rewardDetails: reward.details,
    tags: selectedTags
  };
}

function validateIllegitimateTables() {
  const seedTotal = ILLEGITIMATE_SEEDS.reduce((sum, seed) => sum + seed.percent, 0);

  if (seedTotal !== 100) {
    throw new Error(`Illegitimate seed chances must total 100%, but currently total ${seedTotal}%.`);
  }

  for (const [tagKey, entries] of Object.entries(ILLEGITIMATE_TAG_TABLES)) {
    if (entries.length < 5) {
      throw new Error(`${tagKey} must have at least 5 entries.`);
    }
  }
}

async function chooseIllegitimateSeed() {
  const chosenId = await chooseFromList({
    title: "Illegitimate Contract Seed",
    prompt: "Choose seed",
    items: ILLEGITIMATE_SEEDS.map((seed) => {
      return {
        label: seed.name,
        description: seed.formulaText,
        colour: style.colours.rust
      };
    })
  });

  const result = ILLEGITIMATE_SEEDS.find((seed) => seed.id === chosenId);

  if (result === undefined) {
    throw new Error(`No illegitimate seed found for option ${chosenId}.`);
  }

  return result;
}

function rollIllegitimateSeed() {
  const roll = rollDie(100);
  let minimum = 1;

  for (const seed of ILLEGITIMATE_SEEDS) {
    const maximum = minimum + seed.percent - 1;

    if (roll >= minimum && roll <= maximum) {
      return seed;
    }

    minimum = maximum + 1;
  }

  throw new Error(`No illegitimate seed found for d100 roll ${roll}.`);
}

async function chooseContractTagKey(seed) {
  const chosenIndex = await chooseFromList({
    title: "Illegitimate Contract Base",
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
  if (ILLEGITIMATE_TAG_TABLES[tagKey] !== undefined) {
    return ILLEGITIMATE_TAG_TABLES[tagKey];
  }

  if (LEGITIMATE_TAG_TABLES[tagKey] !== undefined) {
    return LEGITIMATE_TAG_TABLES[tagKey];
  }

  throw new Error(`Unknown tag table: ${tagKey}.`);
}

function getTagLabel(tagKey) {
  return (
    ILLEGITIMATE_TAG_LABELS[tagKey] ??
    LEGITIMATE_TAG_LABELS[tagKey] ??
    tagKey
  );
}

function isKurovianEntry(entry) {
  return entry.kurovian === true;
}

function isFilledEntry(entry) {
  return (
    getCleanText(entry.text) !== "" ||
    getCleanText(entry.rewardText) !== "" ||
    Number(entry.baseRewardGp) > 0
  );
}

function chooseWeightedEntry(entries) {
  const totalWeight = entries.reduce((sum, entry) => {
    return sum + getEntryWeight(entry);
  }, 0);

  if (totalWeight <= 0) {
    const chosenIndex = rollDie(entries.length) - 1;
    return entries[chosenIndex];
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

  if (!Number.isFinite(weight) || weight <= 0) {
    return 1;
  }

  return Math.floor(weight);
}

function shouldAddAdditionalWeirdPayment(seed, selectedTags) {
  if (seed.rewardOverrideTag !== undefined) {
    return false;
  }

  if (selectedTags.weirdPayment !== undefined) {
    return false;
  }

  return Object.values(selectedTags).some((entry) => {
    return entry.additionalWeirdPayment === true;
  });
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

function normaliseTagText(value) {
  return String(value).trim().toLowerCase();
}

function getTagMenuText(tagKey, entry, index) {
  const text = getCleanText(entry.text);
  const rewardText = getCleanText(entry.rewardText);
  const markers = [];

  if (entry.weight !== undefined) {
    markers.push(`weight ${getEntryWeight(entry)}`);
  }

  if (isKurovianEntry(entry)) {
    markers.push("Kurovian");
  }

  if (entry.additionalWeirdPayment === true) {
    markers.push("adds weird payment");
  }

  if (entry.forcedTags !== undefined) {
    markers.push(getForcedTagsText(entry.forcedTags));
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

function getForcedTagsText(forcedTags) {
  return Object.entries(forcedTags)
    .map(([tagKey, forcedText]) => {
      return `forces ${getTagLabel(tagKey)}: ${forcedText}`;
    })
    .join("; ");
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

function calculateReward(seed, contractTagKey, tags) {
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

function getRewardModifier(entry) {
  const modifier = Number(entry.rewardModifierPercent);

  if (!Number.isFinite(modifier)) {
    return 0;
  }

  return modifier;
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

function asSubject(entry, fallbackName) {
  return sentenceCase(getTagText(entry, fallbackName));
}

function asAction(entry, fallbackName) {
  return getTagText(entry, fallbackName);
}

function getTagText(entry, fallbackName) {
  const text = getCleanText(entry.text);

  if (text !== "") {
    return text;
  }

  return `[${fallbackName} not filled]`;
}

function getCleanText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function sentenceCase(text) {
  if (text.length === 0) {
    return text;
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getTagColour(tagKey, entry) {
  if (entry.additionalWeirdPayment === true) {
    return style.colours.cursedViolet;
  }

  if (isKurovianEntry(entry)) {
    return style.colours.cursedViolet;
  }

  if (tagKey === "realPurpose") {
    return style.colours.rust;
  }

  if (tagKey === "betrayal") {
    return style.colours.blood;
  }

  if (tagKey.toLowerCase().includes("contract")) {
    return style.colours.oldBone;
  }

  return style.colours.graveAsh;
}

module.exports = {
  generateIllegitimateContract,
  validateIllegitimateTables,

  ILLEGITIMATE_SEEDS,
  ILLEGITIMATE_TAG_TABLES,
  ILLEGITIMATE_TAG_LABELS
};