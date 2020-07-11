import { DataObject, PipelineBranch, PipelineResult } from "@ipp/common";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { executePipeline } from "./core";
import { hash } from "./hash";

jest.mock("sharp");

jest.mock(
  "./pipes/cjs_pipe_mock",
  () => {
    const PassThrough = async (x: any) => x;
    PassThrough["__esModule"] = true; // a jest "hack" that creates a non-ES module export
    return PassThrough;
  },
  { virtual: true }
);

describe("function executePipeline()", () => {
  /* -- Reused utility data -- */
  const buffer = randomBytes(8);
  const sharpMetadata = { width: 256, height: 256, channels: 3, format: "jpeg" };
  const metadata = {
    ...sharpMetadata,
    hash: hash(buffer),
    originalHash: hash(buffer),
    originalWidth: sharpMetadata.width,
    originalHeight: sharpMetadata.height,
    originalFormat: sharpMetadata.format,
  };

  const data: DataObject = { buffer, metadata };

  /* -- Mocks -- */

  const metadataMock = jest.fn(async () => sharpMetadata);
  const sharpMock = (sharp as unknown) as jest.Mock<{ metadata: typeof metadataMock }>;
  const mocks = [metadataMock, sharpMock];

  /* -- Lifecycle -- */

  beforeAll(() => sharpMock.mockImplementation(() => ({ metadata: metadataMock })));
  afterAll(() => sharpMock.mockRestore());
  afterEach(() => mocks.forEach((m) => m.mockClear()));

  /* -- Tests -- */

  describe("execution", () => {
    test("accepts an empty pipeline", async () => {
      const result = executePipeline([], buffer, {});
      await expect(result).resolves.toMatchObject<PipelineResult>({
        source: data,
        formats: [],
      });
    });

    test("executes a single branch", async () => {
      const result = executePipeline([{ pipe: "passthrough" }], buffer, {});
      await expect(result).resolves.toMatchObject<PipelineResult>({
        source: data,
        formats: [],
      });
    });

    test("saves a format", async () => {
      const result = executePipeline([{ pipe: "passthrough", save: "name" }], buffer, {});
      await expect(result).resolves.toMatchObject<PipelineResult>({
        source: data,
        formats: [{ data, saveKey: "name" }],
      });
    });

    test("saves multiple formats", async () => {
      const result = executePipeline(
        [
          { pipe: "passthrough", save: "file1" },
          { pipe: "passthrough", save: "file2" },
        ],
        buffer,
        {}
      );

      await expect(result).resolves.toMatchObject<PipelineResult>({
        source: data,
        formats: ["file1", "file2"].map((f) => ({ data, saveKey: f })),
      });
    });

    test("handles nested pipelines", async () => {
      const result = executePipeline(
        [{ pipe: "passthrough", save: "file1", then: [{ pipe: "passthrough", save: "file2" }] }],
        buffer,
        {}
      );

      await expect(result).resolves.toMatchObject<PipelineResult>({
        source: data,
        formats: ["file1", "file2"].map((f) => ({ data, saveKey: f })),
      });
    });

    test("handles pipe rejections", async () => {
      const result = executePipeline(
        [
          {
            pipe: async function RejectionPipe() {
              throw new Error("I failed!");
            },
          },
        ],
        buffer,
        {}
      );

      await expect(result).rejects.toThrow("[RejectionPipe] I failed!");
    });

    test("generates file hashes", async () => {
      const newData = randomBytes(8);
      const result = executePipeline(
        [{ pipe: async (data) => ({ ...data, buffer: newData }), save: true }],
        buffer,
        {}
      );

      await expect(result).resolves.toMatchObject<PipelineResult>({
        source: data,
        formats: [
          {
            saveKey: true,
            data: {
              buffer: newData,
              metadata: {
                ...metadata,
                hash: hash(newData),
                originalHash: hash(buffer),
              },
            },
          },
        ],
      });
    });
  });

  describe("pipe resolution", () => {
    test("correct resolution", async () => {
      const pipes: PipelineBranch["pipe"][] = [
        "passthrough",
        { resolve: "./pipes/cjs_pipe_mock" },
        { resolve: "./pipes/passthrough", module: "PassthroughPipe" },
        async (x) => x,
      ];

      for (const pipe of pipes) {
        const result = executePipeline([{ pipe }], buffer, {});
        await expect(result).resolves.toMatchObject<PipelineResult>({
          source: data,
          formats: [],
        });
      }
    });

    test("resolution failure", async () => {
      const pipes = [
        "non_existent_pipe",
        { resolve: "./pipes/non_existent_pipe" },
        { resolve: "./pipes/passthrough", module: "default" },
        { resolve: "./pipes/non_existent_pipe", module: "default" },
      ];

      for (const pipe of pipes) {
        const result = executePipeline([{ pipe }], buffer, {});
        await expect(result).rejects.toBeTruthy();
      }
    });

    test("handles malformed pipe syntax", async () => {
      const pipes = [null, true, 42];

      for (const pipe of pipes) {
        const result = executePipeline([{ pipe: pipe as any }], buffer, {});
        await expect(result).rejects.toThrow("Unknown pipe resolution scheme");
      }
    });
  });

  test("handles metadata errors", async () => {
    metadataMock.mockImplementationOnce(() => Promise.reject("I rejected!"));
    const result = executePipeline([{ pipe: () => Promise.reject() }], buffer, {});

    await expect(result).rejects.toThrow("Metadata error: I rejected!");
  });

  test("handles missing metadata values", async () => {
    metadataMock.mockImplementationOnce(async () => ({} as any));
    const result = executePipeline([{ pipe: () => Promise.reject() }], buffer, {});

    await expect(result).rejects.toThrow("Metadata error: missing properties");
  });

  test("handles no pipe output (edge case)", async () => {
    const result = executePipeline(
      [
        {
          pipe: (async () => {
            /* */
          }) as any,
        },
      ],
      buffer,
      {}
    );
    await expect(result).resolves.toMatchObject<PipelineResult>({
      source: data,
      formats: [],
    });
  });
});
