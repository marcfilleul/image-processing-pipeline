export class Exception extends Error {
  public name = "Exception";

  constructor(message: string) {
    super(message);
  }

  /** Extend another error's stack, returning the instance for chaining */
  extend(stack: Error | string): this {
    this.stack = typeof stack === "string" ? stack : stack.stack;
    return this;
  }
}

export class PipelineException extends Exception {
  public name = "PipelineException";

  constructor(message: string) {
    super(message);
  }
}

export class PipeException extends Exception {
  public name = "PipeException";

  constructor(message: string) {
    super(message);
  }
}
