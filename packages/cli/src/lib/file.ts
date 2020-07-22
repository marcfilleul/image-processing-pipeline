import { promises, Stats } from "fs";

export async function isDirectory(path: string): Promise<boolean> {
  return (await getStats(path)).isDirectory();
}

export async function getStats(path: string): Promise<Stats> {
  return promises.stat(path);
}
