import { noop } from "./noop.ts";
import camelCase from "camelcase";
import {
  type OptionValues,
  Command,
  type ParseOptions,
  Option,
  type OptionValueSource,
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
      const key = option.negate
        ? camelCase(option.long!.replace(/^--no-/, ""))
        : camelCase((option.long ?? option.short)!);

      if (providedOptions?.[key] !== undefined) {
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
  /**
   * A map of commands to a map of option keys to the source of the option value
   */
  providedOptionsSources: Map<Command, Map<string, string | undefined>>;
};

const copyCommandSettings = (source: Command, target: Command) => {
  for (const keysToCopy of [
    "_allowExcessArguments",
    "_allowUnknownOption",
    "_args",
    "_combineFlagAndOptionalValue",
    "_defaultCommandName",
    "_enablePositionalOptions",
    "_passThroughOptions",
  ] as const) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    (target as any)[keysToCopy] = (source as any)[keysToCopy];
  }

  target.name(source.name());
  target.aliases(source.aliases());
  target.version(
    (source as Command & { version: () => string }).version(),
    source.options.find(
      (option) =>
        option.attributeName() ===
        (source as Command & { _versionOptionName: string })._versionOptionName,
    )?.flags,
  );
};

const disableCommandOutput = (command: Command) => {
  command.configureOutput({
    writeOut: noop,
    writeErr: noop,
    outputError: noop,
  });
};

const cloneOption = (option: Option) => {
  const newOption = new Option(option.flags, option.description);
  newOption.makeOptionMandatory(false);
  newOption.default(option.defaultValue, option.defaultValueDescription);

  newOption.preset((option as Option & { presetArg: unknown }).presetArg);
  newOption.env((option as Option & { envVar: string }).envVar);
  if (option.parseArg) {
    newOption.argParser(option.parseArg);
  }

  if (option.argChoices) {
    newOption.choices(option.argChoices);
  }

  newOption.conflicts(
    (option as Option & { conflictsWith: string[] }).conflictsWith,
  );

  (newOption as Option & { implied: unknown }).implied = (
    option as Option & { implied: unknown }
  ).implied;

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
  const providedOptionsSources = new Map<
    Command,
    Map<string, string | undefined>
  >();
  const commandsMap = new Map<Command, Command>();
  let matchedCommand: Command | undefined;

  const setProvidedOptionSource = (
    command: Command,
    optionKey: string,
    source: OptionValueSource | undefined,
  ) => {
    if (!source) {
      return;
    }

    const sourcesMap =
      providedOptionsSources.get(command) ?? new Map<string, string>();
    sourcesMap.set(optionKey, source);
    providedOptionsSources.set(command, sourcesMap);
  };

  const createParserCommand = (parserCommand: Command, command: Command) => {
    commandsMap.set(parserCommand, command);

    copyCommandSettings(command, parserCommand);
    disableCommandOutput(parserCommand);
    parserCommand.exitOverride();

    for (const option of command.options) {
      parserCommand.addOption(cloneOption(option));
    }

    parserCommand.hook("preSubcommand", (thisCommand, actionCommand) => {
      for (const cmd of [thisCommand, actionCommand]) {
        providedOptions.set(commandsMap.get(cmd)!, cmd.opts());

        for (const optionKey of Object.keys(cmd.opts())) {
          setProvidedOptionSource(
            cmd,
            optionKey,
            cmd.getOptionValueSource(optionKey),
          );
        }
      }
    });

    parserCommand.action(() => {
      providedOptions.set(
        commandsMap.get(parserCommand)!,
        parserCommand.opts(),
      );

      for (const optionKey of Object.keys(parserCommand.opts())) {
        setProvidedOptionSource(
          commandsMap.get(parserCommand)!,
          optionKey,
          parserCommand.getOptionValueSource(optionKey),
        );
      }

      matchedCommand = command;
    });

    for (const subcommand of command.commands as Command[]) {
      const parserSubcommand = parserCommand.command(subcommand.name());
      createParserCommand(parserSubcommand, subcommand);
    }

    return parserCommand;
  };

  const parserCommand = createParserCommand(new Command(), command);
  parserCommand.parse(argv, options);

  const missingOptions = matchedCommand
    ? findMissingOptions(matchedCommand, providedOptions)
    : new Map<Command, Set<string>>();

  return {
    matchedCommand,
    missingOptions,
    providedOptions,
    providedOptionsSources,
  };
};
