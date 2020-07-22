import { Stage, State, Status, Task } from "cli/src/model/state";
import { cross, pointer, square, tick } from "figures";
import { Box, Color, ColorProps, Text } from "ink";
import Spinner from "ink-spinner";
import React, { ReactNode } from "react";
import { Observable } from "rxjs";
import { useObservable } from "./useObservable";

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

const WIDTH = 40;

const Layout: React.FC = ({ children }) => (
  <Box width={WIDTH} flexDirection="column" alignItems="center">
    <Box flexDirection="column" minWidth={0.4 * WIDTH}>
      {children}
    </Box>
  </Box>
);

const Tasks: React.FC<{ tasks: Task[] }> = ({ tasks }) => (
  <>
    {tasks.map((t) => (
      <Box key={t.id}>
        {t.status === Status.PENDING ? (
          <Color cyan>
            <Spinner />
          </Color>
        ) : t.status === Status.ERROR ? (
          <Color red>{cross}</Color>
        ) : t.status === Status.COMPLETE ? (
          <Color green>{tick}</Color>
        ) : (
          " "
        )}
        <Box marginLeft={1}>
          <Color grey={t.status === Status.WAITING}>{t.text}</Color>
        </Box>
      </Box>
    ))}
  </>
);

const StageIndicator: React.FC<{ stage: Stage; completed: boolean }> = ({ stage, completed }) => {
  const props: Mutable<ColorProps> = {};
  let text: ReactNode | null = null;

  switch (stage) {
    case Stage.DONE:
      text = "Complete";
      props.greenBright = true;
      break;

    case Stage.ERROR:
      text = "Error";
      props.redBright = true;
      break;

    case Stage.INTERRUPT:
      text = (
        <Box flexDirection="column">
          <Text>Interrupt</Text>
          {!completed && (
            <Text>
              Press <Text bold>Ctrl-C</Text> to force exit
            </Text>
          )}
        </Box>
      );
      props.keyword = "orange";
      break;
  }

  if (!text) return null;

  return (
    <Color {...props}>
      {pointer} {text}
    </Color>
  );
};

export const ProgressBar: React.FC<{ width: number; progress: number }> = ({ width, progress }) => {
  const clamped = Math.max(0, Math.min(1, progress));
  const progressText = `${Math.round(clamped * 100)}%`.padStart(4);

  const internalWidth = width - 4;
  const dots = Math.max(0, Math.min(internalWidth, Math.round(progress * internalWidth)));
  const space = internalWidth - dots;

  return (
    <Box width={width}>
      {square.repeat(dots)}
      {" ".repeat(space)} {progressText}
    </Box>
  );
};

export const Terminal: React.FC<{ state: Observable<State> }> = ({ state: observable }) => {
  const [status, state] = useObservable(observable);

  return (
    <>
      {state && (
        <>
          {state.stage !== Stage.ERROR && (
            <Layout>
              <Tasks tasks={state.tasks} />
            </Layout>
          )}
          {state.stage === Stage.PROCESSING && (
            <Box marginTop={1} width={WIDTH} justifyContent="center">
              <ProgressBar
                width={20}
                progress={
                  (state.statistics.images.completed + state.statistics.images.failed) / state.statistics.images.total
                }
              />
            </Box>
          )}
        </>
      )}

      {status === "complete" && (
        <Box flexDirection="column" marginTop={1} paddingLeft={8}>
          {state && <StageIndicator stage={state.stage} completed={status === Status.COMPLETE} />}
        </Box>
      )}
    </>
  );
};
