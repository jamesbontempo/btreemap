"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Leaf = void 0;
const node_events_1 = require("node:events");
const tree_1 = require("./tree");
class Leaf extends node_events_1.EventEmitter {
    constructor(degree) {
        if (tree_1.debug)
            console.log("Leaf", "constructor", degree);
        super();
        this.degree = degree;
        this.min = Math.ceil(degree / 2);
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
    size() {
        return this.keys.length;
    }
    first() {
        return this;
    }
    insert(key, value) {
        if (tree_1.debug)
            console.log("Leaf", this.keys, "insert", key, value);
        const index = this.keys.indexOf(key);
        if (index >= 0) {
            this.children[index].push(value);
        }
        else {
            if (this.size() === 0 || key > this.highest()) {
                this.keys.push(key);
                this.children.push([value]);
            }
            else {
                for (let i = 0; i < this.keys.length; i++) {
                    if (key < this.keys[i]) {
                        this.keys.splice(i, 0, key);
                        this.children.splice(i, 0, [value]);
                        if (i === 0)
                            this.emit("update", this.keys[1], key);
                        break;
                    }
                }
            }
        }
        if (this.size() > this.degree)
            this.splitLeaf();
    }
    search(key, hops = 0) {
        if (tree_1.debug)
            console.log("Leaf", this.keys, "search", key);
        let count = 0;
        let children = [];
        const index = this.keys.indexOf(key);
        if (index >= 0) {
            children = this.children[index];
            count = children.length;
        }
        return { key: key, values: children, count: count, hops: hops };
    }
    update(key, updater) {
        if (tree_1.debug)
            console.log("Leaf", this.keys, "update", key);
        let count = 0;
        let before = undefined;
        let after = undefined;
        const index = this.keys.indexOf(key);
        if (index >= 0) {
            before = [...this.children[index]];
            for (let i = 0; i < this.children[index].length; i++) {
                this.children[index][i] = updater(this.children[index][i]);
                count++;
            }
            after = this.children[index];
        }
        return { key: key, count: count, before: before, after: after };
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
            if (this.size() < this.min) {
                this.emit("borrow", this.lowest(), this);
            }
        }
        return { key: key, count: count };
    }
    splitLeaf() {
        if (tree_1.debug)
            console.log("Leaf", this.keys, "splitLeaf");
        const leaf = new Leaf(this.degree);
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
        if (this.size() === 0 || key > this.highest()) {
            this.keys.push(key);
            this.children.push(child);
        }
        else {
            for (let i = 0; i < this.size(); i++) {
                if (key < this.keys[i]) {
                    this.keys.splice(i, 0, key);
                    this.children.splice(i, 0, child);
                    if (i === 0)
                        this.emit("update", this.keys[1], key);
                    break;
                }
            }
        }
        if (this.size() > this.degree)
            this.splitLeaf();
    }
    lendChild(action) {
        if (tree_1.debug)
            console.log("Leaf", this.keys, "lendChild", action);
        if (this.size() <= this.min)
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
        this.children.forEach((child) => stats.values += child.length);
        return stats;
    }
    print(level = 0) {
        let output = "|  ".repeat(level);
        for (let index = 0; index < this.keys.length; index++) {
            output += this.keys[index] + ": " + JSON.stringify(this.children[index]) + " ";
        }
        if (this.next)
            output += "--> " + JSON.stringify(this.next.lowest());
        console.log(output);
    }
}
exports.Leaf = Leaf;
//# sourceMappingURL=leaf.js.map