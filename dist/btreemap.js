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
var _BTreeMap_unique, _BTreeMap_order, _BTreeMap_compare, _BTreeMap_stats, _BTreeMap_map, _BTreeMap_root, _BTreeMap_headers;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BTreeMap = void 0;
const node_fs_1 = require("node:fs");
const bson_1 = require("bson");
function typeOf(item) {
    const typeOfItem = typeof item;
    if (typeOfItem !== "object") {
        return typeOfItem;
    }
    else if (item === null) {
        return "null";
    }
    else {
        return Object.prototype.toString.call(item).slice(8, -1).toLowerCase();
    }
}
class BTreeMap {
    constructor(options = {}) {
        _BTreeMap_unique.set(this, true);
        _BTreeMap_order.set(this, 3);
        _BTreeMap_compare.set(this, (a, b) => {
            const typeOfA = typeOf(a);
            const typeOfB = typeOf(b);
            if (typeOfA === typeOfB) {
                return (a < b) ? -1 : ((a > b) ? 1 : 0);
            }
            else {
                return (typeOfA < typeOfB) ? -1 : 1;
            }
        });
        _BTreeMap_stats.set(this, void 0);
        _BTreeMap_map.set(this, void 0);
        _BTreeMap_root.set(this, void 0);
        _BTreeMap_headers.set(this, [
            { length: 8, get: () => __classPrivateFieldGet(this, _BTreeMap_order, "f"), set: (v) => __classPrivateFieldSet(this, _BTreeMap_order, v, "f") },
            { length: 1, get: () => (__classPrivateFieldGet(this, _BTreeMap_unique, "f") === false) ? 0 : 1, set: (v) => __classPrivateFieldSet(this, _BTreeMap_unique, (v === 0) ? false : true, "f") },
        ]);
        if (options.unique !== undefined)
            __classPrivateFieldSet(this, _BTreeMap_unique, options.unique, "f");
        if (options.order !== undefined && options.order >= 3)
            __classPrivateFieldSet(this, _BTreeMap_order, options.order, "f");
        if (options.comparator !== undefined)
            __classPrivateFieldSet(this, _BTreeMap_compare, options.comparator, "f");
        __classPrivateFieldSet(this, _BTreeMap_stats, { depth: 0, nodes: 0, leaves: 0, keys: 0, values: 0 }, "f");
        __classPrivateFieldSet(this, _BTreeMap_map, new Map(), "f");
        __classPrivateFieldSet(this, _BTreeMap_root, new Leaf(__classPrivateFieldGet(this, _BTreeMap_order, "f"), __classPrivateFieldGet(this, _BTreeMap_compare, "f"), __classPrivateFieldGet(this, _BTreeMap_stats, "f")), "f");
    }
    // properties
    get lowest() {
        return __classPrivateFieldGet(this, _BTreeMap_root, "f").lowest;
    }
    get highest() {
        return __classPrivateFieldGet(this, _BTreeMap_root, "f").highest;
    }
    get order() {
        return __classPrivateFieldGet(this, _BTreeMap_order, "f");
    }
    get size() {
        return __classPrivateFieldGet(this, _BTreeMap_map, "f").size;
    }
    get stats() {
        return __classPrivateFieldGet(this, _BTreeMap_stats, "f");
    }
    // data manipulation methods
    has(key) {
        return __classPrivateFieldGet(this, _BTreeMap_map, "f").has(key);
    }
    set(key, value) {
        const values = __classPrivateFieldGet(this, _BTreeMap_map, "f").get(key);
        if (values !== undefined) {
            if (__classPrivateFieldGet(this, _BTreeMap_unique, "f")) {
                values[0] = value;
            }
            else {
                values.push(value);
                this.stats.values++;
            }
        }
        else {
            __classPrivateFieldGet(this, _BTreeMap_map, "f").set(key, [value]);
            __classPrivateFieldGet(this, _BTreeMap_root, "f").set(key, __classPrivateFieldGet(this, _BTreeMap_stats, "f"));
            if (__classPrivateFieldGet(this, _BTreeMap_root, "f").keys.length > __classPrivateFieldGet(this, _BTreeMap_root, "f").max) {
                const newRoot = new Node(__classPrivateFieldGet(this, _BTreeMap_order, "f"), __classPrivateFieldGet(this, _BTreeMap_compare, "f"), __classPrivateFieldGet(this, _BTreeMap_stats, "f"));
                const newChild = __classPrivateFieldGet(this, _BTreeMap_root, "f").split();
                newRoot.keys.push(newChild.lowest);
                newRoot.children.push(__classPrivateFieldGet(this, _BTreeMap_root, "f"), newChild);
                __classPrivateFieldSet(this, _BTreeMap_root, newRoot, "f");
                __classPrivateFieldGet(this, _BTreeMap_stats, "f").depth++;
            }
            this.stats.values++;
        }
        return this;
    }
    get(key, endKey, inclusive) {
        if (endKey) {
            return this.values(key, endKey, inclusive);
        }
        else {
            if (__classPrivateFieldGet(this, _BTreeMap_unique, "f")) {
                return (__classPrivateFieldGet(this, _BTreeMap_map, "f").get(key)) ? __classPrivateFieldGet(this, _BTreeMap_map, "f").get(key)[0] : undefined;
            }
            else {
                return __classPrivateFieldGet(this, _BTreeMap_map, "f").get(key);
            }
        }
    }
    delete(key, endKey, inclusive) {
        if (endKey) {
            let count = 0;
            const keys = Array.from(this.keys(key, endKey, inclusive));
            for (const key of keys) {
                if (this.delete(key))
                    count++;
            }
            return (count > 0) ? true : false;
        }
        else {
            if (__classPrivateFieldGet(this, _BTreeMap_map, "f").has(key)) {
                const count = __classPrivateFieldGet(this, _BTreeMap_map, "f").get(key).length;
                __classPrivateFieldGet(this, _BTreeMap_map, "f").delete(key);
                __classPrivateFieldGet(this, _BTreeMap_root, "f").delete(key);
                if (__classPrivateFieldGet(this, _BTreeMap_root, "f").keys.length === 0) {
                    __classPrivateFieldSet(this, _BTreeMap_root, __classPrivateFieldGet(this, _BTreeMap_root, "f").shrink(), "f");
                    __classPrivateFieldGet(this, _BTreeMap_stats, "f").depth--;
                }
                this.stats.values -= count;
                return true;
            }
            else {
                return false;
            }
        }
    }
    clear() {
        __classPrivateFieldSet(this, _BTreeMap_map, new Map(), "f");
        __classPrivateFieldSet(this, _BTreeMap_stats, { depth: 0, nodes: 0, leaves: 0, keys: 0, values: 0 }, "f");
        __classPrivateFieldSet(this, _BTreeMap_root, new Leaf(__classPrivateFieldGet(this, _BTreeMap_order, "f"), __classPrivateFieldGet(this, _BTreeMap_compare, "f"), __classPrivateFieldGet(this, _BTreeMap_stats, "f")), "f");
    }
    // iterators
    [(_BTreeMap_unique = new WeakMap(), _BTreeMap_order = new WeakMap(), _BTreeMap_compare = new WeakMap(), _BTreeMap_stats = new WeakMap(), _BTreeMap_map = new WeakMap(), _BTreeMap_root = new WeakMap(), _BTreeMap_headers = new WeakMap(), Symbol.iterator)]() {
        return this.entries();
    }
    *keys(start = this.lowest, end = this.highest, inclusive = true) {
        if (__classPrivateFieldGet(this, _BTreeMap_map, "f").size === 0)
            return;
        let leaf = __classPrivateFieldGet(this, _BTreeMap_root, "f").findLeaf(start);
        do {
            const keys = leaf.keys;
            for (let i = 0, length = keys.length; i < length; i++) {
                const key = keys[i];
                if (__classPrivateFieldGet(this, _BTreeMap_compare, "f").call(this, key, start) >= 0 && ((inclusive) ? __classPrivateFieldGet(this, _BTreeMap_compare, "f").call(this, key, end) <= 0 : __classPrivateFieldGet(this, _BTreeMap_compare, "f").call(this, key, end) < 0))
                    yield key;
                if (__classPrivateFieldGet(this, _BTreeMap_compare, "f").call(this, key, end) > 0)
                    break;
            }
            leaf = leaf.next;
        } while (leaf !== null);
    }
    *values(start = this.lowest, end = this.highest, inclusive = true) {
        if (__classPrivateFieldGet(this, _BTreeMap_map, "f").size === 0)
            return;
        const iterator = this.keys(start, end, inclusive);
        let next = iterator.next();
        while (!next.done) {
            const key = next.value;
            const values = __classPrivateFieldGet(this, _BTreeMap_map, "f").get(key);
            for (const value of values) {
                yield value;
            }
            next = iterator.next();
        }
    }
    *entries(start = this.lowest, end = this.highest, inclusive = true) {
        if (__classPrivateFieldGet(this, _BTreeMap_map, "f").size === 0)
            return;
        const iterator = this.keys(start, end, inclusive);
        let next = iterator.next();
        while (!next.done) {
            const key = next.value;
            const values = __classPrivateFieldGet(this, _BTreeMap_map, "f").get(key);
            for (const value of values) {
                yield [key, value];
            }
            next = iterator.next();
        }
    }
    // functional methods
    forEach(func, start = this.lowest, end = this.highest, inclusive = true) {
        if (__classPrivateFieldGet(this, _BTreeMap_map, "f").size === 0)
            return;
        const iterator = this.entries(start, end, inclusive);
        let next = iterator.next();
        while (!next.done) {
            const [key, value] = next.value;
            func(value, key, this);
            next = iterator.next();
        }
    }
    // I/O methods
    load(path) {
        this.clear();
        let position = 0;
        const size = (0, node_fs_1.statSync)(path).size;
        const fd = (0, node_fs_1.openSync)(path, "r+");
        for (const header of __classPrivateFieldGet(this, _BTreeMap_headers, "f")) {
            const buffer = Buffer.alloc(header.length);
            (0, node_fs_1.readSync)(fd, buffer, 0, header.length, position);
            header.set(buffer.readUint8());
            position += header.length;
        }
        while (position < size) {
            const length = Buffer.alloc(8);
            (0, node_fs_1.readSync)(fd, length, 0, 8, position);
            position += 8;
            const data = Buffer.alloc(length.readUint8());
            (0, node_fs_1.readSync)(fd, data, 0, data.length, position);
            const entry = Array.from(Object.values((0, bson_1.deserialize)(data)));
            this.set(entry[0], entry[1]);
            position += data.length;
        }
        (0, node_fs_1.closeSync)(fd);
    }
    save(path) {
        let position = 0;
        const fd = (0, node_fs_1.openSync)(path, "w");
        for (const header of __classPrivateFieldGet(this, _BTreeMap_headers, "f")) {
            const buffer = Buffer.alloc(header.length);
            buffer.writeUInt8(header.get());
            (0, node_fs_1.writeSync)(fd, buffer, 0, buffer.length, position);
            position += header.length;
        }
        const iterator = this.entries();
        let next = iterator.next();
        while (!next.done) {
            const entry = next.value;
            const sEntry = (0, bson_1.serialize)(entry);
            const sEntryLength = Buffer.alloc(8);
            sEntryLength.writeUint8(sEntry.length);
            const data = Buffer.concat([sEntryLength, sEntry]);
            (0, node_fs_1.writeSync)(fd, data, 0, data.length, position);
            position += data.length;
            next = iterator.next();
        }
        (0, node_fs_1.closeSync)(fd);
    }
    toString() {
        return __classPrivateFieldGet(this, _BTreeMap_root, "f").toString(__classPrivateFieldGet(this, _BTreeMap_map, "f"), 0);
    }
}
exports.BTreeMap = BTreeMap;
class Node {
    constructor(order, compare, stats) {
        this.order = order;
        this.compare = compare;
        this.min = Math.ceil(order / 2) - 1;
        this.max = order - 1;
        this.keys = [];
        this.children = [];
        this.stats = stats;
        this.stats.nodes++;
    }
    get lowest() {
        return this.children[0].lowest;
    }
    get highest() {
        return this.children[this.children.length - 1].highest;
    }
    set(key, stats) {
        const slot = this.slotOf(key, this.keys, this.compare);
        const child = this.children[slot];
        child.set(key, stats);
        if (child.keys.length > child.max) {
            let sibling;
            if (slot > 0) {
                sibling = this.children[slot - 1];
                if (sibling.keys.length < sibling.max) {
                    sibling.borrowRight(child);
                    this.keys[slot - 1] = child.lowest;
                }
                else if (slot < this.children.length - 1) {
                    sibling = this.children[slot + 1];
                    if (sibling.keys.length < sibling.max) {
                        sibling.borrowLeft(child);
                        this.keys[slot] = sibling.lowest;
                    }
                    else {
                        this.splitChild(child, slot);
                    }
                }
                else {
                    this.splitChild(child, slot);
                }
            }
            else {
                sibling = this.children[1];
                if (sibling.keys.length < sibling.max) {
                    sibling.borrowLeft(child);
                    this.keys[slot] = sibling.lowest;
                }
                else {
                    this.splitChild(child, slot);
                }
            }
        }
    }
    delete(key) {
        const keys = this.keys;
        const slot = this.slotOf(key, keys, this.compare);
        const child = this.children[slot];
        child.delete(key);
        if (slot > 0)
            keys[slot - 1] = child.lowest;
        if (child.keys.length < child.min)
            this.consolidateChild(child, slot);
    }
    findLeaf(key) {
        return this.children[this.slotOf(key, this.keys, this.compare)].findLeaf(key);
    }
    split() {
        const newNode = new Node(this.order, this.compare, this.stats);
        newNode.keys = this.keys.splice(this.min);
        newNode.keys.shift();
        newNode.children = this.children.splice(this.min + 1);
        return newNode;
    }
    shrink() {
        this.stats.nodes--;
        return this.children[0];
    }
    borrowLeft(source) {
        this.keys.unshift(this.lowest);
        source.keys.pop();
        this.children.unshift(source.children.pop());
    }
    borrowRight(source) {
        this.keys.push(source.lowest);
        source.keys.shift();
        this.children.push(source.children.shift());
    }
    merge(source) {
        this.keys.push(source.lowest, ...source.keys);
        this.children.push(...source.children);
        this.stats.nodes--;
    }
    splitChild(child, slot) {
        const newChild = child.split();
        this.keys.splice(slot, 0, newChild.lowest);
        this.children.splice(slot + 1, 0, newChild);
    }
    consolidateChild(child, slot) {
        const keys = this.keys;
        const children = this.children;
        let sibling;
        if (slot > 0) {
            sibling = children[slot - 1];
            if (sibling.keys.length > sibling.min) {
                child.borrowLeft(sibling);
                keys[slot - 1] = child.lowest;
            }
            else if (slot < this.children.length - 1) {
                sibling = children[slot + 1];
                if (sibling.keys.length > sibling.min) {
                    child.borrowRight(sibling);
                    keys[slot] = sibling.lowest;
                }
                else {
                    children[slot - 1].merge(child);
                    keys.splice(slot - 1, 1);
                    children.splice(slot, 1);
                }
            }
            else {
                children[slot - 1].merge(child);
                keys.splice(slot - 1, 1);
                children.splice(slot, 1);
            }
        }
        else {
            sibling = children[slot + 1];
            if (sibling.keys.length > sibling.min) {
                child.borrowRight(sibling);
                keys[slot] = sibling.lowest;
            }
            else {
                child.merge(children[1]);
                keys.splice(0, 1);
                children.splice(1, 1);
            }
        }
    }
    slotOf(element, array, compare) {
        let bottom = 0, top = array.length, middle = top >>> 1;
        while (bottom < top) {
            const comparison = compare(element, array[middle]);
            if (comparison === 0) {
                return middle + 1;
            }
            else if (comparison < 0) {
                top = middle;
            }
            else {
                bottom = middle + 1;
            }
            middle = bottom + ((top - bottom) >>> 1);
        }
        return middle;
    }
    toString(map, level = 0) {
        let output = "|  ".repeat(level) + ((level === 0) ? "Root - " : "Node - ") + String(this.keys);
        for (let i = 0, length = this.children.length; i < length; i++) {
            output += "\n" + this.children[i].toString(map, level + 1);
        }
        return output;
    }
}
class Leaf {
    constructor(order, comparator, stats) {
        this.order = order;
        this.compare = comparator;
        this.min = Math.ceil(order / 2);
        this.max = order;
        this.keys = [];
        this.next = null;
        this.stats = stats;
        this.stats.leaves++;
    }
    get lowest() {
        return this.keys[0];
    }
    get highest() {
        return this.keys[this.keys.length - 1];
    }
    set(key) {
        if (this.keys.length === 0) {
            this.keys.push(key);
        }
        else {
            const slot = this.slotOf(key, this.keys, this.compare);
            this.keys.splice(slot, 0, key);
        }
        this.stats.keys++;
    }
    delete(key) {
        this.keys.splice(this.keys.indexOf(key), 1);
        this.stats.keys--;
    }
    findLeaf() {
        return this;
    }
    split() {
        const newLeaf = new Leaf(this.order, this.compare, this.stats);
        newLeaf.keys = this.keys.splice(this.min);
        newLeaf.next = this.next;
        this.next = newLeaf;
        return newLeaf;
    }
    shrink() {
        this.stats.leaves--;
        return new Leaf(this.order, this.compare, this.stats);
    }
    borrowLeft(source) {
        this.keys.unshift(source.keys.pop());
    }
    borrowRight(source) {
        this.keys.push(source.keys.shift());
    }
    merge(source) {
        this.keys.push(...source.keys);
        this.next = source.next;
        this.stats.leaves--;
    }
    slotOf(element, array, compare) {
        let bottom = 0, top = array.length, middle = top >>> 1;
        while (bottom < top) {
            const comparison = compare(element, array[middle]);
            if (comparison === 0) {
                return middle + 1;
            }
            else if (comparison < 0) {
                top = middle;
            }
            else {
                bottom = middle + 1;
            }
            middle = bottom + ((top - bottom) >>> 1);
        }
        return middle;
    }
    toString(map, level = 0) {
        let output = "|  ".repeat(level) + "Leaf";
        for (const key of this.keys) {
            output += "\n" + "|  ".repeat(level + 1) + String(key) + ": " + String(map.get(key));
        }
        if (this.next)
            output += " --> " + String(this.next.lowest);
        return output;
    }
}
//# sourceMappingURL=btreemap.js.map