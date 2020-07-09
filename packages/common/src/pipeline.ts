/** A primitive value that can be used in metadata */
export type PrimitiveValue = boolean | number | string;

/**
 * A flexible metadata object that is passed between pipes,
 * and included with each saved format.
 */
export interface Metadata {
  format: string;
  width: number;
  height: number;
  channels: number;
  originalFormat: string;
  originalWidth: number;
  originalHeight: number;
  [index: string]: PrimitiveValue;
}

/**
 * The expected return value from a pipe function. It is a simple process applied
 * as a transformation to an image buffer, with the ability of extending the metadata
 * object to be passed to future pipes.
 */
export interface PipeResult {
  data: Buffer;
  metadata: Metadata;
}

/**
 * The template that a pipe function must conform to. A pipe is a function that applies
 * a transformation to an image buffer, with access to the image metadata, and returns
 * a new buffer, extending the metadata object if needed. The returned buffer and
 * metadata object will be passed to any future pipes down that chain.
 */
export type Pipe<O = any> = (input: Buffer, metadata: Metadata, options?: O) => Promise<PipeResult | PipeResult[]>;

/**
 * A saved chunk of the pipeline process. It is generated from a PipeResult when that pipe
 * is marked with a `save` property in the pipeline schema, indicating that that particular
 * pipe's result should be saved as an exported format. The value of save matches the value
 * defined in the pipeline segment.
 */
export type PipelineResult = PipeResult & { save: PrimitiveValue };

/** All array of PipelineResult objects that represents all exported formats of a pipeline process */
export type PipelineResults = PipelineResult[];

/**
 * The template of a single branch of a pipeline schema. It may only have one input, but the
 * result of the first pipe may be sent to multiple consecutive pipes.
 *
 * The save property indicates whether the output of the pipe should also be exported as from
 * the pipeline segment, which can later be identified by the value of the save property.
 */
export interface PipelineSegment<O = any> {
  pipe: string | { resolve: string; module?: string } | Pipe;
  options?: O;
  save?: PrimitiveValue;
  then?: Pipeline;
}

/**
 * The template that a complete pipeline schema must adhere to. It is a collection of
 * "tree branches", where the beginning of each branch, or segment, will receive the original
 * image, which will subsequently be piped into the next connected pipes.
 *
 * Once the pipeline has finished executing, any pipeline segments that have the `save` property
 * defined will have their output image buffer saved as an exported format of the pipeline.
 */
export type Pipeline = PipelineSegment[];
