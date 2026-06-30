const fs = require("fs");
const path = require("path");

const NOTICEBOARDS_DIR = path.join(__dirname, "..", "noticeboards");
const LINE = "=".repeat(64);
const DIVIDER = "-".repeat(64);

function exportNoticeboard(result) {
  if (!fs.existsSync(NOTICEBOARDS_DIR)) {
    fs.mkdirSync(NOTICEBOARDS_DIR);
  }

  const filepath = getFilePath();
  fs.writeFileSync(filepath, formatNoticeboard(result), "utf8");
  return filepath;
}

function getFilePath() {
  const base = path.join(NOTICEBOARDS_DIR, "noticeboard.txt");
  if (!fs.existsSync(base)) return base;

  let index = 1;
  while (true) {
    const candidate = path.join(NOTICEBOARDS_DIR, `noticeboard${index}.txt`);
    if (!fs.existsSync(candidate)) return candidate;
    index++;
  }
}

function formatNoticeboard(result) {
  const lines = [];

  lines.push(LINE);
  lines.push("  DND NOTICEBOARD GENERATOR");
  lines.push(LINE);
  lines.push("");
  lines.push(`  Mode ................... ${formatMode(result.mode)}`);
  lines.push(`  Kurovian Flavour ....... ${result.kurovianFlavour ? "Enabled" : "Disabled"}`);
  lines.push(`  Quality ................ ${result.quality?.name ?? "Unknown"}`);
  lines.push(`  Size ................... ${result.size?.name ?? "Unknown"}`);
  lines.push(`  Notices ................ ${result.noticeCount}`);
  lines.push("");
  lines.push(LINE);
  lines.push("  NOTICES");
  lines.push(LINE);

  for (const notice of result.notices) {
    lines.push("");
    lines.push(`  [${notice.number}] — ${notice.outcome.toUpperCase()} CONTRACT`);
    lines.push(`  ${DIVIDER}`);

    const contract =
      notice.legitimateContract ?? notice.illegitimateContract ?? notice.illegalContract;

    if (contract) {
      for (const line of wordWrap(contract.sentence, 58)) {
        lines.push(`  ${line}`);
      }
      lines.push("");
      lines.push(`  Reward: ${contract.rewardText}`);
    }
  }

  lines.push("");
  lines.push(LINE);
  lines.push("");

  return lines.join("\n");
}

function wordWrap(text, maxWidth) {
  const words = text.split(" ");
  const result = [];
  let current = "";

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxWidth) {
      current += " " + word;
    } else {
      result.push(current);
      current = word;
    }
  }

  if (current.length > 0) {
    result.push(current);
  }

  return result;
}

function formatMode(mode) {
  if (mode === "manual") return "Manual";
  if (mode === "semiAutomatic") return "Semi-automatic";
  return "Automatic";
}

module.exports = { exportNoticeboard };
