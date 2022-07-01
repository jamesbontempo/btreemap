import { closeSync, openSync, readSync, statSync, writeSync} from "node:fs";
import { deserialize, serialize } from "bson";

// const lettersFirst = /^[\p{L}\p{M}\p{N}]/u;

function typeOf(item: any): string {
	const typeOfItem = typeof item;
	if (typeOfItem !== "object") {
		return typeOfItem;
	} else {
		if (item === null) return "null";
		return Object.prototype.toString.call(item).slice(8,-1).toLowerCase();
	}
}

function convertKey(key: any): undefined|null|number|Date|string|Array<any>|Object {
	const typeOfKey = typeOf(key);
	switch (typeOfKey) {
		case "null":
		case "boolean":
		case "number":
		case "date":
		case "string":
		case "regexp":
		case "array":
		case "object":
			return key;
		case "undefined":
			return null;
		case "bigint":
			return String(key) + "n";
		default:
			return String(key);
	}
}

export interface IBTreeMap {
	// properties
	readonly lowest: any;
	readonly highest: any;
	readonly order: number;
	readonly size: number;
	readonly stats: Record<string, number>;
	// data manipulation methods
	has(key: any): boolean;
	set(key: any, value: any): BTreeMap;
	get(key: any, endKey?: any, inclusive?: boolean): Array<any>|IterableIterator<Array<any>>;
	delete(key: any, endKey?: any, inclusive?: boolean): boolean;
	clear(): void;
	// iterators
	[Symbol.iterator](): IterableIterator<Array<any>>;
	keys(start: any, end: any, inclusive: boolean): IterableIterator<any>
	values(start: any, end: any, inclusive: boolean): IterableIterator<Array<any>>;
	entries(start: any, end: any, inclusive: boolean): IterableIterator<Array<any>>;
	// funcional methods
	forEach(func: Function, start: any, end: any, inclusive: boolean): void;
	// I/O methods
	load(path: string): void;
	save(path: string): void;
	toString(): string;
}

export class BTreeMap implements IBTreeMap {
	#order: number = 3;
	#compare: Function = (a: any, b: any): number => {	
		const typeOfA = typeOf(a);
		const typeOfB = typeOf(b);
		if (typeOfA === typeOfB) {
			return (a < b) ? -1 : ((a > b) ? 1 : 0);
		} else {
			return (typeOfA < typeOfB) ? -1 : 1;
		}
	};
	#unique: boolean = false;
	#stats: Record<string, number>;
	#map: Map<any, any>;
	#root: Node|Leaf;
	#headers: any = [
		{length: 8, get: () => this.#order, set: (v: number) => this.#order = v},
		{length: 1, get: () => (this.#unique === false) ? 0 : 1, set: (v: number) => this.#unique = (v === 0) ? false : true},
	];
	
	constructor(order: number|null = 3, options: any = {}) {
		if (order && order >= 3) this.#order = order;
		if (options.comparator) this.#compare = options.comparator;
		if (options.unique) this.#unique = options.unique;
		this.#stats = {depth: 0, nodes: 0, leaves: 0, keys: 0, values: 0};
		this.#map = new Map();
		this.#root = new Leaf(this.#order, this.#compare, this.#stats);
	}
	
	// properties
	
	get lowest(): any {
		return this.#root.lowest;
	}
	
	get highest(): any {
		return this.#root.highest;
	}
	
	get order(): number {
		return this.#order;
	}
	
	get size(): number {
		return this.#map.size;
	}
	
	get stats(): Record<string, number> {
		return this.#stats;
	}
	
	// data manipulation methods
	
	has(key: any): boolean {
		return this.#map.has(key);
	}
	
	set(key: any, value: any): BTreeMap {
		key = convertKey(key)
		if (key === undefined) return this;
		const values = this.#map.get(key);
		if (values !== undefined) {
			if (this.#unique) {
				values[0] = value;
			} else {
				values.push(value);
				this.stats.values++;
			}
		} else {			
			this.#map.set(key, [value]);
			this.#root.set(key, this.#stats);
			if (this.#root.keys.length > this.#root.max) {
				const newRoot = new Node(this.#order, this.#compare, this.#stats);
				const newChild = this.#root.split();
				newRoot.keys.push(newChild.lowest);
				newRoot.children.push(this.#root, newChild);
				this.#root = newRoot;
				this.#stats.depth++;
			}
			this.stats.values++;
		}
		return this;
	}
	
	get(key: any, endKey?: any, inclusive?: boolean): Array<any>|IterableIterator<Array<any>> {
		if (endKey) {
			return this.values(key, endKey, inclusive);
		} else {
			return (this.#unique) ? this.#map.get(key)[0] : this.#map.get(key);
		}
	}
	
	delete(key: any, endKey?: any, inclusive?: boolean): boolean {
		if (endKey) {
			let count = 0;
			const keys = Array.from(this.keys(key, endKey, inclusive));
			for (const key of keys) {
				if (this.delete(key)) count++;
			}
			return (count > 0) ? true : false;
		} else {
			if (this.#map.has(key)) {
				const count = this.#map.get(key).length;
				this.#map.delete(key);
				this.#root.delete(key);
				if (this.#root.keys.length === 0) {
					this.#root = this.#root.shrink();
					this.#stats.depth--;
				}
				this.stats.values -= count;
				return true;
			} else {
				return false;
			}
		}
	}
	
	clear(): void {
		this.#map = new Map();
		this.#stats = {depth: 0, nodes: 0, leaves: 0, keys: 0, values: 0};
		this.#root = new Leaf(this.#order, this.#compare, this.#stats);
	}
	
	// iterators
	
	[Symbol.iterator](): IterableIterator<Array<any>> {
		return this.entries();
	}
	
	*keys(start: any = this.lowest, end: any = this.highest, inclusive: boolean = true): IterableIterator<any> {
		if (this.#map.size === 0) return;
		let leaf: Leaf|null = this.#root.findLeaf(start);
		do {
			const keys = leaf.keys;
			for (let i = 0, length = keys.length; i < length; i++) {
				const key = keys[i];
				if (this.#compare(key, start) >= 0 && ((inclusive) ? this.#compare(key, end) <= 0 : this.#compare(key, end) < 0)) yield key;
				if (this.#compare(key, end) > 0) break;
			}
			leaf = leaf.next
		} while (leaf !== null)
	}
	
	*values(start: any = this.lowest, end: any = this.highest, inclusive: boolean = true): IterableIterator<Array<any>> {
		if (this.#map.size === 0) return;
		const iterator = this.keys(start, end, inclusive);
		let next = iterator.next();
		while (!next.done) {
			const key = next.value;
			const values = this.#map.get(key);
			for (const value of values) {
				yield value;
			}
			next = iterator.next();
		}
	}
	
	*entries(start: any = this.lowest, end: any = this.highest, inclusive: boolean = true): IterableIterator<Array<any>> {
		if (this.#map.size === 0) return;
		const iterator = this.keys(start, end, inclusive);
		let next = iterator.next();
		while (!next.done) {
			const key = next.value;
			const values = this.#map.get(key);
			for (const value of values) {
				yield [key, value];
			}
			next = iterator.next();
		}
	}
	
	// functional methods
	
	forEach(func: Function, start: any = this.lowest, end: any = this.highest, inclusive: boolean = true): void {
		if (this.#map.size === 0) return;
		const iterator = this.entries(start, end, inclusive);
		let next = iterator.next();
		while (!next.done) {
			const [key, value] = next.value;
			func(value, key, this);
			next = iterator.next();
		}
	}
	
	// I/O methods
	
	load(path: string): void {
		this.clear();
		let position = 0;
		const size = statSync(path).size
		const fd = openSync(path, "r+");
		for (const header of this.#headers) {
			const buffer = Buffer.alloc(header.length);
			readSync(fd, buffer, 0, header.length, position);
			header.set(buffer.readUint8());
			position += header.length;
		}
		while (position < size) {
			const length = Buffer.alloc(8);
			readSync(fd, length, 0, 8, position);
			position += 8;
			const data = Buffer.alloc(length.readUint8());
			readSync(fd, data, 0, data.length, position);
			const entry = Array.from(Object.values(deserialize(data)));
			this.set(entry[0], entry[1]);
			position += data.length;
		}
		closeSync(fd);
	}
	
	save(path: string): void {		
		let position = 0;
		const fd = openSync(path, "w");
		for (const header of this.#headers) {
			const buffer = Buffer.alloc(header.length);
			buffer.writeUInt8(header.get());
			writeSync(fd, buffer, 0, buffer.length, position);
			position += header.length;
		}
		const iterator = this.entries();
		let next = iterator.next();
		while (!next.done) {
			const entry = next.value;
			const sEntry = serialize(entry);
			const sEntryLength = Buffer.alloc(8);
			sEntryLength.writeUint8(sEntry.length);
			const data = Buffer.concat([sEntryLength, sEntry]);
			writeSync(fd, data, 0, data.length, position)
			position += data.length;
			next = iterator.next();
		}
		closeSync(fd);
	}
	
	toString(): string {
		return this.#root.toString(this.#map, 0);
	}
}

class Node {
	order: number;
	compare: Function;
	min: number;
	max: number;
	keys: Array<any>;
	children: Array<any>;
	stats: Record<string, number>;
	
	constructor(order: number, compare: Function, stats: Record<string, number>) {
		this.order = order;
		this.compare = compare;
		this.min = Math.ceil(order/2)-1;
		this.max = order-1;
		this.keys = [];
		this.children = [];
		this.stats = stats;
		this.stats.nodes++;
	}
	
	get lowest(): any {
		return this.children[0].lowest;
	}
	
	get highest(): any {
		return this.children[this.children.length-1].highest;
	}
	
	set(key: any, stats: Record<string, number>): void {
		const slot = this.slotOf(key, this.keys, this.compare);
		const child = this.children[slot];
		child.set(key, stats);
		if (child.keys.length > child.max) {
			let sibling;
			if (slot > 0) {
				sibling = this.children[slot-1];
				if (sibling.keys.length < sibling.max) {
					sibling.borrowRight(child);
					this.keys[slot-1] = child.lowest;
				} else if (slot < this.children.length-1) {
					sibling = this.children[slot+1];
					if (sibling.keys.length < sibling.max) {
						sibling.borrowLeft(child);
						this.keys[slot] = sibling.lowest;
					} else {
						this.splitChild(child, slot);
					}
				} else {
					this.splitChild(child, slot);
				}
			} else {
				sibling = this.children[1];
				if (sibling.keys.length < sibling.max) {
					sibling.borrowLeft(child);
					this.keys[slot] = sibling.lowest;
				} else {
					this.splitChild(child, slot);
				}
			}
		}
	}
	
	delete(key: any): void {
		const keys = this.keys;
		const slot = this.slotOf(key, keys, this.compare)
		const child = this.children[slot];
		child.delete(key);
		if (slot > 0) keys[slot-1] = child.lowest;
		if (child.keys.length < child.min) this.consolidateChild(child, slot);
	}
	
	findLeaf(key: any): Leaf {
		return this.children[this.slotOf(key, this.keys, this.compare)].findLeaf(key);
	}
	
	split(): Node {
		const newNode = new Node(this.order, this.compare, this.stats);
		newNode.keys = this.keys.splice(this.min);
		newNode.keys.shift();
		newNode.children = this.children.splice(this.min+1);
		return newNode;
	}
	
	shrink(): Node {
		this.stats.nodes--;
		return this.children[0];
	}
	
	borrowLeft(source: Node): void {
		this.keys.unshift(this.lowest);
		source.keys.pop();
		this.children.unshift(source.children.pop());
	}
	
	borrowRight(source: Node): void {
		this.keys.push(source.lowest);
		source.keys.shift();
		this.children.push(source.children.shift());
	}
	
	merge(source: Node): void {
		this.keys.push(source.lowest, ...source.keys);
		this.children.push(...source.children);
		this.stats.nodes--;
	}
	
	splitChild(child: Node|Leaf, slot: number): void {
		const newChild = child.split();
		this.keys.splice(slot, 0, newChild.lowest);
		this.children.splice(slot+1, 0, newChild);
	}
	
	consolidateChild(child: Node|Leaf, slot: number): void {
		const keys = this.keys;
		const children = this.children;
		let sibling;
		if (slot > 0) {
			sibling = children[slot-1];
			if (sibling.keys.length > sibling.min) {
				child.borrowLeft(sibling);
				keys[slot-1] = child.lowest;
			} else if (slot < this.children.length-1) {
				sibling = children[slot+1];
				if (sibling.keys.length > sibling.min) {
					child.borrowRight(sibling);
					keys[slot] = sibling.lowest;
				} else {
					children[slot-1].merge(child);
					keys.splice(slot-1, 1);
					children.splice(slot, 1);
				}
			} else {
				children[slot-1].merge(child);
				keys.splice(slot-1, 1);
				children.splice(slot, 1);
			}
		} else {
			sibling = children[slot+1];
			if (sibling.keys.length > sibling.min) {
				child.borrowRight(sibling);
				keys[slot] = sibling.lowest;
			} else {
				child.merge(children[1]);
				keys.splice(0, 1);
				children.splice(1, 1);
			}
		}
	}
	
	slotOf(element: any, array: Array<any>, compare: Function): number {
		let bottom = 0, top = array.length, middle = top >>> 1;
		while (bottom < top) {
			const comparison = compare(element, array[middle]);
			if (comparison === 0) {
				return middle+1;
			} else if (comparison < 0) {
				top = middle;
			} else {
				bottom = middle+1;
			}
			middle = bottom + ((top - bottom) >>> 1);
		}
		return middle;
	}
	
	toString(map: Map<any, any>, level: number = 0): string {
		let output = "|  ".repeat(level) + ((level === 0) ? "Root - " : "Node - ") + this.keys;
		for (let i = 0, length = this.children.length; i < length; i++) {
			output += "\n" + this.children[i].toString(map, level+1)
		}
		return output;
	}
}

class Leaf {
	order: number;
	compare: Function;
	min: number;
	max: number;
	keys: Array<any>;
	next: Leaf|null;
	stats: Record<string, number>;
	
	constructor(order: number, comparator: Function, stats: Record<string, number>) {
		this.order = order;
		this.compare = comparator
		this.min = Math.ceil(order/2);
		this.max = order;
		this.keys = [];
		this.next = null;
		this.stats = stats;
		this.stats.leaves++;
	}
	
	get lowest() {
		return this.keys[0];
	}
	
	get highest() {
		return this.keys[this.keys.length-1];
	}
	
	set(key: any): void {
		if (this.keys.length === 0) {
			this.keys.push(key);
		} else {
			const slot = this.slotOf(key, this.keys, this.compare);
			this.keys.splice(slot, 0, key);
		}
		this.stats.keys++;
	}
	
	delete(key: any): void {
		this.keys.splice(this.keys.indexOf(key), 1);
		this.stats.keys--;
	}
	
	findLeaf(): Leaf {
		return this;
	}
	
	split(): Leaf {
		const newLeaf = new Leaf(this.order, this.compare, this.stats);
		newLeaf.keys = this.keys.splice(this.min);	
		newLeaf.next = this.next;
		this.next = newLeaf;
		return newLeaf;
	}
	
	shrink(): Leaf {
		this.stats.leaves--;
		return new Leaf(this.order, this.compare, this.stats);
	}
	
	borrowLeft(source: Leaf): void {
		this.keys.unshift(source.keys.pop());
	}
	
	borrowRight(source: Leaf): void {
		this.keys.push(source.keys.shift());
	}
	
	merge(source: Leaf): void {
		this.keys.push(...source.keys);
		this.next = source.next;
		this.stats.leaves--;
	}
	
	slotOf(element: any, array: Array<any>, compare: Function): number {
		let bottom = 0, top = array.length, middle = top >>> 1;
		while (bottom < top) {
			const comparison = compare(element, array[middle]);
			if (comparison === 0) {
				return middle+1;
			} else if (comparison < 0) {
				top = middle;
			} else {
				bottom = middle+1;
			}
			middle = bottom + ((top - bottom) >>> 1);
		}
		return middle;
	}
	
	toString(map: Map<any, any>, level: number = 0): string {
		let output = "|  ".repeat(level) + "Leaf";
		for (const key of this.keys) {
			output += "\n" + "|  ".repeat(level+1) + key + ": " + map.get(key);
		}
		if (this.next) output += " --> " + this.next.lowest;
		return output;
	}
}