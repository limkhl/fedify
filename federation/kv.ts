import { Temporal } from "@js-temporal/polyfill";

/**
 * A key for a key-value store.  An array of one or more strings.
 *
 * @since 0.5.0
 */
export type KvKey = readonly [string] | readonly [string, ...string[]];

/**
 * Additional options for setting a value in a key-value store.
 *
 * @since 0.5.0
 */
export interface KvStoreSetOptions {
  /**
   * The time-to-live (TTL) for the value.
   */
  ttl?: Temporal.Duration;
}

/**
 * An abstract interface for a key-value store.
 *
 * @since 0.5.0
 */
export interface KvStore {
  /**
   * Gets the value for the given key.
   * @param key The key to get the value for.
   * @returns The value for the key, or `undefined` if the key does not exist.
   * @typeParam T The type of the value to get.
   */
  get<T = unknown>(key: KvKey): Promise<T | undefined>;

  /**
   * Sets the value for the given key.
   * @param key The key to set the value for.
   * @param value The value to set.
   * @param options Additional options for setting the value.
   */
  set(key: KvKey, value: unknown, options?: KvStoreSetOptions): Promise<void>;

  /**
   * Deletes the value for the given key.
   * @param key The key to delete.
   */
  delete(key: KvKey): Promise<void>;
}

/**
 * A key-value store that stores values in memory.
 * Do not use this in production as it does not persist values.
 *
 * @since 0.5.0
 */
export class MemoryKvStore implements KvStore {
  #values: Record<string, [unknown, null | Temporal.Instant]> = {};

  #encodeKey(key: KvKey): string {
    return JSON.stringify(key);
  }

  /**
   * {@inheritDoc KvStore.get}
   */
  get<T = unknown>(key: KvKey): Promise<T | undefined> {
    const encodedKey = this.#encodeKey(key);
    const entry = this.#values[encodedKey];
    if (entry == null) return Promise.resolve(undefined);
    const [value, expiration] = entry;
    if (
      expiration != null && Temporal.Now.instant().until(expiration).sign < 0
    ) {
      delete this.#values[encodedKey];
      return Promise.resolve(undefined);
    }
    return Promise.resolve(value as T | undefined);
  }

  /**
   * {@inheritDoc KvStore.set}
   */
  set(key: KvKey, value: unknown, options?: KvStoreSetOptions): Promise<void> {
    const encodedKey = this.#encodeKey(key);
    const expiration = options?.ttl == null
      ? null
      : Temporal.Now.instant().add(options.ttl.round({ largestUnit: "hour" }));
    this.#values[encodedKey] = [value, expiration];
    return Promise.resolve();
  }

  /**
   * {@inheritDoc KvStore.delete}
   */
  delete(key: KvKey): Promise<void> {
    const encodedKey = this.#encodeKey(key);
    delete this.#values[encodedKey];
    return Promise.resolve();
  }
}
