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
var _Tree_degree, _Tree_root;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tree = exports.debug = void 0;
const _1 = require("./");
const node_1 = require("./node");
const leaf_1 = require("./leaf");
exports.debug = false;
class Tree {
    constructor(degree) {
        _Tree_degree.set(this, void 0);
        _Tree_root.set(this, void 0);
        __classPrivateFieldSet(this, _Tree_degree, degree, "f");
        const root = new leaf_1.Leaf(degree);
        root.on("split", (leaf) => this.splitTree(leaf));
        __classPrivateFieldSet(this, _Tree_root, root, "f");
    }
    set debug(d) {
        exports.debug = d;
    }
    insert(...pairs) {
        if (exports.debug)
            console.log("Tree", "insert", pairs);
        let count = 0;
        const start = Date.now();
        for (const pair of pairs) {
            let key = Object.keys(pair)[0];
            if (/^\d+$/.test(key))
                key = new Number(key).valueOf();
            const value = pair[key];
            __classPrivateFieldGet(this, _Tree_root, "f").insert(key, value);
            count++;
        }
        return { count: count, time: Date.now() - start };
    }
    search(...keys) {
        if (exports.debug)
            console.log("Tree", "search", keys);
        const results = [];
        const start = Date.now();
        for (const key of keys) {
            results.push(__classPrivateFieldGet(this, _Tree_root, "f").search(key));
        }
        return Object.assign({ results: results }, { time: Date.now() - start });
    }
    update(...args) {
        if (exports.debug)
            console.log("Tree", "update", args);
        const updater = args.pop();
        const keys = args;
        const results = [];
        const start = Date.now();
        for (const key of keys) {
            results.push(__classPrivateFieldGet(this, _Tree_root, "f").update(key, updater));
        }
        return Object.assign({ results: results }, { time: Date.now() - start });
    }
    delete(...keys) {
        if (exports.debug)
            console.log("Tree", "delete", keys);
        const results = [];
        const start = Date.now();
        for (const key of keys) {
            results.push(__classPrivateFieldGet(this, _Tree_root, "f").delete(key));
        }
        return Object.assign({ results: results }, { time: Date.now() - start });
    }
    *keys(order = "asc") {
        if (__classPrivateFieldGet(this, _Tree_root, "f").size() === 0)
            return;
        if (order === "asc") {
            let leaf = __classPrivateFieldGet(this, _Tree_root, "f").first();
            do {
                for (const key of leaf.keys) {
                    yield key;
                }
                leaf = leaf.next;
            } while (leaf !== undefined);
        }
    }
    *values() {
        if (__classPrivateFieldGet(this, _Tree_root, "f").size() === 0)
            return;
        let leaf = __classPrivateFieldGet(this, _Tree_root, "f").first();
        do {
            for (const child of leaf.children) {
                yield child;
            }
            leaf = leaf.next;
        } while (leaf !== undefined);
    }
    *pairs() {
        if (__classPrivateFieldGet(this, _Tree_root, "f").size() === 0)
            return;
        let leaf = __classPrivateFieldGet(this, _Tree_root, "f").first();
        do {
            for (let i = 0; i < leaf.keys.length; i++) {
                yield { [leaf.keys[i]]: leaf.children[i] };
            }
            leaf = leaf.next;
        } while (leaf !== undefined);
    }
    clear() {
        if (exports.debug)
            console.log("Tree", "clear");
        const root = new leaf_1.Leaf(__classPrivateFieldGet(this, _Tree_degree, "f"));
        root.on("split", (leaf) => this.splitTree(leaf));
        __classPrivateFieldSet(this, _Tree_root, root, "f");
    }
    splitTree(child) {
        if (exports.debug)
            console.log("Tree", "splitTree", child.keys);
        __classPrivateFieldGet(this, _Tree_root, "f").removeAllListeners();
        if (__classPrivateFieldGet(this, _Tree_root, "f") instanceof node_1.Node)
            __classPrivateFieldGet(this, _Tree_root, "f").internalize();
        const root = new node_1.Node(_1.ROOT, __classPrivateFieldGet(this, _Tree_degree, "f"));
        root.addChild(__classPrivateFieldGet(this, _Tree_root, "f"));
        root.addChild(child);
        root.on("split", (child) => this.splitTree(child));
        root.on("shrink", () => this.shrinkTree());
        __classPrivateFieldSet(this, _Tree_root, root, "f");
    }
    shrinkTree() {
        if (exports.debug)
            console.log("Tree", "shrinkTree");
        __classPrivateFieldGet(this, _Tree_root, "f").removeAllListeners();
        const root = __classPrivateFieldGet(this, _Tree_root, "f").children[0];
        if (root instanceof node_1.Node)
            root.rootize();
        root.on("split", (child) => this.splitTree(child));
        root.on("shrink", () => this.shrinkTree());
        __classPrivateFieldSet(this, _Tree_root, root, "f");
    }
    stats() {
        return __classPrivateFieldGet(this, _Tree_root, "f").stats({ nodes: 0, leaves: 0, values: 0, depth: __classPrivateFieldGet(this, _Tree_root, "f").search(0).hops });
    }
    print() {
        console.log("degree: " + __classPrivateFieldGet(this, _Tree_degree, "f"));
        if (__classPrivateFieldGet(this, _Tree_root, "f").size() === 0) {
            console.log("[empty]");
        }
        else {
            __classPrivateFieldGet(this, _Tree_root, "f").print();
        }
    }
}
exports.Tree = Tree;
_Tree_degree = new WeakMap(), _Tree_root = new WeakMap();
//# sourceMappingURL=tree.js.map