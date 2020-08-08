import { stdout } from "process";
import { Observable } from "rxjs";
import { debounceTime, last } from "rxjs/operators";
import { Stage, State } from "~/model/state";
import { UI } from "../ui";

const INTERVAL = 1000;

export const TextUi: UI = (ctx) => {
  stdout.write(
    `Image Processing Pipeline\nVersion ${ctx.version}\nConcurrency: ${ctx.concurrency}\n\n`
  );

  const unsubscribe = textUpdates(ctx.state);

  return {
    stop: unsubscribe,
  };
};

function textUpdates(observable: Observable<State>): () => void {
  const progress = observable.pipe(debounceTime(INTERVAL)).subscribe((update) => {
    if (update.stage === Stage.PROCESSING) {
      const { completed, failed, total } = update.stats.images;

      const percent = total !== 0 ? (completed + failed) / total : 0;
      const percentText = Math.round(percent * 100).toString() + "%";

      stdout.write(`${percentText} - Processing ${total} images\n`);
    }
  });

  const summary = observable.pipe(last()).subscribe((state) => {
    progress.unsubscribe();

    const { failed, completed } = state.stats.images;

    stdout.write(`Successfully processed ${completed} images\n`);

    if (failed > 0) {
      stdout.write(`${failed} images failed to process, see errors.json\n`);
    }
  });

  return () => {
    progress.unsubscribe();
    summary.unsubscribe();
  };
}
