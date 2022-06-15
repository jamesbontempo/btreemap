import { EventEmitter } from "node:events";

const ROOT = "root";
const INTERNAL = "internal";

type Key = string | number;
type Value = any;

type indexer = (v: Value) => Key;

type comparator = (a: Key, b: Key) => number;

export class Tree {
	#order: number;
	#root: Node|Leaf;
	#stats: Record<string, number>;
	
	#index: indexer = (v: Value): Key => {
		const keys = Object.keys(v);
		if (keys.includes("key")) return v.key;
		if (keys.includes("id")) return v.id;
		return String(undefined);
	}
	
	#compare: comparator = (a: Key, b: Key): number => {	
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
	
	debug: boolean = false;
	
	constructor(order: number = 3, options: Record<string, any> = {}) {
		if (options.debug) console.log("Node", "constructor", order);
		
		if (order < 3) throw new RangeError("Minimum tree order is 3");
						
		this.#order = order;
		
		if (options.indexer) this.#index = options.indexer;
		if (options.comparator) this.#compare = options.comparator;
		if (options.debug) this.debug = options.debug;
		
		this.#stats = {nodes: 0, keys: 0, leaves:0, values: 0, depth: 1};
		
		const root = new Leaf(order, this.#compare, this.#stats, this.debug);
		root.on("split", (leaf) => this.#splitTree(leaf));
		
		this.#root = root;
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
	
	get stats(): Record<string, number> {
		return this.#stats;
	}
	
	insert(value: Value): void {
		if (this.debug) console.log("Tree", "insert", value);
		
		let key = this.#index(value);
		
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
		if (this.debug) console.log("Tree", "select", key);
		
		return this.#root.select(key);	
	}
	
	*selectRange(start: Key, end: Key): Record<string, any> {
		if (this.#root.size === 0) return;
		
		let leaf: Leaf|undefined = this.#root.find(start);
		
		do {
			for (let i = 0; i < leaf.keys.length; i++) {
				if (this.#compare(leaf.keys[i], start) >= 0 && this.#compare(leaf.keys[i], end) <= 0) yield leaf.children[i];
				if (this.#compare(leaf.keys[i], end) > 0) break;
			}
			leaf = leaf.next
		} while (leaf !== undefined)
	}
	
	update(key: Key, updater: () => Value): number {
		if (this.debug) console.log("Tree", "update", key);
		
		return this.#root.update(key, updater);
	}
	
	updateRange(start: Key, end: Key, updater: () => Value): number|undefined {
		if (this.debug) console.log("Tree", "updateRange", start, end);
		
		if (this.#root.size === 0) return;
		
		let count = 0;
		const keys = Array.from(this.keysRange(start, end));
		
		for (const key of keys) {
			count += this.#root.update(key, updater);
		}
		
		return count;
	}
	
	delete(key: Key): number {
		if (this.debug) console.log("Tree", "delete", key);
		
		return this.#root.delete(key);
	}
	
	deleteRange(start: Key, end: Key): number|undefined {
		if (this.debug) console.log("Tree", "deleteRange", start, end);
		
		if (this.#root.size === 0) return;
		
		let count = 0;
		const keys = Array.from(this.keysRange(start, end));
		
		for (const key of keys) {		
			count += this.#root.delete(key);
		}
		
		return count;
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
	
	keyAt(index: number): Key|undefined {
		if (this.debug) console.log("Tree", "keyAt", index);
		
		if (index < 0) return undefined;
		
		let i = 0;
		const keys = this.keys();
		
		let key = keys.next();
		if (index === 0) return key.value;
		
		while (!key.done) {
			i++;
			key = keys.next();
			if (i === index) return key.value
		}
		
		return undefined;
		
	}
	
	*keysRange(start: Key, end: Key) {
		if (this.#root.size === 0) return undefined;

		let leaf: Leaf|undefined = this.#root.find(start);
		
		do {
			for (let i = 0; i < leaf.keys.length; i++) {
				if (this.#compare(leaf.keys[i], start) >= 0 && this.#compare(leaf.keys[i], end) <= 0) yield leaf.keys[i];
				if (this.#compare(leaf.keys[i], end) > 0) break;
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
	
	// add indexes to leaves & nodes for fast retrieval?
	valueAt(index: number): Value|undefined {
		if (this.debug) console.log("Tree", "valueAt", index);
		
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
		if (this.debug) console.log("Tree", "clear");
		
		this.#stats = {nodes: 0, keys: 0, leaves:0, values: 0, depth: 1};
		
		const root = new Leaf(this.#order, this.#compare, this.#stats, this.debug);
		root.on("split", (leaf) => this.#splitTree(leaf));
		
		this.#root = root;
	}
	
	#splitTree(child: Leaf|Node): void {
		if (this.debug) console.log("Tree", "splitTree", child.keys);
		
		this.#stats.depth++;
		
		this.#root.removeAllListeners();
		if (this.#root instanceof Node) this.#root.internalize();
		
		const root = new Node(ROOT, this.#order, this.#compare, this.#stats, this.debug);
		root.addChild(this.#root);
		root.addChild(child);		

		root.on("split", (child) => this.#splitTree(child));
		root.on("shrink", () => this.#shrinkTree());

		this.#root = root;
	}
	
	#shrinkTree(): void {
		if (this.debug) console.log("Tree", "shrinkTree");
		
		this.#stats.nodes--;
		this.#stats.depth--;
		
		this.#root.removeAllListeners();
		
		const root: any = this.#root.children[0];
		if (root instanceof Node) root.rootize();
		
		root.on("split", (child: Node|Leaf) => this.#splitTree(child));
		root.on("shrink", () => this.#shrinkTree());
		
		this.#root = root;
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

interface Node {
	[index: string]: any;
}

class Node extends EventEmitter {
	type: string;
	order: number;
	compare: comparator;
	min: number;
	keys: Array<Key>;
	children: Array<Node|Leaf>;
	stats: Record<string, number>;
	debug: boolean;
	
	constructor(type: string, order: number, comparator: comparator, stats: Record<string, number>, debug: boolean) {
		if (debug) console.log("Node", "constructor", type, order);
		
		super();

		this.type = type;
		this.order = order;
		this.compare = comparator;
		this.min = (type === ROOT) ? 1 : Math.ceil(order/2)-1;
		this.keys = [];
		this.children = [];
		this.stats = stats;
		this.debug = debug;
		
		this.stats.nodes++;
	}
	
	rootize(): void {
		this.type = ROOT;
		this.min = 1;
	}
	
	internalize(): void {
		this.type = INTERNAL;
		this.min = Math.ceil(this.order/2)-1;
	}
	
	get size(): number {
		return this.keys.length;
	}
	
	lowest(recurse: boolean = false): Key {
		if (recurse) return this.children[0].lowest(recurse);
		return this.keys[0];
	}
	
	highest(recurse: boolean = false): Key {
		if (recurse) return this.children[this.children.length-1].highest(recurse);
		return this.keys[this.keys.length-1];
	}
	
	first(): Leaf {
		return this.children[0].first();
	}
	
	find (key: Key): Leaf {
		if (this.debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "find", key);
		
		return this.redirect(key, "find", key);
	} 
	
	siblings(key: Key): Array<Record<string, any>> {
		const siblings: Array<Record<string, any>> = [];
		const index = this.childIndex(key);
		
		if (this.size < this.min) return siblings;
		
		if (index === 0) {
			siblings.push({direction: "next", child: this.children[1]});
		} else if (index === this.size) {
			siblings.push({direction: "previous", child: this.children[index-1]});
		} else {
			siblings.push({direction: "previous", child: this.children[index-1]});
			siblings.push({direction: "next", child: this.children[index+1]});
		}
		
		return siblings;
	}
	
	childIndex(key: Key): number {
		for (let index = 0; index < this.size; index++) {
			if (this.compare(key, this.keys[index]) < 0) return index;
		}
		
		return this.size;
	}
	
	redirect(key: Key, func: string, ...args: Array<any>): any {
		if (this.debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "redirect", func, args);
		
		for (let i = 0; i < this.keys.length; i++) {
			if (this.compare(key, this.keys[i]) < 0) {
				return this.children[i][func](...args);
			}
		}
		
		return this.children[this.children.length-1][func](...args);
	}
	
	insert(key: Key, value: Value): void {
		if (this.debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "insert", key, value);
		
		return this.redirect(key, "insert", key, value);
	}
	
	select(key: Key): Array<Value>|undefined {
		if (this.debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "select", key);
		
		return this.redirect(key, "select", key);
	}
	
	update(key: Key, updater: Function): number {
		if (this.debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "update", key);
		
		return this.redirect(key, "update", key, updater);
	}
	
	delete(key: Key): number {
		if (this.debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "delete", key);
		
		return this.redirect(key, "delete", key);
	}
	
	addChild(child: Node|Leaf): void {
		if (this.debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "addChild", (child instanceof Leaf) ? "Leaf" : "Node", (child instanceof Leaf) ? child.lowest() : child.lowest(true));
		
		this.registerListeners(child);
		
		if (this.children.length === 0) {
			this.children.push(child);
		} else {		
			const key = (child instanceof Leaf) ? child.lowest() : child.lowest(true);
			
			if (this.size === 0) {
				if (this.compare(key, this.lowest(true)) < 0) {
					this.keys.unshift(this.lowest(true));
					this.children.unshift(child);
					this.emit("update", this.keys[0], key);
				} else {
					this.keys.push(key);
					this.children.push(child);
				}
			} else if (this.compare(key, this.highest()) > 0) {
				this.keys.push(key);
				this.children.push(child);
			} else {
				for (let i = 0; i < this.keys.length; i++) {
					if (this.compare(key, this.keys[i]) < 0) {
						const newLowest = i === 0 && this.compare(key, this.lowest(true)) < 0;
						this.keys.splice(i, 0, (newLowest) ? this.lowest(true) : key);
						this.children.splice((newLowest) ? 0 : i+1, 0, child);
						if (i === 0) this.emit("update", this.keys[1], key);
						break;
					}
				}
			}
		}
		
		if (this.size === this.order) {
			this.splitNode();
		}
	}
	
	splitNode(): void {
		if (this.debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "splitNode");
		
		const node = new Node(INTERNAL, this.order, this.compare, this.stats, this.debug);
		
		this.keys.splice(node.min);
		this.children.splice(node.min+1).forEach(child => {		
			node.addChild(child);
		})
		
		this.emit("split", node);
	}
	
	borrowChild(key: Key, child: Node|Leaf): void {
		if (this.debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "borrowChild", (child instanceof Leaf) ? "Leaf" : "Node", key, child.keys);
		
		const siblings = this.siblings(key);
		
		if (siblings.length > 0) {
			let borrowed = undefined;
			let action = undefined;
			
			for (let i = 0; i < siblings.length; i++) {			
				action = (siblings[i].direction === "previous") ? "pop" : "shift";
				borrowed = siblings[i].child.lendChild(action);
				if (borrowed) break;
			}
			
			if (borrowed) {
				if (child instanceof Leaf) {
					child.addChild(borrowed.key, borrowed.child);
				} else {
					child.addChild(borrowed.child);
				}
			} else {
				this.mergeChild(key, child);
			}
		} else {
			this.emit("shrink");
		}
		
		
	}
	
	lendChild(action: string): Record<string, any>|undefined {
		if (this.debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "lendChild", action);
		
		if (this.size <= this.min) return undefined;

		let key: any = undefined;
		let child: any = undefined;
		
		switch(action) {
			case "shift":
				key = this.keys.shift();
				child = this.children.shift();
				this.emit("update", key, this.lowest());
				break;
			case "pop":
			default:
				key = this.keys.pop()
				child = this.children.pop();
		}
			
		return {key: key, child: child};
	}
	
	mergeChild(key: Key, child: Node|Leaf): void {
		if (this.debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "mergeChild", (child instanceof Leaf) ? "Leaf" : "Node", key, child.keys);
		
		const siblings = this.siblings(key);
		
		if (siblings.length > 0) {
			let keyIndex = this.keys.indexOf(key);
			let childIndex = this.childIndex(key);
			
			let target, source;
			
			if (siblings[0].direction === "previous") {
				target = siblings[0].child;
				source = child;
			} else {
				target = child;
				source = siblings[0].child;
				keyIndex++;
				childIndex++;
			}
			
			if (child instanceof Leaf) {
				this.stats.leaves--;
			} else {
				this.stats.nodes--;
			}
			
			for (let i = 0; i < source.children.length; i++) {
				if (source instanceof Leaf) {
					target.addChild(source.keys[i], source.children[i]);
				} else {
					target.addChild(source.children[i]);
				}
			}
			
			if (source instanceof Leaf) target.next = source.next;


			if (keyIndex >= 0) {
				this.keys.splice(keyIndex, 1);
			} else {
				this.keys.shift();
			}
						
			this.children.splice(childIndex, 1);
		}
		
		if (this.size < this.min) {
			if (this.type === ROOT) {
				this.emit("shrink");
			} else {
				this.emit("borrow", this.lowest(true), this);
			}
		}
		
	}
	
	updateKey(key: Key, newKey: Key): void {
		if (this.debug) console.log("Node", this.keys, "updateKey", key, newKey);
		
		const keyIndex = this.keys.indexOf(key);
		const childIndex = this.childIndex(key);
		
		if (keyIndex >= 0) {
			this.keys[keyIndex] = newKey;
		} else { 
			if (childIndex > 0) this.keys[childIndex-1] = this.children[childIndex].lowest(true);
			this.emit("update", key, newKey);
		}
	}
	
	registerListeners(child: Node|Leaf): void {
		if (this.debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "registerListeners", child.keys);
		
		child.removeAllListeners();

		child.on("split", (child) => this.addChild(child));
		child.on("borrow", (key, child) => this.borrowChild(key, child));
		child.on("update", (key, newKey) => this.updateKey(key, newKey));
	}
	
	toString(level: number = 0): string {
		let s = "|  ".repeat(level) + "keys: " + this.keys;
		for (let i = 0; i < this.children.length; i++) {
			s += "\n" + this.children[i].toString(level+1)
		}
		return s;
	}
}

interface Leaf {
	[index: string]: any;
}

class Leaf extends EventEmitter {
	order: number;
	compare: comparator;
	min: number;
	keys: Array<Key>;
	children: Array<Array<Value>>;
	next: Leaf|undefined;
	stats: Record<string, number>;
	debug: boolean;
	
	constructor(order: number, comparator: comparator, stats: Record<string, number>, debug: boolean) {
		if (debug) console.log("Leaf", "constructor", order);
		
		super();
		
		this.order = order;
		this.compare = comparator;
		this.min = Math.ceil(order/2);
		this.keys = [];
		this.children = [];
		this.next = undefined;
		this.stats = stats;
		this.debug = debug;
		
		this.stats.leaves++;
	}
	
	lowest(): Key {
		return this.keys[0];
	}
	
	highest(): Key {
		return this.keys[this.keys.length-1];
	}
	
	get size(): number {
		return this.keys.length;
	}
	
	first(): Leaf {
		return this;
	}
	
	find (): Leaf {
		return this;
	}
	
	insert(key: Key, value: Value): void {
		if (this.debug) console.log("Leaf", this.keys, "insert", key, value);
		
		const index = this.keys.indexOf(key);
		
		if (index >= 0) {
			this.stats.values++;
			this.children[index].push(value)			
		} else {
			this.stats.keys++;
			this.stats.values++;
			
			if (this.size === 0 || this.compare(key, this.highest()) > 0) {
				this.keys.push(key);
				this.children.push([value]);
			} else {
				for (let i = 0; i < this.keys.length; i++) {
					if (this.compare(key, this.keys[i]) < 0) {
						this.keys.splice(i, 0, key);
						this.children.splice(i, 0, [value]);
						if (i === 0) this.emit("update", this.keys[1], key);
						break;
					}
				}
			}
		}
		
		if (this.size > this.order) this.splitLeaf();
	}
	
	select(key: Key): Array<Value>|undefined {
		if (this.debug) console.log("Leaf", this.keys, "select", key);

		const index = this.keys.indexOf(key);
		
		if (index >= 0) {
			return this.children[index];
		}
		
		return;
	}
	
	update(key: Key, updater: Function): number {
		if (this.debug) console.log("Leaf", this.keys, "update", key);
		
		let values = 0;
		
		const index = this.keys.indexOf(key);
		
		if (index >= 0) {
			values = this.children[index].length;
			
			for (let i = 0; i < this.children[index].length; i++) {
				this.children[index][i] = updater(this.children[index][i]);
			}
		}
		
		return values;
	}
	
	delete(key: Key): number {
		if (this.debug) console.log("Leaf", this.keys, "delete", key);
		
		let values = 0;
		
		const index = this.keys.indexOf(key)
		
		if (index >= 0) {
			values = this.children[index].length;
			
			this.stats.keys--;
			this.stats.values -= values;
			
			this.keys.splice(index, 1);
			this.children.splice(index, 1);
			
			if (index === 0) this.emit("update", key, this.lowest());
				
			if (this.size < this.min) {
				this.emit("borrow", this.lowest(), this);
			}
		}
		
		return values;
	}
	
	splitLeaf(): void {
		if (this.debug) console.log("Leaf", this.keys, "splitLeaf");
		
		const leaf = new Leaf(this.order, this.compare, this.stats, this.debug);
		
		const keys = this.keys.splice(leaf.min);
		const children = this.children.splice(leaf.min);
		
		for (let i = 0; i < children.length; i++) {			
			leaf.addChild(keys[i], children[i]);
		}
		
		leaf.next = this.next;
		this.next = leaf;
		
		this.emit("split", leaf);
	}
	
	addChild(key: Key, child: Array<Value>): void {
		if (this.debug) console.log("Leaf", this.keys, "addChild", key, child);
		
		if (this.size === 0 || this.compare(key, this.highest()) > 0) {
			this.keys.push(key);
			this.children.push(child);
		} else {
			for (let i = 0; i < this.size; i++) {
				if (this.compare(key, this.keys[i]) < 0) {
					this.keys.splice(i, 0, key);
					this.children.splice(i, 0, child);
					if (i === 0) this.emit("update", this.keys[1], key);
					break;
				}
			}
		}
		
		if (this.size > this.order) this.splitLeaf();
	}
	
	lendChild(action: string): Record<string, Key|Value>|undefined {
		if (this.debug) console.log("Leaf", this.keys, "lendChild", action);	
		
		if (this.size <= this.min) return undefined;

		let key: any = undefined;
		let child: any = undefined;
			
		switch(action) {
			case "shift":
				key = this.keys.shift();
				child = this.children.shift();
				this.emit("update", key, this.lowest());
				break;
			case "pop":
			default:
				key = this.keys.pop()
				child = this.children.pop();
		}
			
		return {key: key, child: child};
	}
	
	toString(level: number = 0): string {
		let s = "|  ".repeat(level);
		for (let i = 0; i < this.keys.length; i++) {
			s += this.keys[i] + ": ";
			for (let j = 0; j < this.children[i].length; j++) {
				s += JSON.stringify(this.children[i][j], (_, v) => { return (typeof v === "bigint") ? v.toString() : v}) + " "
			}
		}
		if (this.next) s += "--> " + this.next.lowest();
		return s;
	}
}