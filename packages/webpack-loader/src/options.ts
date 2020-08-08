import { ManifestMappings, Pipeline, PipelineSchema } from "@ipp/common";
import { Schema } from "schema-utils/declarations/validate";
import Ajv from "ajv";

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
        "https://raw.githubusercontent.com/MarcusCemes/image-processing-pipeline/master/packages/common/src/schema/pipeline.json",
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

  const ajv = new Ajv({ allErrors: true });
  ajv.addSchema(PipelineSchema);

  const valid = ajv.validate(SCHEMA, merged);
  if (!valid) throw Error("Invalid config:\n" + ajv.errorsText());

  return merged as Options;
}
