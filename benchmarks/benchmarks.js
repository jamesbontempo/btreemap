const { hrtime } = require("node:process");
const { Tree } = require("../dist/toe-b");
const { BTree } = require("./btree");
const BPlusIndex = require("bplus-index");

// modules to test
const modules = {
	"toe-b": {
		create: (order) => new Tree(order),
		set: "insert",
		get: "select",
		delete: "delete"
	},
	"map": {
		create: () => new Map(),
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
const runs = 10;

// print output headers
console.log(format(["Module", "Method", "Key Order", "Count", "Order", "Time (ms)", "Run"]));

for (let i = 0; i < counts.length; i++) {
	const count = counts[i];
	
	// set tree order to the base 2 log of the number of key/value pairs
	const order = Math.floor(Math.log2(count));
	
	// variable for storing test run results
	let results;
	
	for (let i = 1; i <= runs; i++) {
		
		// run tests for keys generated in ascending order & print results
		results = runTest(order, count);
		for (const module of Object.keys(modules)) {
			console.log(format([module, "insert", "ascending keys", count, (module === "map") ? "N/A" : order, Number(results[module][0]) / 1000000, i]));
			console.log(format([module, "search", "ascending keys", count, (module === "map") ? "N/A" : order, Number(results[module][1]) / 1000000, i]));
			console.log(format([module, "delete", "ascending keys", count, (module === "map") ? "N/A" : order, Number(results[module][2]) / 1000000, i]));
		}
		
		// run tests for keys generated in descending order & print results
		results = runTest(order, count, "desc");
		for (const module of Object.keys(modules)) {
			console.log(format([module, "insert", "descending keys", count, (module === "map") ? "N/A" : order, Number(results[module][0]) / 1000000, i]));
			console.log(format([module, "search", "descending keys", count, (module === "map") ? "N/A" : order, Number(results[module][1]) / 1000000, i]));
			console.log(format([module, "delete", "descending keys", count, (module === "map") ? "N/A" : order, Number(results[module][2]) / 1000000, i]));
		}
		
		// run tests for keys generated in random order & print results
		results = runTest(order, count, "rand");
		for (const module of Object.keys(modules)) {
			console.log(format([module, "insert", "random keys", count, (module === "map") ? "N/A" : order, Number(results[module][0]) / 1000000, i]));
			console.log(format([module, "search", "random keys", count, (module === "map") ? "N/A" : order, Number(results[module][1]) / 1000000, i]));
			console.log(format([module, "delete", "random keys", count, (module === "map") ? "N/A" : order, Number(results[module][2]) / 1000000, i]));
		}
	}	
}

function runTest(order, count, mode) {
	const results = {};
	
	const keys = [];
	
	for (let i = 1; i <= count; i++) {
		switch(mode) {
			case "rand":
				keys.push(i * (Math.floor(Math.random() * count) + 1));
				break;
			case "desc":
				keys.push(count - (i - 1));
				break;
			default:
				keys.push(i);
		}
	}
	
	for (const name of Object.keys(modules)) {
		results[name] = [0n, 0n, 0n];
		
		const module = modules[name];		
		const tree = module["create"](order);
		
		// insert key value pairs
		for (let i = 1; i <= count; i++) {
			const start = hrtime.bigint();
			if (name === "toe-b") {
				tree[module["set"]]({key: keys[i], value: keys[i]});
			} else {
				tree[module["set"]](keys[i], keys[i]);
			}
			results[name][0] += hrtime.bigint()-start;
		}
	
		// search for 5% of keys
		for (let i = 0; i < count/20; i++) {
			let index = Math.floor(Math.random() * count);
			
			const start = hrtime.bigint();
			tree[module["get"]](keys[index]);
			results[name][1] += hrtime.bigint()-start;
		}
		
		// delete 1% of keys
		for (let i = 0; i < count/100; i++) {
			let index = Math.floor(Math.random() * count);
			
			const start = hrtime.bigint();
			tree[module["delete"]](keys[index]);
			results[name][2] += hrtime.bigint()-start;
		}
	}
	
	return results;
}

function format(array) {
	return array.join("\t");
}