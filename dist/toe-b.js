"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Tree_instances, _Tree_order, _Tree_root, _Tree_stats, _Tree_index, _Tree_compare, _Tree_splitTree, _Tree_shrinkTree;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tree = void 0;
const node_events_1 = require("node:events");
const ROOT = "root";
const INTERNAL = "internal";
class Tree {
    constructor(order = 3, options = {}) {
        _Tree_instances.add(this);
        _Tree_order.set(this, void 0);
        _Tree_root.set(this, void 0);
        _Tree_stats.set(this, void 0);
        _Tree_index.set(this, (v) => {
            const keys = Object.keys(v);
            if (keys.includes("key"))
                return v.key;
            if (keys.includes("id"))
                return v.id;
            return String(undefined);
        });
        _Tree_compare.set(this, (a, b) => {
            // numbers before letters
            if (typeof a !== typeof b) {
                if (typeof a === "number" && typeof b === "string")
                    return -1;
                if (typeof a === "string" && typeof b === "number")
                    return 1;
            }
            // "punctuation" before letters, marks or numbers
            if (typeof a === "string" && typeof b === "string") {
                const re = /^[\p{L}\p{M}\p{N}]/u;
                const reA = re.test(a);
                const reB = re.test(b);
                if (!reA && reB)
                    return -1;
                if (reA && !reB)
                    return 1;
            }
            // standard comparisons
            if (a < b)
                return -1;
            if (a > b)
                return 1;
            // must be equal
            return 0;
        });
        this.debug = false;
        if (options.debug)
            console.log("Node", "constructor", order);
        if (order < 3)
            throw new RangeError("Minimum tree order is 3");
        __classPrivateFieldSet(this, _Tree_order, order, "f");
        if (options.indexer)
            __classPrivateFieldSet(this, _Tree_index, options.indexer, "f");
        if (options.comparator)
            __classPrivateFieldSet(this, _Tree_compare, options.comparator, "f");
        if (options.debug)
            this.debug = options.debug;
        __classPrivateFieldSet(this, _Tree_stats, { nodes: 0, keys: 0, leaves: 0, values: 0, depth: 1 }, "f");
        const root = new Leaf(order, __classPrivateFieldGet(this, _Tree_compare, "f"), __classPrivateFieldGet(this, _Tree_stats, "f"), this.debug);
        root.on("split", (leaf) => __classPrivateFieldGet(this, _Tree_instances, "m", _Tree_splitTree).call(this, leaf));
        __classPrivateFieldSet(this, _Tree_root, root, "f");
    }
    get order() {
        return __classPrivateFieldGet(this, _Tree_order, "f");
    }
    get lowest() {
        if (__classPrivateFieldGet(this, _Tree_root, "f").size === 0)
            return undefined;
        return __classPrivateFieldGet(this, _Tree_root, "f").lowest(true);
    }
    get highest() {
        if (__classPrivateFieldGet(this, _Tree_root, "f").size === 0)
            return undefined;
        return __classPrivateFieldGet(this, _Tree_root, "f").highest(true);
    }
    get stats() {
        return __classPrivateFieldGet(this, _Tree_stats, "f");
    }
    insert(value) {
        if (this.debug)
            console.log("Tree", "insert", value);
        let key = __classPrivateFieldGet(this, _Tree_index, "f").call(this, value);
        // convert any key that isn't a string or a number into a string
        if (!(typeof key === "string" || typeof key === "number")) {
            if (typeof key === "object" && key !== null) {
                key = JSON.stringify(key);
            }
            else {
                key = String(key);
            }
        }
        __classPrivateFieldGet(this, _Tree_root, "f").insert(key, value);
    }
    select(key) {
        if (this.debug)
            console.log("Tree", "select", key);
        return __classPrivateFieldGet(this, _Tree_root, "f").select(key);
    }
    *selectRange(start, end) {
        if (__classPrivateFieldGet(this, _Tree_root, "f").size === 0)
            return;
        let leaf = __classPrivateFieldGet(this, _Tree_root, "f").find(start);
        do {
            for (let i = 0; i < leaf.keys.length; i++) {
                if (__classPrivateFieldGet(this, _Tree_compare, "f").call(this, leaf.keys[i], start) >= 0 && __classPrivateFieldGet(this, _Tree_compare, "f").call(this, leaf.keys[i], end) <= 0)
                    yield leaf.children[i];
                if (__classPrivateFieldGet(this, _Tree_compare, "f").call(this, leaf.keys[i], end) > 0)
                    break;
            }
            leaf = leaf.next;
        } while (leaf !== undefined);
    }
    update(key, updater) {
        if (this.debug)
            console.log("Tree", "update", key);
        return __classPrivateFieldGet(this, _Tree_root, "f").update(key, updater);
    }
    updateRange(start, end, updater) {
        if (this.debug)
            console.log("Tree", "updateRange", start, end);
        if (__classPrivateFieldGet(this, _Tree_root, "f").size === 0)
            return;
        let count = 0;
        const keys = Array.from(this.keysRange(start, end));
        for (const key of keys) {
            count += __classPrivateFieldGet(this, _Tree_root, "f").update(key, updater);
        }
        return count;
    }
    delete(key) {
        if (this.debug)
            console.log("Tree", "delete", key);
        return __classPrivateFieldGet(this, _Tree_root, "f").delete(key);
    }
    deleteRange(start, end) {
        if (this.debug)
            console.log("Tree", "deleteRange", start, end);
        if (__classPrivateFieldGet(this, _Tree_root, "f").size === 0)
            return;
        let count = 0;
        const keys = Array.from(this.keysRange(start, end));
        for (const key of keys) {
            count += __classPrivateFieldGet(this, _Tree_root, "f").delete(key);
        }
        return count;
    }
    *keys() {
        if (__classPrivateFieldGet(this, _Tree_root, "f").size === 0)
            return undefined;
        let leaf = __classPrivateFieldGet(this, _Tree_root, "f").first();
        do {
            for (const key of leaf.keys) {
                yield key;
            }
            leaf = leaf.next;
        } while (leaf !== undefined);
    }
    keyAt(index) {
        if (this.debug)
            console.log("Tree", "keyAt", index);
        if (index < 0)
            return undefined;
        let i = 0;
        const keys = this.keys();
        let key = keys.next();
        if (index === 0)
            return key.value;
        while (!key.done) {
            i++;
            key = keys.next();
            if (i === index)
                return key.value;
        }
        return undefined;
    }
    *keysRange(start, end) {
        if (__classPrivateFieldGet(this, _Tree_root, "f").size === 0)
            return undefined;
        let leaf = __classPrivateFieldGet(this, _Tree_root, "f").find(start);
        do {
            for (let i = 0; i < leaf.keys.length; i++) {
                if (__classPrivateFieldGet(this, _Tree_compare, "f").call(this, leaf.keys[i], start) >= 0 && __classPrivateFieldGet(this, _Tree_compare, "f").call(this, leaf.keys[i], end) <= 0)
                    yield leaf.keys[i];
                if (__classPrivateFieldGet(this, _Tree_compare, "f").call(this, leaf.keys[i], end) > 0)
                    break;
            }
            leaf = leaf.next;
        } while (leaf !== undefined);
    }
    *values() {
        if (__classPrivateFieldGet(this, _Tree_root, "f").size === 0)
            return undefined;
        let leaf = __classPrivateFieldGet(this, _Tree_root, "f").first();
        do {
            for (let i = 0; i < leaf.children.length; i++) {
                for (let j = 0; j < leaf.children[i].length; j++) {
                    yield leaf.children[i][j];
                }
            }
            leaf = leaf.next;
        } while (leaf !== undefined);
    }
    // add indexes to leaves & nodes for fast retrieval?
    valueAt(index) {
        if (this.debug)
            console.log("Tree", "valueAt", index);
        if (index < 0)
            return undefined;
        let i = 0;
        const values = this.values();
        let value = values.next();
        if (index === 0)
            return value.value;
        while (!value.done) {
            i++;
            value = values.next();
            if (i === index)
                return value.value;
        }
        return undefined;
    }
    *pairs() {
        if (__classPrivateFieldGet(this, _Tree_root, "f").size === 0)
            return undefined;
        let leaf = __classPrivateFieldGet(this, _Tree_root, "f").first();
        do {
            for (let i = 0; i < leaf.keys.length; i++) {
                for (let j = 0; j < leaf.children[i].length; j++) {
                    yield { [leaf.keys[i]]: leaf.children[i][j] };
                }
            }
            leaf = leaf.next;
        } while (leaf !== undefined);
    }
    clear() {
        if (this.debug)
            console.log("Tree", "clear");
        __classPrivateFieldSet(this, _Tree_stats, { nodes: 0, keys: 0, leaves: 0, values: 0, depth: 1 }, "f");
        const root = new Leaf(__classPrivateFieldGet(this, _Tree_order, "f"), __classPrivateFieldGet(this, _Tree_compare, "f"), __classPrivateFieldGet(this, _Tree_stats, "f"), this.debug);
        root.on("split", (leaf) => __classPrivateFieldGet(this, _Tree_instances, "m", _Tree_splitTree).call(this, leaf));
        __classPrivateFieldSet(this, _Tree_root, root, "f");
    }
    toString() {
        const s = "order: " + __classPrivateFieldGet(this, _Tree_order, "f");
        if (__classPrivateFieldGet(this, _Tree_root, "f").size === 0) {
            return s + "\n[empty]";
        }
        else {
            return s + "\n" + __classPrivateFieldGet(this, _Tree_root, "f").toString().trim();
        }
    }
    print() {
        console.log(this.toString());
    }
}
exports.Tree = Tree;
_Tree_order = new WeakMap(), _Tree_root = new WeakMap(), _Tree_stats = new WeakMap(), _Tree_index = new WeakMap(), _Tree_compare = new WeakMap(), _Tree_instances = new WeakSet(), _Tree_splitTree = function _Tree_splitTree(child) {
    if (this.debug)
        console.log("Tree", "splitTree", child.keys);
    __classPrivateFieldGet(this, _Tree_stats, "f").depth++;
    __classPrivateFieldGet(this, _Tree_root, "f").removeAllListeners();
    if (__classPrivateFieldGet(this, _Tree_root, "f") instanceof Node)
        __classPrivateFieldGet(this, _Tree_root, "f").internalize();
    const root = new Node(ROOT, __classPrivateFieldGet(this, _Tree_order, "f"), __classPrivateFieldGet(this, _Tree_compare, "f"), __classPrivateFieldGet(this, _Tree_stats, "f"), this.debug);
    root.addChild(__classPrivateFieldGet(this, _Tree_root, "f"));
    root.addChild(child);
    root.on("split", (child) => __classPrivateFieldGet(this, _Tree_instances, "m", _Tree_splitTree).call(this, child));
    root.on("shrink", () => __classPrivateFieldGet(this, _Tree_instances, "m", _Tree_shrinkTree).call(this));
    __classPrivateFieldSet(this, _Tree_root, root, "f");
}, _Tree_shrinkTree = function _Tree_shrinkTree() {
    if (this.debug)
        console.log("Tree", "shrinkTree");
    __classPrivateFieldGet(this, _Tree_stats, "f").nodes--;
    __classPrivateFieldGet(this, _Tree_stats, "f").depth--;
    __classPrivateFieldGet(this, _Tree_root, "f").removeAllListeners();
    const root = __classPrivateFieldGet(this, _Tree_root, "f").children[0];
    if (root instanceof Node)
        root.rootize();
    root.on("split", (child) => __classPrivateFieldGet(this, _Tree_instances, "m", _Tree_splitTree).call(this, child));
    root.on("shrink", () => __classPrivateFieldGet(this, _Tree_instances, "m", _Tree_shrinkTree).call(this));
    __classPrivateFieldSet(this, _Tree_root, root, "f");
};
class Node extends node_events_1.EventEmitter {
    constructor(type, order, comparator, stats, debug) {
        if (debug)
            console.log("Node", "constructor", type, order);
        super();
        this.type = type;
        this.order = order;
        this.compare = comparator;
        this.min = (type === ROOT) ? 1 : Math.ceil(order / 2) - 1;
        this.keys = [];
        this.children = [];
        this.stats = stats;
        this.debug = debug;
        this.stats.nodes++;
    }
    rootize() {
        this.type = ROOT;
        this.min = 1;
    }
    internalize() {
        this.type = INTERNAL;
        this.min = Math.ceil(this.order / 2) - 1;
    }
    get size() {
        return this.keys.length;
    }
    lowest(recurse = false) {
        if (recurse)
            return this.children[0].lowest(recurse);
        return this.keys[0];
    }
    highest(recurse = false) {
        if (recurse)
            return this.children[this.children.length - 1].highest(recurse);
        return this.keys[this.keys.length - 1];
    }
    first() {
        return this.children[0].first();
    }
    find(key) {
        if (this.debug)
            console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "find", key);
        return this.redirect(key, "find", key);
    }
    siblings(key) {
        const siblings = [];
        const index = this.childIndex(key);
        if (this.size < this.min)
            return siblings;
        if (index === 0) {
            siblings.push({ direction: "next", child: this.children[1] });
        }
        else if (index === this.size) {
            siblings.push({ direction: "previous", child: this.children[index - 1] });
        }
        else {
            siblings.push({ direction: "previous", child: this.children[index - 1] });
            siblings.push({ direction: "next", child: this.children[index + 1] });
        }
        return siblings;
    }
    childIndex(key) {
        for (let index = 0; index < this.size; index++) {
            if (this.compare(key, this.keys[index]) < 0)
                return index;
        }
        return this.size;
    }
    redirect(key, func, ...args) {
        if (this.debug)
            console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "redirect", func, args);
        for (let i = 0; i < this.keys.length; i++) {
            if (this.compare(key, this.keys[i]) < 0) {
                return this.children[i][func](...args);
            }
        }
        return this.children[this.children.length - 1][func](...args);
    }
    insert(key, value) {
        if (this.debug)
            console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "insert", key, value);
        return this.redirect(key, "insert", key, value);
    }
    select(key) {
        if (this.debug)
            console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "select", key);
        return this.redirect(key, "select", key);
    }
    update(key, updater) {
        if (this.debug)
            console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "update", key);
        return this.redirect(key, "update", key, updater);
    }
    delete(key) {
        if (this.debug)
            console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "delete", key);
        return this.redirect(key, "delete", key);
    }
    addChild(child) {
        if (this.debug)
            console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "addChild", (child instanceof Leaf) ? "Leaf" : "Node", (child instanceof Leaf) ? child.lowest() : child.lowest(true));
        this.registerListeners(child);
        if (this.children.length === 0) {
            this.children.push(child);
        }
        else {
            const key = (child instanceof Leaf) ? child.lowest() : child.lowest(true);
            if (this.size === 0) {
                if (this.compare(key, this.lowest(true)) < 0) {
                    this.keys.unshift(this.lowest(true));
                    this.children.unshift(child);
                    this.emit("update", this.keys[0], key);
                }
                else {
                    this.keys.push(key);
                    this.children.push(child);
                }
            }
            else if (this.compare(key, this.highest()) > 0) {
                this.keys.push(key);
                this.children.push(child);
            }
            else {
                for (let i = 0; i < this.keys.length; i++) {
                    if (this.compare(key, this.keys[i]) < 0) {
                        const newLowest = i === 0 && this.compare(key, this.lowest(true)) < 0;
                        this.keys.splice(i, 0, (newLowest) ? this.lowest(true) : key);
                        this.children.splice((newLowest) ? 0 : i + 1, 0, child);
                        if (i === 0)
                            this.emit("update", this.keys[1], key);
                        break;
                    }
                }
            }
        }
        if (this.size === this.order) {
            this.splitNode();
        }
    }
    splitNode() {
        if (this.debug)
            console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "splitNode");
        const node = new Node(INTERNAL, this.order, this.compare, this.stats, this.debug);
        this.keys.splice(node.min);
        this.children.splice(node.min + 1).forEach(child => {
            node.addChild(child);
        });
        this.emit("split", node);
    }
    borrowChild(key, child) {
        if (this.debug)
            console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "borrowChild", (child instanceof Leaf) ? "Leaf" : "Node", key, child.keys);
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
                if (child instanceof Leaf) {
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
        if (this.debug)
            console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "lendChild", action);
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
    mergeChild(key, child) {
        if (this.debug)
            console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "mergeChild", (child instanceof Leaf) ? "Leaf" : "Node", key, child.keys);
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
            if (child instanceof Leaf) {
                this.stats.leaves--;
            }
            else {
                this.stats.nodes--;
            }
            for (let i = 0; i < source.children.length; i++) {
                if (source instanceof Leaf) {
                    target.addChild(source.keys[i], source.children[i]);
                }
                else {
                    target.addChild(source.children[i]);
                }
            }
            if (source instanceof Leaf)
                target.next = source.next;
            if (keyIndex >= 0) {
                this.keys.splice(keyIndex, 1);
            }
            else {
                this.keys.shift();
            }
            this.children.splice(childIndex, 1);
        }
        if (this.size < this.min) {
            if (this.type === ROOT) {
                this.emit("shrink");
            }
            else {
                this.emit("borrow", this.lowest(true), this);
            }
        }
    }
    updateKey(key, newKey) {
        if (this.debug)
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
        if (this.debug)
            console.log((this.type === ROOT) ? "Root" : "Node", this.keys, "registerListeners", child.keys);
        child.removeAllListeners();
        child.on("split", (child) => this.addChild(child));
        child.on("borrow", (key, child) => this.borrowChild(key, child));
        child.on("update", (key, newKey) => this.updateKey(key, newKey));
    }
    toString(level = 0) {
        let s = "|  ".repeat(level) + "keys: " + this.keys;
        for (let i = 0; i < this.children.length; i++) {
            s += "\n" + this.children[i].toString(level + 1);
        }
        return s;
    }
}
class Leaf extends node_events_1.EventEmitter {
    constructor(order, comparator, stats, debug) {
        if (debug)
            console.log("Leaf", "constructor", order);
        super();
        this.order = order;
        this.compare = comparator;
        this.min = Math.ceil(order / 2);
        this.keys = [];
        this.children = [];
        this.next = undefined;
        this.stats = stats;
        this.debug = debug;
        this.stats.leaves++;
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
    insert(key, value) {
        if (this.debug)
            console.log("Leaf", this.keys, "insert", key, value);
        const index = this.keys.indexOf(key);
        if (index >= 0) {
            this.stats.values++;
            this.children[index].push(value);
        }
        else {
            this.stats.keys++;
            this.stats.values++;
            if (this.size === 0 || this.compare(key, this.highest()) > 0) {
                this.keys.push(key);
                this.children.push([value]);
            }
            else {
                for (let i = 0; i < this.keys.length; i++) {
                    if (this.compare(key, this.keys[i]) < 0) {
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
        if (this.debug)
            console.log("Leaf", this.keys, "select", key);
        const index = this.keys.indexOf(key);
        if (index >= 0) {
            return this.children[index];
        }
        return;
    }
    update(key, updater) {
        if (this.debug)
            console.log("Leaf", this.keys, "update", key);
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
    delete(key) {
        if (this.debug)
            console.log("Leaf", this.keys, "delete", key);
        let values = 0;
        const index = this.keys.indexOf(key);
        if (index >= 0) {
            values = this.children[index].length;
            this.stats.keys--;
            this.stats.values -= values;
            this.keys.splice(index, 1);
            this.children.splice(index, 1);
            if (index === 0)
                this.emit("update", key, this.lowest());
            if (this.size < this.min) {
                this.emit("borrow", this.lowest(), this);
            }
        }
        return values;
    }
    splitLeaf() {
        if (this.debug)
            console.log("Leaf", this.keys, "splitLeaf");
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
    addChild(key, child) {
        if (this.debug)
            console.log("Leaf", this.keys, "addChild", key, child);
        if (this.size === 0 || this.compare(key, this.highest()) > 0) {
            this.keys.push(key);
            this.children.push(child);
        }
        else {
            for (let i = 0; i < this.size; i++) {
                if (this.compare(key, this.keys[i]) < 0) {
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
        if (this.debug)
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
    toString(level = 0) {
        let s = "|  ".repeat(level);
        for (let i = 0; i < this.keys.length; i++) {
            s += this.keys[i] + ": ";
            for (let j = 0; j < this.children[i].length; j++) {
                s += JSON.stringify(this.children[i][j], (_, v) => { return (typeof v === "bigint") ? v.toString() : v; }) + " ";
            }
        }
        if (this.next)
            s += "--> " + this.next.lowest();
        return s;
    }
}
//# sourceMappingURL=toe-b.js.map