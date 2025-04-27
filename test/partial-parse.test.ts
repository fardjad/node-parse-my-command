/* eslint-disable unicorn/consistent-function-scoping */
import { partialParse } from "../src/index.js";
import { noop } from "../src/noop.js";
import { validatePartialParse } from "./validate-partial-parse.js";
import { Argument, Command, InvalidArgumentError, Option } from "commander";
import assert from "node:assert";
import { test } from "node:test";

// These tests are based on the examples in Commander.js repository

await test("alias", () => {
  const program = new Command();

  program
    .command("print")
    .argument("<file>")
    // Multiple aliases is unusual but supported! You can call alias multiple times,
    // and/or add multiple aliases at once. Only the first alias is displayed in the help.
    .alias("p")
    .alias("pr")
    .aliases(["display", "show"]);

  validatePartialParse(program, "node alias.js print file", "print");
  validatePartialParse(program, "node alias.js pr file", "print");
  validatePartialParse(program, "node alias.js display file", "print");
  validatePartialParse(program, "node alias.js show file", "print");
});

await test("arguments-custom-processing", (t) => {
  const customParseInt = t.mock.fn((value: string) =>
    Number.parseInt(value, 10),
  );

  const program = new Command();
  program
    .command("add")
    .argument("<first>", "integer argument", customParseInt);

  validatePartialParse(
    program,
    "node arguments-custom-processing.js add 1",
    "add",
  );

  // One for the original command, one for the parser command
  assert.strictEqual(customParseInt.mock.calls.length, 2);
});

await test("arguments-extra", () => {
  const program = new Command();

  program
    .name("arguments-extra")
    .exitOverride()
    .configureOutput({ writeErr: noop })
    .addArgument(
      new Argument("<drink-size>", "drink cup size").choices([
        "small",
        "medium",
        "large",
      ]),
    )
    .addArgument(
      new Argument("[timeout]", "timeout in seconds").default(60, "one minute"),
    );

  validatePartialParse(
    program,
    "node arguments-extra.js huge",
    "THIS SHOULD ERROR OUT",
  );
  validatePartialParse(
    program,
    "node arguments-extra.js small",
    "arguments-extra",
  );
});

await test("help", () => {
  const program = new Command();

  assert.throws(
    () => {
      partialParse(program, ["node", "help.js", "--help"]);
    },
    { code: "commander.helpDisplayed" },
  );
});

await test("custom-version", () => {
  const program = new Command();

  program
    .name("custom-version")
    .exitOverride()
    .configureOutput({ writeOut: noop, writeErr: noop })
    .version("0.0.1", "-v, --VERSION", "new version message");

  validatePartialParse(
    program,
    // --version is invalid
    "node custom-version --version",
    "SHOULD ERROR OUT",
  );

  validatePartialParse(program, "node custom-version -v", "SHOULD ERROR OUT");
  validatePartialParse(
    program,
    "node custom-version --VERSION",
    "SHOULD ERROR OUT",
  );
});

await test("default-command", () => {
  const program = new Command();

  program.command("build").description("build web site for deployment");

  program.command("deploy").description("deploy web site to production");

  program
    .command("serve", { isDefault: true })
    .description("launch web server")
    .option("-p,--port <port_number>", "web port");

  validatePartialParse(program, "node default-command.js build", "build");
  validatePartialParse(
    program,
    "node default-command.js serve -p 8080",
    "serve",
  );
  validatePartialParse(program, "node default-command.js -p 8080", "serve");
});

await test("nested-commands", () => {
  const program = new Command();

  const brew = program.command("brew");
  brew.command("tea").action(() => {
    console.log("brew tea");
  });
  brew.command("coffee").action(() => {
    console.log("brew coffee");
  });

  const heat = program.command("heat");
  heat.command("jug").action(() => {
    console.log("heat jug");
  });
  heat.command("pot").action(() => {
    console.log("heat pot");
  });

  validatePartialParse(program, "node nested-commands.js brew tea", "tea");
  validatePartialParse(program, "node nested-commands.js heat jug", "jug");
});

await test("boolean-or-value", () => {
  const program = new Command();

  program
    .name("boolean-or-value")
    .option("-c, --cheese [type]", "Add cheese with optional type");

  validatePartialParse(program, "node boolean-or-value.js", "boolean-or-value");
  validatePartialParse(
    program,
    "node boolean-or-value.js --cheese",
    "boolean-or-value",
  );
  validatePartialParse(
    program,
    "node boolean-or-value.js --cheese mozzarella",
    "boolean-or-value",
  );
});

await test("options-conflicts", () => {
  const program = new Command();
  program
    .command("pay")
    .exitOverride()
    .configureOutput({ writeErr: noop })
    .addOption(new Option("--cash").conflicts("creditCard"))
    .addOption(new Option("--credit-card"));

  validatePartialParse(program, "node options-conflicts.js pay --cash", "pay");
  validatePartialParse(
    program,
    "node options-conflicts.js pay --cash --credit-card",
    "SHOULD ERROR OUT",
  );
});

await test("options-custom-processing", () => {
  const program = new Command();

  function myParseInt(value: string) {
    const parsedValue = Number.parseInt(value, 10);
    if (Number.isNaN(parsedValue)) {
      throw new InvalidArgumentError("Not a number.");
    }

    return parsedValue;
  }

  function increaseVerbosity(dummyValue: string, previous: number) {
    return previous + 1;
  }

  function collect(value: string, previous: string[]) {
    return [...previous, value];
  }

  function commaSeparatedList(value: string) {
    return value.split(",");
  }

  program
    .name("options-custom-processing")
    .option("-f, --float <number>", "float argument", Number.parseFloat)
    .option("-i, --integer <number>", "integer argument", myParseInt)
    .option(
      "-v, --verbose",
      "verbosity that can be increased",
      increaseVerbosity,
      0,
    )
    .option("-c, --collect <value>", "repeatable value", collect, [])
    .option("-l, --list <items>", "comma separated list", commaSeparatedList);

  validatePartialParse(
    program,
    "node options-custom-processing.js -f 1e2 -i 100 -vvv -c 1 -c 2 -c 3 -l a,b,c",
    "options-custom-processing",
  );
});

await test("options-defaults", () => {
  const program = new Command();

  program
    .name("options-defaults")
    .option("-c, --cheese <type>", "Add the specified type of cheese", "blue");

  validatePartialParse(program, "node options-defaults.js", "options-defaults");
  validatePartialParse(
    program,
    "node options-defaults.js --cheese stilton",
    "options-defaults",
  );
});

await test("options-env", () => {
  const program = new Command();

  program.name("options-env");
  program.addOption(
    new Option("-p, --port <number>", "specify port number")
      .default(80)
      .env("PARSE_MY_COMMAND_PORT"),
  );

  process.env.PARSE_MY_COMMAND_PORT = "8080";

  validatePartialParse(program, "node options-env.js", "options-env");

  delete process.env.PARSE_MY_COMMAND_PORT;
});

await test("options-extra", () => {
  const createProgram = () => {
    const program = new Command();

    program
      .name("options-extra")
      .exitOverride()
      .configureOutput({ writeErr: noop })
      .addOption(new Option("-s, --secret").hideHelp())
      .addOption(
        new Option("-t, --timeout <delay>", "timeout in seconds").default(
          60,
          "one minute",
        ),
      )
      .addOption(
        new Option("-d, --drink <size>", "drink cup size").choices([
          "small",
          "medium",
          "large",
        ]),
      )
      .addOption(new Option("-p, --port <number>", "port number"))
      .addOption(
        new Option("--donate [amount]", "optional donation in dollars")
          .preset("20")
          .argParser(Number.parseFloat),
      )
      .addOption(
        new Option("--disable-server", "disables the server").conflicts("port"),
      )
      .addOption(
        new Option("--free-drink", "small drink included free ").implies({
          drink: "small",
        }),
      );
    return program;
  };

  validatePartialParse(
    createProgram(),
    "node options-extra.js --drink huge",
    "options-extra",
  );
  validatePartialParse(
    createProgram(),
    "node options-extra.js --free-drink",
    "options-extra",
  );
  validatePartialParse(
    createProgram(),
    "node options-extra.js --port 80",
    "options-extra",
  );
  validatePartialParse(
    createProgram(),
    "node options-extra.js --donate",
    "options-extra",
  );
  validatePartialParse(
    createProgram(),
    "node options-extra.js --donate 30.50",
    "options-extra",
  );
  validatePartialParse(
    createProgram(),
    "node options-extra.js --disable-server --port 8000",
    "SHOULD ERROR OUT",
  );
});

await test("options-implies", () => {
  const createProgram = () => {
    const program = new Command();

    program
      .name("options-implies")
      .addOption(new Option("--quiet").implies({ logLevel: "off" }))
      .addOption(
        new Option("--log-level <level>")
          .choices(["info", "warning", "error", "off"])
          .default("info"),
      )
      .addOption(
        new Option(
          "-c, --cheese <type>",
          "Add the specified type of cheese",
        ).implies({ dairy: true }),
      )
      .addOption(
        new Option("--no-cheese", "You do not want any cheese").implies({
          dairy: false,
        }),
      )
      .addOption(new Option("--dairy", "May contain dairy"));

    return program;
  };

  validatePartialParse(
    createProgram(),
    "node options-implies.js --quiet",
    "options-implies",
  );
  validatePartialParse(
    createProgram(),
    "node options-implies.js --log-level=warning --quiet",
    "options-implies",
  );
  validatePartialParse(
    createProgram(),
    "node options-implies.js --cheese=cheddar",
    "options-implies",
  );
  validatePartialParse(
    createProgram(),
    "node options-implies.js --no-cheese",
    "options-implies",
  );
});

await test("options-negatable", () => {
  const program = new Command();

  program.name("options-negatable").option("--no-cheese");

  const { providedOptions, missingOptions } = partialParse(program, [
    "node",
    "options-negatable.js",
    "--no-cheese",
  ]);

  assert.deepStrictEqual([...providedOptions.values()], [{ cheese: false }]);
  assert.deepStrictEqual([...missingOptions.values()], [new Set()]);
});

await test("options-required", () => {
  const program = new Command();

  program
    .name("options-required")
    .requiredOption("-c, --cheese <type>", "pizza must have cheese");

  assert.doesNotThrow(() => {
    partialParse(program, ["node", "options-required.js"]);
  });
});

await test("options-sources-root", () => {
  const program = new Command();

  program
    .name("options-source-root")
    // Missing
    .requiredOption("-s, --size <size>", "pizza size")
    // Default
    .option("-g, --vegeterian", "vegeterian pizza", false)
    // Provided in command line
    .requiredOption("-c, --cheese <type>", "pizza must have cheese");

  const { matchedCommand, providedOptionsSources } = partialParse(program, [
    "node",
    "options-sources-root.js",
    "-c",
    "mozzarella",
  ]);

  assert.deepStrictEqual(
    providedOptionsSources.get(matchedCommand!),
    new Map([
      ["vegeterian", "default"],
      ["cheese", "cli"],
    ]),
  );
});

await test("options-sources-subcommand", () => {
  const program = new Command();

  program
    .command("pizza")
    // Missing
    .requiredOption("-s, --size <size>", "pizza size")
    // Default
    .option("-g, --vegeterian", "vegeterian pizza", false)
    // Provided in command line
    .requiredOption("-c, --cheese <type>", "pizza must have cheese");

  const { matchedCommand, providedOptionsSources } = partialParse(program, [
    "node",
    "options-sources-subcommand.js",
    "pizza",
    "-c",
    "mozzarella",
  ]);

  assert.deepStrictEqual(
    providedOptionsSources.get(matchedCommand!),
    new Map([
      ["vegeterian", "default"],
      ["cheese", "cli"],
    ]),
  );
});

await test("options-variadic", () => {
  const createProgram = () => {
    const program = new Command();
    program
      .name("options-variadic")
      .option("-n, --number <value...>", "specify numbers")
      .option("-l, --letter [value...]", "specify letters");

    return program;
  };

  validatePartialParse(
    createProgram(),
    "node options-variadic.js -n 1 2 3 --letter a b c",
    "options-variadic",
  );
  validatePartialParse(
    createProgram(),
    "node options-variadic.js --letter=A -n80",
    "options-variadic",
  );
  validatePartialParse(
    createProgram(),
    "node options-variadic.js --letter -n 1 -n 2 3",
    "options-variadic",
  );
});

await test("pass-through-options", () => {
  const createProgram = () => {
    const program = new Command();
    program
      .name("pass-through-options")
      .argument("<utility>")
      .argument("[args...]")
      .passThroughOptions()
      .option("-d, --dry-run");

    return program;
  };

  validatePartialParse(
    createProgram(),
    "node pass-through-options.js git status",
    "pass-through-options",
  );
  validatePartialParse(
    createProgram(),
    "node pass-through-options.js git --version",
    "pass-through-options",
  );
  validatePartialParse(
    createProgram(),
    "node pass-through-options.js --dry-run git checkout -b new-branch",
    "pass-through-options",
  );
  validatePartialParse(
    createProgram(),
    "node pass-through-options.js git push --dry-run",
    "pass-through-options",
  );
});

await test("positional-options", () => {
  const createProgram = () => {
    const program = new Command().name("positional-options");

    program.enablePositionalOptions().option("-p, --progress");

    program
      .command("upload <file>")
      .option("-p, --port <number>", "port number", "80");

    return program;
  };

  validatePartialParse(
    createProgram(),
    "node positional-options.js upload test.js",
    "upload",
  );
  validatePartialParse(
    createProgram(),
    "node positional-options.js -p upload test.js",
    "upload",
  );
  validatePartialParse(
    createProgram(),
    "node positional-options.js upload -p 8080 test.js",
    "upload",
  );
  validatePartialParse(
    createProgram(),
    "node positional-options.js -p upload -p 8080 test.js",
    "upload",
  );
});
