"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_events_1 = require("node:events");
const _1 = require(".");
const tree_1 = require("./tree");
const leaf_1 = require("./leaf");
class Node extends node_events_1.EventEmitter {
    constructor(type, degree) {
        if (tree_1.debug)
            console.log("Node", "constructor", type, degree);
        super();
        this.type = type;
        this.degree = degree;
        this.min = (type === _1.ROOT) ? 1 : Math.ceil(degree / 2) - 1;
        this.keys = [];
        this.children = [];
    }
    rootize() {
        this.type = _1.ROOT;
        this.min = 1;
    }
    internalize() {
        this.type = _1.INTERNAL;
        this.min = Math.ceil(this.degree / 2) - 1;
    }
    size() {
        return this.keys.length;
    }
    lowest(recurse = false) {
        if (recurse)
            return this.children[0].lowest(recurse);
        return this.keys[0];
    }
    highest() {
        return this.keys[this.keys.length - 1];
    }
    first() {
        return this.children[0].first();
    }
    siblings(key) {
        const siblings = [];
        const index = this.childIndex(key);
        if (this.size() < this.min)
            return siblings;
        if (index === 0) {
            siblings.push({ direction: "next", child: this.children[1] });
        }
        else if (index === this.size()) {
            siblings.push({ direction: "previous", child: this.children[index - 1] });
        }
        else {
            siblings.push({ direction: "previous", child: this.children[index - 1] });
            siblings.push({ direction: "next", child: this.children[index + 1] });
        }
        return siblings;
    }
    childIndex(key) {
        for (let index = 0; index < this.size(); index++) {
            if (key < this.keys[index])
                return index;
        }
        return this.size();
    }
    redirect(key, func, ...args) {
        if (tree_1.debug)
            console.log((this.type === _1.ROOT) ? "Root" : "Node", this.keys, "redirect", func, args);
        for (let i = 0; i < this.keys.length; i++) {
            if (key < this.keys[i]) {
                return this.children[i][func](...args);
            }
        }
        return this.children[this.children.length - 1][func](...args);
    }
    insert(key, value) {
        if (tree_1.debug)
            console.log((this.type === _1.ROOT) ? "Root" : "Node", this.keys, "insert", key, value);
        return this.redirect(key, "insert", key, value);
    }
    search(key, hops = 0) {
        if (tree_1.debug)
            console.log((this.type === _1.ROOT) ? "Root" : "Node", this.keys, "search", key);
        return this.redirect(key, "search", key, hops + 1);
    }
    update(key, updater) {
        if (tree_1.debug)
            console.log((this.type === _1.ROOT) ? "Root" : "Node", this.keys, "update", key);
        return this.redirect(key, "update", key, updater);
    }
    delete(key) {
        if (tree_1.debug)
            console.log((this.type === _1.ROOT) ? "Root" : "Node", this.keys, "delete", key);
        return this.redirect(key, "delete", key);
    }
    addChild(child) {
        if (tree_1.debug)
            console.log((this.type === _1.ROOT) ? "Root" : "Node", this.keys, "addChild", (child instanceof leaf_1.Leaf) ? "Leaf" : "Node", (child instanceof leaf_1.Leaf) ? child.lowest() : child.lowest(true));
        this.registerListeners(child);
        if (this.children.length === 0) {
            this.children.push(child);
        }
        else {
            const key = (child instanceof leaf_1.Leaf) ? child.lowest() : child.lowest(true);
            if (this.size() === 0) {
                if (key < this.lowest(true)) {
                    this.keys.unshift(this.lowest(true));
                    this.children.unshift(child);
                    this.emit("update", this.keys[0], key);
                }
                else {
                    this.keys.push(key);
                    this.children.push(child);
                }
            }
            else if (key > this.highest()) {
                this.keys.push(key);
                this.children.push(child);
            }
            else {
                for (let i = 0; i < this.keys.length; i++) {
                    if (key < this.keys[i]) {
                        this.keys.splice(i, 0, (i === 0 && key < this.lowest(true)) ? this.lowest(true) : key);
                        this.children.splice((i === 0 && key < this.lowest(true)) ? 0 : i + 1, 0, child);
                        if (i === 0)
                            this.emit("update", this.keys[1], key);
                        break;
                    }
                }
            }
        }
        if (this.size() === this.degree) {
            this.splitNode();
        }
    }
    splitNode() {
        if (tree_1.debug)
            console.log((this.type === _1.ROOT) ? "Root" : "Node", this.keys, "splitNode");
        const node = new Node(_1.INTERNAL, this.degree);
        this.keys.splice(node.min);
        this.children.splice(node.min + 1).forEach(child => {
            node.addChild(child);
        });
        this.emit("split", node);
    }
    borrowChild(key, child) {
        if (tree_1.debug)
            console.log((this.type === _1.ROOT) ? "Root" : "Node", this.keys, "borrowChild", (child instanceof leaf_1.Leaf) ? "Leaf" : "Node", key, child.keys);
        const siblings = this.siblings(key);
        if (siblings.length > 0) {
            let borrowed = undefined;
            let action = undefined;
            for (let i = 0; i < siblings.length; i++) {
                action = (siblings[i].direction === "previous") ? "pop" : "shift";
                borrowed = siblings[i].child.lendChild(action);
                if (borrowed)
                    break;
            }
            if (borrowed) {
                if (child instanceof leaf_1.Leaf) {
                    child.addChild(borrowed.key, borrowed.child);
                }
                else {
                    child.addChild(borrowed.child);
                }
            }
            else {
                this.mergeChild(key, child);
            }
        }
        else {
            this.emit("shrink");
        }
    }
    lendChild(action) {
        if (tree_1.debug)
            console.log((this.type === _1.ROOT) ? "Root" : "Node", this.keys, "lendChild", action);
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
    mergeChild(key, child) {
        if (tree_1.debug)
            console.log((this.type === _1.ROOT) ? "Root" : "Node", this.keys, "mergeChild", (child instanceof leaf_1.Leaf) ? "Leaf" : "Node", key, child.keys);
        const siblings = this.siblings(key);
        if (siblings.length > 0) {
            let keyIndex = this.keys.indexOf(key);
            let childIndex = this.childIndex(key);
            let target, source;
            if (siblings[0].direction === "previous") {
                target = siblings[0].child;
                source = child;
            }
            else {
                target = child;
                source = siblings[0].child;
                keyIndex++;
                childIndex++;
            }
            for (let i = 0; i < source.children.length; i++) {
                if (source instanceof leaf_1.Leaf) {
                    target.addChild(source.keys[i], source.children[i]);
                }
                else {
                    target.addChild(source.children[i]);
                }
            }
            if (source instanceof leaf_1.Leaf)
                target.next = source.next;
            if (keyIndex >= 0) {
                this.keys.splice(keyIndex, 1);
            }
            else {
                this.keys.shift();
            }
            this.children.splice(childIndex, 1);
        }
        if (this.size() < this.min) {
            if (this.type === _1.ROOT) {
                this.emit("shrink");
            }
            else {
                this.emit("borrow", this.lowest(true), this);
            }
        }
    }
    updateKey(key, newKey) {
        if (tree_1.debug)
            console.log("Node", this.keys, "updateKey", key, newKey);
        const keyIndex = this.keys.indexOf(key);
        const childIndex = this.childIndex(key);
        if (keyIndex >= 0) {
            this.keys[keyIndex] = newKey;
        }
        else {
            if (childIndex > 0)
                this.keys[childIndex - 1] = this.children[childIndex].lowest(true);
            this.emit("update", key, newKey);
        }
    }
    registerListeners(child) {
        if (tree_1.debug)
            console.log((this.type === _1.ROOT) ? "Root" : "Node", this.keys, "registerListeners", child.keys);
        child.removeAllListeners();
        child.on("split", (child) => this.addChild(child));
        child.on("borrow", (key, child) => this.borrowChild(key, child));
        child.on("update", (key, newKey) => this.updateKey(key, newKey));
    }
    stats(stats) {
        stats.nodes++;
        this.children.forEach((child) => child.stats(stats));
        return stats;
    }
    print(level = 0) {
        console.log("|  ".repeat(level) + "keys: " + this.keys);
        this.children.forEach((child) => child.print(level + 1));
    }
}
exports.Node = Node;
//# sourceMappingURL=node.js.map