import { EventEmitter } from "node:events";
import { Key, Value } from ".";
import { debug, compare } from "./tree";

export interface Leaf {
	[index: string]: any;
}

export class Leaf extends EventEmitter {
	order: number;
	min: number;
	keys: Array<Key>;
	children: Array<Array<Value>>;
	next: Leaf|undefined;
	
	constructor(order: number) {
		if (debug) console.log("Leaf", "constructor", order);
		
		super();
		
		this.order = order;
		this.min = Math.ceil(order/2);
		this.keys = [];
		this.children = [];
		this.next = undefined;
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
	
	depth(hops: number = 0): number {
		return hops+1;
	}
	
	insert(key: Key, value: Value): void {
		if (debug) console.log("Leaf", this.keys, "insert", key, value);
		
		const index = this.keys.indexOf(key);
		
		if (index >= 0) {
			this.children[index].push(value)
		} else {
			if (this.size === 0 || compare(key, this.highest()) > 0) {
				this.keys.push(key);
				this.children.push([value]);
			} else {
				for (let i = 0; i < this.keys.length; i++) {
					if (compare(key, this.keys[i]) < 0) {
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
		if (debug) console.log("Leaf", this.keys, "select", key);

		const index = this.keys.indexOf(key);
		
		if (index >= 0) {
			return this.children[index];
		}
		
		return;
	}
	
	update(key: Key, updater: Function): number {
		if (debug) console.log("Leaf", this.keys, "update", key);
		
		let count = 0;
		const index = this.keys.indexOf(key);
		
		if (index >= 0) {
			for (let i = 0; i < this.children[index].length; i++) {
				this.children[index][i] = updater(this.children[index][i]);
				count++;
			}
		}
		
		return count;
	}
	
	delete(key: Key): number {
		if (debug) console.log("Leaf", this.keys, "delete", key);
		
		let count = 0;
		const index = this.keys.indexOf(key)
		
		if (index >= 0) {
			count = this.children[index].length;
			
			this.keys.splice(index, 1);
			this.children.splice(index, 1);
			
			if (index === 0) this.emit("update", key, this.lowest());
				
			if (this.size < this.min) {
				this.emit("borrow", this.lowest(), this);
			}
		}
		
		return count;
	}
	
	splitLeaf(): void {
		if (debug) console.log("Leaf", this.keys, "splitLeaf");
		
		const leaf = new Leaf(this.order);
		
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
		if (debug) console.log("Leaf", this.keys, "addChild", key, child);
		
		if (this.size === 0 || compare(key, this.highest()) > 0) {
			this.keys.push(key);
			this.children.push(child);
		} else {
			for (let i = 0; i < this.size; i++) {
				if (compare(key, this.keys[i]) < 0) {
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
		if (debug) console.log("Leaf", this.keys, "lendChild", action);	
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
	
	stats(stats: Record<string, any>): Record<string, any> {
		stats.leaves++;
		stats.keys += this.keys.length;
		this.children.forEach((child) => stats.values += child.length);
		return stats;
	}
	
	toString(level: number = 0): string {
		let s = "|  ".repeat(level);
		for (let index = 0; index < this.keys.length; index++) {
			s += this.keys[index] + ": " + JSON.stringify(this.children[index]) + " ";
		}
		if (this.next) s += "--> " + JSON.stringify(this.next.lowest());
		return s;
	}
}