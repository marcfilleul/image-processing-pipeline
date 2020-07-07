import { ManifestItem, mapManifest } from "./manifest";
import { PipelineResult } from "./pipeline";

describe("function mapManifest()", () => {
  const sampleResults: PipelineResult[] = [
    {
      data: Buffer.of(0),
      save: "file",
      metadata: {
        format: "jpeg",
        width: 256,
        height: 256,
        channels: 3,
        someValue: 42,
        someVeryLongValue: "longvalue",
      },
    },
  ];

  test("maps sample result data", () => {
    const manifest = mapManifest(sampleResults, {
      source: {
        v: "someValue",
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
          w: 256,
          h: 256,
        },
      ],
    });
  });

  test("limits a long value", () => {
    const manifest = mapManifest(sampleResults, {
      source: { v: "someVeryLongValue:4" },
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
    const manifest = mapManifest(sampleResults, {
      source: { v: "someVeryLongValue:string" },
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
    const manifest = mapManifest([], {
      source: {},
      format: {},
    });

    expect(manifest).toMatchObject({
      f: [],
    });
  });

  test("handles no metadata", () => {
    const manifest = mapManifest(sampleResults, {
      source: {},
      format: {},
    });

    expect(manifest).toMatchObject({
      f: [{}],
    });
  });
});
