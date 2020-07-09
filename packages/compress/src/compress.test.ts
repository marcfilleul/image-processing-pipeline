import { PipeResult, Metadata } from "@ipp/common";
import { getMock } from "@ipp/testing";

import { CompressPipe } from "./compress";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminPngquant, { Plugin } from "imagemin-pngquant";
import imageminSvgo from "imagemin-svgo";
import { randomBytes } from "crypto";

jest.mock("imagemin-mozjpeg");
jest.mock("imagemin-pngquant");
jest.mock("imagemin-svgo");

describe("@ipp/compress pipe", () => {
  const mocks = {
    jpeg: getMock(imageminMozjpeg),
    png: getMock(imageminPngquant),
    svg: getMock(imageminSvgo),
  };

  const pluginMock = jest.fn(async (buffer: Buffer) => buffer);

  beforeAll(() => Object.values(mocks).forEach((mock) => mock.mockImplementation(() => pluginMock as any)));
  afterEach(() => Object.values(mocks).forEach((mock) => mock.mockClear()));
  afterAll(() => Object.values(mocks).forEach((mock) => mock.mockRestore()));

  const data = randomBytes(8);

  const formatMeta = (format: string): Metadata => ({
    channels: 3,
    format,
    height: 256,
    width: 256,
    originalFormat: format,
    originalHeight: 256,
    originalWidth: 256,
  });

  test("accepts a jpeg image", async () => {
    const metadata = formatMeta("jpeg");
    const result = CompressPipe(data, metadata);

    await expect(result).resolves.toMatchObject<PipeResult>({ data, metadata });
    expect(mocks.jpeg).toHaveBeenCalled();
    expect(pluginMock).toHaveBeenCalledWith(data);
  });

  test("accepts a png image", async () => {
    const metadata = formatMeta("png");
    const result = CompressPipe(data, metadata);

    await expect(result).resolves.toMatchObject<PipeResult>({ data, metadata });
    expect(mocks.png).toHaveBeenCalled();
    expect(pluginMock).toHaveBeenCalledWith(data);
  });

  test("accepts a svg image", async () => {
    const metadata = formatMeta("svg");
    const result = CompressPipe(data, metadata);

    await expect(result).resolves.toMatchObject<PipeResult>({ data, metadata });
    expect(mocks.svg).toHaveBeenCalled();
    expect(pluginMock).toHaveBeenCalledWith(data);
  });

  test("rejects on unsupported format", async () => {
    const metadata = formatMeta("unsupportedFormat");
    const result = CompressPipe(data, metadata);

    await expect(result).rejects.toBeTruthy();
  });

  test("respects the allowUnsupported option", async () => {
    const metadata = formatMeta("unsupportedFormat");
    const result = CompressPipe(data, metadata, { allowUnsupported: true });

    await expect(result).resolves.toMatchObject<PipeResult>({
      data,
      metadata,
    });
  });
});
