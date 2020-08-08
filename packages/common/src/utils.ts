import { randomBytes } from "crypto";
import { Metadata } from "./metadata";

/** A utility function that generates some sample metadata for testing purposes. */
export function sampleMetadata(width: number, format: string, sourceFormat = "jpeg"): Metadata {
  const baseMeta = {
    width,
    height: width,
    channels: 3,
    hash: randomBytes(32).toString("hex"),
  };

  return {
    current: {
      ...baseMeta,
      format,
    },
    source: {
      ...baseMeta,
      format: sourceFormat,
    },
  };
}
