import { getOptions } from "loader-utils";
import { isBuffer } from "util";
import { loader } from "webpack";
import { checkOptions } from "./options";
import { runtime } from "./runtime";

export const ippLoader: loader.Loader = function ippLoader(source, map) {
  // Create async loader
  const callback = this.async();
  if (typeof callback === "undefined") throw new Error("Could not create webpack async callback");

  // Webpack configuration
  this.cacheable(true);

  // Validate options
  const options = getOptions(this);
  const validatedOptions = checkOptions(options);

  // Generate the images
  runtime(this, validatedOptions, isBuffer(source) ? source : Buffer.from(source))
    .then((result) => callback(null, result, map))
    .catch((err) => callback(err));
};

export const raw = true;
