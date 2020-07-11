import { Pipe, PipeException } from "@ipp/common";
import sharp, { Raw, Sharp } from "sharp";

export interface ConvertOptions {
  format: string;
  convertOptions?: Parameters<Sharp["toFormat"]>[1];
}

export const ConvertPipe: Pipe<ConvertOptions> = async (data, options) => {
  if (!options || !options.format) throw new PipeException('Missing "format" option');

  const {
    data: newData,
    info: { width, height, channels, format },
  } = await sharp(data.buffer as Buffer, {
    raw:
      data.metadata.format === "raw"
        ? {
            width: data.metadata.width,
            height: data.metadata.height,
            channels: data.metadata.channels as Raw["channels"],
          }
        : void 0,
  })
    .toFormat(options.format === "original" ? data.metadata.originalFormat : options.format, options.convertOptions)
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: newData,
    metadata: {
      ...data.metadata,
      width,
      height,
      channels,
      format,
    },
  };
};
