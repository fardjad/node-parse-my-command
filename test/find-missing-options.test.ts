import { findMissingOptions } from "../src/index.js";
import { noop } from "../src/noop.js";
import { Command } from "commander";
import assert from "node:assert";
import test from "node:test";

await test("findMissingOptions", async () => {
  const rootCommand = new Command();
  rootCommand.requiredOption("-a, --option-a <value>", "option a");
  const childCommand = new Command("child").requiredOption(
    "-b, --option-b <value>",
    "option b",
  );
  childCommand.action(noop);
  rootCommand.addCommand(childCommand);

  const missingOptions = findMissingOptions(
    childCommand,
    new Map([
      [rootCommand, {}],
      [childCommand, { optionB: "value2" }],
    ]),
  );

  assert.deepStrictEqual(
    [...missingOptions.entries()],
    [
      [childCommand, new Set()],
      [rootCommand, new Set(["optionA"])],
    ],
  );
});
