export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private resetFn?: (item: T) => void;

  constructor(factory: () => T, initialSize: number = 20, resetFn?: (item: T) => void) {
    this.factory = factory;
    this.resetFn = resetFn;

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  public acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  public release(item: T): void {
    if (this.resetFn) {
      this.resetFn(item);
    }
    this.pool.push(item);
  }

  public getAvailableCount(): number {
    return this.pool.length;
  }
}
