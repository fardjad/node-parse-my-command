# Parse My Command

Parse `argv` with **Commander.js** without executing the command

<div class="paragraph">

<span class="image"><a href="https://www.npmjs.com/package/parse-my-command" class="image"><img src="https://img.shields.io/npm/v/parse-my-command" alt="NPM Version" /></a></span> <span class="image"><a href="https://www.npmjs.com/package/parse-my-command" class="image"><img src="https://img.shields.io/npm/dm/parse-my-command" alt="Monthly Downloads" /></a></span> <span class="image"><a href="https://github.com/fardjad/node-parse-my-command/actions" class="image"><img src="https://img.shields.io/github/actions/workflow/status/fardjad/node-parse-my-command/test-and-release.yml?branch=main" alt="test-and-release Workflow Status" /></a></span>

</div>

<hr />

[Commander.js](https://github.com/tj/commander.js) doesn't support parsing
`argv` without executing the command. This module provides a workaround for that.

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

const {
  matchedCommand,
  providedOptions,
  missingOptions,
  providedOptionsSources,
} = partialParse(rootCommand, argv);

console.log(matchedCommand.name()); // child
console.log(providedOptions.get(childCommand)); // { optionB: 'value2' }
console.log(missingOptions.get(childCommand)); // Set(1) { 'optionC' }
console.log(providedOptionsSources.get(childCommand)); // Map(1) { 'optionB' => 'cli' }
```

More examples can be found in the [examples](/examples/) directory.

## Error Handling

`partialParse` throws in the following cases:

1. In all cases where your `Command` with the
   [default `exitCallback`](https://github.com/tj/commander.js#override-exit-and-output-handling)
   would throw an error (e.g. when displaying help)
2. In all cases where your command would throw an error before an action is
   executed except for when a required `Option` (not to be confused with an
   `Argument`) is missing (missing options are returned in the result object
   instead).

## How It Works and Limitations

This module works by creating a (best-effort) clone of the command and its
subcommands, setting the actions to no-op functions, and then parsing the
`argv` with the cloned instance. This approach might have some limitations:

1. The implementation might break if Commander.js changes its internals
2. Custom argument and option processors are assumed to be pure functions
3. Hook listeners attached to the commands will be ignored
4. Some edge cases might not be handled correctly (please feel free to open an
   issue/PR in case you find any)
