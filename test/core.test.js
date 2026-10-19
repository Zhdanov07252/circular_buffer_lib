import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CircularBuffer } from '../src/index.js';

test('constructing with non-positive capacity throws RangeError', () => {
  assert.throws(() => new CircularBuffer(0), RangeError);
  assert.throws(() => new CircularBuffer(-1), RangeError);
});

test('constructing with non-integer capacity throws RangeError', () => {
  assert.throws(() => new CircularBuffer(3.5), RangeError);
  assert.throws(() => new CircularBuffer('3'), RangeError);
});

test('a fresh buffer is empty and has the requested capacity', () => {
  const b = new CircularBuffer(3);
  assert.equal(b.capacity, 3);
  assert.equal(b.size, 0);
  assert.equal(b.isEmpty(), true);
  assert.equal(b.isFull(), false);
});

test('push fills without eviction and size tracks correctly', () => {
  const b = new CircularBuffer(3);
  assert.equal(b.push('a'), undefined);
  assert.equal(b.push('b'), undefined);
  assert.equal(b.push('c'), undefined);
  assert.equal(b.size, 3);
  assert.equal(b.isFull(), true);
  assert.equal(b.isEmpty(), false);
});

test('push at capacity returns the evicted oldest item', () => {
  const b = new CircularBuffer(3);
  b.push('a'); b.push('b'); b.push('c');
  assert.equal(b.push('d'), 'a');
  assert.equal(b.push('e'), 'b');
  assert.equal(b.size, 3);
});

test('toArray returns live items in insertion order after wraps', () => {
  const b = new CircularBuffer(3);
  b.push('a'); b.push('b'); b.push('c');
  b.push('d'); b.push('e'); // evicts a, b
  assert.deepEqual(b.toArray(), ['c', 'd', 'e']);
});

test('toArray on a partially filled buffer reflects only live items', () => {
  const b = new CircularBuffer(5);
  b.push('x'); b.push('y');
  assert.deepEqual(b.toArray(), ['x', 'y']);
});

test('first and last peek without removal', () => {
  const b = new CircularBuffer(3);
  b.push('a'); b.push('b'); b.push('c');
  assert.equal(b.first(), 'a');
  assert.equal(b.last(), 'c');
  assert.equal(b.size, 3);
});

test('first and last return undefined on an empty buffer', () => {
  const b = new CircularBuffer(3);
  assert.equal(b.first(), undefined);
  assert.equal(b.last(), undefined);
});

test('shift removes oldest first and returns undefined when empty', () => {
  const b = new CircularBuffer(3);
  b.push('a'); b.push('b'); b.push('c');
  assert.equal(b.shift(), 'a');
  assert.equal(b.shift(), 'b');
  assert.equal(b.shift(), 'c');
  assert.equal(b.shift(), undefined);
  assert.equal(b.size, 0);
  assert.equal(b.isEmpty(), true);
});

test('interleaved push and shift stay ordered across many wraps', () => {
  const b = new CircularBuffer(3);
  b.push(1); b.push(2); b.push(3);
  assert.equal(b.shift(), 1);
  b.push(4);
  assert.deepEqual(b.toArray(), [2, 3, 4]);
  assert.equal(b.shift(), 2);
  assert.equal(b.shift(), 3);
  b.push(5); b.push(6);
  assert.deepEqual(b.toArray(), [4, 5, 6]);
});

test('clear empties the buffer but preserves capacity for reuse', () => {
  const b = new CircularBuffer(3);
  b.push('a'); b.push('b');
  b.clear();
  assert.equal(b.size, 0);
  assert.equal(b.isEmpty(), true);
  assert.equal(b.isFull(), false);
  assert.equal(b.capacity, 3);
  // Buffer must remain usable after clear.
  b.push('z');
  assert.equal(b.size, 1);
  assert.deepEqual(b.toArray(), ['z']);
});

test('storing undefined values is supported (return semantics)', () => {
  const b = new CircularBuffer(2);
  assert.equal(b.push(undefined), undefined);
  assert.equal(b.size, 1);
  assert.equal(b.first(), undefined);
  // Evicting a stored undefined still returns undefined, which is
  // indistinguishable from "no eviction" — this is a documented trade-off.
  assert.equal(b.push('x'), undefined);
  assert.equal(b.push('y'), undefined);
});
