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

async function askSingleKeyNumber(question, minimum, maximum) {
  while (true) {
    output.write(style.prompt(question));

    const key = await readSingleKey();

    output.write("\n");

    if (key === "\u0003") {
      closeInput();
      process.exit(0);
    }

    const value = parseWholeNumber(key);

    if (value !== null && value >= minimum && value <= maximum) {
      return value;
    }

    console.log(style.error(`Choose ${minimum}-${maximum}.`));
  }
}

async function askSingleKeyChoice(question, allowedKeys) {
  const normalisedKeys = allowedKeys.map((key) => key.toLowerCase());

  while (true) {
    output.write(style.prompt(question));

    const key = await readSingleKey();

    output.write("\n");

    if (key === "\u0003") {
      closeInput();
      process.exit(0);
    }

    const normalisedKey = key.toLowerCase();

    if (normalisedKeys.includes(normalisedKey)) {
      return normalisedKey;
    }

    console.log(style.error(`Choose one of: ${allowedKeys.join(", ")}`));
  }
}

function readSingleKey() {
  return new Promise((resolve) => {
    const wasRaw = input.isRaw;

    if (input.isTTY) {
      input.setRawMode(true);
    }

    input.resume();

    const onData = (buffer) => {
      if (input.isTTY) {
        input.setRawMode(wasRaw);
      }

      input.pause();
      input.off("data", onData);

      resolve(buffer.toString("utf8"));
    };

    input.on("data", onData);
  });
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
  askSingleKeyNumber,
  askSingleKeyChoice,
  pause,
  closeInput,
  parseWholeNumber,
  parseDiceInput
};