const { chooseFromList } = require("./input");
const { QUALITY_TABLE, SIZE_TABLE } = require("./tables");
const style = require("./style");
const { generateLegitimateContract, validateLegitimateTables } = require("./legitimateContracts");
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

  validateLegitimateTables();
}

async function generateNoticeboard(mode, options = {}) {
  validateTables();

  const generatorOptions = {
    kurovianFlavour: options.kurovianFlavour === true
  };

  const qualityChoice = await chooseQuality(mode);
  const sizeChoice = await chooseSize(mode);
  const noticeCountChoice = await chooseNoticeCount(sizeChoice.option, mode);

  const notices = [];

  for (let i = 1; i <= noticeCountChoice.count; i += 1) {
    const notice =
      mode === "manual"
        ? await generateNoticeManually(i, qualityChoice.option, sizeChoice.option, mode, generatorOptions)
        : await generateNoticeAutomatically(i, qualityChoice.option, sizeChoice.option, mode, generatorOptions);

    notices.push(notice);
  }

  return {
    mode,
    kurovianFlavour: generatorOptions.kurovianFlavour,
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
  if (mode === "automatic") {
    const roll = rollDie(10);
    const result = getMasterTableResult(QUALITY_TABLE, roll);

    return {
      option: result,
      method: `automatic d10 = ${roll}`
    };
  }

  const chosenId = await chooseFromList({
    title: "Quality",
    prompt: "Choose quality",
    items: QUALITY_TABLE.map((quality) => {
      return {
        label: quality.name,
        description: quality.description,
        colour: getQualityColour(quality.name)
      };
    })
  });

  const result = QUALITY_TABLE.find((quality) => quality.id === chosenId);

  return {
    option: result,
    method: "manual selection"
  };
}

async function chooseSize(mode) {
  if (mode === "automatic") {
    const roll = rollDie(10);
    const result = getMasterTableResult(SIZE_TABLE, roll);

    return {
      option: result,
      method: `automatic d10 = ${roll}`
    };
  }

  const chosenId = await chooseFromList({
    title: "Size",
    prompt: "Choose size",
    items: SIZE_TABLE.map((size) => {
      return {
        label: size.name,
        description: size.description,
        colour: getSizeColour(size.id)
      };
    })
  });

  const result = SIZE_TABLE.find((size) => size.id === chosenId);

  return {
    option: result,
    method: "manual selection"
  };
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

  const noticeCountOptions = [];

  for (let count = minimum; count <= maximum; count += 1) {
    noticeCountOptions.push({
      label: `${count}`,
      description: `${count} notice${count === 1 ? "" : "s"}`,
      colour: style.colours.oldBone
    });
  }

  const chosenIndex = await chooseFromList({
    title: "Notice Count",
    statusLines: [
      `${style.dim("Board size:")} ${style.optionName(size.name, style.colours.tarnishedGold)}`
    ],
    prompt: "Choose notice count",
    items: noticeCountOptions
  });

  return {
    count: minimum + chosenIndex - 1,
    rollText: "manual selection"
  };
}

async function generateNoticeAutomatically(number, quality, size, mode, options) {
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
  const legitimateContract =
    contractType === "Legitimate"
      ? await generateLegitimateContract(mode, options)
      : undefined;

  return {
    number,
    outcome: contractType,
    noteRoll: `d100 = ${noteRoll}`,
    contractTypeRoll: `d100 = ${contractTypeRoll}`,
    legitimateContract
  };
}

async function generateNoticeManually(number, quality, size, mode, options) {
  const noteChoice = await chooseNoteOrContract(number);

  if (noteChoice.isNote) {
    return {
      number,
      outcome: "World-building Note",
      noteRoll: noteChoice.rollText
    };
  }

  const contractChoice = await chooseContractType(number);
  const legitimateContract =
    contractChoice.contractType === "Legitimate"
      ? await generateLegitimateContract(mode, options)
      : undefined;

  return {
    number,
    outcome: contractChoice.contractType,
    noteRoll: noteChoice.rollText,
    contractTypeRoll: contractChoice.rollText,
    legitimateContract
  };
}

async function chooseNoteOrContract(number) {
  const choice = await chooseFromList({
    title: `Notice ${number}`,
    prompt: "Choose notice type",
    items: [
      {
        label: "World-building Note",
        description: "A piece of lore, rumour, news, warning, or city flavour.",
        colour: style.colours.cursedViolet
      },
      {
        label: "Contract",
        description: "A job or request that can lead to an adventure.",
        colour: style.colours.oldBone
      }
    ]
  });

  return {
    isNote: choice === 1,
    rollText: "manual selection"
  };
}

async function chooseContractType(number) {
  const choice = await chooseFromList({
    title: `Notice ${number} Contract Type`,
    prompt: "Choose contract type",
    items: [
      {
        label: "Illegal",
        colour: style.colours.blood
      },
      {
        label: "Illegitimate",
        colour: style.colours.rust
      },
      {
        label: "Legitimate",
        colour: style.colours.corpseGreen
      }
    ]
  });

  if (choice === 1) {
    return {
      contractType: "Illegal",
      rollText: "manual selection"
    };
  }

  if (choice === 2) {
    return {
      contractType: "Illegitimate",
      rollText: "manual selection"
    };
  }

  return {
    contractType: "Legitimate",
    rollText: "manual selection"
  };
}

function getQualityColour(name) {
  if (name === "Underground") {
    return style.colours.blood;
  }

  if (name === "Decrepit") {
    return style.colours.rust;
  }

  if (name === "Standard") {
    return style.colours.oldBone;
  }

  if (name === "Good") {
    return style.colours.witchGreen;
  }

  return style.colours.ghostCyan;
}

function getSizeColour(id) {
  if (id === 1) {
    return style.colours.midnightBlue;
  }

  if (id === 2) {
    return style.colours.ghostCyan;
  }

  if (id === 3) {
    return style.colours.oldBone;
  }

  if (id === 4) {
    return style.colours.tarnishedGold;
  }

  return style.colours.cursedViolet;
}

module.exports = {
  generateNoticeboard
};