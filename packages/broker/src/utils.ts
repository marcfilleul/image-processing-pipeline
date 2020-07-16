export function toAsyncIterable<T>(obj: T | Iterable<T> | AsyncIterable<T>): AsyncIterable<T> {
  if (isAsyncIterable(obj)) return obj;

  if (isIterable(obj)) {
    return (async function* () {
      for (const x of obj) yield x;
    })();
  }

  return (async function* () {
    yield obj;
  })();
}

export function isIterable<T>(x: unknown): x is Iterable<T> {
  return typeof (x as Iterable<T>)[Symbol.iterator] === "function";
}

export function isAsyncIterable<T>(x: unknown): x is AsyncIterable<T> {
  return typeof (x as AsyncIterable<T>)[Symbol.asyncIterator] === "function";
}

export function idGenerator(): () => number {
  let i = 0;
  return () => ++i;
}
