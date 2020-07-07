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
  [index: string]: PrimitiveValue;
}

/** The return value of a pipe function */
export interface PipeResult {
  data: Buffer;
  metadata: Metadata;
  save?: PrimitiveValue;
}

/** The template that pipe functions must conform to */
export type Pipe<O extends Record<string, PrimitiveValue> | undefined = undefined> = (
  input: Buffer,
  metadata: Metadata,
  options?: O
) => Promise<PipeResult | PipeResult[]>;

/**
 * A saved format from a pipeline process. Similar to a pipe result,
 * but has a defined `save` property.
 */
export type PipelineResult = PipeResult & { save: string };

/** Contains all saved formats from a pipeline process */
export type PipelineResults = PipelineResult[];

/** A single branch of a pipeline */
interface PipelineSegment<O extends Record<string, boolean | number | string> | undefined = undefined> {
  pipe: string | { resolve: string; module?: string } | Pipe;
  options: O;
  save?: true | string;
  then: Pipeline;
}

/** A full pipeline template, made from an array of pipeline segment "branches" */
export type Pipeline = PipelineSegment[];
