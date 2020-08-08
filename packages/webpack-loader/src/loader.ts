import { getOptions } from "loader-utils";
import { isBuffer } from "util";
import { loader } from "webpack";
import { checkOptions } from "./options";
import { runtime } from "./runtime";

export const ippLoader: loader.Loader = function ippLoader(source, map) {
  if (!isBuffer(source))
    throw new Error("Source must be a buffer. This error most likely is caused by webpack.");

  // Create async loader
  const callback = this.async();
  if (typeof callback === "undefined") throw new Error("Could not create webpack async callback");

  // Webpack configuration
  this.cacheable(true);

  // Validate options
  const options = getOptions(this);
  const validatedOptions = checkOptions(options);

  // Generate the images
  runtime(this, validatedOptions, source)
    .then((result) => callback(null, serialiseResult(result), map))
    .catch((err) => callback(err));
};

function serialiseResult(obj: any): string {
  return `module.exports = { default: ${JSON.stringify(obj)} };\n`;
}

export const raw = true;
