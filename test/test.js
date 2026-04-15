const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { BTreeMap } = require("../dist/btreemap");

const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function createTest(options = {}) {
	const order = options.order || 3;
	const compare = options.compare;
	const count = options.count || 100;
	const unique = options.unique ?? true;
	const mode = options.mode || "asc";
	
	const tree = new BTreeMap({ order, compare, unique });

	const keys = [];
	const values = [];
	const entries = [];

    let key, value;

    for (let i = 1; i <= count; i++) {
        switch(mode) {
            case "rand":
                const rand = Math.random();
                key = Math.floor(rand * count);
                value = rand;
                break;
            case "desc":
                key = count - (i - 1);
                value = String(key);
                break;
            case "asc":
            default:
                key = i;
                value = String(key);
                break;
        }

        tree.set(key, value);

    	keys.push(key);
		values.push(value);
		entries.push([key, value]);
    }

	return { tree, keys, values, entries };
}

function assertStats(btree, stats) {
    for (const stat of Object.keys(stats)) {
        assert.equal(btree.stats[stat], stats[stat]);
    }
}

describe("BTreeMap", () => {
    it("creates a new tree of order 4", () => {
        const btree = new BTreeMap({ order: 4 });
        assert.equal(btree.order, 4);
        assert.equal(btree.unique, true);
        assertStats(btree, { nodes: 0, keys: 0, leaves: 1, values: 0, depth: 0 });
    });

    it("sets a single key/value pair", () => {
        const btree = new BTreeMap();
        btree.set(1, 1);
        assert.equal(btree.keyType, "number");
        assert.deepStrictEqual(btree.get(1), [1]);
        assert.equal(btree.lowest, 1);
        assert.equal(btree.highest, 1);
        assertStats(btree, { nodes: 0, keys: 1, leaves: 1, values: 1, depth: 0 });

    });

    it("sets enough key/value pairs to generate two leaf splits", () => {
        const test = createTest({ count: 9 });
        assert.deepStrictEqual(test.tree.lowest, 1);
        assert.deepStrictEqual(test.tree.highest, 9);
        assertStats(test.tree, { nodes: 1, keys: 9, leaves: 3, values: 9, depth: 1 });
    });

    it("sets enough key/value pairs, then deletes one, to generate a node merge", () => {
        const test = createTest({ count: 10 });
        test.tree.delete(10);
        assert.equal(test.tree.stats.nodes, 1);
    });

    it("clears a tree", () => {
        const test = createTest({ count: 10 });
        assertStats(test.tree, { keys: 10, values: 10 });
        test.tree.clear();
        assert.equal(test.tree.lowest, undefined);
        assert.equal(test.tree.highest, undefined);
        assertStats(test.tree, { nodes: 0, keys: 0, leaves: 1, values: 0, depth: 0 });
        assert.deepStrictEqual(Array.from(test.tree.keys()), []);
        assert.deepStrictEqual(Array.from(test.tree.values()), []);
        assert.deepStrictEqual(Array.from(test.tree.entries()), []);
    });

    it("tests lowest/highest emptry tree edge cases", () => {
        const tree = new BTreeMap();
        assert.equal(tree.lowest, undefined);
        assert.equal(tree.highest, undefined);
    });

    it("sets a large number of random key/value pairs", () => {
        const order = 5;
        const count = 3000;
        const test = createTest({ order, count, mode: "rand", unique: false });
        test.keys = test.keys.sort((a, b) => compare(a, b)).filter((e, i, a) => e !== a[i-1]);
        assert.equal(test.tree.lowest, test.keys[0]);
        assert.equal(test.tree.highest, test.keys[test.keys.length - 1]);
        assert.equal(test.tree.size, test.keys.length);
        const stats = test.tree.stats;
		let minNodes = 1, maxNodes = 1;
		for (let i = 1; i < stats.depth; i++) {
			minNodes += (i === 1) ? 2 : (Math.ceil(order/2)-1)**(i-1);
			maxNodes += order**i;
		}
        assert.ok(stats.nodes >= minNodes && stats.nodes <= maxNodes);
        assert.ok(stats.leaves >= Math.ceil(stats.keys/order) && stats.leaves <= Math.ceil(stats.keys/(Math.ceil(order/2)-1)));
        assert.equal(stats.keys, test.keys.length);
        assert.equal(stats.values, count);
        assert.ok(stats.depth >= Math.round(Math.log(stats.keys)/Math.log(order))-1 && stats.depth <= Math.round(Math.log(stats.keys)/Math.log(Math.ceil(order/2)))-1);
    });

    it("sets a duplicate key value", () => {
        const test = createTest({ count: 9, unique: false });
        test.tree.set(5, "five");
        assert.deepStrictEqual(test.tree.get(5), ["5", "five"]);
    });

    it("creates a tree with unique keys", () => {
        const test = createTest({ count: 10 });
        test.tree.set(10, 11);
        assert.deepStrictEqual(test.tree.get(10), [11]);
    });

    it("checks to see if a tree has a key", () => {
        const test = createTest({ count: 10 });
        assert.ok(test.tree.has(8));
        assert.equal(test.tree.has("blah"), false);
    });

    it("gets values for a random range of keys", () => {
        const test = createTest({ order: 5, count: 50 });
        test.keys = test.keys.sort((a, b) => compare(a, b)).filter((e, i, a) => e !== a[i-1]);
        const length = test.keys.length;
		const offset = Math.floor(Math.random()*(length/2));
		const start = test.keys[offset];
		const end = test.keys[Math.floor(length/2) + offset];
		test.keys = test.keys.slice(offset, Math.floor(length/2) + offset + 1);
        const values = Array.from(test.tree.entries(start, end)).map((entry) => entry[1]);
        assert.equal(values[0], String(start));
        assert.equal(values[values.length - 1], String(end));
        values.forEach((value) => assert.equal(value, String(value)));
    });

    it("deletes a key", () => {
        const test = createTest({ count: 10 });
        assert.ok(test.tree.has(5));
        test.tree.delete(5);
        assert.equal(test.tree.has(5), false);
    });

    it("deletes a single value from a key", () => {
        const test = createTest({ count: 10, unique: false });
        test.tree.set(5, "five");
        test.tree.set(5, "cinco");
        test.tree.deleteValue(5, "five");
        assert.deepStrictEqual(test.tree.get(5), ["5", "cinco"]);
    });

    it("deletes all values from a key, and the key itself", () => {
        const test = createTest({ count: 10, unique: false });
        test.tree.set(5, "five");
        test.tree.set(5, "cinco");
        test.tree.deleteValue(5, "five");
        test.tree.deleteValue(5, "5");
        test.tree.deleteValue(5, "cinco")
        assert.equal(test.tree.has(5), false);
    });

    it("deletes enough keys to shrink the tree", () => {
        const test = createTest({ count: 5 });
        assert.equal(test.tree.stats.depth, 1);
        for (let i = 1; i <= 4; i++) {
            test.tree.delete(i);
        }
        assert.equal(test.tree.stats.depth, 0);
    });

    it("deletes enough keys to clear the tree", () => {
        const test = createTest({ count: 5 });
        assert.equal(test.tree.size, 5);
        for (let i = 1; i <= 5; i++) {
            test.tree.delete(i);
        }
        assert.equal(test.tree.size, 0);
    });

    it("tries to delete a key that doesn't exist", () => {
        const test = createTest({ count: 5 });
        assert.equal(test.tree.delete(6), false);
    });

    it("tries to delete a key value that doesn't exist", () => {
        const test = createTest({ count: 5 });
        assert.equal(test.tree.deleteValue(5, "cinco"), false);
    });

    it("tries to add different key type", () => {
        const tree = new BTreeMap();
        tree.set(1, "1");
        assert.throws(() => tree.set("2", "two"));
    });

	it("borrows from the left end of a key array", () => {
		const test = createTest({ count: 9 });
		test.tree.delete(5);
        test.tree.delete(6);
		assert.equal(test.tree.stats.leaves, 3);
	});
	
	it("borrows from a right sibling from within the middle of a key array", () => {
		const test = createTest({ count: 9 });
		test.tree.delete(1);
		test.tree.delete(5);
        test.tree.delete(6);
		assert.equal(test.tree.stats.leaves, 3);
	});
	
	it("forces a merge from the left end of a key array", () => {
		const test = createTest({ count: 9 });
		test.tree.delete(1)
        test.tree.delete(2);
		test.tree.delete(5)
        test.tree.delete(6);
		assert.equal(test.tree.stats.leaves, 2);
	});
	
	it("forces a merge from the right end of a key array", () => {
		const test = createTest({ count: 9 });
		test.tree.delete(1);
		test.tree.delete(5)
        test.tree.delete(6);
		test.tree.delete(9);
		assert.equal(test.tree.stats.leaves, 2);
	});

    it("accesses the default iterator", () => {
		const test = createTest({ count: 20 });
		let i = 0;
		const entries = Array.from(test.tree.entries());
		for (const entry of test.tree) {
			assert.deepStrictEqual(entry, entries[i]);
			i++;
		}
    });

	it("accesses the keys, values, and entries iterators", () => {
		const test = createTest({ order: 8, count: 200 });
		test.keys = test.keys.filter((e, i, a) => e !== a[i-1]);
		test.values = test.values.sort((a, b) => Number(a) < Number(b) ? -1 : Number(a) > Number(b) ? 1 : 0);
		test.entries = test.entries.sort((a, b) => compare(a[0], b[0]));
		assert.deepStrictEqual(Array.from(test.tree.keys()), test.keys);
		assert.deepStrictEqual(Array.from(test.tree.values()), test.values);
		assert.deepStrictEqual(Array.from(test.tree.entries()), test.entries);		
	});

    it("accesses the keys, values, and entries iterators (exclusive)", () => {
		const test = createTest({ order: 8, count: 200 });
        const lowest = test.tree.lowest;
        const highest = test.tree.highest;

		const keysA = test.keys.filter((e, i, a) => e !== a[i-1]).slice(0, -1);
		const valuesA = test.values.sort((a, b) => Number(a) < Number(b) ? -1 : Number(a) > Number(b) ? 1 : 0).slice(0, -1);
		const entriesA = test.entries.sort((a, b) => compare(a[0], b[0])).slice(0, -1);
		assert.deepStrictEqual(Array.from(test.tree.keys(lowest, highest, true, false)), keysA);
		assert.deepStrictEqual(Array.from(test.tree.values(lowest, highest, true, false)), valuesA);
		assert.deepStrictEqual(Array.from(test.tree.entries(lowest, highest, true, false)), entriesA);

		const keysB = test.keys.filter((e, i, a) => e !== a[i-1]).slice(1);
		const valuesB = test.values.sort((a, b) => Number(a) < Number(b) ? -1 : Number(a) > Number(b) ? 1 : 0).slice(1);
		const entriesB = test.entries.sort((a, b) => compare(a[0], b[0])).slice(1);
		assert.deepStrictEqual(Array.from(test.tree.keys(lowest, highest, false, true)), keysB);
		assert.deepStrictEqual(Array.from(test.tree.values(lowest, highest, false, true)), valuesB);
		assert.deepStrictEqual(Array.from(test.tree.entries(lowest, highest, false, true)), entriesB);

		const keysC = test.keys.filter((e, i, a) => e !== a[i-1]).slice(1, -1);
		const valuesC = test.values.sort((a, b) => Number(a) < Number(b) ? -1 : Number(a) > Number(b) ? 1 : 0).slice(1, -1);
		const entriesC = test.entries.sort((a, b) => compare(a[0], b[0])).slice(1, -1);
		assert.deepStrictEqual(Array.from(test.tree.keys(lowest, highest, false, false)), keysC);
		assert.deepStrictEqual(Array.from(test.tree.values(lowest, highest, false, false)), valuesC);
		assert.deepStrictEqual(Array.from(test.tree.entries(lowest, highest, false, false)), entriesC);
    });

	it("uses the forEach method to modify values", () => {
		const test = createTest({ count: 10, unique: true });
		test.tree.forEach((v, k) => test.tree.set(k, String(Number(v) + 1)));
		for (let i = 1; i <= 10; i++) {
			assert.deepStrictEqual(test.tree.get(i), [String(i+1)]);
		}
	});

	it("provides a custom comparator", () => {
		const cmp = (a, b) =>(a > b) ? -1 : ((a < b) ? 1 : 0);
		const test = createTest({ count: 25, mode: "desc", compare: cmp });
		test.keys = test.keys.sort((a, b) => cmp(a, b)).filter((e, i, a) => e !== a[i-1]);
		assert.deepStrictEqual(Array.from(test.tree.keys()), test.keys);
    });

    it("provides an array-based custom comparator", () => {
        const btree = new BTreeMap({
            unique: false,
            compare: (a, b) => {
                a = JSON.stringify([...a].sort());
                b = JSON.stringify([...b].sort());
                return a < b ? -1 : a > b ? 1 : 0;
            }
        });
        btree.set([1, 2], "first");
        btree.set([3, 1], "second");
        btree.set([1, 4], "third");
        assert.deepStrictEqual(Array.from(btree.keys()), [[1, 2], [3, 1], [1, 4]]);
    });

	it("provides a custom serializer", () => {
        const btree = new BTreeMap({
            unique: false,
            serialize: (a) => JSON.stringify([...a].sort())
        });
        btree.set([1, 2], "first");
        btree.set([2, 1], "another first");
        assert.equal(btree.has([2, 1]), true);
        assert.equal(btree.size, 1);
        assert.deepStrictEqual(btree.get([1, 2]), ["first", "another first"]);
	});

    it("deletes a value using a custom equals function", () => {
        const btree = new BTreeMap({ unique: false });
        btree.set(1, "Hello");
        btree.set(1, "World");
        btree.set(1, "Foo");
        btree.deleteValue(1, "hello", (a, b) => a.toLowerCase() === b.toLowerCase());
        assert.deepStrictEqual(btree.get(1), ["World", "Foo"]);
    });

    it("sets array values and deletes one", () => {
        const btree = new BTreeMap({ unique: false });
        btree.set(1, [1, 2]);
        btree.set(1, [2, 3]);
        btree.set(1, [3, 4]);
        btree.deleteValue(1, [2, 3]);
        assertStats(btree, { keys: 1, values: 2 });
    });

    it("sets object values and deletes one", () => {
        const btree = new BTreeMap({ unique: false });
        btree.set(1, { id: 1, letter: "a" });
        btree.set(1, { id: 2, letter: "b" });
        btree.set(1, { id: 1, letter: "c" });
        btree.set(1, { id: 3 });
        btree.deleteValue(1, { id: 1, letter: "a" });
        assertStats(btree, { keys: 1, values: 3 });
    });

    it("sets a bigint key", () => {
        const btree = new BTreeMap({ unique: false });
        btree.set(1n, "bigint");
        btree.set(1n, "another bigint");
        btree.set(2n, "one last bigint");
        assert.deepStrictEqual(Array.from(btree.keys()), [1n, 2n]);
        assert.deepStrictEqual(btree.get(1n), ["bigint", "another bigint"]);
    });

    it("bla", () => {
        const test = createTest({ unique: false, count: 30, mode: "rand" });
        console.log(test.tree.toString());
    })

    it("prints out a tree", () => {
        const btree = new BTreeMap({ unique: false });
        btree.set(1, 1);
        btree.set(2, 2);
        btree.set(3, 3);
        btree.set(4, 4);
        btree.set(4, 5);
        assert.equal(btree.toString(), "Root - [3]\n|  Leaf\n|  |  1: [1]\n|  |  2: [2] --> 3\n|  Leaf\n|  |  3: [3]\n|  |  4: [4,5]")
    });
});