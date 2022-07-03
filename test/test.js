const expect = require("chai").expect;
const { BTreeMap } = require("../dist/btreemap");
const { join } = require("path");

function typeOf(item) {
	const typeOfItem = typeof item;
	if (typeOfItem !== "object") {
		return typeOfItem;
	} else {
		if (item === null) return "null";
		return Object.prototype.toString.call(item).slice(8,-1).toLowerCase();
	}
}

function compare(a, b) {	
	const typeOfA = typeOf(a);
	const typeOfB = typeOf(b);
	if (typeOfA === typeOfB) {
		return (a < b) ? -1 : ((a > b) ? 1 : 0);
	} else {
		return (typeOfA < typeOfB) ? -1 : 1;
	}
}

function createTree(options = {}) {
	const order = options.order || 3;
	const compare = options.comparator;
	const count = options.count || 100;
	const unique = options.unique || false;
	const mode = options.mode || "asc";
	
	const tree = new BTreeMap({order: order, comparator: compare, unique: unique});
	
	const keys = [];
	const values = [];
	const entries = [];
	
	for (let i = 1; i <= count; i++) {
		let code, rand, key, value;
		
		switch(mode) {
			case "rand":
				code = (i * (Math.floor(Math.random() * count) + 1)) % 65536;
				if (code >= 0xd800 && code <= 0xdfff) {
					key = (i % 2 === 0) ? i - 1 : i + 1;
					rand = code;
				} else {
					key = (i % 2 === 0) ? String.fromCharCode(code) : (i % 7 === 0) ? i - 2 : i;
					rand = String.fromCharCode(code);
				}
				value = {id: key, key: i, code: code, rand: rand};
				break;
			case "desc":
				key = count - (i - 1);
				value = {id: key, key: key, value: key.toString()};
				break;
			case "asc":
			default:
				key = i;
				value = {id: key, key: key, value: key.toString()};
		}
		
		tree.set(key, value);
		
		keys.push(key);
		values.push(value);
		entries.push([key, value]);
	}
	
	return {tree: tree, keys: keys, values: values, entries: entries};
}

describe("oobps tests", () => {
	
	it("Creates a new tree of order 3", () => {
		const tree = new BTreeMap({order: 3});
		expect(tree.order).to.equal(3);
		expect(tree.lowest).to.equal(undefined);
		expect(tree.highest).to.equal(undefined);
		
		const stats = tree.stats;
		expect(stats.nodes).to.equal(0);
		expect(stats.keys).to.equal(0);
		expect(stats.leaves).to.equal(1);
		expect(stats.values).to.equal(0);
		expect(stats.depth).to.equal(0);
	});
	
	it("Sets a single key/value pair", () => {
		const test = createTree({order: 3, count: 1});
		
		expect(test.tree.lowest).to.equal(1);
		expect(test.tree.highest).to.equal(1);
		
		const stats = test.tree.stats;
		expect(stats.nodes).to.equal(0);
		expect(stats.keys).to.equal(1);
		expect(stats.leaves).to.equal(1);
		expect(stats.values).to.equal(1);
		expect(stats.depth).to.equal(0);
	});
	
	it("Sets enough key/value pairs to generate two splits", () => {
		const test = createTree({order: 3, count: 9});

		expect(test.tree.lowest).to.equal(1);
		expect(test.tree.highest).to.equal(9);
		
		const stats = test.tree.stats;
		expect(stats.nodes).to.equal(1);
		expect(stats.keys).to.equal(9);
		expect(stats.leaves).to.equal(3);
		expect(stats.values).to.equal(9);
		expect(stats.depth).to.equal(1);
	});
	
	it ("Clears a tree", () => {
		const test = createTree({order: 3, count: 16});
		
		test.tree.clear();
		
		expect(test.tree.lowest).to.equal(undefined);
		expect(test.tree.highest).to.equal(undefined);
		
		const stats = test.tree.stats;
		expect(stats.nodes).to.equal(0);
		expect(stats.keys).to.equal(0);
		expect(stats.leaves).to.equal(1);
		expect(stats.values).to.equal(0);
		expect(stats.depth).to.equal(0);
		
		expect(Array.from(test.tree.keys())).to.deep.equal([]);
		expect(Array.from(test.tree.values())).to.deep.equal([]);
		expect(Array.from(test.tree.entries())).to.deep.equal([]);
	});
	
	
	it("Sets a large number of random key/value pairs", function() {
		const order = 5;
		const count = 3000;
		const test = createTree({order: order, count: count, mode: "rand"});
		
		test.keys = test.keys.sort((a, b) => compare(a, b)).filter((e, i, a) => e !== a[i-1]);
		
		expect(test.tree.lowest).to.equal(test.keys[0]);
		expect(test.tree.highest).to.equal(test.keys[test.keys.length-1]);
		expect(test.tree.size).to.equal(test.keys.length);
		
		const stats = test.tree.stats;
		
		let minNodes = 1, maxNodes = 1;
		for (let i = 1; i < stats.depth; i++) {
			minNodes += (i === 1) ? 2 : (Math.ceil(order/2)-1)**(i-1);
			maxNodes += order**i;
		}

		expect(stats.nodes).to.be.within(minNodes, maxNodes);
		expect(stats.leaves).to.be.within(
			Math.ceil(stats.keys/order),
			Math.ceil(stats.keys/(Math.ceil(order/2)-1))
		);
		expect(stats.keys).to.equal(test.keys.length);
		expect(stats.values).to.equal(count);
		expect(stats.depth).to.be.within(
			Math.round(Math.log(stats.keys)/Math.log(order))-1,
			Math.round(Math.log(stats.keys)/Math.log(Math.ceil(order/2)))-1
		);
	});
	
	it ("Sets a range of different key types", () => {
		const tree = new BTreeMap({order: 3, unique: false})
		
		tree.set(undefined, 0);
		tree.set(null, 1234);
		const sym = Symbol("foo");
		tree.set(sym, "foo");
		tree.set(true, "true");
		tree.set(1, 1);
		tree.set(1234n, 5678);
		tree.set(new Date(), "date");
		tree.set("string", "string");
		tree.set([4, 5, 6], [4, 5, 6]);
		tree.set([1, 2, 3], [1, 2, 3]);
		const ws = new WeakSet();
		tree.set(ws, "WS");
		tree.set(new Set([1]), 1);
		tree.set(new WeakMap(), "WM");
		tree.set(new Map([[1, 1]]), [1, 1]);
		const obj = {id: 1};
		tree.set(obj, "object");
		tree.set(obj, "another object");
		tree.set(() => false, false);
		const func = () => true;
		tree.set(func, "a function?");
		tree.set(/^$/, "regex");
		
		expect(tree.lowest).to.deep.equal([1, 2, 3]);
		expect(tree.highest).to.equal(ws);
		expect(tree.get(null)).to.deep.equal([1234]);
		expect(tree.get(sym)).to.deep.equal(["foo"]);
		expect(tree.get(true)).to.deep.equal(["true"]);
		expect(tree.get(1234n)).to.deep.equal([5678]);
		expect(tree.get(obj)).to.deep.equal(["object", "another object"]);
	});
	
	it("Sets a duplicate key value", () => {
		const test = createTree({order: 3, count: 9});
		test.tree.set(5, "five");
		expect(test.tree.get(5)).to.deep.equal([{id: 5, key: 5, value: "5"}, "five"]);
	});
	
	it ("Creates a tree with unique keys", () => {
		const test = createTree({order: 3, count: 10, unique: true});
		test.tree.set(10, 11);
		expect(test.tree.get(10)).to.deep.equal(11);
	});
	
	it ("Checks to see if the tree has a key", () => {
		const test = createTree({order: 3, count: 10, unique: false});
		expect(test.tree.has(8)).to.equal(true);
		expect(test.tree.has("blah")).to.equal(false);
	});
	
	it("Gets values for each of a set of keys", () => {
		const test = createTree({order: 3, count: 25});

		const searchKeys = [1, 5, 10];
		
		for (let i = 0; i < searchKeys.length; i++) {
			const result = test.tree.get(searchKeys[i]);
			expect(result.length).to.equal(1);
			expect(result[0]).to.equal(test.values[searchKeys[i]-1]);
		}
	});
	
	it("Gets values for a random range of keys", () => {
		const test = createTree({order: 5, count: 50, mode: "rand"});
		
		test.keys = test.keys.sort((a, b) => compare(a, b)).filter((e, i, a) => e !== a[i-1]);
		
		const length = test.keys.length;
		const offset = Math.floor(Math.random()*(length/2));
		const start = test.keys[offset];
		const end = test.keys[Math.floor(length/2) + offset];
		test.keys = test.keys.slice(offset, Math.floor(length/2) + offset + 1);
		
		const values = Array.from(test.tree.get(start, end));
		expect(values[0].id).to.equal(start);
		expect(values[values.length-1].id).to.equal(end);
		for (const value of values) {
			expect(test.keys.indexOf(value.id)).to.be.at.least(0);
		}
	});
	
	it("Deletes values for each of a random set of keys", () => {
		const test = createTree({order: 8, count: 20, mode: "rand", debug: false});
		
		test.keys = test.keys.sort((a, b) => compare(a, b)).filter((e, i, a) => e !== a[i-1]);
		const deletes = test.keys.filter((e, i) => { if (i % 3 === 0) return e;});
		
		for (const d of deletes) {
			const result = test.tree.delete(d);
			expect(result).to.equal(true);
			test.keys.splice(test.keys.indexOf(d), 1);
		}
		
		let count = 0;
		
		for (const entry of test.entries) {
			if (test.keys.includes(entry[0])) count++;
		}
		
		const stats = test.tree.stats;
		expect(stats.keys).to.equal(test.keys.length);
		expect(stats.values).to.equal(count);
		expect(Array.from(test.tree.keys())).to.deep.equal(test.keys);
	});
	
	it("Deletes values for a random range of keys", () => {
		const test = createTree({order: 3, count: 25, mode: "rand"});
		
		test.keys = test.keys.sort((a, b) => compare(a, b)).filter((e, i, a) => e !== a[i-1]);
		
		const length = test.keys.length;
		const offset = Math.floor(Math.random()*(length/2));
		const start = test.keys[offset];
		const end = test.keys[Math.floor(length/2) + offset];
		
		test.tree.delete(start, end);
		
		test.keys.splice(offset, Math.floor(length/2) + 1);
		expect(Array.from(test.tree.keys())).to.deep.equal(test.keys);
		
	});
	
	it("Deletes enough keys to shrink the tree", () => {
		const test = createTree({order: 3, count: 5, mode: "asc"});
		expect(test.tree.stats.depth).to.equal(1);
		test.tree.delete(1, 4, false);
		expect(test.tree.stats.depth).to.equal(0);
	});
	
	it("Deletes enough keys using a delete range to completely clear the tree", () => {
		const test = createTree({order: 3, count: 5, mode: "asc"});
		test.tree.delete(1, 5);
		expect(test.tree.size).to.equal(0);
	});
	
	it("Borrows from the left end of a key array", () => {
		const test = createTree({order: 3, count: 9, mode: "asc"});
		test.tree.delete(5, 6);
		expect(test.tree.stats.leaves).to.equal(3);
	});
	
	it("Borrows from a right sibling from within the middle of a key array", () => {
		const test = createTree({order: 3, count: 9, mode: "asc"});
		test.tree.delete(1);
		test.tree.delete(5, 6);
		expect(test.tree.stats.leaves).to.equal(3);
	});
	
	it("Forces a merge from the left end of a key array", () => {
		const test = createTree({order: 3, count: 9, mode: "asc"});
		test.tree.delete(1, 2);
		test.tree.delete(5, 6);
		expect(test.tree.stats.leaves).to.equal(2);
	});
	
	it("Forces a merge from the right end of a key array", () => {
		const test = createTree({order: 3, count: 9, mode: "asc"});
		test.tree.delete(1);
		test.tree.delete(5, 6);
		test.tree.delete(9);
		expect(test.tree.stats.leaves).to.equal(2);
	});
	
	it("Tries to delete a key that doesn't exist", () => {
		const test = createTree({order: 3, count: 15, mode: "desc"});
		expect(test.tree.delete(16)).to.equal(false);
	});
	
	it ("Accesses the default iterator", () => {
		const test = createTree({order: 3, count: 20, mode: "rand"});
		let i = 0;
		const entries = Array.from(test.tree.entries());
		for (const entry of test.tree) {
			expect(entry).to.deep.equal(entries[i]);
			i++;
		}
	});
	
	it("Accesses the keys, values, and entries iterators", () => {
		const test = createTree({order: 8, count: 200, mode: "rand"});
		
		test.keys = test.keys.sort((a, b) => compare(a, b)).filter((e, i, a) => e !== a[i-1]);
		test.values = test.values.sort((a, b) => compare(a.id, b.id));
		test.entries = test.entries.sort((a, b) => compare(a[0], b[0]));
		
		expect(Array.from(test.tree.keys())).to.deep.equal(test.keys);
		expect(Array.from(test.tree.values())).to.deep.equal(test.values);
		expect(Array.from(test.tree.entries())).to.deep.equal(test.entries);		
	});
	
	it("Uses the forEach method with a range to modify values", () => {
		const test = createTree({order: 3, count: 10, mode: "asc"});
		test.tree.forEach((v, k) => test.tree.get(k)[0].value++, 3, 8);
		for (let i = 3; i <= 8; i++) {
			expect(test.tree.get(i)[0].value).to.equal(i+1);
		}
		
	})
	
	it("Provides a custom comparator", () => {
		let cmp = (a, b) => {
			return (a > b) ? -1 : ((a < b) ? 1 : 0);
		}
		
		const test = createTree({order: 3, count: 25, mode: "desc", comparator: cmp});
		
		test.keys = test.keys.sort((a, b) => cmp(a, b)).filter((e, i, a) => e !== a[i-1]);
		expect(Array.from(test.tree.keys())).to.deep.equal(test.keys);
	});
	
	it("Saves and then loads a tree", () => {
		const test = createTree({order: 10, count: 2000, mode: "rand"});
		
		test.tree.set(null, 1234);
		test.tree.set(true, "true");
		test.tree.set(1, 1);
		test.tree.set(new Date(), "date");
		test.tree.set("string", "string");
		test.tree.set([4, 5, 6], [4, 5, 6]);
		test.tree.set([1, 2, 3], [1, 2, 3]);
		const obj = {id: 1};
		test.tree.set(obj, "object");
		test.tree.set({id: 1}, "another object");
		test.tree.set(/^$/, "regex");
		
		test.tree.save(join(__dirname, "./test.btm"));
		
		const tree2 = new BTreeMap();
		tree2.load(join(__dirname, "./test.btm"));
		
		expect(tree2.order).to.equal(10);
		expect(tree2.lowest).to.deep.equal(test.tree.lowest);
		expect(tree2.highest).to.deep.equal(test.tree.highest);
		expect(tree2.size).to.equal(test.tree.size);
		
		expect(Array.from(test.tree.keys())).to.deep.equal(Array.from(tree2.keys()));
		expect(Array.from(test.tree.values())).to.deep.equal(Array.from(tree2.values()));
		expect(Array.from(test.tree.entries())).to.deep.equal(Array.from(tree2.entries()));
	});
	
	it("Prints out a tree", () => {
		const tree = new BTreeMap({order: 3, unique: false});
		tree.set(1, 1);
		tree.set(2, 2);
		tree.set(3, 3);
		tree.set(4, 4);
		tree.set(4, 5);
		expect(tree.toString()).to.equal("Root - 3\n|  Leaf\n|  |  1: 1\n|  |  2: 2 --> 3\n|  Leaf\n|  |  3: 3\n|  |  4: 4,5")
	});
});

