type Serializer = (a: any) => string;

const defaultSerializer: Serializer = (a: any) =>
	JSON.stringify(a, ((key, value) => 
		typeof value === "bigint" ? value.toString() : value
	)
);

type Comparator = (a: any, b: any) => number;

const defaultComparator: Comparator = (a: any, b: any): number => a < b ? -1 : a > b ? 1 : 0

export type BTreeMapOptions = {
	unique?: boolean;
	order?: number;
	/** @deprecated Use serializeKey instead */
	serialize?: Serializer;
	/** @deprecated Use compareKeys instead */
	compare?: Comparator;
	serializeKey?: Serializer;
	compareKeys?: Comparator;
}

type TreeConfig = {
	order: number;
	serialize: Serializer;
	compare: Comparator;
	stats: Record<string, number>;
}

export class BTreeMap<V> {
	private readonly _config: TreeConfig;
	private readonly _unique: boolean;
	private readonly _map: Map<any, V[]>;
	private _root: Node<V> | Leaf<V>;
	
	constructor(options: BTreeMapOptions = {}) {
		this._config = {
			order: Math.max(options.order ?? 3, 3),
			serialize: options.serializeKey ?? options.serialize ?? defaultSerializer,
			compare: options.compareKeys ?? options.compare ?? defaultComparator,
			stats: { depth: 0, nodes: 0, leaves: 0, keys: 0, values: 0 }
		}
		this._unique = options.unique ?? true;
		this._map = new Map();
		this._root = new Leaf(this._config);
	}
	
	// properties
	
	get lowest(): any {
		return this._root.lowest;
	}
	
	get highest(): any {
		return this._root.highest;
	}
	
	get order(): number {
		return this._config.order;
	}

	get unique(): boolean {
		return this._unique;
	}
	
	get size(): number {
		return this._map.size;
	}
	
	get stats(): Record<string, number> {
		return { ...this._config.stats };
	}
	
	// data manipulation methods
	
	has(key: any): boolean {
		return this._map.has(this._config.serialize(key));
	}

	get(key: any): V[] | undefined {
		return this._map.get(this._config.serialize(key));
	}
	
	set(key: any, value: V): BTreeMap<V> {
		const values = this._map.get(this._config.serialize(key));
		if (values !== undefined) {
			if (this._unique) {
				values[0] = value;
			} else {
				values.push(value);
				this._config.stats.values++;
			}
		} else {			
			this._map.set(this._config.serialize(key), [value]);
			this._root.set(key);
			if (this._root.keys.length > this._root.max) {
				const newRoot = new Node(this._config);
				const newChild = this._root.split();
				newRoot.keys.push(newChild.lowest);
				newRoot.children.push(this._root, newChild);
				this._root = newRoot;
				this._config.stats.depth++;
			}
			this._config.stats.values++;
		}
		return this;
	}
	
	delete(key: any): boolean {
		if (this._map.has(this._config.serialize(key))) {
			const count = this._map.get(this._config.serialize(key))!.length;
			this._map.delete(this._config.serialize(key));
			this._root.delete(key);
			if (this._root.keys.length === 0) {
				this._root = this._root.shrink();
				this._config.stats.depth--;
			}
			this._config.stats.values -= count;
			return true;
		} else {
			return false;
		}
	}

	deleteValue(key: any, value: V, matchValue: (a: V, b: V) => boolean = (a: V, b: V) => a === b): boolean {
		const values = this._map.get(this._config.serialize(key));
		if (values === undefined) return false;
		let index = -1;
		for (let i = 0; i < values.length; i++) {
			if (matchValue(values[i], value)) {
				index = i;
				break;
			}
		}
		if (index === -1) return false;
		values.splice(index, 1);
		this._config.stats.values--;
		if (values.length === 0) this.delete(key);
		return true;
	}
	
	clear(): void {
		this._map.clear();
		this._config.stats = {depth: 0, nodes: 0, leaves: 0, keys: 0, values: 0};
		this._root = new Leaf(this._config);
	}
	
	// iterators
	
	[Symbol.iterator](): IterableIterator<Array<any>> {
		return this.entries();
	}
	
	*keys(start: any = this.lowest, end: any = this.highest, includeStart: boolean = true, includeEnd: boolean = true): IterableIterator<any> {
		if (this._map.size === 0) return;
		let leaf: Leaf<V> | null = this._root.findLeaf(start);
		let i = slotOf(start, leaf.keys, this._config.compare);
		while (i > 0 && this._config.compare(leaf?.keys[i - 1], start) >= 0) i--;
		do {
			for (const length = leaf.keys.length; i < length; i++) {
				const key = leaf.keys[i];
				const compareEnd = this._config.compare(key, end);
				if (compareEnd > 0) return;
				if (!includeEnd && compareEnd === 0) return;
				const compareStart = this._config.compare(key, start);
				if (!includeStart && compareStart === 0) continue;
				yield key;
			}
			leaf = leaf.next;
			i = 0;
		} while (leaf !== null)
	}
	
	*values(start: any = this.lowest, end: any = this.highest, includeStart: boolean = true, includeEnd: boolean = true): IterableIterator<V> {
		if (this._map.size === 0) return;
		const iterator = this.keys(start, end, includeStart, includeEnd);
		let next = iterator.next();
		while (!next.done) {
			const key = next.value;
			const values = this._map.get(this._config.serialize(key));
			for (const value of values!) {
				yield value;
			}
			next = iterator.next();
		}
	}
	
	*entries(start: any = this.lowest, end: any = this.highest, includeStart: boolean = true, includeEnd: boolean = true): IterableIterator<[any, V]> {
		if (this._map.size === 0) return;
		const iterator = this.keys(start, end, includeStart, includeEnd);
		let next = iterator.next();
		while (!next.done) {
			const key = next.value;
			const values = this._map.get(this._config.serialize(key));
			for (const value of values!) {
				yield [key, value];
			}
			next = iterator.next();
		}
	}
	
	// functional methods
	
	forEach(func: (value: V, key: any, map: BTreeMap<V>) => void, start: any = this.lowest, end: any = this.highest, includeStart: boolean = true, includeEnd: boolean = true): void {
		if (this._map.size === 0) return;
		const iterator = this.entries(start, end, includeStart, includeEnd);
		let next = iterator.next();
		while (!next.done) {
			const [key, value] = next.value;
			func(value, key, this);
			next = iterator.next();
		}
	}
	
	toString(): string {
		return this._root.toString((key: any) => this._map.get(this._config.serialize(key))!, 0);
	}
}

class Node<V> {
	config: TreeConfig;
	min: number;
	max: number;
	keys: Array<any>;
	children: Array<any>;
	
	constructor(config: TreeConfig) {
		this.config = config;
		this.min = Math.ceil(this.config.order/2)-1;
		this.max = this.config.order-1;
		this.keys = [];
		this.children = [];
		this.config.stats.nodes++;
	}
	
	get lowest(): any {
		return this.children[0].lowest;
	}
	
	get highest(): any {
		return this.children[this.children.length-1].highest;
	}
	
	set(key: any): void {
		const slot = slotOf(key, this.keys, this.config.compare);
		const child = this.children[slot];
		child.set(key, this.config.stats);
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
		const slot = slotOf(key, keys, this.config.compare)
		const child = this.children[slot];
		child.delete(key);
		if (slot > 0) keys[slot-1] = child.lowest;
		if (child.keys.length < child.min) this.consolidateChild(child, slot);
	}
	
	findLeaf(key: any): Leaf<V> {
		return this.children[slotOf(key, this.keys, this.config.compare)].findLeaf(key);
	}
	
	split(): Node<V> {
		const newNode = new Node(this.config);
		newNode.keys = this.keys.splice(this.min);
		newNode.keys.shift();
		newNode.children = this.children.splice(this.min+1);
		return newNode;
	}
	
	shrink(): Node<V> {
		this.config.stats.nodes--;
		return this.children[0];
	}
	
	borrowLeft(source: Node<V>): void {
		this.keys.unshift(this.lowest);
		source.keys.pop();
		this.children.unshift(source.children.pop());
	}
	
	borrowRight(source: Node<V>): void {
		this.keys.push(source.lowest);
		source.keys.shift();
		this.children.push(source.children.shift());
	}
	
	merge(source: Node<V>): void {
		this.keys.push(source.lowest, ...source.keys);
		this.children.push(...source.children);
		this.config.stats.nodes--;
	}
	
	splitChild(child: Node<V> | Leaf<V>, slot: number): void {
		const newChild = child.split();
		this.keys.splice(slot, 0, newChild.lowest);
		this.children.splice(slot+1, 0, newChild);
	}
	
	consolidateChild(child: Node<V> | Leaf<V>, slot: number): void {
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
	
	toString(resolve: (key: any) => V[], level: number = 0): string {
		let output = "|  ".repeat(level) + ((level === 0) ? "Root - " : "Node - ") + "[" + this.keys.map((key) => this.config.serialize(key)).join(",") + "]";
		for (let i = 0, length = this.children.length; i < length; i++) {
			output += "\n" + this.children[i].toString(resolve, level + 1)
		}
		return output;
	}
}

class Leaf<V> {
	config: TreeConfig;
	min: number;
	max: number;
	keys: Array<any>;
	next: Leaf<V> | null;
	
	constructor(config: TreeConfig) {
		this.config = config;
		this.min = Math.ceil(this.config.order/2);
		this.max = this.config.order;
		this.keys = [];
		this.next = null;
		this.config.stats.leaves++;
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
			const slot = slotOf(key, this.keys, this.config.compare);
			this.keys.splice(slot, 0, key);
		}
		this.config.stats.keys++;
	}
	
	delete(key: any): void {
		this.keys.splice(this.keys.indexOf(key), 1);
		this.config.stats.keys--;
	}
	
	findLeaf(): Leaf<V> {
		return this;
	}
	
	split(): Leaf<V> {
		const newLeaf = new Leaf(this.config);
		newLeaf.keys = this.keys.splice(this.min);	
		newLeaf.next = this.next;
		this.next = newLeaf;
		return newLeaf;
	}
	
	shrink(): Leaf<V> {
		this.config.stats.leaves--;
		return new Leaf(this.config);
	}
	
	borrowLeft(source: Leaf<V>): void {
		this.keys.unshift(source.keys.pop());
	}
	
	borrowRight(source: Leaf<V>): void {
		this.keys.push(source.keys.shift());
	}
	
	merge(source: Leaf<V>): void {
		this.keys.push(...source.keys);
		this.next = source.next;
		this.config.stats.leaves--;
	}
	
	toString(resolve: (key: any) => V[], level: number = 0): string {
		let output = "|  ".repeat(level) + "Leaf";
		for (const key of this.keys) {
			output += "\n" + "|  ".repeat(level + 1) + this.config.serialize(key) + ": " + this.config.serialize(resolve(key));
		}
		if (this.next) output += " --> " + this.config.serialize(this.next.lowest);
		return output;
	}
}

// Note: This intentionally returns middle + 1 when elements are equal,
// ensuring that the key is inserted into the keys array after the matching
// key, which is necessary for maintaining the correct tree structure.
function slotOf(element: any, array: Array<any>, compare: Function): number {
	let bottom = 0, top = array.length, middle = top >>> 1;
	while (bottom < top) {
		const comparison = compare(element, array[middle]);
		if (comparison === 0) {
			return middle + 1;
		} else if (comparison < 0) {
			top = middle;
		} else {
			bottom = middle + 1;
		}
		middle = bottom + ((top - bottom) >>> 1);
	}
	return middle;
}
