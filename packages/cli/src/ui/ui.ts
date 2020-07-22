import { Observable } from "rxjs";
import { State } from "../model/state";

export interface UiContext {
  stop: () => Promise<void>;
}

export type UI = (state: Observable<State>) => UiContext;

export default {};
