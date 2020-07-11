import { randomBytes } from "crypto";
import { Metadata } from "./pipeline";

/** Replace all backslashes "\\" wth forward slashes "/" for cross-platform path compatibility */
export function slash(path: string): string {
  return path.replace(/\\/g, "/");
}

/** A utility function that generates some sample metadata for testing purposes. */
export function sampleMetadata(width: number, format: string, originalFormat = "jpeg"): Metadata {
  return {
    width,
    height: width,
    format,
    hash: randomBytes(32).toString("hex"),
    originalWidth: width,
    originalHeight: width,
    originalFormat,
    originalHash: randomBytes(32).toString("hex"),
    channels: 3,
  };
}
