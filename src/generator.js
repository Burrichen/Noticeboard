const { chooseFromList, GoBackError, SkipToResultsError } = require("./input");
const { QUALITY_TABLE, SIZE_TABLE } = require("./tables");
const style = require("./style");
const { generateLegitimateContract, validateLegitimateTables } = require("./legitimateContracts");
const { generateIllegitimateContract, validateIllegitimateTables } = require("./illegitimateContracts");
const { generateIllegalContract, validateIllegalTables } = require("./illegalContracts");
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
  validateIllegitimateTables();
  validateIllegalTables();
}

async function generateNoticeboard(mode, options = {}) {
  validateTables();

  const generatorOptions = {
    kurovianFlavour: options.kurovianFlavour === true
  };

  let qualityChoice = null;
  let sizeChoice = null;
  let noticeCountChoice = null;
  const notices = [];

  // State machine: each state is one "step". GoBack transitions to the prior state;
  // SkipToResults (Esc) finalises generation with whatever notices were completed.
  let state = "quality";

  while (state !== "done") {
    try {
      if (state === "quality") {
        qualityChoice = await chooseQuality(mode);
        state = "size";
      } else if (state === "size") {
        sizeChoice = await chooseSize(mode);
        state = "noticeCount";
      } else if (state === "noticeCount") {
        noticeCountChoice = await chooseNoticeCount(sizeChoice.option, mode);
        state = "notices";
      } else if (state === "notices") {
        const noticeNumber = notices.length + 1;

        if (noticeNumber > noticeCountChoice.count) {
          state = "done";
        } else {
          const notice =
            mode === "manual"
              ? await generateNoticeManually(noticeNumber, qualityChoice.option, sizeChoice.option, mode, generatorOptions)
              : await generateNoticeAutomatically(noticeNumber, qualityChoice.option, sizeChoice.option, mode, generatorOptions);

          notices.push(notice);
        }
      }
    } catch (e) {
      if (e instanceof SkipToResultsError) {
        if (state !== "notices") throw e; // Nothing useful yet — let caller handle
        state = "done";
        continue;
      }

      if (e instanceof GoBackError) {
        if (state === "quality") continue; // Already at start — redo quality
        if (state === "size") { state = "quality"; continue; }
        if (state === "noticeCount") { state = "size"; continue; }
        if (state === "notices") {
          if (notices.length === 0) { state = "noticeCount"; } else { notices.pop(); }
          continue;
        }
      }

      throw e;
    }
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

  if (result === undefined) {
    throw new Error(`No quality found for option ${chosenId}.`);
  }

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

  if (result === undefined) {
    throw new Error(`No size found for option ${chosenId}.`);
  }

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
  const contractTypeRoll = rollDie(100);
  const contractType = rollOnPercentTable(quality.contractTypeTable, contractTypeRoll);

  const legitimateContract =
    contractType === "Legitimate"
      ? await generateLegitimateContract(mode, options)
      : undefined;

  const illegitimateContract =
    contractType === "Illegitimate"
      ? await generateIllegitimateContract(mode, options)
      : undefined;

  const illegalContract =
    contractType === "Illegal"
      ? await generateIllegalContract(mode, options)
      : undefined;

  return {
    number,
    outcome: contractType,
    contractTypeRoll: `d100 = ${contractTypeRoll}`,
    legitimateContract,
    illegitimateContract,
    illegalContract
  };
}

async function generateNoticeManually(number, quality, size, mode, options) {
  while (true) {
    // GoBack from chooseContractType propagates up to the state machine (back to previous notice).
    const contractChoice = await chooseContractType(number);

    try {
      const legitimateContract =
        contractChoice.contractType === "Legitimate"
          ? await generateLegitimateContract(mode, options)
          : undefined;

      const illegitimateContract =
        contractChoice.contractType === "Illegitimate"
          ? await generateIllegitimateContract(mode, options)
          : undefined;

      const illegalContract =
        contractChoice.contractType === "Illegal"
          ? await generateIllegalContract(mode, options)
          : undefined;

      return {
        number,
        outcome: contractChoice.contractType,
        contractTypeRoll: contractChoice.rollText,
        legitimateContract,
        illegitimateContract,
        illegalContract
      };
    } catch (e) {
      if (e instanceof GoBackError) {
        continue; // Back from inside a contract → redo contract type for this notice
      }
      throw e;
    }
  }
}

async function chooseContractType(number) {
  const choice = await chooseFromList({
    title: `Notice ${number} Contract Type`,
    prompt: "Choose contract type",
    items: [
      {
        label: "Illegal",
        description: "Criminal, forbidden, or openly unlawful work.",
        colour: style.colours.blood
      },
      {
        label: "Illegitimate",
        description: "Dubious, exploitative, unofficial, or morally suspect work.",
        colour: style.colours.rust
      },
      {
        label: "Legitimate",
        description: "Lawful or socially accepted work.",
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