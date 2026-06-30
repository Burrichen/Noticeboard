const { chooseFromList } = require("./input");
const { rollDie } = require("./dice");
const style = require("./style");
const {
  isKurovianEntry,
  chooseWeightedEntry,
  getEntryWeight,
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

const REWARD_DRIFT_RANGE_PERCENT = 15;

// TODO: Edit these seed chances later.
// These are rough placeholder values and must total 100.
const LEGITIMATE_SEEDS = [
  {
    id: 1,
    name: "Legitimate Simple",
    percent: 30,
    formulaText: "contract + employer = reward",
    tagKeys: ["contract", "employer"]
  },
  {
    id: 2,
    name: "Legitimate Complicated",
    percent: 15,
    formulaText: "contract + employer + externalComplication = reward",
    tagKeys: ["contract", "employer", "externalComplication"]
  },
  {
    id: 3,
    name: "Legitimate Dangerous",
    percent: 15,
    formulaText: "dangerousContract + employer = reward",
    tagKeys: ["dangerousContract", "employer"]
  },
  {
    id: 4,
    name: "Legitimate Weird",
    percent: 10,
    formulaText: "weirdContract + employer = reward",
    tagKeys: ["weirdContract", "employer"]
  },
  {
    id: 5,
    name: "Legitimate Social",
    percent: 10,
    formulaText: "socialContract + employer = reward",
    tagKeys: ["socialContract", "employer"]
  },
  {
    id: 6,
    name: "Legitimate Investigation",
    percent: 15,
    formulaText: "investigationContract + employer = reward",
    tagKeys: ["investigationContract", "employer"]
  },
  {
    id: 7,
    name: "Legitimate Weird Payment",
    percent: 5,
    formulaText: "dangerousContract + weirdPayment",
    tagKeys: ["dangerousContract", "weirdPayment"],
    rewardOverrideTag: "weirdPayment"
  }
];

// -----------------------------------------------------------------------------
// TAG TABLES
// -----------------------------------------------------------------------------
//
// Fill these in manually.
//
// Any tag with "contract" in its name should use:
//   text: "your contract text here"
//   baseRewardGp: 300
//
// Employer uses weighted entries:
//   text: "your employer text here"
//   rewardModifierPercent: -15
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
// Any tag can now use:
//   additionalWeirdPayment: true
//
// If a selected tag has additionalWeirdPayment: true, the contract keeps its
// normal GP reward and also rolls/selects a weirdPayment entry.
//
// Other normal tags should use:
//   text: "your tag text here"
//   rewardModifierPercent: -15
//
// weirdPayment ignores normal GP reward calculation when used by the
// "Legitimate Weird Payment" seed.
// Use:
//   text: "payment description here"
//   rewardText: "payment shown to the player here"
//
// Automatic rolling will prefer filled entries. If some entries are still blank,
// they will be ignored unless the whole table is blank.

const contract = [
  // Roll d100. Total weight = 100.
  { text: "work at a {job}", baseRewardGp: 10, weight: 28, subTableKey: "job" },
  { text: "escort an individual", baseRewardGp: 25, weight: 18 },
  { text: "deliver a sealed letter", baseRewardGp: 20, weight: 16 },
  { text: "deliver an object of importance", baseRewardGp: 50, weight: 10 },
  { text: "guard a location overnight", baseRewardGp: 20, weight: 8 },
  { text: "escort a caravan", baseRewardGp: 40, weight: 7 },
  { text: "carry supplies to an isolated {isolatedLocation}", baseRewardGp: 20, weight: 5, subTableKey: "isolatedLocation" },
  { text: "find a missing animal", baseRewardGp: 5, weight: 4 },
  { text: "retrieve a {strandedVehicle} stranded off-route", baseRewardGp: 30, weight: 3, subTableKey: "strandedVehicle" },
  { text: "escort a disliked {dislikedFigure} through town", baseRewardGp: 50, weight: 1, subTableKey: "dislikedFigure" }
];

const employer = [
  // Roll d100 (non-Kurovian total = 100). Kurovian entries add to the pool when enabled.
  // Common (12 each)
  { text: "Local Merchant", rewardModifierPercent: 5, weight: 12 },
  { text: "Farmer", rewardModifierPercent: -5, weight: 12 },
  { text: "Local Resident", rewardModifierPercent: -10, weight: 12 },

  // Normal (6 each)
  { text: "Town Guard", rewardModifierPercent: 0, weight: 6 },
  { text: "Shopkeeper", rewardModifierPercent: 5, weight: 6 },
  { text: "Innkeeper", rewardModifierPercent: 0, weight: 6 },

  // Uncommon (3 each)
  { text: "Retired Adventurer", rewardModifierPercent: 0, weight: 3 },
  { text: "Guild Representative", rewardModifierPercent: 10, weight: 3 },
  { text: "Village Elder", rewardModifierPercent: -10, weight: 3 },
  { text: "Council Member", rewardModifierPercent: 5, weight: 3 },
  { text: "Priest", rewardModifierPercent: -10, weight: 3 },
  { text: "Caravan Master", rewardModifierPercent: 5, weight: 3 },
  { text: "Nobel's Steward", rewardModifierPercent: 5, weight: 3 },
  { text: "Artisan", rewardModifierPercent: 15, weight: 3 },
  { text: "Dockworker, ferryman or stablemaster", rewardModifierPercent: 0, weight: 3 },
  { text: "Scholar", rewardModifierPercent: -5, weight: 3 },
  { text: "Courier", rewardModifierPercent: 0, weight: 3 },
  { text: "Scribe", rewardModifierPercent: 5, weight: 3 },
  { text: "Criminal Contact", rewardModifierPercent: 0, weight: 3 },
  { text: "Healer", rewardModifierPercent: -5, weight: 3 },

  // Rare (1 each)
  { text: "Nobel", rewardModifierPercent: 75, weight: 1 },
  { text: "Anonymous Patron", rewardModifierPercent: 25, weight: 1 },
  { text: "Cursed Individual", rewardModifierPercent: 25, weight: 1 },
  { text: "Cult Member", rewardModifierPercent: 10, weight: 1 },

  // Kurovian only (add to pool when Kurovian Flavour is enabled)
  { text: "Ambit representative", rewardModifierPercent: 25, weight: 1, kurovian: true },
  { text: "Remnant operative", rewardModifierPercent: 25, weight: 1, kurovian: true }
];

const externalComplication = [
  // Roll d10. Total weight = 10 (equal chance).
  { text: "the job must be completed in a limited timeframe", baseRewardGp: 25, weight: 1 },
  { text: "the employer has no information about the contract", rewardModifierPercent: 10, weight: 1 },
  { text: "the employer has unwittingly given false information", rewardModifierPercent: 0, weight: 1 },
  { text: "another group has already accepted the contract", rewardModifierPercent: -10, weight: 1 },
  { text: "an alternative group has an active interest in the contract not being fulfilled", rewardModifierPercent: 0, weight: 1 },
  { text: "another group has already accepted the contract", rewardModifierPercent: 0, weight: 1 },
  { text: "the job attracts unwanted public attention", rewardModifierPercent: 10, weight: 1 },
  { text: "the contract requires following a local custom", rewardModifierPercent: 5, weight: 1 },
  { text: "the employer has a strange reputation", rewardModifierPercent: 5, weight: 1 },
  { text: "the job is merely one part of a much larger ", rewardModifierPercent: 0, weight: 1 }
];

const dangerousContract = [
  // Roll d20. Total weight = 20. Common entries (weight 2) are typical adventuring jobs.
  { text: "hunt a monster that's been attacking travellers", rewardModifierPercent: 100, weight: 2 },
  { text: "drive off a beast that's been threatening livestock", baseRewardGp: 100, weight: 2 },
  { text: "clear creatures out of an abandoned building", baseRewardGp: 100, weight: 2 },
  { text: "exorcise a ghost from {hauntedLocation}", baseRewardGp: 200, subTableKey: "hauntedLocation", weight: 1 },
  { text: "rescue someone trapped in a dangerous location", baseRewardGp: 200, weight: 2 },
  { text: "destroy a brood den", baseRewardGp: 125, weight: 1 },
  { text: "protect {protectedLocation} from incoming attack", baseRewardGp: 150, subTableKey: "protectedLocation", weight: 1 },
  { text: "capture a dangerous outlaw alive", baseRewardGp: 125, weight: 1 },
  { text: "kill a dangerous outlaw", baseRewardGp: 75, weight: 2 },
  { text: "recover an item from a monsters lair or haunted place", baseRewardGp: 125, weight: 1 },
  { text: "hunt a creature that only appears under a specific condition (e.g. full-moon, fog)", baseRewardGp: 150, weight: 1 },
  { text: "guard a {guardedEvent} from hostile forces", baseRewardGp: 125, subTableKey: "guardedEvent", weight: 1 },
  { text: "break into a dangerous location to recover captives or proof", baseRewardGp: 300, weight: 1 },
  { text: "destroy a cursed {cursedThing}", baseRewardGp: 150, subTableKey: "cursedThing", weight: 1 },
  { text: "survive a night in a cursed or haunted location", baseRewardGp: 300, weight: 1 }
];

const weirdContract = [
  // Roll d4. Total weight = 4 (equal). The empty 5th slot is a placeholder — skip it.
  { text: "give a ghost one last day of fun", baseRewardGp: 250, weight: 1 },
  { text: "investigate and end a curse affecting a {cursedSubject}", baseRewardGp: 300, subTableKey: "cursedSubject", weight: 1 },
  { text: "break a supernatural bargain", baseRewardGp: 250, weight: 1 },
  { text: "return something that does not belong in the mortal realm", baseRewardGp: 0, weight: 1 },
  { text: "", baseRewardGp: 0 }
];

const socialContract = [
  // Roll d12. Total weight = 12.
  { text: "mediate a dispute between two families", baseRewardGp: 100, weight: 2 },
  { text: "deliver an apology on someone else's behalf", baseRewardGp: 25, weight: 1 },
  { text: "collect a debt without causing physical harm", baseRewardGp: 25, weight: 1 },
  { text: "flatter a foreign dignitary", baseRewardGp: 75, weight: 1 },
  { text: "negotiate a truce between a guild and its workers", baseRewardGp: 125, weight: 1 },
  { text: "act as a guild representative on a sensitive matter", baseRewardGp: 125, weight: 1 },
  { text: "deliver a confession on someone else's behalf", baseRewardGp: 30, weight: 1 },
  { text: "serve as a neutral witness for a contract", baseRewardGp: 10, weight: 1 },
  { text: "serve as a neutral witness for a wedding", baseRewardGp: 10, weight: 1 },
  { text: "chaperone a troublesome rich kid for the day", baseRewardGp: 150, weight: 1 },
  { text: "chaperone a troublesome noble guest for the day", baseRewardGp: 200, weight: 1 }
];

const investigationContract = [
  // Roll d100 (non-Kurovian total = 100). Kurovian entries add to the pool when enabled.
  { text: "infiltrate a masked ball", baseRewardGp: 150, weight: 12 },
  { text: "assist solving a mundane crime", baseRewardGp: 100, weight: 12 },
  { text: "follow someone without being seen", baseRewardGp: 50, weight: 10 },
  { text: "investigate a secret meeting", baseRewardGp: 60, weight: 10 },
  { text: "find a missing person", baseRewardGp: 150, weight: 9 },
  { text: "trace a stolen object through the criminal underworld", baseRewardGp: 100, weight: 8 },
  { text: "infiltrate a hideout", baseRewardGp: 150, weight: 8 },
  { text: "solve a murder", baseRewardGp: 300, weight: 8 },
  { text: "assist solving a magical crime", baseRewardGp: 150, weight: 8 },
  { text: "infiltrate a cult", baseRewardGp: 400, weight: 8 },
  { text: "find a witness who has gone missing", baseRewardGp: 200, weight: 5 },
  { text: "track a kidnapper before they leave the country", baseRewardGp: 400, weight: 2 },

  // Kurovian only (add to pool when Kurovian Flavour is enabled)
  {
    text: "work for the Ambit",
    baseRewardGp: 500,
    kurovian: true,
    weight: 4,
    additionalWeirdPayment: true,
    forcedTags: {
      employer: "Ambit representative"
    }
  },
  {
    text: "work as an blacksite Remnant operative",
    baseRewardGp: 400,
    kurovian: true,
    weight: 2,
    additionalWeirdPayment: true,
    forcedTags: {
      employer: "Remnant operative"
    }
  },
];

const weirdPayment = [
  // Roll d20 (non-Kurovian total = 20). Kurovian entry adds to the pool when enabled.
  { text: "a favour from a person of power", rewardText: "a favour from a person of power", weight: 4 },
  { text: "an uncommon magic item", rewardText: "an uncommon magic item", weight: 4 },
  { text: "a piece of land", rewardText: "a piece of land", weight: 2 },
  { text: "a rare magic item", rewardText: "a rare magic item", weight: 2 },
  { text: "a custom-made weapon, armor piece, tool, or arcane focus", rewardText: "a custom-made weapon, armor piece, tool, or arcane focus", weight: 1 },
  { text: "property in a nearby village, town or city", rewardText: "property in a nearby village, town or city", weight: 1 },
  { text: "mayoralship of a village", rewardText: "mayoralship of a village", weight: 1 },
  { text: "A blessing, oath, or supernatural protection", rewardText: "A blessing, oath, or supernatural protection", weight: 1 },
  { text: "proficency training", rewardText: "proficency training", weight: 1 },
  { text: "a very rare magic item", rewardText: "a very rare magic item", weight: 1 },
  { text: "a village", rewardText: "a village", weight: 1 },
  { text: "a legendary magic item", rewardText: "a legendary magic item", weight: 1 },

  // Kurovian only (add to pool when Kurovian Flavour is enabled)
  { text: "crystallised Axius", rewardText: "crystallised Axius", kurovian: true, weight: 1 }
];

const TAG_TABLES = {
  contract,
  employer,
  externalComplication,
  dangerousContract,
  weirdContract,
  socialContract,
  investigationContract,
  weirdPayment
};

const TAG_LABELS = {
  contract: "Contract",
  employer: "Employer",
  externalComplication: "External Complication",
  dangerousContract: "Dangerous Contract",
  weirdContract: "Weird Contract",
  socialContract: "Social Contract",
  investigationContract: "Investigation Contract",
  weirdPayment: "Weird Payment"
};

async function generateLegitimateContract(mode, options = {}) {
  validateLegitimateTables();

  const kurovianFlavour = options.kurovianFlavour === true;

  const seed =
    mode === "automatic"
      ? rollLegitimateSeed()
      : await chooseLegitimateSeed();

  const selectedTags = {};

  for (const tagKey of seed.tagKeys) {
    if (selectedTags[tagKey] !== undefined) {
      continue;
    }

    const selectedTag =
      mode === "manual"
        ? await chooseTagManually(tagKey, kurovianFlavour)
        : chooseTagAutomatically(tagKey, kurovianFlavour);

    selectedTags[tagKey] = selectedTag;

    applyForcedTags(selectedTags, selectedTag, kurovianFlavour);
    await applySubTable(selectedTags, selectedTag, mode, kurovianFlavour);
  }

  if (shouldAddAdditionalWeirdPayment(seed, selectedTags)) {
    selectedTags.weirdPayment =
      mode === "manual"
        ? await chooseTagManually("weirdPayment", kurovianFlavour)
        : chooseTagAutomatically("weirdPayment", kurovianFlavour);
  }

  return buildContractFromTags(seed, selectedTags, kurovianFlavour);
}

function validateLegitimateTables() {
  const seedTotal = LEGITIMATE_SEEDS.reduce((sum, seed) => sum + seed.percent, 0);

  if (seedTotal !== 100) {
    throw new Error(`Legitimate seed chances must total 100%, but currently total ${seedTotal}%.`);
  }

  for (const [tagKey, entries] of Object.entries(TAG_TABLES)) {
    if (entries.length < 5) {
      throw new Error(`${tagKey} must have at least 5 entries.`);
    }
  }
}

async function chooseLegitimateSeed() {
  const chosenId = await chooseFromList({
    title: "Legitimate Contract Seed",
    prompt: "Choose seed",
    items: LEGITIMATE_SEEDS.map((seed) => {
      return {
        label: seed.name,
        description: seed.formulaText,
        colour: style.colours.oldBone
      };
    })
  });

  const result = LEGITIMATE_SEEDS.find((seed) => seed.id === chosenId);

  if (result === undefined) {
    throw new Error(`No legitimate seed found for option ${chosenId}.`);
  }

  return result;
}

function rollLegitimateSeed() {
  const roll = rollDie(100);
  let minimum = 1;

  for (const seed of LEGITIMATE_SEEDS) {
    const maximum = minimum + seed.percent - 1;

    if (roll >= minimum && roll <= maximum) {
      return seed;
    }

    minimum = maximum + 1;
  }

  throw new Error(`No legitimate seed found for d100 roll ${roll}.`);
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

function getTagTable(tagKey) {
  if (TAG_TABLES[tagKey] !== undefined) return TAG_TABLES[tagKey];
  if (SUB_TABLES[tagKey] !== undefined) return SUB_TABLES[tagKey];
  throw new Error(`Unknown tag table: ${tagKey}.`);
}

function getTagLabel(tagKey) {
  return TAG_LABELS[tagKey] ?? SUB_TABLE_LABELS[tagKey] ?? tagKey;
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
      `Forced tag "${forcedText}" was not found in ${TAG_LABELS[tagKey] ?? tagKey}.`
    );
  }

  return result;
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

function buildContractSentence(seed, tags) {
  if (seed.name === "Legitimate Simple") {
    return `${asSubject(tags.employer, "employer")} is asking for people to ${resolveContractText(tags.contract, tags)}.`;
  }

  if (seed.name === "Legitimate Complicated") {
    return `${asSubject(tags.employer, "employer")} is asking for people to ${resolveContractText(tags.contract, tags)}, but ${asAction(tags.externalComplication, "external complication")}.`;
  }

  if (seed.name === "Legitimate Dangerous") {
    return `${asSubject(tags.employer, "employer")} is asking for people to ${resolveContractText(tags.dangerousContract, tags)}.`;
  }

  if (seed.name === "Legitimate Weird") {
    return `${asSubject(tags.employer, "employer")} is asking for people to ${resolveContractText(tags.weirdContract, tags)}.`;
  }

  if (seed.name === "Legitimate Social") {
    return `${asSubject(tags.employer, "employer")} is asking for help to ${asAction(tags.socialContract, "social contract")}.`;
  }

  if (seed.name === "Legitimate Investigation") {
    return `${asSubject(tags.employer, "employer")} is asking for people to ${asAction(tags.investigationContract, "investigation contract")}.`;
  }

  if (seed.name === "Legitimate Weird Payment") {
    return `A notice asks for people to ${resolveContractText(tags.dangerousContract, tags)}.`;
  }

  return "A legitimate contract has been posted.";
}

function calculateReward(seed, tags) {
  if (seed.rewardOverrideTag !== undefined) {
    const paymentTag = tags[seed.rewardOverrideTag];

    return {
      rewardText: getWeirdPaymentText(paymentTag),
      details: {
        overriddenBy: seed.rewardOverrideTag
      }
    };
  }

  const contractTagKey = seed.tagKeys.find((tagKey) =>
    tagKey.toLowerCase().includes("contract")
  );

  if (contractTagKey === undefined) {
    return {
      rewardText: "[reward value not filled]",
      details: {
        reason: "No contract tag found in seed."
      }
    };
  }

  const baseRewardGp = Number(tags[contractTagKey].baseRewardGp);

  if (!Number.isFinite(baseRewardGp) || baseRewardGp <= 0) {
    return {
      rewardText: "[reward value not filled]",
      details: {
        reason: `${contractTagKey} has no baseRewardGp value.`
      }
    };
  }

  const totalTagModifierPercent = seed.tagKeys
    .filter((tagKey) => tagKey !== contractTagKey)
    .reduce((sum, tagKey) => {
      return sum + getRewardModifier(tags[tagKey]);
    }, 0);

  const driftPercent = getRandomRewardDriftPercent();

  const tagModifierGp = calculateVisibleGpModifier(
    baseRewardGp,
    totalTagModifierPercent
  );

  const afterTagModifiersGp = baseRewardGp + tagModifierGp;

  const driftModifierGp = calculateVisibleGpModifier(
    afterTagModifiersGp,
    driftPercent
  );

  const finalRewardGp = Math.max(
    1,
    Math.floor(afterTagModifiersGp + driftModifierGp)
  );

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
  const absoluteChange = Math.abs(exactChange);

  // This keeps the modifier percentage-based for larger rewards,
  // but prevents small rewards like 10 GP from swallowing 5% changes.
  const visibleChange = Math.max(1, Math.floor(absoluteChange));

  if (modifierPercent > 0) {
    return visibleChange;
  }

  return -visibleChange;
}

function getRandomRewardDriftPercent() {
  if (REWARD_DRIFT_RANGE_PERCENT <= 0) {
    return 0;
  }

  return rollDie(REWARD_DRIFT_RANGE_PERCENT * 2 + 1) -
    (REWARD_DRIFT_RANGE_PERCENT + 1);
}

function getTagColour(tagKey, entry) {
  if (entry.additionalWeirdPayment === true) {
    return style.colours.cursedViolet;
  }

  if (isKurovianEntry(entry)) {
    return style.colours.cursedViolet;
  }

  if (tagKey === "employer") {
    return style.colours.tarnishedGold;
  }

  if (tagKey === "externalComplication") {
    return style.colours.rust;
  }

  if (tagKey === "weirdPayment") {
    return style.colours.cursedViolet;
  }

  if (tagKey.toLowerCase().includes("contract")) {
    return style.colours.oldBone;
  }

  return style.colours.graveAsh;
}

function buildContractFromTags(seed, tags, kurovianFlavour) {
  const reward = calculateReward(seed, tags);

  return {
    seedName: seed.name,
    kurovianFlavour: kurovianFlavour === true,
    sentence: buildContractSentence(seed, tags),
    rewardText: reward.rewardText,
    rewardDetails: reward.details,
    tags
  };
}

module.exports = {
  generateLegitimateContract,
  validateLegitimateTables,
  buildContractFromTags,

  // Exported for the Electron desktop GUI.
  LEGITIMATE_SEEDS,
  TAG_TABLES,
  TAG_LABELS,
  REWARD_DRIFT_RANGE_PERCENT
};
