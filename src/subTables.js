// Shared sub-tables used across multiple contract files.
//
// Sub-tables are rolled automatically when a parent entry has a matching
// subTableKey property. They are display-only detail and do not affect
// reward calculation.
//
// Each entry only needs:
//   text:   "your text here"
//   weight: 10
//
// Higher weight = more common. Does not need to total 100.
// Add kurovian: true to any entry to hide it unless Kurovian Flavour is on.

// -----------------------------------------------------------------------------
// LOCATION / SETTING SUB-TABLES
// -----------------------------------------------------------------------------

const isolatedLocation = [
  // Used by: "carry supplies to an isolated {isolatedLocation}"
  // Roll d6. Total weight = 6 (equal).
  { text: "house", weight: 2 },
  { text: "farm", weight: 2 },
  { text: "outpost", weight: 2 }
];

const hauntedLocation = [
  // Used by: "exorcise a ghost from {hauntedLocation}"
  // Note: articles (a/an) are included in each entry.
  // Roll d4. Total weight = 4 (equal).
  { text: "a home", weight: 1 },
  { text: "a graveyard", weight: 1 },
  { text: "a shrine", weight: 1 },
  { text: "an inn", weight: 1 }
];

const protectedLocation = [
  // Used by: "protect {protectedLocation} from incoming attack"
  // Note: articles (a/an) are included in each entry.
  // Roll d6. Total weight = 6 (equal).
  { text: "a caravan", weight: 2 },
  { text: "a farm", weight: 2 },
  { text: "an outpost", weight: 2 }
];

// -----------------------------------------------------------------------------
// OBJECT / THING SUB-TABLES
// -----------------------------------------------------------------------------

const strandedVehicle = [
  // Used by: "retrieve a {strandedVehicle} stranded off-route"
  // Roll d6. Total weight = 6 (equal).
  { text: "wagon", weight: 2 },
  { text: "cart", weight: 2 },
  { text: "boat", weight: 2 }
];

const cursedThing = [
  // Used by: "destroy a cursed {cursedThing}"
  // Roll d6. Total weight = 6 (equal).
  { text: "object", weight: 2 },
  { text: "relic", weight: 2 },
  { text: "shrine", weight: 2 }
];

// -----------------------------------------------------------------------------
// PERSON / FIGURE SUB-TABLES
// -----------------------------------------------------------------------------

const dislikedFigure = [
  // Used by: "escort a disliked {dislikedFigure} through town"
  // Roll d6. Total weight = 6 (equal).
  { text: "official", weight: 2 },
  { text: "collector", weight: 2 },
  { text: "guild agent", weight: 2 }
];

const cursedSubject = [
  // Used by: "investigate and end a curse affecting a {cursedSubject}"
  // Roll d6. Total weight = 6 (equal).
  { text: "person", weight: 2 },
  { text: "family", weight: 2 },
  { text: "place", weight: 2 }
];

// -----------------------------------------------------------------------------
// EVENT SUB-TABLES
// -----------------------------------------------------------------------------

const guardedEvent = [
  // Used by: "guard a {guardedEvent} from hostile forces"
  // Roll d6. Total weight = 6 (equal).
  { text: "ritual", weight: 2 },
  { text: "burial", weight: 2 },
  { text: "ceremony", weight: 2 }
];

// -----------------------------------------------------------------------------
// JOB SUB-TABLES
// -----------------------------------------------------------------------------

const job = [
  // Used by: "work at a {job}"
  // Roll d10. Total weight = 10 (equal).
  { text: "lumber mill", weight: 1 },
  { text: "mine", weight: 1 },
  { text: "repair work", weight: 1 },
  { text: "cargo lifting", weight: 1 },
  { text: "farm", weight: 1 },
  { text: "forge", weight: 1 },
  { text: "tavern", weight: 1 },
  { text: "bakery", weight: 1 },
  { text: "courier service", weight: 1 },
  { text: "cleaners service", weight: 1 }
];

// -----------------------------------------------------------------------------
// CONDITION SUB-TABLES
// -----------------------------------------------------------------------------

const paymentCondition = [
  // Used by: "the payment is {paymentCondition}"
  // Roll d6. Total weight = 6.
  { text: "fake", weight: 3 },
  { text: "stolen", weight: 2 },
  { text: "cursed", weight: 1 }
];

// -----------------------------------------------------------------------------

const SUB_TABLES = {
  job,
  isolatedLocation,
  hauntedLocation,
  protectedLocation,
  strandedVehicle,
  cursedThing,
  dislikedFigure,
  cursedSubject,
  guardedEvent,
  paymentCondition
};

const SUB_TABLE_LABELS = {
  job: "Job",
  isolatedLocation: "Isolated Location",
  hauntedLocation: "Haunted Location",
  protectedLocation: "Protected Location",
  strandedVehicle: "Stranded Vehicle",
  cursedThing: "Cursed Thing",
  dislikedFigure: "Disliked Figure",
  cursedSubject: "Cursed Subject",
  guardedEvent: "Guarded Event",
  paymentCondition: "Payment Condition"
};

module.exports = {
  SUB_TABLES,
  SUB_TABLE_LABELS,
  job,
  isolatedLocation,
  hauntedLocation,
  protectedLocation,
  strandedVehicle,
  cursedThing,
  dislikedFigure,
  cursedSubject,
  guardedEvent,
  paymentCondition
};
