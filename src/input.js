const readline = require("readline/promises");
const { stdin: input, stdout: output } = require("process");
const style = require("./style");

const rl = readline.createInterface({ input, output });

async function ask(question) {
  return (await rl.question(style.prompt(question))).trim();
}

async function askNumber(question, minimum, maximum) {
  while (true) {
    const answer = await ask(question);
    const value = parseWholeNumber(answer);

    if (value !== null && value >= minimum && value <= maximum) {
      return value;
    }

    console.log(style.error(`Enter a number between ${minimum} and ${maximum}.`));
  }
}

async function pause() {
  await ask("\nPress Enter to continue...");
}

function closeInput() {
  rl.close();
}

function parseWholeNumber(value) {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  return Number.parseInt(value, 10);
}

function parseDiceInput(value, sides) {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^d\d+\s*:\s*(\d+)$/);

  if (match === null) {
    return null;
  }

  if (!normalized.startsWith(`d${sides}:`)) {
    return null;
  }

  const roll = Number.parseInt(match[1], 10);

  if (roll < 1 || roll > sides) {
    console.log(style.error(`A d${sides} roll must be between 1 and ${sides}.`));
    return null;
  }

  return roll;
}

module.exports = {
  ask,
  askNumber,
  pause,
  closeInput,
  parseWholeNumber,
  parseDiceInput
};