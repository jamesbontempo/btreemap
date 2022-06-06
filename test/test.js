const expect = require("chai").expect;
const { Tree } = require("../dist");

function createTree(order, count, mode) {
	const tree = new Tree(order);
	
	const keys = [];
	const values = [];
	const pairs = [];
	let time = 0;
	
	for (let i = 1; i <= count; i++) {
		let code, og, rand, key, value, pair;
		switch(mode) {
			case "rand":
				code = i * (Math.floor(Math.random() * count) + 1);
				og = (i % 2 === 0) ? String.fromCharCode(code) : (i % 7 === 0) ? i - 2 : i;
				key = (/^\d+$/.test(og)) ? new Number(og).valueOf() : og;
				rand = String.fromCharCode(i * (Math.floor(Math.random() * count) + 1));
				value = {key: key, og: og, id: i, code: code, rand: rand};
				break;
			case "desc":
				key = count - (i - 1);
				value = {key: key, id: key, value: key.toString()};
				break;
			default:
				key = i;
				value = {key: key, id: key, value: key.toString()};
		}
		
		pair = {[key]: value};
		
		let result = tree.insert(pair);
		time += result.time;
		
		keys.push((/^\d+$/.test(key)) ? new Number(key).valueOf() : key);
		values.push(value);
		pairs.push(pair);
	}
	
	return {tree: tree, keys: keys, values: values, pairs: pairs, time: time};
}

function cmp(a, b) {
	if (typeof a === "number" && typeof b === "string") return -1;
	if (typeof a === "string" && typeof b === "number") return 1;
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

describe("oobps tests", () => {
	
	it("Creates a new tree of order 3", () => {
		const tree = new Tree(3);
		expect(tree.order).to.equal(3);
		expect(tree.lowest()).to.equal(undefined);
		expect(tree.highest()).to.equal(undefined);
		
		const stats = tree.stats();
		expect(stats.nodes).to.equal(0);
		expect(stats.keys).to.equal(0);
		expect(stats.leaves).to.equal(1);
		expect(stats.values).to.equal(0);
		expect(stats.depth).to.equal(1);
	});
	
	it("Adds a single key/value pair", () => {
		const test = createTree(3, 1);
		
		expect(test.tree.lowest()).to.equal(1);
		expect(test.tree.highest()).to.equal(1);
		
		const stats = test.tree.stats();
		expect(stats.nodes).to.equal(0);
		expect(stats.keys).to.equal(1);
		expect(stats.leaves).to.equal(1);
		expect(stats.values).to.equal(1);
		expect(stats.depth).to.equal(1);
	});
	
	it("Adds enough key/value pairs to generate several splits", () => {
		const test = createTree(3, 8);

		expect(test.tree.lowest()).to.equal(1);
		expect(test.tree.highest()).to.equal(8);
		
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
		
		expect(test.tree.lowest()).to.equal(undefined);
		expect(test.tree.highest()).to.equal(undefined);
		
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
	
	it("Adds a large number of random key/value pairs to the tree", function() {
		const count = 500;
		const test = createTree(5, count, "rand");
		
		test.keys = test.keys.sort((a, b) => cmp(a, b)).filter((e, i, a) => e !== a[i-1]);
		
		expect(test.tree.lowest()).to.equal(test.keys[0]);
		expect(test.tree.highest()).to.equal(test.keys[test.keys.length-1]);
		
		const stats = test.tree.stats();
		//expect(stats.nodes).to.equal(0);
		expect(stats.keys).to.equal(test.keys.length);
		//expect(stats.keys).to.be.within(2*Math.ceil(5/2)**(stats.depth-1)-1,5**(stats.depth)-1);
		expect(stats.leaves).to.be.within(Math.ceil(stats.keys/5), Math.ceil(stats.keys/Math.ceil(5/2)));
		expect(stats.values).to.equal(count);
		//expect(stats.depth).to.be.at.most(Math.ceil(Math.log(stats.leaves)/Math.log(Math.ceil(5/2))));
		
		
		
		
		const p = {};
		for (const pair of test.pairs) {
			if (!p[Object.keys(pair)[0]]) {
				p[Object.keys(pair)[0]] = [Object.values(pair)[0]]
			} else {
				p[Object.keys(pair)[0]].push(Object.values(pair)[0]);
			}
		}
		
		for (const k of Object.keys(p)) {
			expect(p[k]).to.have.deep.members(test.tree.search(k).results[0].values);
		}
	});
	
	it("Converts a number-like key into an actual number", () => {
		const test = createTree(3, 10);
		test.tree.insert({"11": {id: 11, code: "11"}});
		
		expect(Array.from(test.tree.keys()).pop()).to.equal(11);
	});
	
	it("Searches for a set of key/value pairs in a tree", () => {
		const test = createTree(3, 25);
		
		let result;
		const searchKeys = [1, 5, 10];
		
		for (let i = 0; i < searchKeys.length; i++) {
			result = test.tree.search(test.keys[i]);
			expect(result.count).to.equal(1);
			expect(result.results[0].key).to.equal(test.keys[i]);
			expect(result.results[0].values[0]).to.deep.equal(test.values[i]);
		}
	});
	
	it("Updates a random set of key/value pairs in a tree", () => {
		const test = createTree(4, 100, "rand");
		
		test.keys = test.keys.filter((e, i, a) => e !== a[i-1]);
		const updates = test.keys.filter((e, i) => { if (i % 7 === 0) return e;});
		
		for (const u of updates) {
			test.tree.insert({[u]: {id: "foo"}});
			test.tree.update(u, (v) => {v.code = "bar"; v.updated = Date.now(); return v;});
			for (const r of test.tree.search(u).results) {
				for (const v of r.values) {
					expect(v.code).to.equal("bar");
				}
			}
		}
	});
	
	it("Deletes a random set of key/value pairs from a tree", () => {
		const test = createTree(8, 100, "rand");
		
		test.keys = test.keys.sort((a, b) => cmp(a, b)).filter((e, i, a) => e !== a[i-1]);
		const deletes = test.keys.filter((e, i) => { if (i % 10 === 0) return e;});
		
		for (const d of deletes) {
			test.tree.delete(d);
			test.keys.splice(test.keys.indexOf(d), 1);
		}
		
		expect(Array.from(test.tree.keys())).to.deep.equal(test.keys);
	});
	
	it("Accesses the keys, values, and pairs iterators", () => {
		const test = createTree(8, 50, "desc");
		
		test.keys = test.keys.sort((a, b) => cmp(a, b)).filter((e, i, a) => e !== a[i-1]);
		test.values = test.values.sort((a, b) => cmp(a.key, b.key));
		test.pairs = test.pairs.sort((a, b) => cmp(Object.values(a)[0].key, Object.values(b)[0].key));
		
		expect(Array.from(test.tree.keys())).to.deep.equal(test.keys);
		expect(Array.from(test.tree.values())).to.deep.equal(test.values);
		expect(Array.from(test.tree.pairs())).to.deep.equal(test.pairs);		
	});
});

