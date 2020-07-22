import { promises } from "fs";
import { repository, version } from "./constants";
import { join } from "path";

describe("constants", () => {
  let packageJson: any;

  beforeAll(async () => {
    packageJson = JSON.parse((await promises.readFile(join(__dirname, "../package.json"))).toString());
  });

  test("version matches package.json", () => {
    expect(version).toBe(packageJson.version);
  });

  test("repository matches package.json", () => {
    expect(repository).toBe(packageJson.repository?.url || packageJson.repository);
  });
});
