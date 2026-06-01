const readline = require("readline/promises");
const { stdin: input, stdout: output } = require("process");
const style = require("./style");

async function ask(question) {
  disableRawMode();

  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(style.prompt(question));
  rl.close();

  return answer.trim();
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

async function chooseFromList(config) {
  const title = config.title ?? "Choose";
  const statusLines = config.statusLines ?? [];
  const prompt = config.prompt ?? "Choose an option";
  const items = config.items;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("chooseFromList requires at least one item.");
  }

  let selectedIndex = 0;
  let typedNumber = "";
  let errorMessage = "";

  while (true) {
    renderChoiceList({
      title,
      statusLines,
      prompt,
      items,
      selectedIndex,
      typedNumber,
      errorMessage
    });

    const rawKey = await readKey();
    const key = normaliseKey(rawKey);

    errorMessage = "";

    if (key.name === "ctrlC") {
      closeInput();
      process.exit(0);
    }

    if (key.name === "up") {
      typedNumber = "";
      selectedIndex =
        selectedIndex === 0 ? items.length - 1 : selectedIndex - 1;
      continue;
    }

    if (key.name === "down") {
      typedNumber = "";
      selectedIndex =
        selectedIndex === items.length - 1 ? 0 : selectedIndex + 1;
      continue;
    }

    if (key.name === "enter") {
      if (typedNumber !== "") {
        const chosenNumber = parseWholeNumber(typedNumber);

        if (
          chosenNumber !== null &&
          chosenNumber >= 1 &&
          chosenNumber <= items.length
        ) {
          return chosenNumber;
        }

        errorMessage = `Choose a number between 1 and ${items.length}.`;
        typedNumber = "";
        continue;
      }

      return selectedIndex + 1;
    }

    if (key.name === "backspace") {
      typedNumber = typedNumber.slice(0, -1);
      continue;
    }

    if (key.name === "digit") {
      if (items.length <= 9) {
        const chosenNumber = Number.parseInt(key.value, 10);

        if (chosenNumber >= 1 && chosenNumber <= items.length) {
          return chosenNumber;
        }

        errorMessage = `Choose a number between 1 and ${items.length}.`;
        continue;
      }

      typedNumber += key.value;

      const typedValue = parseWholeNumber(typedNumber);

      if (
        typedValue !== null &&
        typedValue >= 1 &&
        typedValue <= items.length
      ) {
        selectedIndex = typedValue - 1;
      }

      continue;
    }
  }
}

function renderChoiceList(config) {
  console.clear();

  console.log(style.line());
  console.log(style.title(` ${config.title}`));
  console.log(style.line());

  if (config.statusLines.length > 0) {
    for (const line of config.statusLines) {
      console.log(line);
    }

    console.log("");
  } else {
    console.log("");
  }

  for (let index = 0; index < config.items.length; index += 1) {
    const item = config.items[index];
    const isSelected = index === config.selectedIndex && config.typedNumber === "";

    const arrow = isSelected ? style.cursor("➤") : " ";
    const number = style.menuNumber(index + 1);
    const colour = item.colour ?? style.colours.oldBone;

    const label = isSelected
      ? style.selectedOptionName(item.label, colour)
      : style.optionName(item.label, colour);

    console.log(`${arrow} ${number} ${label}`);

    if (item.description !== undefined && item.description !== "") {
      const description = isSelected
        ? style.selectedSubtitle(`   ${item.description}`)
        : `   ${style.subtitle(item.description)}`;

      console.log(`  ${description}`);
    }
  }

  console.log("");

  const instruction =
    config.items.length <= 9
      ? "press a number, or use ↑/↓ then Enter"
      : "type a number then Enter, or use ↑/↓ then Enter";

  console.log(style.prompt(`${config.prompt} `) + style.dim(`(${instruction})`));

  if (config.typedNumber !== "") {
    console.log(`${style.dim("Typed:")} ${style.optionName(config.typedNumber, style.colours.tarnishedGold)}`);
  }

  if (config.errorMessage !== "") {
    console.log(style.error(config.errorMessage));
  }
}

function readKey() {
  return new Promise((resolve) => {
    disableRawMode();

    function cleanup() {
      input.off("data", onData);
      disableRawMode();
      input.pause();
    }

    function onData(buffer) {
      cleanup();
      resolve(buffer.toString("utf8"));
    }

    if (input.isTTY) {
      input.setRawMode(true);
    }

    input.resume();
    input.once("data", onData);
  });
}

function normaliseKey(rawKey) {
  if (rawKey === "\u0003") {
    return { name: "ctrlC" };
  }

  if (rawKey === "\r" || rawKey === "\n") {
    return { name: "enter" };
  }

  if (rawKey === "\u001b[A") {
    return { name: "up" };
  }

  if (rawKey === "\u001b[B") {
    return { name: "down" };
  }

  if (rawKey === "\u007f" || rawKey === "\b") {
    return { name: "backspace" };
  }

  if (/^\d$/.test(rawKey)) {
    return {
      name: "digit",
      value: rawKey
    };
  }

  return {
    name: "other",
    value: rawKey
  };
}

async function pause() {
  await ask("\nPress Enter to continue...");
}

function closeInput() {
  disableRawMode();
  input.pause();
}

function disableRawMode() {
  if (input.isTTY) {
    input.setRawMode(false);
  }
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
  chooseFromList,
  pause,
  closeInput,
  parseWholeNumber,
  parseDiceInput
};