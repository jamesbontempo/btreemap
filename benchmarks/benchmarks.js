const { hrtime } = require("node:process");
const { BTreeMap } = require("../dist/btreemap");
const { BTree } = require("sorted-btree");
const BPlusIndex = require("bplus-index");

// modules to test, each using its default comparator
const modules = {
	"btreemap": {
		create: (order) => new BTreeMap({order: order, unique: true}),
		set: "set",
		get: "get",
		delete: "delete"
	},
	"sorted-btree": {
		create: (order) => new BTree(undefined, undefined, order),
		set: "set",
		get: "get",
		delete: "delete"
	},
	"bplus-index": {
		create: (order) => new BPlusIndex({branchingFactor: order}),
		set: "inject",
		get: "get",
		delete: "eject"
	}
};

// also tried bplustree, @atsjj/btreemap

// number of key/value pairs for each test
const counts = [1000, 10000, 100000, 1000000];

// number of test runs to conduct for each module, for each count
const runs = 20;

// print output headers
console.log(format(["Module", "Method", "Key Order", "Count", "Order", "Time (ms)", "Ops/ms", "Run"]));

for (let i = 0; i < counts.length; i++) {
	const count = counts[i];
	
	// set tree order to the base 2 log of the number of key/value pairs
	const order = Math.floor(Math.log2(count));
	
	// variable for storing test run results
	let results;
	
	for (let i = 1; i <= runs; i++) {
		
		
		// run tests for keys generated in ascending order & print results
		//*
		results = runTest(order, count);
		for (const module of Object.keys(modules)) {
			console.log(format([module, "insert", "ascending keys", count, (module === "map") ? "N/A" : order, Number(results[module][0]) / 1000000, count/(Number(results[module][0]) / 1000000), i]));
			console.log(format([module, "retrieve", "ascending keys", count, (module === "map") ? "N/A" : order, Number(results[module][1]) / 1000000, (count*0.2)/(Number(results[module][1]) / 1000000), i]));
			console.log(format([module, "delete", "ascending keys", count, (module === "map") ? "N/A" : order, Number(results[module][2]) / 1000000, (count*0.01)/(Number(results[module][2]) / 1000000), i]));
			console.log(format([module, "update", "ascending keys", count, (module === "map") ? "N/A" : order, Number(results[module][3]) / 1000000, (count*0.1)/(Number(results[module][3]) / 1000000), i]));
		}
		//*/
		
		// run tests for keys generated in descending order & print results
		//*
		results = runTest(order, count, "desc");
		for (const module of Object.keys(modules)) {
			console.log(format([module, "insert", "descending keys", count, (module === "map") ? "N/A" : order, Number(results[module][0]) / 1000000, count/(Number(results[module][0]) / 1000000), i]));
			console.log(format([module, "retrieve", "descending keys", count, (module === "map") ? "N/A" : order, Number(results[module][1]) / 1000000, (count*0.2)/(Number(results[module][1]) / 1000000), i]));
			console.log(format([module, "delete", "descending keys", count, (module === "map") ? "N/A" : order, Number(results[module][2]) / 1000000, (count*0.01)/(Number(results[module][2]) / 1000000), i]));
			console.log(format([module, "update", "descending keys", count, (module === "map") ? "N/A" : order, Number(results[module][3]) / 1000000, (count*0.1)/(Number(results[module][3]) / 1000000), i]));
		}
		//*/
		
		// run tests for keys generated in random order & print results
		//*
		results = runTest(order, count, "rand");
		for (const module of Object.keys(modules)) {
			console.log(format([module, "insert", "random keys", count, (module === "map") ? "N/A" : order, Number(results[module][0]) / 1000000, count/(Number(results[module][0]) / 1000000), i]));
			console.log(format([module, "retrieve", "random keys", count, (module === "map") ? "N/A" : order, Number(results[module][1]) / 1000000, (count*0.2)/(Number(results[module][1]) / 1000000), i]));
			console.log(format([module, "delete", "random keys", count, (module === "map") ? "N/A" : order, Number(results[module][2]) / 1000000, (count*0.01)/(Number(results[module][2]) / 1000000), i]));
			console.log(format([module, "update", "random keys", count, (module === "map") ? "N/A" : order, Number(results[module][3]) / 1000000, (count*0.1)/(Number(results[module][3]) / 1000000), i]));
		}
		//*/
	}	
}

function runTest(order, count, mode) {
	const results = {};
	const trees = {};
	
	for (const name of Object.keys(modules)) {
		results[name] = [0n, 0n, 0n, 0n];
		// sorted-btree nodes have [order] number of keys as opposed to the standard b+ tree which has [order-1]
		// so to make the comparisons more equal (i.e., to have the same # of keys in each node)
		// btreemap & bplus-index have an order one greater than sorted-btree
		if (name === "sorted-btree") {
			trees[name] = modules[name]["create"](order);
		} else {
			trees[name] = modules[name]["create"](order+1);
		}		
	}
	
	const keys = [];
	
	for (let i = 1; i <= count; i++) {
		if (mode === "asc") {
			keys.push(i);
		} else if (mode === "desc") {
			keys.push(count - (i - 1));
		} else {
			if (i % 2 === 0) {
				keys.push(i * (Math.floor(Math.random() * (count*2)) + 1));
			} else {
				keys.push(String.fromCharCode(Math.floor(Math.random()*5000)+200))
			}
		}
	}
	
	for (let i = 1; i <= count; i++) {
		const key = keys[i];
		for (const name of Object.keys(modules)) {
			const module = modules[name];
			const tree = trees[name];
			const start = hrtime.bigint();
			tree[module["set"]](key, key);
			results[name][0] += hrtime.bigint()-start;
		}
	}
	
	for (let i = 0; i < count*0.2; i++) {
		const index = Math.floor(Math.random() * count);
		const key = keys[index];
		for (const name of Object.keys(modules)) {
			const module = modules[name];
			const tree = trees[name];
			const start = hrtime.bigint();
			tree[module["get"]](key);
			results[name][1] += hrtime.bigint()-start;
		}
	}
	
	for (let i = 0; i < count*0.1; i++) {
		const index = Math.floor(Math.random() * count);
		const key = keys[index];
		for (const name of Object.keys(modules)) {
			const module = modules[name];
			const tree = trees[name];
			const start = hrtime.bigint();
			tree[module["set"]](key, key);
			results[name][3] += hrtime.bigint()-start;
		}
	}
	
	for (let i = 0; i < count*0.01; i++) {
		const index = Math.floor(Math.random() * count);
		const key = keys[index];
		for (const name of Object.keys(modules)) {
			const module = modules[name];
			const tree = trees[name];
			const start = hrtime.bigint();
			tree[module["delete"]](key);
			results[name][2] += hrtime.bigint()-start;
		}
	}
	
	return results;
}

function format(array) {
	return array.join("\t");
}