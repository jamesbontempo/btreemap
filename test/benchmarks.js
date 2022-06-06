const { Tree } = require("../dist");

function createTree(degree, count, mode) {
	const tree = new Tree(degree);
	
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

const runs = 10;

for (const count of [100, 1000, 10000]) {
	let asc = 0;
	let desc = 0;
	let rand = 0;
	let order = Math.floor(Math.log2(count)+1);
	
	for (let i = 0; i < runs; i++) {
		asc += createTree(order, count).time;
		desc += createTree(order, count, "desc").time;
		rand += createTree(order, count, "rand").time;
	}
	
	console.log("Took an average of", asc/runs, "ms to create a tree of order", order, "with", count, "ordered keys (asc)");
	console.log("Took an average of", desc/runs, "ms to create a tree of order", order, "with", count, "ordered keys (desc)");
	console.log("Took an average of", rand/runs, "ms to create a tree of order", order, "with", count, "random keys");
}