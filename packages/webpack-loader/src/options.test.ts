import { checkOptions, Options } from "./options";

describe("function checkOptions()", () => {
  test("validates a simple pipeline", () => {
    expect(checkOptions({ pipeline: [] })).toBeTruthy();
  });

  test("accepts more complex options", () => {
    const options: Options = {
      name: "test",
      outputPath: "path",
      devBuild: true,
      regExp: /regex/,
      context: "some_context",
      pipeline: [],
      manifest: { source: {}, format: {} },
    };
    expect(checkOptions(options)).toMatchObject(options);
  });

  test("requires a pipeline", () => {
    expect(() => checkOptions({})).toThrow(/Invalid config/);
  });
});
