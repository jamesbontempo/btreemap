"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Leaf = void 0;
const node_events_1 = require("node:events");
const tree_1 = require("./tree");
class Leaf extends node_events_1.EventEmitter {
    constructor(order) {
        if (tree_1.debug)
            console.log("Leaf", "constructor", order);
        super();
        this.order = order;
        this.min = Math.ceil(order / 2);
        this.keys = [];
        this.children = [];
        this.next = undefined;
    }
    lowest() {
        return this.keys[0];
    }
    highest() {
        return this.keys[this.keys.length - 1];
    }
    get size() {
        return this.keys.length;
    }
    first() {
        return this;
    }
    find() {
        return this;
    }
    depth(hops = 0) {
        return hops + 1;
    }
    insert(key, value) {
        if (tree_1.debug)
            console.log("Leaf", this.keys, "insert", key, value);
        const index = this.keys.indexOf(key);
        if (index >= 0) {
            this.children[index].push(value);
        }
        else {
            if (this.size === 0 || (0, tree_1.compare)(key, this.highest()) > 0) {
                this.keys.push(key);
                this.children.push([value]);
            }
            else {
                for (let i = 0; i < this.keys.length; i++) {
                    if ((0, tree_1.compare)(key, this.keys[i]) < 0) {
                        this.keys.splice(i, 0, key);
                        this.children.splice(i, 0, [value]);
                        if (i === 0)
                            this.emit("update", this.keys[1], key);
                        break;
                    }
                }
            }
        }
        if (this.size > this.order)
            this.splitLeaf();
    }
    select(key) {
        if (tree_1.debug)
            console.log("Leaf", this.keys, "select", key);
        const index = this.keys.indexOf(key);
        if (index >= 0) {
            return this.children[index];
        }
        return;
    }
    update(key, updater) {
        if (tree_1.debug)
            console.log("Leaf", this.keys, "update", key);
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
    delete(key) {
        if (tree_1.debug)
            console.log("Leaf", this.keys, "delete", key);
        let count = 0;
        const index = this.keys.indexOf(key);
        if (index >= 0) {
            count = this.children[index].length;
            this.keys.splice(index, 1);
            this.children.splice(index, 1);
            if (index === 0)
                this.emit("update", key, this.lowest());
            if (this.size < this.min) {
                this.emit("borrow", this.lowest(), this);
            }
        }
        return count;
    }
    splitLeaf() {
        if (tree_1.debug)
            console.log("Leaf", this.keys, "splitLeaf");
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
    addChild(key, child) {
        if (tree_1.debug)
            console.log("Leaf", this.keys, "addChild", key, child);
        if (this.size === 0 || (0, tree_1.compare)(key, this.highest()) > 0) {
            this.keys.push(key);
            this.children.push(child);
        }
        else {
            for (let i = 0; i < this.size; i++) {
                if ((0, tree_1.compare)(key, this.keys[i]) < 0) {
                    this.keys.splice(i, 0, key);
                    this.children.splice(i, 0, child);
                    if (i === 0)
                        this.emit("update", this.keys[1], key);
                    break;
                }
            }
        }
        if (this.size > this.order)
            this.splitLeaf();
    }
    lendChild(action) {
        if (tree_1.debug)
            console.log("Leaf", this.keys, "lendChild", action);
        if (this.size <= this.min)
            return undefined;
        let key = undefined;
        let child = undefined;
        switch (action) {
            case "shift":
                key = this.keys.shift();
                child = this.children.shift();
                this.emit("update", key, this.lowest());
                break;
            case "pop":
            default:
                key = this.keys.pop();
                child = this.children.pop();
        }
        return { key: key, child: child };
    }
    stats(stats) {
        stats.leaves++;
        stats.keys += this.keys.length;
        this.children.forEach((child) => stats.values += child.length);
        return stats;
    }
    toString(level = 0) {
        let s = "|  ".repeat(level);
        for (let index = 0; index < this.keys.length; index++) {
            s += this.keys[index] + ": " + JSON.stringify(this.children[index]) + " ";
        }
        if (this.next)
            s += "--> " + JSON.stringify(this.next.lowest());
        return s;
    }
}
exports.Leaf = Leaf;
//# sourceMappingURL=leaf.js.map