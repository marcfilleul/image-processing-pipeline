import { randomBytes } from "crypto";
import { ManifestItem, mapManifest } from "./manifest";
import { PipelineResult } from "./pipeline";
import { sampleMetadata } from "./utils";

describe("function mapManifest()", () => {
  const sampleResult: PipelineResult = {
    source: {
      buffer: randomBytes(8),
      metadata: {
        ...sampleMetadata(256, "jpeg"),
        __testValue: 42,
        __testLongValue: "longvalue",
      },
    },
    formats: [
      {
        data: {
          buffer: randomBytes(8),
          metadata: {
            ...sampleMetadata(128, "jpeg"),
          },
        },
        saveKey: "saveValue",
      },
    ],
  };

  test("maps sample result data", () => {
    const manifest = mapManifest(sampleResult, {
      source: {
        v: "__testValue",
        x: "nonexistantValue",
      },
      format: {
        w: "width",
        h: "height",
      },
    });

    expect(manifest).toMatchObject<ManifestItem>({
      m: {
        v: 42,
      },
      f: [
        {
          w: 128,
          h: 128,
        },
      ],
    });
  });

  test("limits a long value", () => {
    const manifest = mapManifest(sampleResult, {
      source: { v: "__testLongValue:4" },
      format: {},
    });

    expect(manifest).toMatchObject<ManifestItem>({
      m: {
        v: "long",
      },
      f: [{}],
    });
  });

  test("ignores malformed limit", () => {
    const manifest = mapManifest(sampleResult, {
      source: { v: "__testLongValue:string" },
      format: {},
    });

    expect(manifest).toMatchObject({
      m: {
        v: "longvalue",
      },
      f: [{}],
    });
  });

  test("handles no results", () => {
    const manifest = mapManifest(
      { ...sampleResult, formats: [] },
      {
        source: {},
        format: {},
      }
    );

    expect(manifest).toMatchObject({
      f: [],
    });
  });

  test("handles no metadata", () => {
    const manifest = mapManifest(sampleResult, {
      source: {},
      format: {},
    });

    expect(manifest).toMatchObject({
      f: [{}],
    });
  });
});
