import { Exception } from "@ipp/common";

export enum CliExceptionCode {
  CONFIG_LOAD = "CONFIG_LOAD",
  CONFIG_PARSE = "CONFIG_PARSE",
  ARG_VALIDATION = "ARG_VALIDATE",
  SEARCH = "SEARCH",
  MANIFEST = "MANIFEST",
  UNKNOWN = "UNKNOWN",
}

export class CliException extends Exception {
  public name = "CliException";

  constructor(
    message: string,
    public code?: CliExceptionCode,
    public title?: string,
    public comment?: string
  ) {
    super(message);
  }
}
