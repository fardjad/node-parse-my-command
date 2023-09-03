import { partialParse } from "../src/index.js";
import { CommanderError, type Command } from "commander";
import assert from "node:assert";

export const validatePartialParse = (
  rootCommand: Command,
  command: string,
  expectedMatchedCommandName: string,
) => {
  const argv = command.split(" ");

  let matchedCommand: Command | undefined;
  let providedOptions: Map<Command, Record<string, unknown>>;
  let missingOptions: Map<Command, Set<string>>;

  let partialParseErrorCode: string | undefined;

  try {
    ({ matchedCommand, providedOptions, missingOptions } = partialParse(
      rootCommand,
      argv,
    ));
  } catch (error) {
    if (error instanceof CommanderError) {
      partialParseErrorCode = error.code;
    }
  }

  try {
    rootCommand.parse(argv);
  } catch (error) {
    if (error instanceof CommanderError) {
      assert.strictEqual(error.code, partialParseErrorCode);
    }

    return;
  }

  const validateOptions = (command: Command) => {
    const options = command.opts();
    assert.deepStrictEqual(providedOptions.get(command) ?? {}, options);

    for (const key of Object.keys(options)) {
      if (!missingOptions.has(command)) continue;
      assert.ok(!missingOptions.get(command)!.has(key));
    }

    for (const subcommand of command.commands) {
      validateOptions(subcommand);
    }
  };

  validateOptions(rootCommand);

  assert.ok(matchedCommand);
  assert.strictEqual(matchedCommand.name(), expectedMatchedCommandName);
};
