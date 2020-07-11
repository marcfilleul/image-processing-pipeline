import { Exception, PipeException, PipelineException } from "./exception";

describe("Exception classes", () => {
  test.each(
    [Exception, PipelineException, PipeException].map<[string, typeof Exception]>((e) => [e.name, e])
  )("instantiate %s", (_, e) => {
    const exception = new e("Random message");

    expect(exception).toBeInstanceOf(e);
    expect(exception).toBeInstanceOf(Error);

    expect(exception.name).toBe(e.name);
    expect(exception.message).toBe("Random message");
  });
});
