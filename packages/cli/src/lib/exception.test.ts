import { CliException } from "./exception";

describe("class CliException()", () => {
  test("can be instantiated", () => {
    const exception = new CliException("Random message");

    expect(exception).toBeInstanceOf(CliException);
    expect(exception).toBeInstanceOf(Error);

    expect(exception.name).toBe(CliException.name);
    expect(exception.message).toBe("Random message");
  });
});
