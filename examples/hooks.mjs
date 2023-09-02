/* eslint-disable capitalized-comments */
import { Command } from "commander";
import { partialParse } from "parse-my-command";

const rootCommand = new Command("root")
  .requiredOption("-a, --option-a <value>", "option a")
  .action(() => {
    console.log("root command");
  });

rootCommand
  .command("child")
  .requiredOption("-b, --option-b <value>", "option b")
  .requiredOption("-c, --option-c <value>", "option c")
  .action((options, command) => {
    console.log("options", command.optsWithGlobals());
  });

const argv = ["node", "index.mjs", "child", "-b", "value2"];

const { matchedCommand, missingOptions } = partialParse(rootCommand, argv);

let currentCommand = matchedCommand;
while (currentCommand) {
  rootCommand.hook("preSubcommand", (thisCommand, actionCommand) => {
    // You can use this hook to show an interactive prompt to the user for the
    // missing options. Here, we just set the missing options to a default

    for (const key of missingOptions.get(thisCommand) ?? []) {
      thisCommand.setOptionValue(key, `${key}-missing`);
    }

    for (const key of missingOptions.get(actionCommand) ?? []) {
      actionCommand.setOptionValue(key, `${key}-missing`);
    }
  });

  currentCommand = currentCommand.parent;
}

rootCommand.parse(argv); // options { optionC: 'optionC-missing', optionB: 'value2', optionA: 'optionA-missing' }
