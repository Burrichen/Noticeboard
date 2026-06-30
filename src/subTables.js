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
  // TODO: Isolated Location Area
  { text: "house", weight: 10 },
  { text: "farm", weight: 10 },
  { text: "outpost", weight: 10 }
];

const hauntedLocation = [
  // Used by: "exorcise a ghost from {hauntedLocation}"
  // Note: articles (a/an) are included in each entry.
  // TODO: Haunted Location Area
  { text: "a home", weight: 10 },
  { text: "a graveyard", weight: 10 },
  { text: "a shrine", weight: 10 },
  { text: "an inn", weight: 10 }
];

const protectedLocation = [
  // Used by: "protect {protectedLocation} from incoming attack"
  // Note: articles (a/an) are included in each entry.
  // TODO: Protected Location Area
  { text: "a caravan", weight: 10 },
  { text: "a farm", weight: 10 },
  { text: "an outpost", weight: 10 }
];

// -----------------------------------------------------------------------------
// OBJECT / THING SUB-TABLES
// -----------------------------------------------------------------------------

const strandedVehicle = [
  // Used by: "retrieve a {strandedVehicle} stranded off-route"
  // TODO: Stranded Vehicle Area
  { text: "wagon", weight: 10 },
  { text: "cart", weight: 10 },
  { text: "boat", weight: 10 }
];

const cursedThing = [
  // Used by: "destroy a cursed {cursedThing}"
  // TODO: Cursed Thing Area
  { text: "object", weight: 10 },
  { text: "relic", weight: 10 },
  { text: "shrine", weight: 10 }
];

// -----------------------------------------------------------------------------
// PERSON / FIGURE SUB-TABLES
// -----------------------------------------------------------------------------

const dislikedFigure = [
  // Used by: "escort a disliked {dislikedFigure} through town"
  // TODO: Disliked Figure Area
  { text: "official", weight: 10 },
  { text: "collector", weight: 10 },
  { text: "guild agent", weight: 10 }
];

const cursedSubject = [
  // Used by: "investigate and end a curse affecting a {cursedSubject}"
  // TODO: Cursed Subject Area
  { text: "person", weight: 10 },
  { text: "family", weight: 10 },
  { text: "place", weight: 10 }
];

// -----------------------------------------------------------------------------
// EVENT SUB-TABLES
// -----------------------------------------------------------------------------

const guardedEvent = [
  // Used by: "guard a {guardedEvent} from hostile forces"
  // TODO: Guarded Event Area
  { text: "ritual", weight: 10 },
  { text: "burial", weight: 10 },
  { text: "ceremony", weight: 10 }
];

// -----------------------------------------------------------------------------
// CONDITION SUB-TABLES
// -----------------------------------------------------------------------------

const paymentCondition = [
  // Used by: "the payment is {paymentCondition}"
  // TODO: Payment Condition Area
  { text: "fake", weight: 10 },
  { text: "stolen", weight: 10 },
  { text: "cursed", weight: 3 }
];

// -----------------------------------------------------------------------------

const SUB_TABLES = {
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
