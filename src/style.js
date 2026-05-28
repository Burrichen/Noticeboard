const colours = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m"
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
  return colour(bold(text), colours.brightCyan);
}

function menuNumber(number) {
  return colour(`${number}.`, colours.brightYellow);
}

function optionName(text, colourCode = colours.white) {
  return colour(bold(text), colourCode);
}

function prompt(text) {
  return colour(text, colours.brightGreen);
}

function error(text) {
  return colour(text, colours.brightRed);
}

function success(text) {
  return colour(text, colours.brightGreen);
}

function note(text) {
  return colour(text, colours.brightMagenta);
}

function illegal(text) {
  return colour(text, colours.brightRed);
}

function illegitimate(text) {
  return colour(text, colours.brightYellow);
}

function legitimate(text) {
  return colour(text, colours.brightGreen);
}

function line() {
  return colour("=".repeat(35), colours.cyan);
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

  if (text === "World-building Note") {
    return note(text);
  }

  return text;
}

module.exports = {
  colours,
  colour,
  bold,
  dim,
  title,
  menuNumber,
  optionName,
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