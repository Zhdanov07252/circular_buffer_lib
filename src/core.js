/**
 * CircularBuffer: a fixed-capacity ring buffer.
 *
 * Design decisions (stated plainly so callers know what they are getting):
 *
 * 1. When the buffer is full, push() silently drops the OLDEST item and
 *    appends the new one. We return the dropped item so callers can detect
 *    the eviction without a separate isFull() check.
 *
 * 2. size() reflects the current number of live items (0..capacity). We do
 *    NOT pretend the buffer always holds `capacity` items — that would force
 *    callers to distinguish "valid" from "stale" slots, which defeats the
 *    point of a ring buffer that tracks its own occupancy.
 *
 * 3.toArray() returns items in insertion order: oldest first, newest last.
 *
 * 4. clear() resets head, tail and size but keeps the underlying array
 *    allocation, so repeated clear/push cycles do not trigger GC churn.
 */
export class CircularBuffer {
  #buf;
  #capacity;
  #head = 0; // index of the oldest live item
  #size = 0;  // number of live items (NOT a raw tail index)

  /**
   * @param {number} capacity - Maximum number of items the buffer retains.
   *   Must be a positive integer. We reject zero and negatives here rather
   *   than letting them produce a buffer that can never hold anything —
   *   that is almost always a caller bug and should fail loudly.
   */
  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError(`capacity must be a positive integer, got ${capacity}`);
    }
    this.#buf = new Array(capacity);
    this.#capacity = capacity;
  }

  get capacity() {
    return this.#capacity;
  }

  /** Current number of live items, in [0, capacity]. */
  get size() {
    return this.#size;
  }

  /** True when no items are live. */
  isEmpty() {
    return this.#size === 0;
  }

  /** True when at capacity (next push will evict). */
  isFull() {
    return this.#size === this.#capacity;
  }

  /**
   * Append an item.
   * @param {*} item
   * @returns {*} The evicted item if the buffer was full, otherwise undefined.
   *   Note: returning undefined for "nothing evicted" means a stored value of
   *   undefined is indistinguishable from "no eviction" by the return value
   *   alone. Callers who store undefined and care about eviction should check
   *   isFull() before pushing.
   */
  push(item) {
    let evicted;
    if (this.#size === this.#capacity) {
      evicted = this.#buf[this.#head];
      this.#buf[this.#head] = item;
      this.#head = (this.#head + 1) % this.#capacity;
    } else {
      const tail = (this.#head + this.#size) % this.#capacity;
      this.#buf[tail] = item;
      this.#size += 1;
    }
    return evicted;
  }

  /**
   * Remove and return the oldest live item, or undefined if empty.
   */
  shift() {
    if (this.#size === 0) return undefined;
    const item = this.#buf[this.#head];
    this.#buf[this.#head] = undefined; // release reference for GC
    this.#head = (this.#head + 1) % this.#capacity;
    this.#size -= 1;
    return item;
  }

  /**
   * Return the oldest live item without removing it, or undefined if empty.
   */
  first() {
    if (this.#size === 0) return undefined;
    return this.#buf[this.#head];
  }

  /**
   * Return the newest live item without removing it, or undefined if empty.
   */
  last() {
    if (this.#size === 0) return undefined;
    const tail = (this.#head + this.#size - 1) % this.#capacity;
    return this.#buf[tail];
  }

  /**
   * Return a fresh array of live items in insertion order (oldest first).
   */
  toArray() {
    const out = new Array(this.#size);
    for (let i = 0; i < this.#size; i++) {
      out[i] = this.#buf[(this.#head + i) % this.#capacity];
    }
    return out;
  }

  /** Reset to empty without reallocating the backing array. */
  clear() {
    for (let i = 0; i < this.#capacity; i++) {
      this.#buf[i] = undefined;
    }
    this.#head = 0;
    this.#size = 0;
  }
}
