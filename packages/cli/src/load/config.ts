import { ManifestMappings, Pipeline } from "@ipp/common";
import Ajv from "ajv";
import { bold, white } from "chalk";
import { cosmiconfig } from "cosmiconfig";
import { CliException, CliExceptionCode } from "../lib/exception";
import configSchema from "../schema/config.json";
import pipelineSchema from "../schema/pipeline.json";

const MODULE_NAME = "ipp";

export interface Config {
  input: string | string[];
  output: string;
  pipeline: Pipeline;

  concurrency: number;
  flat?: boolean;
  manifest?: ManifestMappings;
}

export async function getConfig(initial: Partial<Config>, path?: string): Promise<Config> {
  const config = await loadConfig(path);
  return validateConfig({ ...config, ...initial });
}

/** Attempts to load a config from a path, or by looking in well known locations */
async function loadConfig(path?: string): Promise<Partial<Config>> {
  try {
    const configExplorer = cosmiconfig(MODULE_NAME);
    const explorerResult = await (path ? configExplorer.load(path) : configExplorer.search());

    return explorerResult?.config || {};
  } catch (err) {
    throw new CliException(
      "Configuration load failure",
      CliExceptionCode.CONFIG_LOAD,
      `Configuration load error -> ${err.name}`,
      err.message
    ).extend(err);
  }
}

/** Validate the configuration  */
function validateConfig(config: Partial<Config>): Config {
  friendlyParse(config);

  const filteredConfig = { ...config };

  const ajv = new Ajv({ removeAdditional: true, allErrors: true });
  ajv.addSchema(pipelineSchema);

  const valid = ajv.validate(configSchema, filteredConfig);

  if (!valid)
    throw new CliException(
      "Invalid config",
      CliExceptionCode.CONFIG_PARSE,
      "Configuration validation failed",
      ajv.errors?.map((e) => `property "${bold(e.dataPath.substr(1))}" ${e.message}`).join("\n")
    );

  return filteredConfig as Config;
}

/** Check for some easy mistakes and supply user-friendly errors */
function friendlyParse(config: Partial<Config> = {}): void {
  const errors = [] as string[];

  const criteria: [any, string][] = [
    [config.input, "An input directory containing images must be specified"],
    [config.output, "An output directory for generated formats must be specified"],
    [config.pipeline, "A processing pipeline must be specified"],
  ];

  for (const [key, message] of criteria) {
    if (!key) errors.push(message);
  }

  if (errors.length > 0)
    throw new CliException(
      "Invalid configuration",
      CliExceptionCode.CONFIG_PARSE,
      "Invalid configuration",
      errors.join("\n") + `\n\n${white("Did you create a configuration file?")}`
    );
}
