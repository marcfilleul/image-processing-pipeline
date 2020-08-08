#!/usr/bin/env node
// Node.js makes if difficult to increase the number of libuv threads that
// are available to external libraries wih binary addons. This will attempt
// to increase the number of threads, or run an early process fork on certain
// platforms.

import { fork } from "child_process";
import { cpus, platform } from "os";
import { argv, env } from "process";
import { DEFAULT_LIBUV_THREADPOOL } from "./constants";

/** Environmental variable entry that signifies that process has already been forked */
const FORK_VARIABLE = "IPP_FORKED";

const CONCURRENCY_FLAGS = ["-c", "--concurrency"];

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
  if (typeof env.DEBUG !== "undefined") return DEFAULT_LIBUV_THREADPOOL;

  // Prevent an infinite loop of spawned processes
  if (typeof env[FORK_VARIABLE] !== "undefined" || process.connected) {
    const detectedSize = parseInt(env.UV_THREADPOOL_SIZE as string);
    if (!detectedSize) return DEFAULT_LIBUV_THREADPOOL;
    return Math.max(detectedSize - DEFAULT_LIBUV_THREADPOOL, DEFAULT_LIBUV_THREADPOOL);
  }

  const concurrency = parseConcurrency() || cpus().length;
  const uvThreads = concurrency + DEFAULT_LIBUV_THREADPOOL;

  switch (platform()) {
    case "win32":
      // Ignore interrupts on the parent, there are no open handles apart from the
      // forked child process which will handle its own interrupts and exit accordingly
      process.on("SIGINT", () => null);

      fork(__filename, argv.slice(2), {
        env: {
          ...env,
          UV_THREADPOOL_SIZE: uvThreads.toString(),
          TS_NODE_PROJECT: env.NODE_ENV === "test" ? "tsconfig.test.json" : void 0,
          [FORK_VARIABLE]: "1",
        },
        execArgv: env.NODE_ENV === "test" ? ["-r", "ts-node/register"] : void 0,
      });
      return false;

    default:
      env.UV_THREADPOOL_SIZE = uvThreads.toString();
  }

  return uvThreads;
}

/** A lightweight CLI flag parser */
function parseConcurrency(): number | null {
  for (const flag of CONCURRENCY_FLAGS) {
    const index = argv.indexOf(flag);
    if (index !== -1) return parseInt(argv[index + 1]) || null;
  }

  return null;
}
