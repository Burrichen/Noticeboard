const colours = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  reverse: "\x1b[7m",

  // Dark fantasy palette
  deepGreen: "\x1b[38;5;28m",
  blood: "\x1b[38;5;124m",
  ember: "\x1b[38;5;130m",
  tarnishedGold: "\x1b[38;5;178m",
  oldBone: "\x1b[38;5;223m",
  graveAsh: "\x1b[38;5;246m",
  witchGreen: "\x1b[38;5;65m",
  corpseGreen: "\x1b[38;5;108m",
  midnightBlue: "\x1b[38;5;67m",
  cursedViolet: "\x1b[38;5;97m",
  ghostCyan: "\x1b[38;5;109m",
  rust: "\x1b[38;5;166m",

  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m"
};

function colour(text, colourCode) {
  return `${colourCode}${text}${colours.reset}`;
}

function bold(text) {
  return colour(text, colours.bold);
}

function dim(text) {
  return colour(text, colours.dim);
}

function title(text) {
  return colour(bold(text), colours.oldBone);
}

function subtitle(text) {
  return colour(text, colours.graveAsh);
}

function menuNumber(number) {
  return colour(`${number}.`, colours.tarnishedGold);
}

function optionName(text, colourCode = colours.oldBone) {
  return colour(bold(text), colourCode);
}

function selectedOptionName(text, colourCode = colours.oldBone) {
  return `${colourCode}${colours.bold}${text}${colours.reset}`;
}

function selectedSubtitle(text) {
  return `${colours.bold}${colours.graveAsh}${text}${colours.reset}`;
}

function cursor(text) {
  return colour(text, colours.tarnishedGold);
}

function prompt(text) {
  return colour(text, colours.tarnishedGold);
}

function error(text) {
  return colour(text, colours.blood);
}

function success(text) {
  return colour(text, colours.witchGreen);
}

function note(text) {
  return colour(text, colours.cursedViolet);
}

function illegal(text) {
  return colour(text, colours.blood);
}

function illegitimate(text) {
  return colour(text, colours.rust);
}

function legitimate(text) {
  return colour(text, colours.corpseGreen);
}

function line() {
  return colour("=".repeat(35), colours.graveAsh);
}

function contractType(text) {
  if (text === "Illegal") {
    return illegal(text);
  }

  if (text === "Illegitimate") {
    return illegitimate(text);
  }

  if (text === "Legitimate") {
    return legitimate(text);
  }

  return text;
}

module.exports = {
  colours,
  colour,
  bold,
  dim,
  title,
  subtitle,
  menuNumber,
  optionName,
  selectedOptionName,
  selectedSubtitle,
  cursor,
  prompt,
  error,
  success,
  note,
  illegal,
  illegitimate,
  legitimate,
  line,
  contractType
};