import { Pipeline, ManifestMappings } from "@ipp/common";
import validate from "schema-utils";
import { Schema } from "schema-utils/declarations/validate";

const NAME = "IPP Loader";

export interface Options {
  pipeline: Pipeline[];
  manifest?: ManifestMappings;
}

// TODO import common schema for pipeline?
const SCHEMA: Schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["pipeline"],
  properties: {
    pipeline: {
      $schema:
        "https://raw.githubusercontent.com/MarcusCemes/image-processing-pipeline/master/packages/cli/src/config/schema.json",
      type: "array",
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
  },
};

export function checkOptions(options: Partial<Options>): Options {
  validate(SCHEMA, options, { name: NAME });
  return options as Options;
}
