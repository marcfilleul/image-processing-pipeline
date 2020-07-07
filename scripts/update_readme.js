/**
 * Updates all package README.md files to match the root README.md
 */

/* eslint-disable */
const { promises, createReadStream, createWriteStream } = require("fs");
const { resolve, join } = require("path");
const { W_OK, R_OK } = require("constants");

main()
  .then(() => console.log("Done"))
  .catch(console.error);

async function main() {
  const packages = await getPackages();
  const readmes = await getReadmes(packages);

  console.log(`Found ${readmes.length} README files`);

  return updateReadmes(readmes);
}

/**
 * Resolves a list of package paths
 * @param {string} path The path to check
 * @param {number} accessLevel The fs.access constant to check
 */
async function ensureAccess(path, accessLevel) {
  return promises.access(path, accessLevel);
}

async function getPackages() {
  const packagesDir = resolve("packages");

  const packagesDirStat = await promises.stat(packagesDir);
  if (!packagesDirStat.isDirectory()) throw new Error(`"packages" is not a directory`);

  const packages = await promises.readdir(packagesDir);
  return packages.map((pkg) => join(packagesDir, pkg));
}

/**
 * Takes an array of package paths and returns all resolved README files
 * @param {string[]} packages
 */
async function getReadmes(packages) {
  const readmeAccess = packages
    .map((pkg) => join(pkg, "README.md"))
    .map(async (readme) => {
      try {
        await ensureAccess(readme, W_OK);
        return readme;
      } catch {
        return;
      }
    });

  const resolvedReadmes = await Promise.all(readmeAccess);
  return resolvedReadmes.filter((x) => !!x);
}

/**
 * Pipes the root README.md file into each package's README.md
 * @param {string[]} readmes Paths to each readme file
 */
async function updateReadmes(readmes) {
  await ensureAccess("README.md", R_OK);
  const readStream = createReadStream("README.md");

  // Pipe the readStream into each package README
  await Promise.all(
    readmes.map((readme) => {
      const writeStream = createWriteStream(readme);
      readStream.pipe(writeStream);

      return new Promise((res, rej) => {
        writeStream.once("finish", () => res());
        writeStream.once("error", (err) => rej(err));
      });
    })
  );
}
