interface RetryOptions {
  baseTimeout?: number;
  exponent?: number;
  maxTimeout?: number;
  minTimeout?: number;
  minCount?: number;
  fuzz?: number;
}

export class Retry {
  baseTimeout: number;
  exponent: number;
  maxTimeout: number;
  minTimeout: number;
  minCount: number;
  fuzz: number;
  retryTimer: NodeJS.Timeout | null;

  constructor({
    baseTimeout = 1000,
    exponent = 2.2,
    maxTimeout = 5 * 60000,
    minTimeout = 10,
    minCount = 2,
    fuzz = 0.5,
  }: RetryOptions = {}) {
    this.baseTimeout = baseTimeout;
    this.exponent = exponent;
    this.maxTimeout = maxTimeout;
    this.minTimeout = minTimeout;
    this.minCount = minCount;
    this.fuzz = fuzz;
    this.retryTimer = null;
  }

  clear(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    this.retryTimer = null;
  }

  timeout(count: number): number {
    if (count < this.minCount) {
      return this.minTimeout;
    }

    let timeout = Math.min(
      this.maxTimeout,
      this.baseTimeout * Math.pow(this.exponent, count),
    );

    timeout *= Math.random() * this.fuzz + (1 - this.fuzz / 2);

    return Math.ceil(timeout);
  }

  retryLater(count: number, fn: () => void): number {
    const timeout = this.timeout(count);
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    this.retryTimer = setTimeout(fn, timeout);
    return timeout;
  }
}
