const { rollDie } = require("./dice");

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

function normaliseTagText(value) {
  return String(value).trim().toLowerCase();
}

function isKurovianEntry(entry) {
  return entry.kurovian === true;
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

function getTagText(entry, fallbackName) {
  const text = getCleanText(entry.text);
  if (text !== "") {
    return text;
  }
  return `[${fallbackName} not filled]`;
}

function asSubject(entry, fallbackName) {
  return sentenceCase(getTagText(entry, fallbackName));
}

function asAction(entry, fallbackName) {
  return getTagText(entry, fallbackName);
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

function getRewardModifier(entry) {
  const modifier = Number(entry.rewardModifierPercent);
  if (!Number.isFinite(modifier)) {
    return 0;
  }
  return modifier;
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

// getLabel is a (tagKey) => string resolver supplied by the caller,
// since label lookups differ between legitimate and illegitimate contexts.
function getForcedTagsText(forcedTags, getLabel) {
  return Object.entries(forcedTags)
    .map(([tagKey, forcedText]) => {
      return `forces ${getLabel(tagKey)}: ${forcedText}`;
    })
    .join("; ");
}

module.exports = {
  getCleanText,
  sentenceCase,
  normaliseTagText,
  isKurovianEntry,
  getEntryWeight,
  isFilledEntry,
  chooseWeightedEntry,
  getTagText,
  asSubject,
  asAction,
  getWeirdPaymentText,
  getRewardModifier,
  shouldAddAdditionalWeirdPayment,
  getForcedTagsText
};
