import { PerformanceObserver, constants, performance } from 'perf_hooks';

export class GCMetrics {
  observer?: PerformanceObserver;
  started = false;
  metrics: Record<string, number>;

  constructor() {
    this.metrics = {};

    this.reset();
  }

  start() {
    if (this.started) {
      return false;
    }

    this.started = true;

    this.observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        // @ts-ignore @todo check if kind is still a thing
        const metric = this._mapKindToMetric(entry.kind);

        if (!metric) {
          return;
        }

        this.metrics[metric] += entry.duration;
      });
    });

    this.observer.observe({ entryTypes: ['gc'], buffered: false });
  }

  _mapKindToMetric(gcKind: number): string | undefined {
    switch (gcKind) {
      case constants.NODE_PERFORMANCE_GC_MAJOR:
        return 'gcMajor';
      case constants.NODE_PERFORMANCE_GC_MINOR:
        return 'gcMinor';
      case constants.NODE_PERFORMANCE_GC_INCREMENTAL:
        return 'gcIncremental';
      case constants.NODE_PERFORMANCE_GC_WEAKCB:
        return 'gcWeakCB';
      default:
        // no default
        console.log(`Monti APM: Unrecognized GC Kind: ${gcKind}`);
    }
  }

  reset() {
    this.metrics = {
      gcMajor: 0,
      gcMinor: 0,
      gcIncremental: 0,
      gcWeakCB: 0,
    };
  }
}
