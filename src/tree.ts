import { Key, Value, Pair, ROOT } from "./";
import { Node } from "./node";
import { Leaf } from "./leaf";

export let debug = false;

export class Tree {
	#degree: number;
	#root: Node|Leaf;
	
	constructor(degree: number) {				
		this.#degree = degree;
		
		const root = new Leaf(degree);
		root.on("split", (leaf) => this.splitTree(leaf));
		
		this.#root = root;
	}
	
	set debug(d: boolean) {
		debug = d;
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
		const start = Date.now();
		
		for (const key of keys) {
			results.push(this.#root.search(key));
		}
		
		return Object.assign({results: results}, {time: Date.now() - start});
	}
	
	update(...args: Array<any>): Record<string, any> {
		if (debug) console.log("Tree", "update", args);
		
		const updater = args.pop();
		const keys = args;
		const results = [];
		const start = Date.now();
		
		for (const key of keys) {
			results.push(this.#root.update(key, updater));
		}
		
		return Object.assign({results: results}, {time: Date.now() - start});
	}
	
	delete(...keys: Array<Key>): Record<string, any> {
		if (debug) console.log("Tree", "delete", keys);
		
		const results = [];
		const start = Date.now();
		
		for (const key of keys) {
			results.push(this.#root.delete(key));
		}
		
		return Object.assign({results: results}, {time: Date.now() - start});
	}
	
	*keys(order: string = "asc") {
		if (this.#root.size() === 0) return;

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
		if (this.#root.size() === 0) return;
		
		let leaf: Leaf|undefined = this.#root.first();
		
		do {
			for (const child of leaf.children) {
				yield child;
			}
			leaf = leaf.next
		} while (leaf !== undefined)
	}
	
	*pairs() {
		if (this.#root.size() === 0) return;
		
		let leaf: Leaf|undefined = this.#root.first();
		
		do {
			for (let i = 0; i < leaf.keys.length; i++) {
				yield {[leaf.keys[i]]: leaf.children[i]};
			}
			leaf = leaf.next
		} while (leaf !== undefined)
	}
	
	clear(): void {
		if (debug) console.log("Tree", "clear");
		
		const root = new Leaf(this.#degree);
		root.on("split", (leaf) => this.splitTree(leaf));
		
		this.#root = root;
	}
	
	splitTree(child: Leaf|Node): void {
		if (debug) console.log("Tree", "splitTree", child.keys);
		
		this.#root.removeAllListeners();
		if (this.#root instanceof Node) this.#root.internalize();
		
		const root = new Node(ROOT, this.#degree);
		root.addChild(this.#root);
		root.addChild(child);		

		root.on("split", (child) => this.splitTree(child));
		root.on("shrink", () => this.shrinkTree());

		this.#root = root;
	}
	
	shrinkTree(): void {
		if (debug) console.log("Tree", "shrinkTree");
		this.#root.removeAllListeners();
		
		const root: any = this.#root.children[0];
		if (root instanceof Node) root.rootize();
		root.on("split", (child: Node|Leaf) => this.splitTree(child));
		root.on("shrink", () => this.shrinkTree());
		
		this.#root = root;
	}
	
	stats(): Record<string, any> {
		return this.#root.stats({nodes: 0, leaves: 0, values: 0, depth: this.#root.search(0).hops});
	}
	
	print(): void {
		console.log("degree: " + this.#degree);
		if (this.#root.size() === 0) {
			console.log("[empty]")
		} else {
			this.#root.print();
		}
	}
}

