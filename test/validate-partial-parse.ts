import { expect } from "bun:test";
import { type Command, CommanderError } from "commander";
import { partialParse } from "../src/index.js";

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
      expect(partialParseErrorCode).toBeDefined();
      if (partialParseErrorCode === undefined) {
        throw new Error("Expected partialParse to throw a CommanderError");
      }

      expect(error.code).toBe(partialParseErrorCode);
    }

    return;
  }

  const validateOptions = (command: Command) => {
    const options = command.opts();
    expect(providedOptions.get(command) ?? {}).toEqual(options);

    for (const key of Object.keys(options)) {
      if (!missingOptions.has(command)) continue;
      const missingOptionsForCommand = missingOptions.get(command);
      expect(missingOptionsForCommand).toBeDefined();
      if (!missingOptionsForCommand) {
        throw new Error("Expected missing options for command");
      }

      expect(missingOptionsForCommand.has(key)).toBe(false);
    }

    for (const subcommand of command.commands) {
      validateOptions(subcommand);
    }
  };

  validateOptions(rootCommand);

  expect(matchedCommand).toBeDefined();
  if (!matchedCommand) {
    throw new Error("Expected a matched command");
  }

  expect(matchedCommand.name()).toBe(expectedMatchedCommandName);
};
