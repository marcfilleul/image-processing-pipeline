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
    const { value, limit } = extractValueLimit(template);

    if (typeof metadata[value] !== "undefined") {
      const valueToMap = metadata[value];

      mappedMetadata[key] = limit ? String(valueToMap).substr(0, limit) : valueToMap;
    }
  }

  return mappedMetadata;
}

/** Splits a colon separated string into its value and its number limit
 *
 * @example
 * extractValueLimit("text:5"); // { value: "text", limit: 5 }
 * extractValueLimit("text");   // { value: "text" }
 */
function extractValueLimit(value: string): { value: string; limit?: number } {
  const index = value.indexOf(":");
  if (index === -1) return { value };

  const limit = parseInt(value.substr(index + 1), 10);
  if (!limit) return { value: value.substr(0, index) };

  return { value: value.substr(0, index), limit: limit };
}

/** Returns undefined if the object has no properties */
function voidIfEmpty<T extends Record<string, unknown>>(obj: T): T | undefined {
  if (Object.keys(obj).length === 0) return;
  return obj;
}
