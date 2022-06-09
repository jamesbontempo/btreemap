import { EventEmitter } from "node:events";
import { Key, Value, ROOT, INTERNAL } from ".";
import { debug, compare } from "./tree";
import { Leaf } from "./leaf";

export interface Node {
	[index: string]: any;
}

export class Node extends EventEmitter {
	type: string;
	order: number;
	min: number;
	keys: Array<Key>;
	children: Array<Node|Leaf>;
	
	constructor(type: string, order: number) {
		if (debug) console.log("Node", "constructor", type, order);
		
		super();

		this.type = type;
		this.order = order;
		this.min = (type === ROOT) ? 1 : Math.ceil(order/2)-1;
		this.keys = [];
		this.children = [];
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
		if (debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "find", key);
		
		return this.redirect(key, "find", key);
	} 
	
	depth(hops: number = 0): number {
		return this.children[0].depth(hops+1);
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
			if (compare(key, this.keys[index]) < 0) return index;
		}
		
		return this.size;
	}
	
	redirect(key: Key, func: string, ...args: Array<any>): any {
		if (debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "redirect", func, args);
		
		for (let i = 0; i < this.keys.length; i++) {
			if (compare(key, this.keys[i]) < 0) {
				return this.children[i][func](...args);
			}
		}
		
		return this.children[this.children.length-1][func](...args);
	}
	
	insert(key: Key, value: Value): void {
		if (debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "insert", key, value);
		
		this.redirect(key, "insert", key, value);
	}
	
	select(key: Key): Array<Value>|undefined {
		if (debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "select", key);
		
		return this.redirect(key, "select", key);
	}
	
	update(key: Key, updater: Function): number {
		if (debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "update", key);
		
		return this.redirect(key, "update", key, updater);
	}
	
	delete(key: Key): any {
		if (debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "delete", key);
		
		return this.redirect(key, "delete", key);
	}
	
	addChild(child: Node|Leaf): void {
		if (debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "addChild", (child instanceof Leaf) ? "Leaf" : "Node", (child instanceof Leaf) ? child.lowest() : child.lowest(true));
		
		this.registerListeners(child);
		
		if (this.children.length === 0) {
			this.children.push(child);
		} else {		
			const key = (child instanceof Leaf) ? child.lowest() : child.lowest(true);
			
			if (this.size === 0) {
				if (compare(key, this.lowest(true)) < 0) {
					this.keys.unshift(this.lowest(true));
					this.children.unshift(child);
					this.emit("update", this.keys[0], key);
				} else {
					this.keys.push(key);
					this.children.push(child);
				}
			} else if (compare(key, this.highest()) > 0) {
				this.keys.push(key);
				this.children.push(child);
			} else {
				for (let i = 0; i < this.keys.length; i++) {
					if (compare(key, this.keys[i]) < 0) {
						const newLowest = i === 0 && compare(key, this.lowest(true)) < 0;
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
		if (debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "splitNode");
		
		const node = new Node(INTERNAL, this.order);
		
		this.keys.splice(node.min);
		this.children.splice(node.min+1).forEach(child => {
			node.addChild(child);
		})
		
		this.emit("split", node);
	}
	
	borrowChild(key: Key, child: Node|Leaf): void {
		if (debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "borrowChild", (child instanceof Leaf) ? "Leaf" : "Node", key, child.keys);
		
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
		if (debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "lendChild", action);
		
		if (this.size <= this.min) return undefined;

		let key = undefined;
		let child = undefined;
		
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
		if (debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "mergeChild", (child instanceof Leaf) ? "Leaf" : "Node", key, child.keys);
		
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
		if (debug) console.log("Node", this.keys, "updateKey", key, newKey);
		
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
		if (debug) console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "registerListeners", child.keys);
		
		child.removeAllListeners();
		
		child.on("split", (child) => this.addChild(child));
		child.on("borrow", (key, child) => this.borrowChild(key, child));
		child.on("update", (key, newKey) => this.updateKey(key, newKey));
	}
	
	stats(stats: Record<string, any>): Record<string, any> {
		stats.nodes++;
		this.children.forEach((child) => child.stats(stats));
		return stats;
	}
	
	toString(level: number = 0): string {
		let s = ("|  ".repeat(level) + "keys: " + this.keys);
		for (let i = 0; i < this.children.length; i++) {
			s += "\n" + this.children[i].toString(level+1)
		}
		return s;
	}
}