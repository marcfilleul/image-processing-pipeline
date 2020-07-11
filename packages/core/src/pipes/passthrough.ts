import { Pipe } from "@ipp/common";

/** A pipe that does nothing to the image. Useful for testing */
export const PassthroughPipe: Pipe = async (data) => data;
