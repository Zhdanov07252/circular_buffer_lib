# circular_buffer_lib

A fixed-capacity ring buffer for JavaScript. When it is full, the next `push`
drops the oldest item and returns it.

```js
import { CircularBuffer } from './src/index.js';

const buf = new CircularBuffer(3);
buf.push('a');
buf.push('b');
buf.push('c');
buf.push('d'); // buffer was full -> returns 'a', the evicted oldest item

buf.toArray();  // ['b', 'c', 'd']
buf.first();    // 'b'  (oldest live item)
buf.last();     // 'd'  (newest live item)
buf.shift();    // 'b'  (removes and returns oldest)
buf.size;       // 2
buf.clear();    // empties in place, keeps the same capacity
```

## Why this exists

You need to keep the last N of something — recent log lines, the newest
sensor readings, a bounded event window — and you do not want unbounded growth
or the allocation churn of `array.shift()` on a plain array (which moves every
remaining element). This buffer pre-allocates a fixed array of length N and
overwrites slots in place, so both `push` and `shift` are O(1) with no copying.

The trade-off: capacity is fixed at construction. There is no `resize`. If you
need to grow, make a new buffer and copy.

## The edge you will hit

`push` returns `undefined` both when nothing was evicted and when the evicted
value itself was `undefined`. If you store `undefined` as a real value and need
to detect evictions, check `isFull()` before calling `push`.

## API

- `new CircularBuffer(capacity)` — `capacity` must be a positive integer;
  throws `RangeError` otherwise.
- `push(item)` — appends; returns the evicted oldest item if full, else
  `undefined`.
- `shift()` — removes and returns the oldest live item, or `undefined` if
  empty.
- `first()` / `last()` — peek oldest / newest without removing; `undefined`
  if empty.
- `toArray()` — fresh array of live items, oldest first.
- `clear()` — empties without reallocating.
- `capacity`, `size` — read-only numeric properties.
- `isEmpty()`, `isFull()` — boolean helpers.

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

