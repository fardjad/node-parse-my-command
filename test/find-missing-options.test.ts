import { expect, test } from "bun:test";
import { Command } from "commander";
import { findMissingOptions } from "../src/index.js";
import { noop } from "../src/noop.js";

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

  expect([...missingOptions.entries()]).toEqual([
    [childCommand, new Set()],
    [rootCommand, new Set(["optionA"])],
  ]);
});
