// common/manifest.ts
//
// Handles the mapping of pipeline metadata, which is generated
// during the pipe transformation process, into mapped manifest
// entries that can be exported from the process.
//
// This can be reused across modules, and therefore stays abstract
// to allow customisation/optimisation on a per-module basis.

import { Metadata, PipelineResult, PrimitiveValue } from "./pipeline";

/* -- Types -- */

type StringMap = Record<string, string>;
type PrimitiveMap = Record<string, PrimitiveValue>;

/**
 * A single manifest entry that represents a single source image
 * and it's resulting formats.
 */
export interface ManifestItem {
  m?: PrimitiveMap;
  f: PrimitiveMap[];
}

/** A collection of manifest entries for each source image */
export type Manifest = ManifestItem[];

/** A collection of metadata configured mappings that are used to map metadata to the manifest */
export interface ManifestMappings {
  source: StringMap;
  format: StringMap;
}

/* -- Functions -- */

/**
 * Generates a manifest entry (ManifestItem) from a set of pipeline results that are built from
 * one source image, by mapping result metadata based on a set of defined manifest mappings.
 *
 * This is useful when exporting metadata from a pipeline result, as it allows the user
 * to select exactly what metadata they would like to keep and under what name.
 */
export function mapManifest(result: PipelineResult, mappings: ManifestMappings): ManifestItem {
  const manifestItem: ManifestItem = {
    f: result.formats.map((format) => mapMetadata(format.data.metadata, mappings.format)),
  };

  if (mappings.source) {
    const m = voidIfEmpty(mapMetadata(result.source.metadata, mappings.source));
    if (m) manifestItem.m = m;
  }

  return manifestItem;
}

/** Maps metadata from a single pipeline result based on a set of defined mappings */
function mapMetadata(metadata: Metadata, mappings: StringMap): PrimitiveMap {
  const mappedMetadata: PrimitiveMap = {};

  for (const [key, template] of Object.entries(mappings)) {
    const mappedTemplate = mapTemplate(metadata, template);

    if (typeof mappedTemplate !== "undefined") {
      mappedMetadata[key] = mappedTemplate;
    }

    // const { value, limit } = extractValueLimit(template);

    // if (typeof metadata[value] !== "undefined") {
    //   const valueToMap = metadata[value];

    //   mappedMetadata[key] = limit ? String(valueToMap).substr(0, limit) : valueToMap;
    // }
  }

  return mappedMetadata;
}

/**
 * Maps a string template of the form `string` or `string:number` to its corresponding
 * metadata value, optionally limited to a certain length.
 *
 * @example
 * mapTemplate({ format: { width: 1920 }}, "width:2"); // "19"
 */
export function mapTemplate(metadata: Metadata, template: string): PrimitiveValue | undefined {
  const { selector, key, limit } = parseTemplate(template);
  // const { value, limit } = extractValueLimit(template);

  if (key && typeof metadata[key] !== "undefined") {
    const value = metadata[key];
    // TODO
  }

  const metadataValue = metadata[value];

  if (typeof metadataValue !== "undefined") {
    return limit ? String(metadataValue).substr(0, limit) : metadataValue;
  }
}

interface ParsedTemplate {
  selector?: string;
  key?: string;
  limit?: number;
}

/**
 * Splits a template string into three components, the selector,
 * the key and a numeric limit.
 *
 * Only the key is required, the others may be omitted.
 * Returns an empty object if the template is invalid
 * to allow destructuring.
 *
 * @example
 * parseTemplate("format.hash:8");
 * // { selector: "format", key: "hash", limit: 8 }
 */
function parseTemplate(value: string): ParsedTemplate {
  const matcher = /^([a-zA-Z0-9_-]+\.)?([a-zA-Z0-9_-]+)(:[0-9]+)?$/;

  const result = matcher.exec(value);
  if (result === null) return {};

  const parsed: ParsedTemplate = {
    key: result[2],
  };

  if (result[1]) parsed.selector = result[1];
  if (result[3]) {
    const int = parseInt(result[3]);
    if (!isNaN(int)) parsed.limit = int;
  }

  return parsed;
}

/** Splits a colon separated string into its value and its number limit
 *
 * @example
 * extractValueLimit("text:5"); // { value: "text", limit: 5 }
 * extractValueLimit("text");   // { value: "text" }
 */
// function extractValueLimit(value: string): { value: string; limit?: number } {
//   const index = value.indexOf(":");
//   if (index === -1) return { value };

//   const limit = parseInt(value.substr(index + 1), 10);
//   if (!limit) return { value: value.substr(0, index) };

//   return { value: value.substr(0, index), limit: limit };
// }

/** Returns undefined if the object has no properties */
function voidIfEmpty<T extends Record<string, unknown>>(obj: T): T | undefined {
  if (Object.keys(obj).length === 0) return;
  return obj;
}
