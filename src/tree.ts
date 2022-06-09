import { Key, Value, ROOT } from "./";
import { Node } from "./node";
import { Leaf } from "./leaf";

export let debug = false;

type comparator = (a: Key, b: Key) => number;

export let compare: comparator = (a: Key, b: Key): number => {	
	// numbers before letters
	if (typeof a !== typeof b) {
		if (typeof a === "number" && typeof b === "string") return -1;
		if (typeof a === "string" && typeof b === "number") return 1;
	}
	
	// "punctuation" before letters, marks or numbers
	if (typeof a === "string" && typeof b === "string") {
		const re = /^[\p{L}\p{M}\p{N}]/u;
		const reA = re.test(a);
		const reB = re.test(b);
		if (!reA && reB) return -1;
		if (reA && !reB) return 1;
	}
	
	// standard comparisons
	if (a < b) return -1;
	if (a > b) return 1;
	
	// must be equal
	return 0;
}

export class Tree {
	#order: number;
	#root: Node|Leaf;
	
	constructor(order: number = 3, comparator?: comparator) {
		if (order < 3) throw new RangeError("Minimum tree order is 3");
						
		this.#order = order;
		if (comparator) compare = comparator;
		
		const root = new Leaf(order);
		root.on("split", (leaf) => this.#splitTree(leaf));
		
		this.#root = root;
	}
	
	set debug(d: boolean) {
		debug = d;
	}
	
	get order(): number {
		return this.#order;
	}
	
	get lowest(): Key|undefined {
		if (this.#root.size === 0) return undefined;
		
		return this.#root.lowest(true);
	}
	
	get highest(): Key|undefined {
		if (this.#root.size === 0) return undefined;
		
		return this.#root.highest(true);
	}
	
	insert(key: Key, value: Value): void {
		if (debug) console.log("Tree", "insert", key, value);
		
		// convert any key that isn't a string or a number into a string
		if (!(typeof key === "string" || typeof key === "number")) {
			if (typeof key === "object" && key !== null) {
				key = JSON.stringify(key);
			} else {
				key = String(key);
			}
		}
		
		this.#root.insert(key, value);
	}
	
	select(key: Key): Array<Value>|undefined {
		if (debug) console.log("Tree", "select", key);
		
		return this.#root.select(key);	
	}
	
	*selectRange(start: Key, end: Key): Record<string, any> {
		if (this.#root.size === 0) return;
		
		let leaf: Leaf|undefined = this.#root.find(start);
		
		do {
			for (let i = 0; i < leaf.children.length; i++) {
				if (compare(leaf.keys[i], start) >= 0 && compare(leaf.keys[i], end) <= 0) yield leaf.children[i];
				if (compare(leaf.keys[i], end) > 0) break;
			}
			leaf = leaf.next
		} while (leaf !== undefined)
	}
	
	update(key: Key, updater: () => Value): number {
		if (debug) console.log("Tree", "update", key);
		
		return this.#root.update(key, updater);
	}
	
	updateRange(start: Key, end: Key, updater: () => Value): number|undefined {
		if (this.#root.size === 0) return;
		
		let count = 0;
		const keys = Array.from(this.keysRange(start, end));
		
		for (const key of keys) {
			count += this.#root.update(key, updater);
		}
		
		return count;
	}
	
	delete(key: Key): Record<string, any> {
		if (debug) console.log("Tree", "delete", key);
		
		return this.#root.delete(key);
	}
	
	deleteRange(start: Key, end: Key): number|undefined {
		if (this.#root.size === 0) return;
		
		let count = 0;
		const keys = Array.from(this.keysRange(start, end));
		
		for (const key of keys) {
			count += this.#root.delete(key);
		}
		
		return count;
	}
	
	at(index: number): Value|undefined {
		if (index < 0) return undefined;
		
		let i = 0;
		const values = this.values();
		
		let value = values.next();
		if (index === 0) return value.value;
		
		while (!value.done) {
			i++;
			value = values.next();
			if (i === index) return value.value
		}
		
		return undefined;
		
	}
	
	*keys() {
		if (this.#root.size === 0) return undefined;

		let leaf: Leaf|undefined = this.#root.first();
				
		do {
			for (const key of leaf.keys) {
				yield key;
			}
			leaf = leaf.next
		} while (leaf !== undefined)
	}
	
	*keysRange(start: Key, end: Key) {
		if (this.#root.size === 0) return undefined;

		let leaf: Leaf|undefined = this.#root.find(start);
		
		do {
			for (let i = 0; i < leaf.keys.length; i++) {
				if (compare(leaf.keys[i], start) >= 0 && compare(leaf.keys[i], end) <= 0) yield leaf.keys[i];
				if (compare(leaf.keys[i], end) > 0) break;
			}
			leaf = leaf.next
		} while (leaf !== undefined)
	}
	
	*values() {
		if (this.#root.size === 0) return undefined;
		
		let leaf: Leaf|undefined = this.#root.first();
		
		do {
			for (let i = 0; i < leaf.children.length; i++) {
				for (let j = 0; j < leaf.children[i].length; j++) {
					yield leaf.children[i][j];
				}
			}
			leaf = leaf.next
		} while (leaf !== undefined)
	}
	
	*pairs() {
		if (this.#root.size === 0) return undefined;
		
		let leaf: Leaf|undefined = this.#root.first();
		
		do {
			for (let i = 0; i < leaf.keys.length; i++) {
				for (let j = 0; j < leaf.children[i].length; j++) {
					yield {[leaf.keys[i]]: leaf.children[i][j]};
				}
			}
			leaf = leaf.next
		} while (leaf !== undefined)
	}
	
	clear(): void {
		if (debug) console.log("Tree", "clear");
		
		const root = new Leaf(this.#order);
		root.on("split", (leaf) => this.#splitTree(leaf));
		
		this.#root = root;
	}
	
	#splitTree(child: Leaf|Node): void {
		if (debug) console.log("Tree", "splitTree", child.keys);
		
		this.#root.removeAllListeners();
		if (this.#root instanceof Node) this.#root.internalize();
		
		const root = new Node(ROOT, this.#order);
		root.addChild(this.#root);
		root.addChild(child);		

		root.on("split", (child) => this.#splitTree(child));
		root.on("shrink", () => this.#shrinkTree());

		this.#root = root;
	}
	
	#shrinkTree(): void {
		if (debug) console.log("Tree", "shrinkTree");
		this.#root.removeAllListeners();
		
		const root: any = this.#root.children[0];
		if (root instanceof Node) root.rootize();
		root.on("split", (child: Node|Leaf) => this.#splitTree(child));
		root.on("shrink", () => this.#shrinkTree());
		
		this.#root = root;
	}
	
	stats(): Record<string, any> {
		return this.#root.stats({nodes: 0, keys: 0, leaves: 0, values: 0, depth: this.#root.depth()});
	}
	
	toString(): string {
		const s = "order: " + this.#order;
		
		if (this.#root.size === 0) {
			return s + "\n[empty]";
		} else {
			return s + "\n" + this.#root.toString().trim();
		}
	}
	
	print(): void {
		console.log(this.toString());
	}
}

