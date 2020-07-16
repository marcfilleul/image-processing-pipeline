import { Metadata, Pipeline, PipelineResult } from "@ipp/common";
import { PassThrough, Readable, Writable } from "stream";

interface Id {
  id: number;
}

interface ProviderId {
  providerId: number;
}

export interface Task extends Id {
  data: Buffer | ReadableStream; // TODO stream?
  metadata?: Partial<Metadata>;
}

export interface InternalTask extends Task, ProviderId {}

export interface TaskSuccess extends Id {
  ok: true;
  formats: PipelineResult;
}
export interface TaskFailure extends Id {
  ok: false;
  error: {
    name: string;
    message: string;
  };
}

export type TaskResult = TaskSuccess | TaskFailure;
export type InternalTaskResult = TaskResult & ProviderId;

export interface Provider extends Id {
  pipeline: Pipeline;

  source: Readable;
  submissions: PassThrough;

  activeTasks: Set<number>;
}

export interface Client {
  tasks: Writable;
  results: Readable;

  capabilities: Map<string, string>;
  hasCapabilities(capabilities: string[]): boolean | null;

  stop: () => Promise<void>;
}

export default {};
