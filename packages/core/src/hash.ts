import { createHash } from "crypto";

const HASH_ALGORITHM = "md5";

/** Creates a unique hash of a buffer. Uses the MD5 algorithm. */
export function hash(buffer: Buffer): string {
  const hash = createHash(HASH_ALGORITHM);
  hash.update(buffer);
  return hash.digest("hex");
}
