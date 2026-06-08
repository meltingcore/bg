import { DECKS, type CuisineId } from './data/decks.ts';
import {
  defaultSimulationOptions,
  formatSimulationReport,
  runSimulation,
  type SimulationOptions,
} from './game/simulation.ts';

declare const process: {
  argv: string[];
  exitCode?: number;
};

interface CliOptions extends SimulationOptions {
  json: boolean;
}

const usage = () => `Usage:
  pnpm sim -- --games 10 --players 4 --decks italy,france,china,india --seed 1000

Options:
  --games <n>      Number of full games to run. Default: ${defaultSimulationOptions.games}
  --players <n>    Player count from 2 to 4. Default: ${defaultSimulationOptions.players}
  --decks <ids>    Comma-separated cuisine ids. Default: ${defaultSimulationOptions.decks.join(',')}
  --seed <n>       Base seed. Game i uses seed + i. Default: ${defaultSimulationOptions.seed}
  --policy <name>  Bot policy. Currently: greedy
  --json           Print raw JSON instead of a text report.
  --help           Show this help.

Deck ids:
  ${DECKS.map((deck) => deck.id).join(', ')}`;

const parseInteger = (name: string, value: string | undefined) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = { ...defaultSimulationOptions, json: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') throw new Error(usage());
    if (arg === '--json') {
      options.json = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value.`);

    if (arg === '--games') options.games = parseInteger('--games', value);
    else if (arg === '--players') options.players = parseInteger('--players', value);
    else if (arg === '--seed') options.seed = parseInteger('--seed', value);
    else if (arg === '--policy') {
      if (value !== 'greedy') throw new Error(`Unsupported policy "${value}".`);
      options.policy = value;
    } else if (arg === '--decks') {
      options.decks = value.split(',').map((id) => id.trim()).filter(Boolean) as CuisineId[];
    } else {
      throw new Error(`Unknown option "${arg}".`);
    }

    index += 1;
  }

  return options;
};

const main = () => {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = runSimulation(options);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatSimulationReport(result));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
};

main();
