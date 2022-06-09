const expect = require("chai").expect;
const { Tree } = require("../dist/tree");

function createTree(order, count, mode) {
	const tree = new Tree(order);
	
	const keys = [];
	const values = [];
	const pairs = [];
	
	for (let i = 1; i <= count; i++) {
		let code, rand, key, value;
		switch(mode) {
			case "rand":
				code = i * (Math.floor(Math.random() * count) + 1);
				key = (i % 2 === 0) ? String.fromCharCode(code) : (i % 7 === 0) ? i - 2 : i;
				rand = String.fromCharCode(i * (Math.floor(Math.random() * count) + 1));
				value = {key: key, id: i, code: code, rand: rand};
				break;
			case "desc":
				key = count - (i - 1);
				value = {key: key, id: key, value: key.toString()};
				break;
			default:
				key = i;
				value = {key: key, id: key, value: key.toString()};
		}
		
		tree.insert(key, value);
		
		keys.push(key);
		values.push(value);
		pairs.push({[key]: value});
	}
	
	return {tree: tree, keys: keys, values: values, pairs: pairs};
}

function convert(key) {
	if (typeof key === "object" && key !== null) {
		return JSON.stringify(key);
	} else {
	return String(key);
	}
}

function compare(a, b) {	
	// numbers before letters
	if (typeof a !== typeof b) {
		if (typeof a === "number" && typeof b === "string") return -1;
		if (typeof a === "string" && typeof b === "number") return 1;
	}
	
	// "punctuation" before letters, marks or numbers
	if (typeof a === "string" && typeof b === "string") {
		const re = /^[\p{L}\p{M}\p{N}]/u;
		const reA = re.test(a);
		const reB = re.test(b);
		if (!reA && reB) return -1;
		if (reA && !reB) return 1;
	}
	
	// standard comparisons
	if (a < b) return -1;
	if (a > b) return 1;
	
	// must be equal
	return 0;
}

describe("oobps tests", () => {
	
	it("Creates a new tree of order 3", () => {
		const tree = new Tree(3);
		expect(tree.order).to.equal(3);
		expect(tree.lowest).to.equal(undefined);
		expect(tree.highest).to.equal(undefined);
		
		const stats = tree.stats();
		expect(stats.nodes).to.equal(0);
		expect(stats.keys).to.equal(0);
		expect(stats.leaves).to.equal(1);
		expect(stats.values).to.equal(0);
		expect(stats.depth).to.equal(1);
	});
	
	it("Adds a single key/value pair", () => {
		const test = createTree(3, 1);
		
		expect(test.tree.lowest).to.equal(1);
		expect(test.tree.highest).to.equal(1);
		
		const stats = test.tree.stats();
		expect(stats.nodes).to.equal(0);
		expect(stats.keys).to.equal(1);
		expect(stats.leaves).to.equal(1);
		expect(stats.values).to.equal(1);
		expect(stats.depth).to.equal(1);
	});
	
	it("Adds enough key/value pairs to generate several splits", () => {
		const test = createTree(3, 8);

		expect(test.tree.lowest).to.equal(1);
		expect(test.tree.highest).to.equal(8);
		
		const stats = test.tree.stats();
		expect(stats.nodes).to.equal(3);
		expect(stats.keys).to.equal(8);
		expect(stats.leaves).to.equal(4);
		expect(stats.values).to.equal(8);
		expect(stats.depth).to.equal(3);
	});
	
	it ("Clears a tree", () => {
		const test = createTree(3, 16);
		
		test.tree.clear();
		
		expect(test.tree.lowest).to.equal(undefined);
		expect(test.tree.highest).to.equal(undefined);
		
		const stats = test.tree.stats();
		expect(stats.nodes).to.equal(0);
		expect(stats.keys).to.equal(0);
		expect(stats.leaves).to.equal(1);
		expect(stats.values).to.equal(0);
		expect(stats.depth).to.equal(1);
		
		expect(Array.from(test.tree.keys())).to.deep.equal([]);
		expect(Array.from(test.tree.values())).to.deep.equal([]);
		expect(Array.from(test.tree.pairs())).to.deep.equal([]);
	});
	
	it("Adds a large number of random key/value pairs", function() {
		const order = 10;
		const count = 500;
		const test = createTree(order, count, "rand");
		
		test.keys = test.keys.sort((a, b) => compare(a, b)).filter((e, i, a) => e !== a[i-1]);
		
		expect(test.tree.lowest).to.equal(test.keys[0]);
		expect(test.tree.highest).to.equal(test.keys[test.keys.length-1]);
		
		const stats = test.tree.stats();
		expect(stats.nodes).to.be.within((2*(Math.ceil(order/2)-1))**(stats.depth-3), order**(stats.depth-1));
		expect(stats.keys).to.equal(test.keys.length);
		expect(stats.leaves).to.be.within(Math.ceil(stats.keys/order), Math.ceil(stats.keys/(Math.ceil(order/2)-1)));
		expect(stats.values).to.equal(count);
		expect(stats.depth).to.be.within(1+Math.ceil(Math.log(stats.keys)/Math.log(order)), 1+Math.ceil(Math.log(stats.keys)/Math.log(Math.ceil(order/2)-1)));
	});
	
	it("Converts non-string/non-number keys into a string", () => {
		const test = createTree(3, 10);
		
		const inserts = [
			{key: 18014398509481982n, type: "bigint"},
			{key: [11, 12, 13], type: "array"},
			{key: {id: 11, code: "11"}, type: "object"},
			{key: null, type: "null"},
			{key: true, type: "boolean"},
			{key: () => true, type: "function"}
		]
		
		for (const insert of inserts) {
			test.tree.insert(insert.key, insert.type);
		}
		
		const keys = Array.from(test.tree.keys());
		inserts.sort((a, b) => compare(convert(a.key), convert(b.key)));
		
		for (let i = 0; i < inserts.length; i++) {
			expect(keys[10+i]).to.equal(convert(inserts[i].key));
		}
	});
	
	it("Selects each of a set of keys", () => {
		const test = createTree(3, 25);

		const searchKeys = [1, 5, 10];
		
		for (let i = 0; i < searchKeys.length; i++) {
			const results = test.tree.select(searchKeys[i]);
			expect(results.length).to.equal(1);
			expect(results[0]).to.equal(test.values[searchKeys[i]-1]);
		}
	});
	
	it("Selects a random range of values", () => {
		const test = createTree(5, 200, "rand");
		
		test.keys = test.keys.sort((a, b) => compare(a, b)).filter((e, i, a) => e !== a[i-1]);
		
		const length = test.keys.length;
		const offset = Math.floor(Math.random()*(length/2));
		const start = test.keys[offset];
		const end = test.keys[Math.floor(length/2) + offset];
		
		const values = Array.from(test.tree.selectRange(start, end));
		expect(values.length).to.equal(Math.floor(length/2)+1);
		expect(values[0][0].key).to.equal(start);
		expect(values[values.length-1][0].key).to.equal(end);
	});
	
	it("Updates each of a random set of key/value pairs", () => {
		const test = createTree(4, 100, "rand");
		
		const updates = test.keys.sort((a, b) => compare(a, b)).filter((e, i) => { if (i % 7 === 0) return e;});
		
		for (const u of updates) {
			test.tree.insert(u, {id: "foo"});
			
			let results = test.tree.update(u, (v) => {v.code = "bar"; v.updated = Date.now(); return v;});
			expect(results).to.be.at.least(2);
			
			results = test.tree.select(u);
			for (const result of results) {
				expect(result.code).to.equal("bar");
			}
		}
	});
	
	it("Updates a random range of key/value pairs", () => {
		
	});
	
	it("Deletes each of a random set of key/value pairs", () => {
		const test = createTree(8, 100, "rand");
		
		test.keys = test.keys.sort((a, b) => compare(a, b)).filter((e, i, a) => e !== a[i-1]);
		const deletes = test.keys.filter((e, i) => { if (i % 10 === 0) return e;});
		
		for (const d of deletes) {
			const result = test.tree.delete(d);
			expect(result).to.be.at.least(1);
			test.keys.splice(test.keys.indexOf(d), 1);
		}
		
		expect(Array.from(test.tree.keys())).to.deep.equal(test.keys);
	});
	
	it("Deletes a random range of key/value pairs", () => {
		const test = createTree(3, 25, "rand");
		
		test.keys = test.keys.sort((a, b) => compare(a, b)).filter((e, i, a) => e !== a[i-1]);
		
		const length = test.keys.length;
		const offset = Math.floor(Math.random()*(length/2));
		const start = test.keys[offset];
		const end = test.keys[Math.floor(length/2) + offset];
		
		test.tree.deleteRange(start, end);
		
		test.keys.splice(offset, Math.floor(length/2) + 1);
		expect(Array.from(test.tree.keys())).to.deep.equal(test.keys);
		
	});
	
	it("Accesses the keys, values, and pairs iterators", () => {
		const test = createTree(8, 50, "desc");
		
		test.keys = test.keys.sort((a, b) => compare(a, b)).filter((e, i, a) => e !== a[i-1]);
		test.values = test.values.sort((a, b) => compare(a.key, b.key));
		test.pairs = test.pairs.sort((a, b) => compare(Object.values(a)[0].key, Object.values(b)[0].key));
		
		expect(Array.from(test.tree.keys())).to.deep.equal(test.keys);
		expect(Array.from(test.tree.values())).to.deep.equal(test.values);
		expect(Array.from(test.tree.pairs())).to.deep.equal(test.pairs);		
	});
	
	it("Retrieves a value by index", () => {
		const test = createTree(8, 50);
		
		expect(test.tree.at(-1)).to.equal(undefined);
		expect(test.tree.at(0)).to.deep.equal({key: 1, id: 1, value: "1"});
		expect(test.tree.at(24)).to.deep.equal({key: 25, id: 25, value: "25"});
		expect(test.tree.at(50)).to.equal(undefined);
	});
});

