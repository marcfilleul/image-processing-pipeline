import { Pipeline, ManifestMappings } from "@ipp/common";
import validate from "schema-utils";
import { Schema } from "schema-utils/declarations/validate";

const NAME = "IPP Loader";

interface BasicWebpackOptions {
  context?: string;
  name: string;
  outputPath?: string;
  regExp?: RegExp;
}

export interface Options extends BasicWebpackOptions {
  devBuild: boolean;
  manifest?: ManifestMappings;
  pipeline: Pipeline;
}

// TODO import common schema for pipeline?
const SCHEMA: Schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["pipeline"],
  properties: {
    context: {
      type: "string",
    },
    devBuild: {
      type: "boolean",
    },
    manifest: {
      type: "object",
      required: ["source", "format"],
      properties: {
        source: {
          type: "object",
          patternProperties: {
            "^.*$": {
              type: "string",
            },
          },
        },
        format: {
          type: "object",
          patternProperties: {
            "^.*$": {
              type: "string",
            },
          },
        },
      },
    },
    name: {
      type: "string",
    },
    outputPath: {
      type: "string",
    },
    pipeline: {
      $schema:
        "https://raw.githubusercontent.com/MarcusCemes/image-processing-pipeline/master/packages/cli/src/config/schema.json",
      type: "array",
    },
    regExp: {
      type: "object",
    },
  },
};

const DEFAULT_OPTIONS: Partial<Options> = {
  devBuild: false,
  name: "[contenthash].[ext]",
  outputPath: "./",
};

export function checkOptions(options: Partial<Options>): Options {
  const merged = { ...DEFAULT_OPTIONS, ...options };
  validate(SCHEMA, merged, { name: NAME });
  return merged as Options;
}
