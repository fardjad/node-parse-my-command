import camelCase from "camelcase";
import {
  type OptionValues,
  Command,
  type ParseOptions,
  Option,
} from "commander";

export const findMissingOptions = (
  command: Command,
  providedOptionsByCommand: Map<Command, OptionValues>,
) => {
  const missingOptionsByCommand = new Map<Command, Set<string>>();

  // eslint-disable-next-line @typescript-eslint/ban-types
  let currentCommand: Command | undefined | null = command;

  while (currentCommand) {
    const missingOptions = new Set<string>();
    const providedOptions = providedOptionsByCommand.get(currentCommand);
    for (const option of currentCommand.options) {
      const key = camelCase((option.long ?? option.short)!);
      if (providedOptions?.[key]) {
        continue;
      }

      missingOptions.add(key);
    }

    missingOptionsByCommand.set(currentCommand, missingOptions);
    currentCommand = currentCommand.parent;
  }

  return missingOptionsByCommand;
};

export type PartialParseResult = {
  /**
   * The command whose action will be executed
   */
  matchedCommand: Command | undefined;
  /**
   * A map of commands to a set of missing options for that command
   */
  missingOptions: Map<Command, Set<string>>;
  /**
   * A map of commands to the options provided for that command
   */
  providedOptions: Map<Command, OptionValues>;
};

const copyCommandSettings = (source: Command, target: Command) => {
  for (const keysToCopy of [
    "_args",
    "_combineFlagAndOptionalValue",
    "_allowUnknownOption",
    "_allowExcessArguments",
    "_enablePositionalOptions",
    "_passThroughOptions",
  ] as const) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    (target as any)[keysToCopy] = (source as any)[keysToCopy];
  }

  target.name(source.name());
  target.aliases(source.aliases());
};

const cloneOption = (option: Option) => {
  const newOption = new Option(option.flags, option.description);
  newOption.default(option.defaultValue, option.defaultValueDescription);
  if (option.argChoices) {
    newOption.choices(option.argChoices);
  }

  newOption.makeOptionMandatory(false);
  newOption.preset(option.parseArg);
  newOption.conflicts(
    (option as Option & { conflictsWith: string[] }).conflictsWith,
  );
  newOption.env((option as Option & { envVar: string }).envVar);
  if (option.parseArg) {
    newOption.argParser(option.parseArg);
  }

  return newOption;
};

/**
 * Partially parse argv for a command without executing the action. @see {@link Command.parse}
 *
 * @returns An object containing the matched command, the provided options, and the missing options.
 */
export const partialParse = (
  command: Command,
  argv: readonly string[],
  options?: ParseOptions,
): PartialParseResult => {
  const providedOptions = new Map<Command, OptionValues>();
  const commandsMap = new Map<Command, Command>();
  let matchedCommand: Command | undefined;

  const createParserCommand = (parserCommand: Command, command: Command) => {
    commandsMap.set(parserCommand, command);

    copyCommandSettings(command, parserCommand);

    for (const option of command.options) {
      parserCommand.addOption(cloneOption(option));
    }

    parserCommand.hook("preSubcommand", (thisCommand, actionCommand) => {
      providedOptions.set(commandsMap.get(parserCommand)!, thisCommand.opts());
      providedOptions.set(commandsMap.get(actionCommand)!, thisCommand.opts());
    });

    parserCommand.action(() => {
      providedOptions.set(
        commandsMap.get(parserCommand)!,
        parserCommand.opts(),
      );
      matchedCommand = command;
    });

    for (const subcommand of command.commands as Command[]) {
      const parserSubcommand = parserCommand
        .command(subcommand.name())
        .exitOverride();
      createParserCommand(parserSubcommand, subcommand);
    }

    return parserCommand;
  };

  const parserCommand = createParserCommand(
    new Command().exitOverride(),
    command,
  );
  parserCommand.parse(argv, options);

  const missingOptions = matchedCommand
    ? findMissingOptions(matchedCommand, providedOptions)
    : new Map<Command, Set<string>>();

  return { matchedCommand, missingOptions, providedOptions };
};
