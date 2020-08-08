import { Observable } from "rxjs";
import { State } from "../model/state";

export interface UiContext {
  concurrency: number;
  state: Observable<State>;
  version: string;
}

export interface UiInstance {
  stop: () => void | Promise<void>;
}

export type UI = (context: UiContext) => UiInstance;

export default {};
