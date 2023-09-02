# Parse My Command

Parse `argv` with **Commander.js** without executing the command

<div class="paragraph">

<span class="image"><a href="https://www.npmjs.com/package/parse-my-command" class="image"><img src="https://img.shields.io/npm/v/parse-my-command" alt="NPM Version" /></a></span> <span class="image"><a href="https://www.npmjs.com/package/parse-my-command" class="image"><img src="https://img.shields.io/npm/dm/parse-my-command" alt="Monthly Downloads" /></a></span> <span class="image"><a href="https://github.com/fardjad/node-parse-my-command/actions" class="image"><img src="https://img.shields.io/github/actions/workflow/status/fardjad/node-parse-my-command/test-and-release.yml?branch=main" alt="test-and-release Workflow Status" /></a></span>

</div>

<hr />

[Commander.js](https://github.com/tj/commander.js) doesn't support parsing
`argv` without executing the command. This package provides a workaround for that.

## Installation

```bash
npm install --save parse-my-command
```

## Usage

```js
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
```

More examples can be found in the [examples](/examples/) directory.
