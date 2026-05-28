const QUALITY_TABLE = [
  {
    id: 1,
    name: "Underground",
    description: "A noticeboard in an illegal place, or one known for illegal contracts.",
    contractTypeTable: [
      { result: "Illegal", percent: 70 },
      { result: "Illegitimate", percent: 25 },
      { result: "Legitimate", percent: 5 }
    ]
  },
  {
    id: 2,
    name: "Decrepit",
    description: "A noticeboard that is badly maintained, ignored, or unreliable.",
    contractTypeTable: [
      { result: "Illegal", percent: 35 },
      { result: "Illegitimate", percent: 35 },
      { result: "Legitimate", percent: 30 }
    ]
  },
  {
    id: 3,
    name: "Standard",
    description: "An average noticeboard.",
    contractTypeTable: [
      { result: "Illegal", percent: 15 },
      { result: "Illegitimate", percent: 40 },
      { result: "Legitimate", percent: 45 }
    ]
  },
  {
    id: 4,
    name: "Good",
    description: "A good quality noticeboard.",
    contractTypeTable: [
      { result: "Illegal", percent: 10 },
      { result: "Illegitimate", percent: 35 },
      { result: "Legitimate", percent: 55 }
    ]
  },
  {
    id: 5,
    name: "Pristine",
    description: "A pristine, official, well-maintained noticeboard.",
    contractTypeTable: [
      { result: "Illegal", percent: 5 },
      { result: "Illegitimate", percent: 10 },
      { result: "Legitimate", percent: 85 }
    ]
  }
];

const SIZE_TABLE = [
  {
    id: 1,
    name: "Tiny",
    description: "A tiny noticeboard with only a handful of notices.",
    contractDice: { numberOfDice: 1, sides: 4, modifier: 0 },
    noteChancePercent: 25
  },
  {
    id: 2,
    name: "Small",
    description: "A small noticeboard with a modest number of notices.",
    contractDice: { numberOfDice: 2, sides: 4, modifier: 0 },
    noteChancePercent: 25
  },
  {
    id: 3,
    name: "Average",
    description: "A typical noticeboard with a decent spread of notices.",
    contractDice: { numberOfDice: 3, sides: 4, modifier: -1 },
    noteChancePercent: 25
  },
  {
    id: 4,
    name: "Large",
    description: "A large noticeboard with many available notices.",
    contractDice: { numberOfDice: 4, sides: 4, modifier: 0 },
    noteChancePercent: 25
  },
  {
    id: 5,
    name: "Enormous",
    description: "An enormous noticeboard packed with notices.",
    contractDice: { numberOfDice: 5, sides: 4, modifier: -1 },
    noteChancePercent: 25
  }
];

module.exports = {
  QUALITY_TABLE,
  SIZE_TABLE
};