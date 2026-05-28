function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(formula) {
  const rolls = [];

  for (let i = 0; i < formula.numberOfDice; i += 1) {
    rolls.push(rollDie(formula.sides));
  }

  const total = rolls.reduce((sum, roll) => sum + roll, 0) + formula.modifier;

  return { rolls, total };
}

function formatDiceFormula(formula) {
  const base = `${formula.numberOfDice}d${formula.sides}`;

  if (formula.modifier === 0) {
    return base;
  }

  if (formula.modifier > 0) {
    return `${base}+${formula.modifier}`;
  }

  return `${base}${formula.modifier}`;
}

function formatDiceRoll(formula, rolls, total) {
  const modifierText =
    formula.modifier === 0
      ? ""
      : formula.modifier > 0
        ? ` + ${formula.modifier}`
        : ` - ${Math.abs(formula.modifier)}`;

  return `${formatDiceFormula(formula)} = [${rolls.join(", ")}]${modifierText} = ${total}`;
}

function getDiceMinimum(formula) {
  return formula.numberOfDice + formula.modifier;
}

function getDiceMaximum(formula) {
  return formula.numberOfDice * formula.sides + formula.modifier;
}

function getMasterTableResult(table, d10Roll) {
  const result = table.find((row) => {
    const minimum = row.id * 2 - 1;
    const maximum = row.id * 2;
    return d10Roll >= minimum && d10Roll <= maximum;
  });

  if (!result) {
    throw new Error(`No master table result found for d10 roll ${d10Roll}.`);
  }

  return result;
}

function rollOnPercentTable(table, roll) {
  let currentMinimum = 1;

  for (const row of table) {
    const currentMaximum = currentMinimum + row.percent - 1;

    if (roll >= currentMinimum && roll <= currentMaximum) {
      return row.result;
    }

    currentMinimum = currentMaximum + 1;
  }

  throw new Error(`No result found for d100 roll ${roll}.`);
}

function getPercentTableText(table) {
  let currentMinimum = 1;

  return table
    .map((row) => {
      const currentMaximum = currentMinimum + row.percent - 1;
      const text = `${currentMinimum}-${currentMaximum}: ${row.result}`;
      currentMinimum = currentMaximum + 1;
      return text;
    })
    .join(", ");
}

function validatePercentTable(tableName, table) {
  const total = table.reduce((sum, row) => sum + row.percent, 0);

  if (total !== 100) {
    throw new Error(`${tableName} must total 100%, but it totals ${total}%.`);
  }
}

module.exports = {
  rollDie,
  rollDice,
  formatDiceFormula,
  formatDiceRoll,
  getDiceMinimum,
  getDiceMaximum,
  getMasterTableResult,
  rollOnPercentTable,
  getPercentTableText,
  validatePercentTable
};
