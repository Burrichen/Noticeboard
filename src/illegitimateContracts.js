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
const { SUB_TABLES, SUB_TABLE_LABELS } = require("./subTables");

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
  // TODO: Real Purpose Area
  { text: "completing the contract implicates the party in a larger problem", rewardModifierPercent: 0, weight: 4 },

  { text: "completing the job distracts from the real crime", rewardModifierPercent: 20, weight: 3 },
  { text: "the job is to test the party for future work", rewardModifierPercent: 0, weight: 3 },
  
  { text: "a rival party is already involved", rewardModifierPercent: -5, weight: 2 },
  { text: "performing the job leads to evidence being stolen, destroyed or hidden", rewardModifierPercent: 10, weight: 2 },

  { text: "performing the job starts a fued between two groups", rewardModifierPercent: 10, weight: 1 }
];

const betrayal = [
  // TODO: Betrayal Area 
  { text: "the employer will refuse to pay", rewardModifierPercent: 25, weight: 4 },
  { text: "the employer vanishes during job", rewardModifierPercent: 25, weight: 4 },
  { text: "the city watch / enemies have already been tipped off", rewardModifierPercent: 0, weight: 4 },

  { text: "completing the contract forces the party to be involved in a larger problem", rewardModifierPercent: 10, weight: 2 },
  { text: "the party is locked in, trapped or abandoned during the job", rewardModifierPercent: 0, weight: 2 },

  { text: "the job is an ambush", rewardModifierPercent: 0, weight: 1 },
  { text: "the payment is {paymentCondition}", rewardModifierPercent: 50, weight: 1, subTableKey: "paymentCondition" },
  { text: "the party is paid, but accepting payment implicates them", rewardModifierPercent: 10, weight: 1 }
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
  await applySubTable(selectedTags, selectedTags[contractTagKey], mode, kurovianFlavour);

  selectedTags[seed.extraTagKey] =
    mode === "manual"
      ? await chooseTagManually(seed.extraTagKey, kurovianFlavour)
      : chooseTagAutomatically(seed.extraTagKey, kurovianFlavour);

  applyForcedTags(selectedTags, selectedTags[seed.extraTagKey], kurovianFlavour);
  await applySubTable(selectedTags, selectedTags[seed.extraTagKey], mode, kurovianFlavour);

  if (shouldAddAdditionalWeirdPayment(seed, selectedTags)) {
    selectedTags.weirdPayment =
      mode === "manual"
        ? await chooseTagManually("weirdPayment", kurovianFlavour)
        : chooseTagAutomatically("weirdPayment", kurovianFlavour);
  }

  return buildIllegitimateContractFromTags(seed, contractTagKey, selectedTags, kurovianFlavour);
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
    ILLEGITIMATE_TAG_LABELS[tagKey] ??
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

function buildIllegitimateSentence(seed, contractTagKey, tags) {
  const subject = tags.employer === undefined
    ? "A notice"
    : asSubject(tags.employer, "employer");

  const contractText = asAction(tags[contractTagKey], getTagLabel(contractTagKey));

  if (seed.name === "Illegitimate False Premise") {
    return `${subject} asks for people to ${contractText}, however ${asAction(tags.realPurpose, "real purpose")}.`;
  }

  if (seed.name === "Illegitimate Betrayal") {
    return `${subject} asks for people to ${contractText}, but ${resolveContractText(tags.betrayal, tags)}.`;
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

function buildIllegitimateContractFromTags(seed, contractTagKey, tags, kurovianFlavour) {
  const reward = calculateReward(seed, contractTagKey, tags);

  return {
    seedName: seed.name,
    kurovianFlavour: kurovianFlavour === true,
    contractTagKey,
    sentence: buildIllegitimateSentence(seed, contractTagKey, tags),
    rewardText: reward.rewardText,
    rewardDetails: reward.details,
    tags
  };
}

module.exports = {
  generateIllegitimateContract,
  validateIllegitimateTables,
  buildIllegitimateContractFromTags,

  ILLEGITIMATE_SEEDS,
  ILLEGITIMATE_TAG_TABLES,
  ILLEGITIMATE_TAG_LABELS
};
