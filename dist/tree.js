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
var _Tree_instances, _Tree_order, _Tree_root, _Tree_splitTree, _Tree_shrinkTree;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tree = exports.compare = exports.debug = void 0;
const _1 = require("./");
const node_1 = require("./node");
const leaf_1 = require("./leaf");
exports.debug = false;
let compare = (a, b) => {
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
};
exports.compare = compare;
class Tree {
    constructor(order = 3, comparator) {
        _Tree_instances.add(this);
        _Tree_order.set(this, void 0);
        _Tree_root.set(this, void 0);
        if (order < 3)
            throw new RangeError("Minimum tree order is 3");
        __classPrivateFieldSet(this, _Tree_order, order, "f");
        if (comparator)
            exports.compare = comparator;
        const root = new leaf_1.Leaf(order);
        root.on("split", (leaf) => __classPrivateFieldGet(this, _Tree_instances, "m", _Tree_splitTree).call(this, leaf));
        __classPrivateFieldSet(this, _Tree_root, root, "f");
    }
    set debug(d) {
        exports.debug = d;
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
    insert(key, value) {
        if (exports.debug)
            console.log("Tree", "insert", key, value);
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
        if (exports.debug)
            console.log("Tree", "select", key);
        return __classPrivateFieldGet(this, _Tree_root, "f").select(key);
    }
    *selectRange(start, end) {
        if (__classPrivateFieldGet(this, _Tree_root, "f").size === 0)
            return;
        let leaf = __classPrivateFieldGet(this, _Tree_root, "f").find(start);
        do {
            for (let i = 0; i < leaf.children.length; i++) {
                if ((0, exports.compare)(leaf.keys[i], start) >= 0 && (0, exports.compare)(leaf.keys[i], end) <= 0)
                    yield leaf.children[i];
                if ((0, exports.compare)(leaf.keys[i], end) > 0)
                    break;
            }
            leaf = leaf.next;
        } while (leaf !== undefined);
    }
    update(key, updater) {
        if (exports.debug)
            console.log("Tree", "update", key);
        return __classPrivateFieldGet(this, _Tree_root, "f").update(key, updater);
    }
    updateRange(start, end, updater) {
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
        if (exports.debug)
            console.log("Tree", "delete", key);
        return __classPrivateFieldGet(this, _Tree_root, "f").delete(key);
    }
    deleteRange(start, end) {
        if (__classPrivateFieldGet(this, _Tree_root, "f").size === 0)
            return;
        let count = 0;
        const keys = Array.from(this.keysRange(start, end));
        for (const key of keys) {
            count += __classPrivateFieldGet(this, _Tree_root, "f").delete(key);
        }
        return count;
    }
    at(index) {
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
    *keysRange(start, end) {
        if (__classPrivateFieldGet(this, _Tree_root, "f").size === 0)
            return undefined;
        let leaf = __classPrivateFieldGet(this, _Tree_root, "f").find(start);
        do {
            for (let i = 0; i < leaf.keys.length; i++) {
                if ((0, exports.compare)(leaf.keys[i], start) >= 0 && (0, exports.compare)(leaf.keys[i], end) <= 0)
                    yield leaf.keys[i];
                if ((0, exports.compare)(leaf.keys[i], end) > 0)
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
        if (exports.debug)
            console.log("Tree", "clear");
        const root = new leaf_1.Leaf(__classPrivateFieldGet(this, _Tree_order, "f"));
        root.on("split", (leaf) => __classPrivateFieldGet(this, _Tree_instances, "m", _Tree_splitTree).call(this, leaf));
        __classPrivateFieldSet(this, _Tree_root, root, "f");
    }
    stats() {
        return __classPrivateFieldGet(this, _Tree_root, "f").stats({ nodes: 0, keys: 0, leaves: 0, values: 0, depth: __classPrivateFieldGet(this, _Tree_root, "f").depth() });
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
_Tree_order = new WeakMap(), _Tree_root = new WeakMap(), _Tree_instances = new WeakSet(), _Tree_splitTree = function _Tree_splitTree(child) {
    if (exports.debug)
        console.log("Tree", "splitTree", child.keys);
    __classPrivateFieldGet(this, _Tree_root, "f").removeAllListeners();
    if (__classPrivateFieldGet(this, _Tree_root, "f") instanceof node_1.Node)
        __classPrivateFieldGet(this, _Tree_root, "f").internalize();
    const root = new node_1.Node(_1.ROOT, __classPrivateFieldGet(this, _Tree_order, "f"));
    root.addChild(__classPrivateFieldGet(this, _Tree_root, "f"));
    root.addChild(child);
    root.on("split", (child) => __classPrivateFieldGet(this, _Tree_instances, "m", _Tree_splitTree).call(this, child));
    root.on("shrink", () => __classPrivateFieldGet(this, _Tree_instances, "m", _Tree_shrinkTree).call(this));
    __classPrivateFieldSet(this, _Tree_root, root, "f");
}, _Tree_shrinkTree = function _Tree_shrinkTree() {
    if (exports.debug)
        console.log("Tree", "shrinkTree");
    __classPrivateFieldGet(this, _Tree_root, "f").removeAllListeners();
    const root = __classPrivateFieldGet(this, _Tree_root, "f").children[0];
    if (root instanceof node_1.Node)
        root.rootize();
    root.on("split", (child) => __classPrivateFieldGet(this, _Tree_instances, "m", _Tree_splitTree).call(this, child));
    root.on("shrink", () => __classPrivateFieldGet(this, _Tree_instances, "m", _Tree_shrinkTree).call(this));
    __classPrivateFieldSet(this, _Tree_root, root, "f");
};
//# sourceMappingURL=tree.js.map