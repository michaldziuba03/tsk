export class MemoryStorage {
  static collections = new Map();
  
  clear(collection) {
    MemoryStorage.collections.delete(collection);
  }

  save(collection, data) {
    MemoryStorage.collections.set(collection, data);
  }

  add(collection, data) {
    if (!MemoryStorage.collections.has(collection)) {
      MemoryStorage.collections.set(collection, []);
    }
    MemoryStorage.collections.get(collection).push(data);
  }

  bulkAdd(collection, data) {
    if (!MemoryStorage.collections.has(collection)) {
      MemoryStorage.collections.set(collection, []);
    }
    MemoryStorage.collections.get(collection).push(...data);
  }

  get(collection) {
    return MemoryStorage.collections.get(collection) || [];
  }

  count(collection) {
    return MemoryStorage.collections.get(collection)?.length || 0;
  }
}
