export const ROOT = "root";
export const INTERNAL = "internal";

export type Key = string | number;
export type Value = any;

export interface Pair {
	[index: Key]: Value;
}

export { Tree } from "./tree";