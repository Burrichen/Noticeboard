import { common, CustomWorld } from "@fxd-qa/bolt";
import { generateTypingCommands } from "@fxd-qa/keyboard-navigator";
import { setTimeout as sleep } from "node:timers/promises";

const log = common.LoggerFactory.getSubLogger({ name: "RokuSearchKeyboard" });

/**
 * ABC123 search keyboard character grid.
 *
 * Visible Roku layout:
 *
 *   [shift]   a b c d e f g   1 2 3
 *   [space]   h i j k l m n   4 5 6
 *   [delete]  o p q r s t u   7 8 9
 *   [arrows]  v w x y z - _   @ . 0
 *
 * The generateTypingCommands grid should stay as the character grid only.
 * The left control rail is handled only during the initial sync.
 */
export const ROKU_ABC123_GRID = [
  ["a", "b", "c", "d", "e", "f", "g", "1", "2", "3"],
  ["h", "i", "j", "k", "l", "m", "n", "4", "5", "6"],
  ["o", "p", "q", "r", "s", "t", "u", "7", "8", "9"],
  ["v", "w", "x", "y", "z", "-", "_", "@", ".", "0"],
];

const BUTTON_PRESS_DELAY_MS = 1000;

/**
 * The Roku keyboard opens on the left control rail, one column before "a".
 * So to reach character column 0, we still need one right press.
 */
const ROKU_LEFT_CONTROL_RAIL_OFFSET = 1;

export function getRokuAbc123KeyCoords(character: string): {
  row: number;
  col: number;
} {
  const normalizedCharacter = character.toLowerCase();

  for (let row = 0; row < ROKU_ABC123_GRID.length; row += 1) {
    const col = ROKU_ABC123_GRID[row].indexOf(normalizedCharacter);

    if (col >= 0) {
      return { row, col };
    }
  }

  throw new Error(`Character not on Roku ABC123 keyboard: ${character}`);
}

async function pressAndWait(this: CustomWorld, button: string) {
  log.info(button);

  if (button === "select") {
    await this.pressButton("enter");
  } else {
    await this.pressButton(button);
  }

  await sleep(BUTTON_PRESS_DELAY_MS);
}

/**
 * Initial focus is on the top-left control rail, not on "a".
 *
 * Example:
 * - "a" is col 0, but needs 1 right press.
 * - "g" is col 6, but needs 7 right presses.
 * - "1" is col 7, but needs 8 right presses.
 */
async function syncRokuSearchKeyboardTo(
  this: CustomWorld,
  targetRow: number,
  targetCol: number,
) {
  const rightPresses = targetCol + ROKU_LEFT_CONTROL_RAIL_OFFSET;

  for (let i = 0; i < rightPresses; i += 1) {
    await pressAndWait.call(this, "right");
  }

  for (let i = 0; i < targetRow; i += 1) {
    await pressAndWait.call(this, "down");
  }
}

async function executeButtonSequence(this: CustomWorld, buttonSequence: string[]) {
  for (let i = 0; i < buttonSequence.length; i += 1) {
    await pressAndWait.call(this, buttonSequence[i]);
  }
}

export async function typeOnRokuSearchKeyboard(
  this: CustomWorld,
  input: string,
) {
  if (!input.length) {
    return;
  }

  const normalizedInput = input.toLowerCase();
  const focusCoords = getRokuAbc123KeyCoords(normalizedInput[0]);

  log.info(
    `Syncing Roku keyboard to first character "${normalizedInput[0]}" at row ${focusCoords.row}, col ${focusCoords.col}`,
  );

  await syncRokuSearchKeyboardTo.call(
    this,
    focusCoords.row,
    focusCoords.col,
  );

  const buttonSequence = await generateTypingCommands(
    normalizedInput,
    ROKU_ABC123_GRID,
    [[]],
    [[]],
    focusCoords.col,
    focusCoords.row,
    true,
    "Roku",
  );

  log.info(`Generated sequence: ${JSON.stringify(buttonSequence)}`);

  await executeButtonSequence.call(this, buttonSequence);
}

export default typeOnRokuSearchKeyboard;