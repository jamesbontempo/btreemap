import { Key, Value, Pair, ROOT } from "./";
import { Node } from "./node";
import { Leaf } from "./leaf";

export let debug = false;

export let cmp = (a:Key, b:Key): number => {
	if (typeof a === "number" && typeof b === "string") return -1;
	if (typeof a === "string" && typeof b === "number") return 1;
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

export class Tree {
	#order: number;
	#root: Node|Leaf;
	
	constructor(order: number) {
		if (order < 3) throw new RangeError("Minimum tree order is 3");
						
		this.#order = order;
		
		const root = new Leaf(order);
		root.on("split", (leaf) => this.#splitTree(leaf));
		
		this.#root = root;
	}
	
	set debug(d: boolean) {
		debug = d;
	}
	
	set cmp(f: () => number) {
		cmp = f;
	}
	
	get order(): number {
		return this.#order;
	}
	
	lowest(): Key|undefined {
		if (this.#root.size() === 0) return undefined;
		
		return this.#root.lowest(true);
	}
	
	highest(): Key|undefined {
		if (this.#root.size() === 0) return undefined;
		
		return this.#root.highest(true);
	}
	
	insert(...pairs: Array<Pair>): Record<string, any> {
		if (debug) console.log("Tree", "insert", pairs);
		
		let count = 0;
		const start = Date.now();
		
		for (const pair of pairs) {
			let key: Key = Object.keys(pair)[0];
			if (/^\d+$/.test(key)) key = new Number(key).valueOf();
			const value: Value = pair[key];
			this.#root.insert(key, value);
			count++;
		}
		
		return {count: count, time: Date.now() - start};
	}
	
	search(...keys: Array<Key>): Record<string, any> {
		if (debug) console.log("Tree", "search", keys);
		
		const results = [];
		let count = 0;
		const start = Date.now();
		
		for (let key of keys) {
			if (/^\d+$/.test(key.toString())) key = new Number(key).valueOf();
			const result = this.#root.search(key);
			count += result.count;
			results.push(result);
		}
		
		return Object.assign({results: results}, {count: count, time: Date.now() - start});
	}
	
	*searchRange(start: Key, end: Key): Record<string, any> {
		if (this.#root.size() === 0) return;
		
		if (/^\d+$/.test(start.toString())) start = new Number(start).valueOf();
		if (/^\d+$/.test(end.toString())) end = new Number(end).valueOf();
		
		let leaf: Leaf|undefined = this.#root.find(start);
		
		do {
			for (let i = 0; i < leaf.children.length; i++) {
				if (cmp(leaf.keys[i], start) >= 0 && cmp(leaf.keys[i], end) <= 0) yield {[leaf.keys[i]]: leaf.children[i]};
				if (cmp(leaf.keys[i], end) > 0) break;
			}
			leaf = leaf.next
		} while (leaf !== undefined)
	}
	
	update(...args: Array<any>): Record<string, any> {
		if (debug) console.log("Tree", "update", args);
		
		const updater = args.pop();
		const keys = args;
		const results = [];
		const start = Date.now();
		
		for (let key of keys) {
			if (/^\d+$/.test(key.toString())) key = new Number(key).valueOf();
			results.push(this.#root.update(key, updater));
		}
		
		return Object.assign({results: results}, {time: Date.now() - start});
	}
	
	// updateRange - generator or recursive function? Probably a recursive function.
	
	delete(...keys: Array<Key>): Record<string, any> {
		if (debug) console.log("Tree", "delete", keys);
		
		const results = [];
		const start = Date.now();
		
		for (let key of keys) {
			if (/^\d+$/.test(key.toString())) key = new Number(key).valueOf();
			results.push(this.#root.delete(key));
		}
		
		return Object.assign({results: results}, {time: Date.now() - start});
	}
	
	// deleteRange - can the individual pairs delete themselves? Or do we call delete on the parent leaf?
	
	*keys(order: string = "asc") {
		if (this.#root.size() === 0) return undefined;

		if (order === "asc") {
			let leaf: Leaf|undefined = this.#root.first();
				
			do {
				for (const key of leaf.keys) {
					yield key;
				}
				leaf = leaf.next
			} while (leaf !== undefined)
		}
	}
	
	*values() {
		if (this.#root.size() === 0) return undefined;
		
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
		if (this.#root.size() === 0) return undefined;
		
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
		return this.#root.stats({nodes: 0, keys: 0, leaves: 0, values: 0, depth: this.#root.search(0).hops});
	}
	
	toString(): string {
		const s = "order: " + this.#order;
		
		if (this.#root.size() === 0) {
			return s + "\n[empty]";
		} else {
			return s + "\n" + this.#root.toString().trim();
		}
	}
	
	print(): void {
		console.log(this.toString());
	}
}

