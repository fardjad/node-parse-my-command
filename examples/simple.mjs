/* eslint-disable capitalized-comments */
import { Command } from "commander";
import { partialParse } from "parse-my-command";

const rootCommand = new Command("root")
  .requiredOption("-a, --option-a <value>", "option a")
  .action(() => {
    throw new Error("This should never get called");
  });

const childCommand = rootCommand
  .command("child")
  .requiredOption("-b, --option-b <value>", "option b")
  .requiredOption("-c, --option-c <value>", "option c")
  .action(() => {
    throw new Error("This should never get called");
  });

const argv = ["node", "index.mjs", "-a", "value1", "child", "-b", "value2"];

const { matchedCommand, providedOptions, missingOptions } = partialParse(
  rootCommand,
  argv,
);

console.log(matchedCommand.name()); // child
console.log(providedOptions.get(childCommand)); // { optionB: 'value2' }
console.log(missingOptions.get(childCommand)); // Set(1) { 'optionC' }
