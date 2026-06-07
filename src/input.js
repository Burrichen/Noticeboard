const readlinePromises = require("readline/promises");
const readline = require("readline");
const { stdin: input, stdout: output } = require("process");
const style = require("./style");

async function ask(question) {
  disableRawMode();

  const rl = readlinePromises.createInterface({ input, output });
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
  let previousLineCount = 0;

  clearTerminal();

  while (true) {
    previousLineCount = renderChoiceList({
      title,
      statusLines,
      prompt,
      items,
      selectedIndex,
      typedNumber,
      errorMessage,
      previousLineCount
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

async function askSingleKeyNumber(question, minimum, maximum) {
  const items = [];

  for (let value = minimum; value <= maximum; value += 1) {
    items.push({
      label: String(value),
      colour: style.colours.oldBone
    });
  }

  const selectedIndex = await chooseFromList({
    title: cleanQuestionForTitle(question),
    prompt: question,
    items
  });

  return minimum + selectedIndex - 1;
}

async function askSingleKeyChoice(question, allowedKeys) {
  const items = allowedKeys.map((key) => {
    return {
      label: key.toUpperCase(),
      colour: style.colours.oldBone
    };
  });

  const selectedIndex = await chooseFromList({
    title: cleanQuestionForTitle(question),
    prompt: question,
    items
  });

  return allowedKeys[selectedIndex - 1].toLowerCase();
}

function renderChoiceList(config) {
  const lines = [];

  lines.push(style.line());
  lines.push(style.title(` ${config.title}`));
  lines.push(style.line());

  if (config.statusLines.length > 0) {
    for (const line of config.statusLines) {
      lines.push(line);
    }

    lines.push("");
  } else {
    lines.push("");
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

    lines.push(`${arrow} ${number} ${label}`);

    if (item.description !== undefined && item.description !== "") {
      const description = isSelected
        ? style.selectedSubtitle(`   ${item.description}`)
        : `   ${style.subtitle(item.description)}`;

      lines.push(`  ${description}`);
    }
  }

  lines.push("");

  const instruction =
    config.items.length <= 9
      ? "press a number, or use ↑/↓ then Enter"
      : "type a number then Enter, or use ↑/↓ then Enter";

  lines.push(style.prompt(`${config.prompt} `) + style.dim(`(${instruction})`));

  if (config.typedNumber !== "") {
    lines.push(
      `${style.dim("Typed:")} ${style.optionName(config.typedNumber, style.colours.tarnishedGold)}`
    );
  }

  if (config.errorMessage !== "") {
    lines.push(style.error(config.errorMessage));
  }

  redrawInPlace(lines, config.previousLineCount);

  return lines.length;
}

function redrawInPlace(lines, previousLineCount) {
  if (previousLineCount > 0) {
    readline.moveCursor(output, 0, -previousLineCount);
    readline.clearScreenDown(output);
  }

  output.write(`${lines.join("\n")}\n`);
}

function clearTerminal() {
  readline.cursorTo(output, 0, 0);
  readline.clearScreenDown(output);
}

function readKey() {
  return new Promise((resolve) => {
    disableRawMode();

    function cleanup() {
      input.off("data", onData);
      disableRawMode();
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

function cleanQuestionForTitle(question) {
  return question
    .replaceAll(":", "")
    .replaceAll("?", "")
    .trim() || "Choose";
}

module.exports = {
  ask,
  askNumber,
  chooseFromList,
  askSingleKeyNumber,
  askSingleKeyChoice,
  pause,
  closeInput,
  parseWholeNumber,
  parseDiceInput
};