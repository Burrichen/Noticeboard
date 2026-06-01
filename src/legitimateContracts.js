const { askSingleKeyNumber } = require("./input");
const { rollDie } = require("./dice");
const style = require("./style");

// Your example says the final reward gets a random drift between -10 and +10.
// Change this to 25 later if you decide you meant a full 25% drift range.
//
// For testing reward maths clearly, temporarily set this to 0.
const REWARD_DRIFT_RANGE_PERCENT = 10;

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
// Other normal tags should use:
//   text: "your tag text here"
//   rewardModifierPercent: -15
//
// weirdPayment ignores normal GP reward calculation and overwrites the payment.
// Use:
//   text: "payment description here"
//   rewardText: "payment shown to the player here"
//
// Automatic rolling will prefer filled entries. If some entries are still blank,
// they will be ignored unless the whole table is blank.

const contract = [
    // TODO: Contract Area
  { text: "work a job", baseRewardGp: 10, weight: 30 },
  { text: "escort an individual", baseRewardGp: 25, weight: 20 },
  { text: "deliver a sealed letter", baseRewardGp: 20, weight: 20 },
  { text: "deliver an object of importance", baseRewardGp: 50, weight: 10 },
  { text: "guard a location overnight", baseRewardGp: 20, weight: 10 },
  { text: "escort a caravan", baseRewardGp: 40, weight: 10 },
  { text: "carry supplies to an isolated house, farm or outpost", baseRewardGp: 20, weight: 5 },
  { text: "find a missing animal", baseRewardGp: 5, weight: 5 },
  { text: "retrieve a wagon, cart or boat stranded off-route", baseRewardGp: 30, weight: 5 },
  { text: "escort a disliked official, collector or guild agent through town", baseRewardGp: 50, weight: 1 },

];

const employer = [
      // TODO: Employer Area
    // weight: 20 = fairly common
  { text: "Local Merchant", rewardModifierPercent: 5, weight: 20 },
  { text: "Farmer", rewardModifierPercent: -5, weight: 20 },
  { text: "Local Resident", rewardModifierPercent: -10, weight: 20 },
  // weight: 10 = normal
  { text: "Town Guard", rewardModifierPercent: 0, weight: 10 },
  { text: "Shopkeeper", rewardModifierPercent: 5, weight: 10 },
  { text: "Innkeeper", rewardModifierPercent: 0, weight: 10 },
  // weight: 5 = uncommon
  { text: "Retired Adventurer", rewardModifierPercent: 0, weight: 5 },
  { text: "Guild Representative", rewardModifierPercent: 10, weight: 5 },
  { text: "Village Elder", rewardModifierPercent: -10, weight: 5 },
  { text: "Council Member", rewardModifierPercent: 5, weight: 5 },
  { text: "Priest", rewardModifierPercent: -10, weight: 5 },
  { text: "Caravan Master", rewardModifierPercent: 5, weight: 5 },
  { text: "Nobel's Steward", rewardModifierPercent: 5, weight: 5 },
  { text: "Artisan", rewardModifierPercent: 15, weight: 5 },
  { text: "Dockworker, ferryman or stablemaster", rewardModifierPercent: 0, weight: 5 },
  { text: "Scholar", rewardModifierPercent: -5, weight: 5 },
  { text: "Courier", rewardModifierPercent: 0, weight: 5 },
  { text: "Scribe", rewardModifierPercent: 5, weight: 5 },
  { text: "Criminal Contact", rewardModifierPercent: 0, weight: 5 },
  { text: "Healer", rewardModifierPercent: -5, weight: 5 },
  // weight: 1 = rare
  { text: "Nobel", rewardModifierPercent: 75, weight: 1 },
  { text: "Anonymous Patron", rewardModifierPercent: 25, weight: 1 },
  { text: "Cursed Individual", rewardModifierPercent: 25, weight: 1 },
  { text: "Cult Member", rewardModifierPercent: 10, weight: 1 }
];

const externalComplication = [
  // TODO: External Complication Area
  { text: "the job must be completed in a limited timeframe", baseRewardGp: 25 },
  { text: "the employer has no information about the contract", rewardModifierPercent: 10 },
  { text: "the employer has unwittingly given false information", rewardModifierPercent: 0 },
  { text: "another group has already accepted the contract", rewardModifierPercent: -10 },
  { text: "an alternative group has an active interest in the contract not being fulfilled", rewardModifierPercent: 0 },
  { text: "another group has already accepted the contract", rewardModifierPercent: 0 },
  { text: "the job attracts unwanted public attention", rewardModifierPercent: 10 },
  { text: "the contract requires following a local custom", rewardModifierPercent: 5 },
  { text: "the employer has a strange reputation", rewardModifierPercent: 5 },
  { text: "the job is merely one part of a much larger ", rewardModifierPercent: 0 }
];

const dangerousContract = [
  // TODO: Dangerous Contract Area
  { text: "hunt a monster that's been attacking travellers", rewardModifierPercent: 100 },
  { text: "drive off a beast that's been threatening livestock", baseRewardGp: 100 },
  { text: "clear creatures out of an abandoned building", baseRewardGp: 100 },
  { text: "exorcise a ghost from a home, graveyard, shrine or inn", baseRewardGp: 200 },
  { text: "rescue someone trapped in a dangerous location", baseRewardGp: 200 },
  { text: "destroy a brood den", baseRewardGp: 125 },
  { text: "protect a caravan, farm or outpost from incoming attack", baseRewardGp: 150 },
  { text: "capture a dangerous outlaw alive", baseRewardGp: 125 }, 
  { text: "kill a dangerous outlaw", baseRewardGp: 75 }, 
  { text: "recover an item from a monsters lair or haunted place", baseRewardGp: 125 }, 
  { text: "hunt a creature that only appears under a specific condition (e.g. full-moon, fog)", baseRewardGp: 150 }, 
  { text: "guard a ritual. burial or ceremony from hostile forces", baseRewardGp: 125 }, 
  { text: "break into a dangerous location to recover captives or proof", baseRewardGp: 300 },
  { text: "destroy a cursed object, relic or shrine", baseRewardGp: 150 }, 

  { text: "survive a night in a cursed or haunted location", baseRewardGp: 300 }
];

const weirdContract = [
  // TODO: Weird Contract Area
  { text: "give a ghost one last day of fun", baseRewardGp: 250, weight: 1 },

  { text: "investigate and end a curse affecting a person, family, or place", baseRewardGp: 300 },

  { text: "break a supernatural bargain", baseRewardGp: 250 },

  { text: "return something that does not belong in the mortal realm", baseRewardGp: 0 },

  { text: "", baseRewardGp: 0 }
];

const socialContract = [
  // TODO: Social Contract Area
  { text: "mediate a dispute between two families", baseRewardGp: 100, weight: 5 },
  { text: "deliver an apology on someone else's behalf", baseRewardGp: 25, weight: 5 },
  { text: "collect a debt without causing", baseRewardGp: 25, weight: 5 },
  { text: "flatter a foreign dignitary", baseRewardGp: 75, weight: 5 },

  { text: "negotiate a truce between a guild and its workers", baseRewardGp: 125, weight: 3 },
  { text: "act as a guild representative on a sensitive matter", baseRewardGp: 125, weight: 3 },

  { text: "deliver a confession on someone else's behalf", baseRewardGp: 30, weight: 2 },
  { text: "serve as a neutral witness for a contract", baseRewardGp: 10, weight: 2 },
  { text: "serve as a neutral witness for a wedding", baseRewardGp: 10, weight: 2 },
  { text: "chaperone a troublesome rich kid for the day", baseRewardGp: 150, weight: 2 },

  { text: "chaperone a troublesome noble guest for the day", baseRewardGp: 200, weight: 1 }
];

const investigationContract = [
  // TODO: Fill in investigation contract option 1.
  { text: "", baseRewardGp: 0 },

  // TODO: Fill in investigation contract option 2.
  { text: "", baseRewardGp: 0 },

  // TODO: Fill in investigation contract option 3.
  { text: "", baseRewardGp: 0 },

  // TODO: Fill in investigation contract option 4.
  { text: "", baseRewardGp: 0 },

  // TODO: Fill in investigation contract option 5.
  { text: "", baseRewardGp: 0 },

  // TODO: Fill in Kurovian-only investigation contract option.
  // This option is only visible/rollable when Kurovian Flavour is enabled.
  { text: "KurovianOnly", baseRewardGp: 67, kurovian: true }
];

const weirdPayment = [
  // TODO: Fill in weird payment option 1.
  { text: "", rewardText: "" },

  // TODO: Fill in weird payment option 2.
  { text: "", rewardText: "" },

  // TODO: Fill in weird payment option 3.
  { text: "", rewardText: "" },

  // TODO: Fill in weird payment option 4.
  { text: "", rewardText: "" },

  // TODO: Fill in weird payment option 5.
  { text: "", rewardText: "" },

  // TODO: Fill in Kurovian-only weird payment option.
  // This option is only visible/rollable when Kurovian Flavour is enabled.
  { text: "KurovianOnly", rewardText: "Your test passes", kurovian: true }
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

async function generateLegitimateContract(mode) {
  validateLegitimateTables();

  const seed =
    mode === "automatic"
      ? rollLegitimateSeed()
      : await chooseLegitimateSeed();

  const selectedTags = {};

  for (const tagKey of seed.tagKeys) {
    selectedTags[tagKey] =
      mode === "manual"
        ? await chooseTagManually(tagKey)
        : chooseTagAutomatically(tagKey);
  }

  const sentence = buildContractSentence(seed, selectedTags);
  const reward = calculateReward(seed, selectedTags);

  return {
    seedName: seed.name,
    sentence,
    rewardText: reward.rewardText,
    rewardDetails: reward.details,
    tags: selectedTags
  };
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
  console.log("");
  console.log(style.line());
  console.log(style.title(" Legitimate Contract Seed"));
  console.log(style.line());
  console.log("");

  for (const seed of LEGITIMATE_SEEDS) {
    console.log(`${style.menuNumber(seed.id)} ${style.optionName(seed.name, style.colours.oldBone)}`);
    console.log(`   ${style.subtitle(seed.formulaText)}`);
  }

  console.log("");

  const chosenId = await askSingleKeyNumber("Choose seed: ", 1, LEGITIMATE_SEEDS.length);
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

async function chooseTagManually(tagKey) {
  const table = TAG_TABLES[tagKey];

  console.log("");
  console.log(style.line());
  console.log(style.title(` ${TAG_LABELS[tagKey]}`));
  console.log(style.line());
  console.log("");

  for (let index = 0; index < table.length; index += 1) {
    const entry = table[index];
    const displayText = getTagMenuText(tagKey, entry, index);

    console.log(`${style.menuNumber(index + 1)} ${style.optionName(displayText, getTagColour(tagKey))}`);
  }

  console.log("");

  const chosenIndex = await askSingleKeyNumber("Choose tag: ", 1, table.length);

  return table[chosenIndex - 1];
}

function chooseTagAutomatically(tagKey) {
  const table = TAG_TABLES[tagKey];
  const filledEntries = table.filter((entry) => isFilledEntry(entry));
  const usableTable = filledEntries.length > 0 ? filledEntries : table;

  if (tagKey === "employer") {
    return chooseWeightedEntry(usableTable);
  }

  const chosenIndex = rollDie(usableTable.length) - 1;
  return usableTable[chosenIndex];
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

function isFilledEntry(entry) {
  return (
    getCleanText(entry.text) !== "" ||
    getCleanText(entry.rewardText) !== "" ||
    Number(entry.baseRewardGp) > 0
  );
}

function getTagMenuText(tagKey, entry, index) {
  const text = getCleanText(entry.text);
  const rewardText = getCleanText(entry.rewardText);

  if (text !== "") {
    if (tagKey === "employer") {
      return `${text} ${style.dim(`weight ${getEntryWeight(entry)}`)}`;
    }

    return text;
  }

  if (rewardText !== "") {
    return rewardText;
  }

  if (tagKey === "employer") {
    return `[empty ${TAG_LABELS[tagKey]} option ${index + 1}] ${style.dim(`weight ${getEntryWeight(entry)}`)}`;
  }

  return `[empty ${TAG_LABELS[tagKey]} option ${index + 1}]`;
}

function buildContractSentence(seed, tags) {
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

  return {
    rewardText: `${finalRewardGp} GP`,
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

function getTagColour(tagKey) {
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

module.exports = {
  generateLegitimateContract,
  validateLegitimateTables
};