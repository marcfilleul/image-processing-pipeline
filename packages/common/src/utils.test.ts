import { Metadata } from "./pipeline";
import { sampleMetadata, slash } from "./utils";

describe("function slash()", () => {
  test("converts a backslash to forward slash", () => {
    expect(slash("\\")).toBe("/");
  });

  test("slashes Unix paths", () => {
    expect(slash("/some/path/to/something")).toBe("/some/path/to/something");
    expect(slash("\\some\\path\\to\\something")).toBe("/some/path/to/something");
  });

  test("slashes a Windows path", () => {
    expect(slash("C:\\Windows\\")).toBe("C:/Windows/");
  });
});

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
