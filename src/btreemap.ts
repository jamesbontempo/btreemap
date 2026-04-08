type Comparator = (a: any, b: any) => number;

type BTreeMapOptions = {
	unique?: boolean;
	order?: number;
	compare?: Comparator;
}

type TreeConfig = {
	order: number;
	compare: Comparator;
	stats: Record<string, number>;
}

export class BTreeMap {
	private _config: TreeConfig;
	private _unique: boolean;
	private _map: Map<any, any[]>;
	private _root: Node | Leaf;
	private _keyType: string | undefined;
	
	constructor(options: BTreeMapOptions = {}) {
		this._unique = options.unique ?? true;
		this._map = new Map();
		this._config = {
			order: Math.max(options.order ?? 3, 3),
			compare: options.compare ?? ((a: any, b: any): number => a < b ? -1 : a > b ? 1 : 0),
			stats: { depth: 0, nodes: 0, leaves: 0, keys: 0, values: 0 }
		}
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
	
	get size(): number {
		return this._map.size;
	}
	
	get stats(): Record<string, number> {
		return { ...this._config.stats };
	}
	
	// data manipulation methods
	
	has(key: any): boolean {
		return this._map.has(key);
	}

	get(key: any): any[] | undefined {
		return this._map.get(key);
	}
	
	set(key: any, value: any): BTreeMap {
		const keyType = typeof key;
		if (!this._keyType) {
			this._keyType = keyType;
		} else if (keyType !== this._keyType) {
			throw new TypeError(`Key type mismatch: expected ${this._keyType}, got ${keyType}`);
		}
		const values = this._map.get(key);
		if (values !== undefined) {
			if (this._unique) {
				values[0] = value;
			} else {
				values.push(value);
				this._config.stats.values++;
			}
		} else {			
			this._map.set(key, [value]);
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
		if (this._map.has(key)) {
			const count = this._map.get(key)!.length;
			this._map.delete(key);
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

	deleteValue(key: any, value: any): boolean {
		const values = this._map.get(key);
		if (values === undefined) return false;
		const index = values.indexOf(value);
		if (index === -1) return false;
		values.splice(index, 1);
		this._config.stats.values--;
		if (values.length === 0) this.delete(key);
		return true;
	}
	
	clear(): void {
		this._map = new Map();
		this._config.stats = {depth: 0, nodes: 0, leaves: 0, keys: 0, values: 0};
		this._root = new Leaf(this._config);
	}
	
	// iterators
	
	[Symbol.iterator](): IterableIterator<Array<any>> {
		return this.entries();
	}
	
	*keys(start: any = this.lowest, end: any = this.highest, inclusive: boolean = true): IterableIterator<any> {
		if (this._map.size === 0) return;
		let leaf: Leaf | null = this._root.findLeaf(start);
		let i = slotOf(start, leaf.keys, this._config.compare);
		while (i > 0 && this._config.compare(leaf?.keys[i - 1], start) >= 0) i--;
		do {
			for (const length = leaf.keys.length; i < length; i++) {
				const key = leaf.keys[i];
				if (this._config.compare(key, end) > 0) return;
				if (inclusive || this._config.compare(key, end) < 0) yield key;
			}
			leaf = leaf.next;
			i = 0;
		} while (leaf !== null)
	}
	
	*values(start: any = this.lowest, end: any = this.highest, inclusive: boolean = true): IterableIterator<Array<any>> {
		if (this._map.size === 0) return;
		const iterator = this.keys(start, end, inclusive);
		let next = iterator.next();
		while (!next.done) {
			const key = next.value;
			const values = this._map.get(key);
			for (const value of values!) {
				yield value;
			}
			next = iterator.next();
		}
	}
	
	*entries(start: any = this.lowest, end: any = this.highest, inclusive: boolean = true): IterableIterator<Array<any>> {
		if (this._map.size === 0) return;
		const iterator = this.keys(start, end, inclusive);
		let next = iterator.next();
		while (!next.done) {
			const key = next.value;
			const values = this._map.get(key);
			for (const value of values!) {
				yield [key, value];
			}
			next = iterator.next();
		}
	}
	
	// functional methods
	
	forEach(func: (value: any, key: any, map: BTreeMap) => void, start: any = this.lowest, end: any = this.highest, inclusive: boolean = true): void {
		if (this._map.size === 0) return;
		const iterator = this.entries(start, end, inclusive);
		let next = iterator.next();
		while (!next.done) {
			const [key, value] = next.value;
			func(value, key, this);
			next = iterator.next();
		}
	}
	
	toString(): string {
		return this._root.toString(this._map, 0);
	}
}

class Node {
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
	
	findLeaf(key: any): Leaf {
		return this.children[slotOf(key, this.keys, this.config.compare)].findLeaf(key);
	}
	
	split(): Node {
		const newNode = new Node(this.config);
		newNode.keys = this.keys.splice(this.min);
		newNode.keys.shift();
		newNode.children = this.children.splice(this.min+1);
		return newNode;
	}
	
	shrink(): Node {
		this.config.stats.nodes--;
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
		this.config.stats.nodes--;
	}
	
	splitChild(child: Node | Leaf, slot: number): void {
		const newChild = child.split();
		this.keys.splice(slot, 0, newChild.lowest);
		this.children.splice(slot+1, 0, newChild);
	}
	
	consolidateChild(child: Node | Leaf, slot: number): void {
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
	
	toString(map: Map<any, any>, level: number = 0): string {
		let output = "|  ".repeat(level) + ((level === 0) ? "Root - " : "Node - ") + String(this.keys);
		for (let i = 0, length = this.children.length; i < length; i++) {
			output += "\n" + this.children[i].toString(map, level+1)
		}
		return output;
	}
}

class Leaf {
	config: TreeConfig;
	min: number;
	max: number;
	keys: Array<any>;
	next: Leaf | null;
	
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
	
	findLeaf(): Leaf {
		return this;
	}
	
	split(): Leaf {
		const newLeaf = new Leaf(this.config);
		newLeaf.keys = this.keys.splice(this.min);	
		newLeaf.next = this.next;
		this.next = newLeaf;
		return newLeaf;
	}
	
	shrink(): Leaf {
		this.config.stats.leaves--;
		return new Leaf(this.config);
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
		this.config.stats.leaves--;
	}
	
	toString(map: Map<any, any>, level: number = 0): string {
		let output = "|  ".repeat(level) + "Leaf";
		for (const key of this.keys) {
			output += "\n" + "|  ".repeat(level+1) + String(key) + ": " + String(map.get(key));
		}
		if (this.next) output += " --> " + String(this.next.lowest);
		return output;
	}
}

function slotOf(element: any, array: Array<any>, compare: Function): number {
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