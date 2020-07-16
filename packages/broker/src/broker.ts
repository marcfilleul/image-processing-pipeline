import { Pipeline } from "@ipp/common";
import { EventEmitter } from "events";
import { finished, PassThrough, Readable } from "stream";
import { Client, InternalTaskResult, Provider, Task, TaskFailure } from "./common";
import { BrokerException } from "./exception";
import { idGenerator } from "./utils";

export class Broker {
  events = new EventEmitter();

  private id = idGenerator();

  private active = false;
  private destroyed = false;

  private clients = new Map<number, { client: Client; tasks: Map<number, Provider> }>();
  private providers = new Map<number, Provider>();

  private taskStream = new PassThrough({ objectMode: true, highWaterMark: 8 });
  private resultStream = new PassThrough({ objectMode: true, highWaterMark: 8 });

  constructor() {
    this.taskStream.on("readable", () => this.distribute());
  }

  /** Registers a new task stream with the broker that will get distributed amongst connected clients */
  queue(pipeline: Pipeline, tasks: Task | Iterable<Task> | AsyncIterable<Task>): Readable {
    const provider: Provider = {
      id: this.id(),
      pipeline,

      source: Readable.from(isIterable<Task>(tasks) ? tasks : [tasks]),
      submissions: new PassThrough({ objectMode: true }),

      activeTasks: new Set(),
    };

    console.log(((isIterable<Task>(tasks) ? tasks : [tasks]) as Iterable<Task>)[Symbol.iterator]);
    console.log(`Provider tasks length: ${provider.source.readableLength}`);
    provider.source.pipe(this.taskStream, { end: false });

    // Mark the provider as done after all inputs have been ingested
    finished(provider.source, () => this.unregisterProvider(provider.id));

    this.providers.set(provider.id, provider);
    this.distribute();

    return provider.submissions;
  }

  /** Registers a new client that can provide services for the broker */
  register(client: Client): number {
    const id = this.id();

    this.clients.set(id, { client, tasks: new Map() });
    client.tasks.on("drain", () => this.distribute());
    client.results.on("error", (err) => this.handleClientError(err));
    client.results.pipe(this.resultStream);

    this.distribute();
    return id;
  }

  /** Unregister an existing client from the broker */
  async unregister(id: number, stopClient = true, force = false): Promise<boolean> {
    const entry = this.clients.get(id);
    if (!entry) return false;

    const { client, tasks } = entry;

    client.tasks.removeAllListeners("drain");
    client.results.unpipe(this.resultStream);

    if (force) {
      // Reject all active tasks
      client.results.removeAllListeners("data").removeAllListeners("error");

      for (const [taskId, provider] of tasks) {
        this.handleSubmission({
          ...this.createFailure(taskId, "The client was forcefully stopped"),
          providerId: provider.id,
        });
      }

      if (stopClient) await client.stop();
    } else {
      // Allow the client to submit final tasks
      if (stopClient) await client.stop();
      await new Promise((res) => finished(client.results, res));

      client.results.removeAllListeners("data").removeAllListeners("error");
    }

    this.clients.delete(id);
    return true;
  }

  start(): void {
    this.active = true;
    this.distribute();
  }

  pause(): void {
    this.active = false;
  }

  async shutdown(stopClients = true): Promise<void> {
    this.active = false;
    this.destroyed = true;

    // Stop and unregister clients
    const stop = [] as Promise<boolean>[];
    for (const id of this.clients.keys()) {
      stop.push(this.unregister(id, stopClients));
    }
    await Promise.allSettled(stop);
    this.clients.clear();

    // Reject any outstanding tasks
    const message = "Broker shutdown, task interrupted";
    for (const { activeTasks, submissions } of this.providers.values()) {
      for (const task of activeTasks) submissions.write(this.createFailure(task, message));
      submissions.end();
    }
  }

  private handleSubmission(result: InternalTaskResult) {
    console.log(`Received submission ${result.id}`);
    const { providerId, ...task } = result;

    const provider = this.providers.get(providerId);

    if (!provider) {
      this.error(new BrokerException(`Client submitted task for non-existent provider ${result.providerId}`));
      return;
    }

    provider.submissions.write(task);
    provider.activeTasks.delete(task.id);
    this.unregisterProvider(providerId);
  }

  private handleClientError(err: Error) {
    this.error(new BrokerException("Client error: " + err.message, err.stack));
  }

  /** Distributes available jobs amongst all connected clients */
  private async distribute() {
    if (!this.active || this.destroyed) return;
    console.log("Distributing tasks: count is " + this.taskStream.readableLength);

    for (const {
      client: { tasks },
    } of this.clients.values()) {
      if (!tasks.writable) continue;

      console.log(
        `Writable: ${tasks.writableHighWaterMark - tasks.writableLength}, readable: ${this.taskStream.readableLength}`
      );
      while (tasks.writableHighWaterMark > tasks.writableLength && this.taskStream.readableLength > 0) {
        const task: Task = this.taskStream.read();
        this.providers.get(task.)

        console.log(`Sending task ${task.id} to client`);
        tasks.write(task);
      }
    }
  }

  /** If a provider has received back all of its results, unregister it from the broker */
  private unregisterProvider(id: number): boolean {
    const provider = this.providers.get(id);
    if (!provider) return false;

    if (!provider.source.readable && provider.activeTasks.size === 0) {
      provider.source.unpipe(this.taskStream);
      provider.submissions.end();
      this.providers.delete(id);
      return true;
    }

    return false;
  }

  /** Emit a new BrokerException on the broker object */
  private error(exception: BrokerException) {
    this.events.emit("error", exception);
  }

  /** Creates a new failure object with a broker exception */
  private createFailure(id: number, message: string): TaskFailure {
    return {
      id,
      ok: false,
      error: {
        name: BrokerException.name,
        message,
      },
    };
  }
}

/** Returns true if an object is iterable or asynchronously iterable. Typescript type guard. */
function isIterable<T>(x: unknown): x is Iterable<T> | AsyncIterable<T> {
  return (
    typeof (x as Iterable<T>)[Symbol.iterator] === "function" ||
    typeof (x as AsyncIterable<T>)[Symbol.asyncIterator] === "function"
  );
}
