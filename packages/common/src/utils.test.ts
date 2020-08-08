import { Metadata } from "./metadata";
import { sampleMetadata } from "./utils";

describe("function sampleMetadata()", () => {
  test("generates some sample metadata", () => {
    expect(sampleMetadata(256, "jpeg")).toMatchObject<Metadata>({
      width: 256,
      height: 256,
      format: "jpeg",
      hash: expect.any(String),
      originalFormat: "jpeg",
      originalHeight: 256,
      originalWidth: 256,
      channels: 3,
      originalHash: expect.any(String),
    });
  });
});
