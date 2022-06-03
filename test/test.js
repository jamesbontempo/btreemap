const { Tree } = require("../dist/index");

const debug = true;
const degree = 3;
let count = 20;

const t = new Tree(degree);
t.debug = debug;

let time;
let id, id2;
let result;

time = rand(count);
//if (debug) t.print()
console.log("Took", time, "ms to create a tree of degree", degree, "with", count, "value(s)");

console.log(t.stats());

id = Math.floor(Math.random()*count);
id2 = Math.floor(Math.random()*count)+1;

result = t.search(id, id2);
console.log("Took " + result.time + "ms to find", result.results.reduce((p, c) => p + c.count, 0), "value(s) for two random keys (", id, id2, ")");
console.log(result);

id = Math.floor(Math.random()*count);
id2 = Math.floor(Math.random()*count)+1;

result = t.update(id, id2, () => "blah");
console.log("Took", result.time, "ms to update", result.results.reduce((p, c) => p + c.count, 0), "value(s) for two random keys (", id, id2, ")");
console.log(result.results);

t.clear();
t.print();

/*
count = 35;
desc(count);

const deletes = del(count);

//*
console.log(deletes);
console.log(Array.from(t.keys()));
console.log(deletes.concat(Array.from(t.keys())).sort((a,b)=>a-b));

const v = t.values();
let value = v.next();
while (!value.done) {
	console.log(value.value);
	value = v.next();
}

const p = t.pairs();
let pair = p.next();
while (!pair.done) {
	console.log(pair.value);
	pair = p.next();
}

t.print();
//*/

function del(count) {
	//const deletes = [13, 11, 7, 4, 6, 9, 15, 14, 23, 20, 21, 25, 19, 22, 3, 17, 12, 24, 18, 5, 2, 16];
	//const deletes = [4, 5, 10, 13, 11, 15, 7, 8, 14, 12, 1, 6, 9, 2, 3];
	
	//*
	const deletes = [];
	
	for (let i = 0; i < count; i++) {
		deletes.push(Math.floor(Math.random()*count));
	}
	//*/
	
	for (const d of deletes) {
		if (debug) console.log("Deleting " + d)
		const result = t.delete(d);
		if (debug) {
			console.log(result);
			t.print();
			console.log();
		}
	}
	return (deletes.sort((a,b)=>a-b).filter((e, i, a) => e !== a[i-1]));
	//t.print();
}

/*

	[
		1413, 2452, 6663, 6859, 12707,
		18248, 21572, 26789, 30803, 32432,
		35306, 35461, 38790, 44989, 47002,
		33885, 37350, 47999, 54866, 55670,
		57852, 55991, 60547, 60815, 63420
	]

	[
		"օ", "ঔ", "ᨇ", "᫋", "ㆣ",
		"䝈", "呄", "梥". "硓", "纰",
		"觪", "誅", "鞆", "꾽", "랚",
		"葝", "釦". "뭿", "홒", "\ud976".
		"". "\udab7", "", "", ""
	]
*/

function asc(count) {
	let time = 0;
	for (let i = 1; i <= count; i++) {
		time += t.insert({[i]: {id: i}}).time;
		if (debug) t.print();
	}
	return time;
}

function desc(count) {
	let time = 0;
	for (let i = count; i > 0; i--) {
		time += t.insert({[i]: {id: i}}).time;
		if (debug) t.print();
	}
	return time;
}

function rand(count) {
	let time = 0;
	const randoms = [];
	for (let i = count; i > 0; i--) {
		const random = Math.floor(Math.random()*count/2);
		time += t.insert({[random]: i}).time;
		randoms.push(random);
		if (debug) t.print();
	}
	if (debug) console.log(randoms);
	return time;
}

function chars(count) {
	let array = [];
	let time = 0;
	for (let i = 1; i <= count; i++) {
		const charCode = Math.floor(Math.random()*9999);
		array.push(charCode);
		const char = String.fromCharCode(charCode);
		time += t.insert({[charCode]: {id: i, code: charCode, char: char}}).time;
		if (debug) t.print();
	}
	return time;
}

function values() {
	/*/
	const values = [
		12345,
		"abcde",
		"A fragment...",
		new Date(Date.now()).toISOString(),
		"abc",
		String.fromCharCode(12345)
	];
	//*/
	
	//*/
	const values = [
		431, 5057, 4048, 4826, 7238,
		7090, 2384, 8122, 2073, 6221,
		5732, 3169, 4207, 9613, 2757,
		1451, 9724, 9629, 4219, 2450,
		6642, 6587, 9594,  247, 6778
	];
	//*/
	
	//const values = [1, 2, 3, 5, 7, 9, 11, 13, 15, 13];
	
	//const values = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
	
	let time = 0;
	for (const value of values) {
		time += t.insert({[value]: String.fromCharCode(value)}).time;
		if (debug) t.print();
	}
	return time;
}