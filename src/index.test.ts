import { partialParse, findMissingOptions } from "./index.ts";
import { Command } from "commander";
import assert from "node:assert";
import test from "node:test";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

// To test the overriden action function
const rootCommand = new Command();
rootCommand.requiredOption("-a, --option-a <value>", "option a");

// To test the preSubcommand hook
const childCommand = new Command("child").requiredOption(
  "-b, --option-b <value>",
  "option b",
);
childCommand.action(noop);

// To test the preSubcommand hook for nested commands
const grandchildCommand = new Command("grandchild")
  .requiredOption("-c, --option-c <value>", "option c")
  .action(noop);

childCommand.addCommand(grandchildCommand);
rootCommand.addCommand(childCommand);

const argvBase = ["node", "root"];

await test("partialParse", async (t) => {
  await t.test("root without arguments", async (t) => {
    const { matchedCommand, providedOptions, missingOptions } = partialParse(
      rootCommand,
      [...argvBase],
    );

    assert.strictEqual(matchedCommand, rootCommand);

    assert.deepStrictEqual(providedOptions.get(matchedCommand), {});
    assert.deepStrictEqual(
      missingOptions.get(matchedCommand),
      new Set(["optionA"]),
    );
  });

  await t.test("root with arguments", async (t) => {
    const { matchedCommand, providedOptions, missingOptions } = partialParse(
      rootCommand,
      [...argvBase, "--option-a=value1"],
    );

    assert.strictEqual(matchedCommand, rootCommand);

    assert.deepStrictEqual(
      providedOptions,
      new Map([[matchedCommand, { optionA: "value1" }]]),
    );
    assert.deepStrictEqual(missingOptions.get(matchedCommand), new Set());
  });

  await t.test("child without arguments", async (t) => {
    const { matchedCommand, providedOptions, missingOptions } = partialParse(
      rootCommand,
      [...argvBase, "--option-a=value1", "child"],
    );

    assert.strictEqual(matchedCommand, childCommand);

    assert.deepStrictEqual(providedOptions.get(rootCommand), {
      optionA: "value1",
    });
    assert.deepStrictEqual(missingOptions.get(rootCommand), new Set());

    assert.deepStrictEqual(providedOptions.get(matchedCommand), {});
    assert.deepStrictEqual(
      missingOptions.get(matchedCommand),
      new Set(["optionB"]),
    );
  });

  await t.test("child with arguments", async (t) => {
    const { matchedCommand, providedOptions, missingOptions } = partialParse(
      rootCommand,
      [...argvBase, "--option-a=value1", "child", "--option-b=value2"],
    );

    assert.strictEqual(matchedCommand, childCommand);

    assert.deepStrictEqual(providedOptions.get(rootCommand), {
      optionA: "value1",
    });
    assert.deepStrictEqual(missingOptions.get(rootCommand), new Set());

    assert.deepStrictEqual(providedOptions.get(matchedCommand), {
      optionB: "value2",
    });
    assert.deepStrictEqual(missingOptions.get(matchedCommand), new Set());
  });

  await t.test("grandchild without arguments", async (t) => {
    const { matchedCommand, providedOptions, missingOptions } = partialParse(
      rootCommand,
      [...argvBase, "child", "grandchild"],
    );

    assert.strictEqual(matchedCommand, grandchildCommand);

    assert.deepStrictEqual(providedOptions.get(rootCommand), {});
    assert.deepStrictEqual(
      missingOptions.get(rootCommand),
      new Set(["optionA"]),
    );

    assert.deepStrictEqual(providedOptions.get(childCommand), {});
    assert.deepStrictEqual(
      missingOptions.get(childCommand),
      new Set(["optionB"]),
    );

    assert.deepStrictEqual(providedOptions.get(matchedCommand), {});
    assert.deepStrictEqual(
      missingOptions.get(matchedCommand),
      new Set(["optionC"]),
    );
  });

  await t.test("grandchild with arguments", async (t) => {
    const { matchedCommand, providedOptions, missingOptions } = partialParse(
      rootCommand,
      [
        ...argvBase,
        "--option-a=value1",
        "child",
        "--option-b=value2",
        "grandchild",
        "--option-c=value3",
      ],
    );

    assert.strictEqual(matchedCommand, grandchildCommand);

    assert.deepStrictEqual(providedOptions.get(rootCommand), {
      optionA: "value1",
    });
    assert.deepStrictEqual(missingOptions.get(rootCommand), new Set());

    assert.deepStrictEqual(providedOptions.get(childCommand), {
      optionB: "value2",
    });
    assert.deepStrictEqual(missingOptions.get(childCommand), new Set());

    assert.deepStrictEqual(providedOptions.get(matchedCommand), {
      optionC: "value3",
    });
    assert.deepStrictEqual(missingOptions.get(matchedCommand), new Set());
  });
});

await test("findMissingOptions", async (t) => {
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
