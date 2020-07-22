#!/usr/bin/env node
// Node.js makes if difficult to increase the number of libuv threads that
// are available to external libraries wih binary addons. This will attempt
// to increase the number of threads, or run an early process fork on certain
// platforms.

import { fork } from "child_process";
import { cpus, platform } from "os";
import { argv, env } from "process";

/** Environmental variable entry that signifies that process has already been forked */
const FORK_VARIABLE = "IPP_FORKED";

const CONCURRENCY_FLAGS = ["-c", "--concurrency"];

/** http://docs.libuv.org/en/v1.x/threadpool.html */
const LIBUV_DEFAULT_THREADPOOL = 4;

async function main() {
  const concurrency = elevateUvThreads();
  if (concurrency) {
    (await import("./init")).init(concurrency);
  }
}

main().catch((err) => console.error(err));

/**
 * Attempts to increase the number of UV threads available by setting
 * the UV_THREADPOOL_SIZE variable on supported platforms, otherwise
 * forks a new process.
 *
 * @returns {boolean} True on success, false if the process was forked
 * and execution should not continue.
 */
function elevateUvThreads(): number | false {
  if (typeof env.DEBUG !== "undefined") return LIBUV_DEFAULT_THREADPOOL;

  // Prevent an infinite loop of spawned processes
  if (typeof env[FORK_VARIABLE] !== "undefined" || process.connected)
    return parseInt((env.UV_THREADPOOL_SIZE || 0) as string) + LIBUV_DEFAULT_THREADPOOL;

  const concurrency = LIBUV_DEFAULT_THREADPOOL + (parseConcurrency() || cpus().length);

  switch (platform()) {
    case "win32":
      // Ignore interrupts on the parent, there are no open handles apart from the
      // forked child process which will handle its own interrupts and exit accordingly
      process.on("SIGINT", () => null);

      fork(__filename, argv.slice(2), {
        env: {
          ...env,
          UV_THREADPOOL_SIZE: concurrency.toString(),
          TS_NODE_PROJECT: env.NODE_ENV === "test" ? "tsconfig.test.json" : void 0,
          [FORK_VARIABLE]: "1",
        },
        execArgv: env.NODE_ENV === "test" ? ["-r", "ts-node/register"] : void 0,
      });
      return false;

    default:
      env.UV_THREADPOOL_SIZE = concurrency.toString();
  }

  return concurrency;
}

/** A lightweight CLI flag parser */
function parseConcurrency(): number | null {
  for (const flag of CONCURRENCY_FLAGS) {
    const index = argv.indexOf(flag);
    if (index !== -1) return parseInt(argv[index + 1]) || null;
  }

  return null;
}
