import { Exception } from "@ipp/common";

export class InterruptException extends Exception {
  public name = "InterruptException";

  constructor(message: string) {
    super(message);
  }
}

export interface InterruptHandler {
  rejecter: Promise<never>;
  rejected: () => boolean;
  destroy: () => void;
}

/**
 * Attaches a SIGINT handler to the process, and returns a promise tha rejects
 * with an InterruptException when the handler is called.
 *
 * The handler may be unregistered using the returned destroy function, which resolves
 * the promise and removes the signal handler.
 */
export function createInterruptHandler(): InterruptHandler {
  let rejectedBool = false;

  let destroy: InterruptHandler["destroy"] = () => void 0;

  const rejecter = new Promise<never>((_, rej) => {
    const handler = () => {
      rej(new InterruptException("Received SIGINT"));
      rejectedBool = true;
    };

    process.on("SIGINT", handler);
    destroy = () => {
      process.off("SIGINT", handler);
    };
  });

  // Avoid unhandled rejections.
  // Promise.race() will register a permanent catch() function anyway.
  rejecter.catch(() => {
    /* */
  });

  const rejected = () => rejectedBool;

  return {
    destroy,
    rejecter,
    rejected,
  };
}
