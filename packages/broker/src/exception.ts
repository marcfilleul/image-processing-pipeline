import { Exception } from "@ipp/common";

export class BrokerException extends Exception {
  public name = "BrokerException";

  constructor(message?: string, stack?: string) {
    super(message, stack);
  }
}
