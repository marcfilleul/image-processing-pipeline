import { useEffect, useState } from "react";
import { Observable } from "rxjs";

type ObservableStatus = "waiting" | "open" | "error" | "complete";

/** Subscribes to an observable and triggers a render when a new state is pushed */
export function useObservable<T>(observable: Observable<T> | undefined): [ObservableStatus, T?] {
  const [status, setStatus] = useState<ObservableStatus>("waiting");
  const [state, setState] = useState<T>();

  useEffect(() => {
    if (!observable) return;

    const subscription = observable.subscribe(
      (state) => {
        setState(state);
        if (status === "waiting") setStatus("open");
      },
      () => setStatus("error"),
      () => setStatus("complete")
    );
    return (): void => subscription.unsubscribe();
  }, [observable]);

  return [status, state];
}
