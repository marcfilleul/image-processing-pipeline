import { Pipe, PipeException } from "@ipp/common";
import mozjpeg, { Options as JpegOptions } from "imagemin-mozjpeg";
import pngquant, { Options as PngOptions } from "imagemin-pngquant";
import svgo, { Options as SvgOptions } from "imagemin-svgo";

type CompressFunction = (image: Buffer) => Promise<Buffer>;

export interface CompressOptions {
  /** Don't throw an error if an unsupported image format is received, instead pass it through */
  allowUnsupported?: boolean;
  /** Options passed to mozjpeg */
  jpeg?: JpegOptions;
  /** Options passed to pngquant */
  png?: PngOptions;
  /** Options passed to svgo */
  svg?: SvgOptions;
}

export const CompressPipe: Pipe<CompressOptions> = async (input, metadata, options = {}) => {
  const plugin = resolvePlugin(metadata.format, options);

  return {
    data: typeof plugin === "function" ? await plugin(input) : input,
    metadata,
  };
};

function resolvePlugin(format: string, options: CompressOptions): CompressFunction | undefined {
  switch (format) {
    case "jpeg":
      return mozjpeg(options.jpeg);
    case "png":
      return pngquant(options.png);
    case "svg":
      return svgo(options.svg);
    default:
      if (!options.allowUnsupported) throw new PipeException(`Cannot compress format ${format}`);
  }
}
