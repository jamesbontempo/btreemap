const { hrtime } = require("node:process");
const { Tree } = require("../dist/tree");

function createTree(degree, count, mode) {
	const tree = new Tree(degree);
	
	for (let i = 1; i <= count; i++) {
		let key, value;
		switch(mode) {
			case "rand":
				value = key = i * (Math.floor(Math.random() * count) + 1);
				break;
			case "desc":
				value = key = count - (i - 1);
				break;
			default:
				value = key = i;
		}
		
		tree.insert(key, value);
	}
	
	return 0;
}

const runs = 10;
const counts = [1000, 10000, 100000];

console.log("  benchmarks")
console.log(["    Input", "Count", "Order", "Average (ms)", "Runs"].join("\t"));

for (let i = 0; i < counts.length; i++) {
	const count = counts[i];
	
	let asc = 0;
	let desc = 0;
	let rand = 0;
	
	const order = Math.floor(Math.log2(count)+1);
	let start;
	
	for (let i = 0; i < runs; i++) {
		start = hrtime.bigint();
		createTree(order, count);
		asc += Number(hrtime.bigint() - start) / 1000000;
		
		start = hrtime.bigint();
		createTree(order, count, "desc");
		desc += Number(hrtime.bigint() - start) / 1000000;
		
		start = hrtime.bigint();
		createTree(order, count, "rand");
		rand += Number(hrtime.bigint() - start) / 1000000;
	}
		
	console.log(["    Sorted keys (asc)", count, order, Math.round((asc/runs)*100)/100, runs].join("\t"));
	console.log(["    Sorted keys (desc)", count, order, Math.round((desc/runs)*100)/100, runs].join("\t"));
	console.log(["    Random keys", count, order, Math.round((rand/runs)*100)/100, runs].join("\t"));
}