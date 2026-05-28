const { ask, parseDiceInput, parseWholeNumber } = require("./input");
const { QUALITY_TABLE, SIZE_TABLE } = require("./tables");
const style = require("./style");
const {
  formatDiceFormula,
  getDiceMaximum,
  getDiceMinimum,
  getMasterTableResult,
  rollDice,
  rollDie,
  rollOnPercentTable,
  validatePercentTable
} = require("./dice");

function validateTables() {
  for (const quality of QUALITY_TABLE) {
    validatePercentTable(`${quality.name} contract type table`, quality.contractTypeTable);
  }
}

async function generateNoticeboard(mode) {
  validateTables();

  const qualityChoice = await chooseQuality(mode);
  const sizeChoice = await chooseSize(mode);
  const noticeCountChoice = await chooseNoticeCount(sizeChoice.option, mode);

  const notices = [];

  for (let i = 1; i <= noticeCountChoice.count; i += 1) {
    const notice =
      mode === "manual"
        ? await generateNoticeManually(i, qualityChoice.option, sizeChoice.option)
        : generateNoticeAutomatically(i, qualityChoice.option, sizeChoice.option);

    notices.push(notice);
  }

  return {
    mode,
    quality: qualityChoice.option,
    qualityMethod: qualityChoice.method,
    size: sizeChoice.option,
    sizeMethod: sizeChoice.method,
    noticeCount: noticeCountChoice.count,
    noticeCountRoll: noticeCountChoice.rollText,
    notices
  };
}

async function chooseQuality(mode) {
  printQualityTable();

  if (mode === "automatic") {
    const roll = rollDie(10);
    const result = getMasterTableResult(QUALITY_TABLE, roll);

    return {
      option: result,
      method: `automatic d10 = ${roll}`
    };
  }

  while (true) {
    const answer = await ask("Choose quality: ");

    const d10Roll = parseDiceInput(answer, 10);

    if (d10Roll !== null) {
      const result = getMasterTableResult(QUALITY_TABLE, d10Roll);

      return {
        option: result,
        method: `manual d10 = ${d10Roll}`
      };
    }

    const chosenId = parseWholeNumber(answer);
    const result = QUALITY_TABLE.find((quality) => quality.id === chosenId);

    if (result !== undefined) {
      return {
        option: result,
        method: "manual selection"
      };
    }

    console.log(style.error("Invalid quality choice."));
  }
}

async function chooseSize(mode) {
  printSizeTable();

  if (mode === "automatic") {
    const roll = rollDie(10);
    const result = getMasterTableResult(SIZE_TABLE, roll);

    return {
      option: result,
      method: `automatic d10 = ${roll}`
    };
  }

  while (true) {
    const answer = await ask("Choose size: ");

    const d10Roll = parseDiceInput(answer, 10);

    if (d10Roll !== null) {
      const result = getMasterTableResult(SIZE_TABLE, d10Roll);

      return {
        option: result,
        method: `manual d10 = ${d10Roll}`
      };
    }

    const chosenId = parseWholeNumber(answer);
    const result = SIZE_TABLE.find((size) => size.id === chosenId);

    if (result !== undefined) {
      return {
        option: result,
        method: "manual selection"
      };
    }

    console.log(style.error("Invalid size choice."));
  }
}

async function chooseNoticeCount(size, mode) {
  const minimum = getDiceMinimum(size.contractDice);
  const maximum = getDiceMaximum(size.contractDice);
  const formulaText = formatDiceFormula(size.contractDice);

  if (mode !== "manual") {
    const roll = rollDice(size.contractDice);

    return {
      count: roll.total,
      rollText: `automatic ${formulaText}`
    };
  }

  while (true) {
    const answer = await ask(
      `Enter notice count ${minimum}-${maximum}, or press Enter to roll: `
    );

    if (answer === "") {
      const roll = rollDice(size.contractDice);

      return {
        count: roll.total,
        rollText: `automatic ${formulaText}`
      };
    }

    const total = parseWholeNumber(answer);

    if (total !== null && total >= minimum && total <= maximum) {
      return {
        count: total,
        rollText: "manual selection"
      };
    }

    console.log(style.error(`Invalid total. Must be between ${minimum} and ${maximum}.`));
  }
}

function generateNoticeAutomatically(number, quality, size) {
  const noteRoll = rollDie(100);

  if (noteRoll <= size.noteChancePercent) {
    return {
      number,
      outcome: "World-building Note",
      noteRoll: `d100 = ${noteRoll}`
    };
  }

  const contractTypeRoll = rollDie(100);
  const contractType = rollOnPercentTable(quality.contractTypeTable, contractTypeRoll);

  return {
    number,
    outcome: contractType,
    noteRoll: `d100 = ${noteRoll}`,
    contractTypeRoll: `d100 = ${contractTypeRoll}`
  };
}

async function generateNoticeManually(number, quality, size) {
  console.log("");
  console.log(`${style.dim("---")} ${style.title(`Notice ${number}`)} ${style.dim("---")}`);

  const noteChoice = await chooseNoteOrContract(size);

  if (noteChoice.isNote) {
    return {
      number,
      outcome: "World-building Note",
      noteRoll: noteChoice.rollText
    };
  }

  const contractChoice = await chooseContractType(quality);

  return {
    number,
    outcome: contractChoice.contractType,
    noteRoll: noteChoice.rollText,
    contractTypeRoll: contractChoice.rollText
  };
}

async function chooseNoteOrContract(size) {
  while (true) {
    const answer = await ask("Note or contract? N/C, or Enter to roll: ");

    if (answer === "") {
      const roll = rollDie(100);

      return {
        isNote: roll <= size.noteChancePercent,
        rollText: `automatic d100 = ${roll}`
      };
    }

    const normalized = answer.toLowerCase();

    if (normalized === "n" || normalized === "note") {
      return {
        isNote: true,
        rollText: "manual selection"
      };
    }

    if (normalized === "c" || normalized === "contract") {
      return {
        isNote: false,
        rollText: "manual selection"
      };
    }

    const d100Roll = parseDiceInput(answer, 100);

    if (d100Roll !== null) {
      return {
        isNote: d100Roll <= size.noteChancePercent,
        rollText: `manual d100 = ${d100Roll}`
      };
    }

    console.log(style.error("Invalid choice."));
  }
}

async function chooseContractType(quality) {
  while (true) {
    console.log("");
    console.log(`${style.menuNumber(1)} ${style.illegal("Illegal")}`);
    console.log(`${style.menuNumber(2)} ${style.illegitimate("Illegitimate")}`);
    console.log(`${style.menuNumber(3)} ${style.legitimate("Legitimate")}`);

    const answer = await ask("Choose contract type, or Enter to roll: ");

    if (answer === "") {
      const roll = rollDie(100);

      return {
        contractType: rollOnPercentTable(quality.contractTypeTable, roll),
        rollText: `automatic d100 = ${roll}`
      };
    }

    const d100Roll = parseDiceInput(answer, 100);

    if (d100Roll !== null) {
      return {
        contractType: rollOnPercentTable(quality.contractTypeTable, d100Roll),
        rollText: `manual d100 = ${d100Roll}`
      };
    }

    if (answer === "1") {
      return {
        contractType: "Illegal",
        rollText: "manual selection"
      };
    }

    if (answer === "2") {
      return {
        contractType: "Illegitimate",
        rollText: "manual selection"
      };
    }

    if (answer === "3") {
      return {
        contractType: "Legitimate",
        rollText: "manual selection"
      };
    }

    console.log(style.error("Invalid contract type."));
  }
}

function printQualityTable() {
  console.log(style.line());
  console.log(style.title(" Quality"));
  console.log(style.line());
  console.log("");

  for (const quality of QUALITY_TABLE) {
    const colour = getQualityColour(quality.name);

    console.log(`${style.menuNumber(quality.id)} ${style.optionName(quality.name, colour)}`);
    console.log(`   ${style.dim(quality.description)}`);
  }

  console.log("");
}

function printSizeTable() {
  console.log(style.line());
  console.log(style.title(" Size"));
  console.log(style.line());
  console.log("");

  for (const size of SIZE_TABLE) {
    const colour = getSizeColour(size.id);

    console.log(`${style.menuNumber(size.id)} ${style.optionName(size.name, colour)}`);
    console.log(`   ${style.dim(size.description)}`);
  }

  console.log("");
}

function getQualityColour(name) {
  if (name === "Underground") {
    return style.colours.brightRed;
  }

  if (name === "Decrepit") {
    return style.colours.yellow;
  }

  if (name === "Standard") {
    return style.colours.white;
  }

  if (name === "Good") {
    return style.colours.brightGreen;
  }

  return style.colours.brightCyan;
}

function getSizeColour(id) {
  if (id === 1) {
    return style.colours.brightBlue;
  }

  if (id === 2) {
    return style.colours.cyan;
  }

  if (id === 3) {
    return style.colours.white;
  }

  if (id === 4) {
    return style.colours.brightYellow;
  }

  return style.colours.brightMagenta;
}

module.exports = {
  generateNoticeboard
};