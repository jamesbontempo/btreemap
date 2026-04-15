# btreemap

![Version](https://img.shields.io/github/package-json/v/jamesbontempo/btreemap?color=blue) ![Coverage](https://img.shields.io/codecov/c/github/jamesbontempo/btreemap/main.svg?style=flat) ![License](https://img.shields.io/github/license/jamesbontempo/btreemap?color=red)

A `BTreeMap` is a sorted, in-memory data store with a Map-like API and extensions for range-based iteration. At its core is a `Map` object, used to store key/value pairs, and a [B+ Tree](https://en.wikipedia.org/wiki/B%2B_tree) for managing keys. This "best of both worlds" approach leverages the strengths of each: the efficient data access of a `Map`, and the sorting and range benefits of a B+ Tree.

There is one important way in which a `BTreeMap` differs from a `Map`. The design inspiration comes from database indexes, which can either enforce unique key constraints or allow keys to have multiple associated values. A `BTreeMap` can be configured either way. When keys are unique, a `BTreeMap` effectively functions like a `Map` with the added benefit of key sorting and range-based access. When keys are non-unique, each key can have an array of associated values. This has several implications:

* The `get` method always returns an array of values for a key (a single-element array when keys are unique).
* The `delete` method removes the entire array of values associated with a key.
* The `deleteValue` method removes a single value from a key's array of associated values, and removes the key itself if the array becomes empty.
* The `values` iterator yields a result for each individual element of a key's array of associated values.
* The `entries` iterator yields a `[key, value]` pair for each individual element of a key's array of associated values.
* The `forEach` method applies the supplied function to each individual element of a key's array of associated values.

By default, a `BTreeMap` is configured for unique keys.

`BTreeMap` enforces a single key type per instance, inferred from the first call to `set()`. Attempting to insert a key of a different type will throw a `TypeError`.

## Examples

### Unique keys
```js
const { BTreeMap } = require("btreemap");

const btm = new BTreeMap();
btm.set(1, "one");
btm.get(1); // returns ["one"]
btm.set(1, "two"); // overwrites "one" with "two"
btm.get(1); // returns ["two"]
btm.delete(1); // deletes key 1 and its value
```

### Non-unique keys

```js
const { BTreeMap } = require("btreemap");

const btm = new BTreeMap({ unique: false });
btm.set(1, "one");
btm.get(1); // returns ["one"]
btm.set(1, "two"); // adds "two" for key 1
btm.get(1); // returns ["one", "two"]
btm.deleteValue(1, "one"); // removes "one", key 1 still exists
btm.get(1); // returns ["two"]
btm.delete(1); // deletes key 1 and all its values
```

### Key type enforcement

```js
const btm = new BTreeMap();
btm.set(1, "one"); // key type inferred as "number"
btm.set("2", "two"); // throws TypeError: BTreeMap key type mismatch: expected number, got string
```

### Non-primitive keys

When using object or array keys, provide a custom `serialize` function so that key equality is based on value rather than reference. The default serializer uses `JSON.stringify` and handles `BigInt` values automatically.

```js
const btm = new BTreeMap({
	unique: false,
	serialize: (a) => JSON.stringify([...a].sort()),
	compare: (a, b) => {
		const sa = JSON.stringify([...a].sort());
		const sb = JSON.stringify([...b].sort());
		return sa < sb ? -1 : sa > sb ? 1 : 0;
	}
});
btm.set([1, 2], "first");
btm.set([2, 1], "another first"); // treated as the same key as [1, 2]
btm.get([1, 2]); // returns ["first", "another first"]
```

### BigInt keys

`BigInt` keys are supported out of the box via the default serializer:

```js
const btm = new BTreeMap({ unique: false });
btm.set(1n, "one");
btm.set(1n, "uno");
btm.get(1n); // returns ["one", "uno"]
```

## Table of contents
 - [Constructor](#constructor)
 - [Properties](#properties)
 - [Data manipulation methods](#data-manipulation-methods)
 - [Iterators](#iterators)
 - [Functional methods](#functional-methods)

## Constructor

#### Syntax

	new BTreeMap([options])

#### Parameters

`options`

An object containing configuration options for the `BTreeMap`.

Option|Type|Description|Default
------|----|-----------|-------
`unique`|boolean|Whether keys are unique|`true`
`order`|number|The order of the B+ Tree (minimum 3)|`3`
`serialize`|function|The function used to serialize keys for equality checks|See below
`compare`|function|The function used to compare keys for ordering|See below

The default serializer converts keys to strings using `JSON.stringify`, with built-in support for `BigInt` values. For non-primitive keys (objects, arrays) where equality should be based on value rather than reference, supply a custom serializer. Note that the serializer is used only for key equality checks — ordering is controlled separately by `compare`.

The default comparator compares keys using the `<` and `>` operators, which works correctly for keys of a consistent primitive type (numbers, strings, etc.). For custom ordering, supply your own comparator. It must take two values as input and return a negative number if the first should be sorted before the second, a positive number if the second should be sorted before the first, or zero if they are equal. When using non-primitive keys, take care not to mutate keys inside the comparator — operate on copies instead.

#### Examples

```js
// Custom order and comparator
const btm = new BTreeMap({
	unique: false,
	order: 5,
	compare: (a, b) => (a < b) ? -1 : ((a > b) ? 1 : 0)
});

// Array keys with custom serializer and comparator
const btm2 = new BTreeMap({
	serialize: (a) => JSON.stringify([...a].sort()),
	compare: (a, b) => {
		const sa = JSON.stringify([...a].sort());
		const sb = JSON.stringify([...b].sort());
		return sa < sb ? -1 : sa > sb ? 1 : 0;
	}
});
```

## Properties

### BTreeMap.lowest

Returns the lowest key in the `BTreeMap`, or `undefined` if the map is empty.

### BTreeMap.highest

Returns the highest key in the `BTreeMap`, or `undefined` if the map is empty.

### BTreeMap.order

Returns the order of the `BTreeMap` object's B+ Tree.

### BTreeMap.unique

Returns `true` if the `BTreeMap` is configured for unique keys; `false` otherwise.

### BTreeMap.keyType

Returns the type of keys in the `BTreeMap` as a string (e.g. `"number"`, `"string"`, `"object"`), as inferred from the first call to `set()`. Returns `undefined` if no keys have been inserted yet.

### BTreeMap.size

Returns the number of unique keys in the `BTreeMap`. When configured for non-unique keys, the number of values may be greater than the size.

### BTreeMap.stats

Returns a copy of an object with statistics for the `BTreeMap` object's B+ Tree:

Property|Description
--------|-----------
`depth`|The depth of the tree
`nodes`|The number of internal nodes in the tree
`leaves`|The number of leaf nodes in the tree
`keys`|The number of keys in the tree
`values`|The total number of values stored across all keys

## Data manipulation methods

### BTreeMap.has()

Returns a boolean indicating whether the specified key exists.

#### Syntax

	has(key)

#### Parameters

`key`

The key to test for presence in the `BTreeMap` object.

#### Return value

`true` if the specified key exists; otherwise `false`.

### BTreeMap.set()

Adds a value for the specified key. If configured for unique keys and the key already exists, overwrites the existing value. If configured for non-unique keys, appends the value to the key's array of associated values. The key's values array preserves insertion order and allows duplicates.

Infers the key type from the first call. Throws a `TypeError` if a subsequent call uses a key of a different type.

#### Syntax

	set(key, value)

#### Parameters

`key`

The key to add to the `BTreeMap` object.

`value`

The associated value to add to the `BTreeMap` object.

#### Return value

The `BTreeMap` object.

### BTreeMap.get()

Returns the array of values associated with the specified key.

#### Syntax

	get(key)

#### Parameters

`key`

The key whose associated values should be returned.

#### Return value

An array of values associated with the specified key, or `undefined` if the key doesn't exist. When configured for unique keys, the array will always contain a single element.

#### Examples

```js
const btm = new BTreeMap({ unique: false });
btm.set(1, "one");
btm.set(1, "uno");
btm.get(1); // returns ["one", "uno"]
btm.get(2); // returns undefined
```

### BTreeMap.delete()

Removes the specified key and all its associated values from the `BTreeMap`.

#### Syntax

	delete(key)

#### Parameters

`key`

The key to remove from the `BTreeMap` object.

#### Return value

`true` if the key existed and was removed; `false` if the key does not exist.

### BTreeMap.deleteValue()

Removes a single value from the array of values associated with the specified key. If removing the value causes the array to become empty, the key itself is also removed.

By default, values are compared using shallow equality: primitives use strict equality (`===`), arrays are compared element-by-element, and plain objects are compared property-by-property (one level deep). A custom `equals` function can be provided for other equality semantics.

#### Syntax

	deleteValue(key, value[, equals])

#### Parameters

`key`

The key whose associated value should be removed.

`value`

The specific value to remove from the key's array of associated values.

`equals`

An optional function `(a, b) => boolean` used to determine value equality. Defaults to a shallow equality check.

#### Return value

`true` if the value was found and removed; `false` if either the key or value does not exist.

#### Examples

```js
const btm = new BTreeMap({ unique: false });
btm.set(1, "one");
btm.set(1, "uno");
btm.deleteValue(1, "one"); // returns true; key 1 still exists with ["uno"]
btm.deleteValue(1, "uno"); // returns true; key 1 is also removed
btm.deleteValue(1, "one"); // returns false; key 1 no longer exists

// Custom equals function
btm.set(1, "Hello");
btm.set(1, "World");
btm.deleteValue(1, "hello", (a, b) => a.toLowerCase() === b.toLowerCase()); // removes "Hello"

// Array values (shallow equality by default)
const btm2 = new BTreeMap({ unique: false });
btm2.set(1, [1, 2]);
btm2.set(1, [3, 4]);
btm2.deleteValue(1, [1, 2]); // returns true; shallow equality matches [1, 2]
```

### BTreeMap.clear()

Removes all elements from the `BTreeMap` object.

#### Syntax

	clear()

#### Return value

`undefined`

## Iterators

### BTreeMap\[@@iterator\]()

Returns the same iterator object as the [entries](#btreemapentries) method.

#### Examples

```js
for (const [key, value] of btm) {
	console.log(key, value);
}
```

### BTreeMap.keys()

Returns a new iterator object that contains the keys in the `BTreeMap` in sorted order.

#### Syntax

	keys([start, end, includeStart, includeEnd])

#### Parameters

`start`

The lowest key to include. Defaults to the lowest key in the `BTreeMap`.

`end`

The highest key to include. Defaults to the highest key in the `BTreeMap`.

`includeStart`

Whether to include `start` in the results. Default is `true`.

`includeEnd`

Whether to include `end` in the results. Default is `true`.

#### Return value

A new iterator object.

#### Examples

```js
// All keys
btm.keys();

// Keys 1 through 10 (inclusive on both ends)
btm.keys(1, 10);

// Keys from the lowest up through 10
btm.keys(undefined, 10);

// Keys from 10 up through the highest
btm.keys(10, undefined);

// Keys greater than 1 and less than 10 (exclusive on both ends)
btm.keys(1, 10, false, false);

// Keys greater than 1 through 10 (exclusive start, inclusive end)
btm.keys(1, 10, false, true);

// Keys 1 up to but not including 10 (inclusive start, exclusive end)
btm.keys(1, 10, true, false);
```

### BTreeMap.values()

Returns a new iterator object that contains the values in the `BTreeMap`, sorted by key order. When configured for non-unique keys, yields one value per element across all keys' value arrays.

#### Syntax

	values([start, end, includeStart, includeEnd])

#### Parameters

See [keys](#btreemapkeys) for parameter descriptions.

#### Return value

A new iterator object.

### BTreeMap.entries()

Returns a new iterator object that contains `[key, value]` pairs in the `BTreeMap`, sorted by key order. When configured for non-unique keys, yields one `[key, value]` pair per element across all keys' value arrays — meaning more than one pair may be yielded for a given key.

#### Syntax

	entries([start, end, includeStart, includeEnd])

#### Parameters

See [keys](#btreemapkeys) for parameter descriptions.

#### Return value

A new iterator object.

## Functional methods

### BTreeMap.forEach()

Executes a provided function once per `[key, value]` pair in the `BTreeMap`, in sorted key order. When configured for non-unique keys, applies the function to each individual element of a key's array of associated values.

#### Syntax

	forEach(function [, start, end, includeStart, includeEnd])

#### Parameters

`function`

The function to execute, invoked with three arguments: the value, the key, and the `BTreeMap` object.

`start`, `end`, `includeStart`, `includeEnd`

See [keys](#btreemapkeys) for parameter descriptions.

#### Return value

`undefined`

### BTreeMap.toString()

Returns a string representing the internal structure of the `BTreeMap`'s B+ Tree. Primarily useful for debugging.

#### Syntax

	toString()

#### Return value

A string representing the `BTreeMap` object.
