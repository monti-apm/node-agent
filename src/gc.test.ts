import sinon from 'sinon';
import { constants, PerformanceObserver } from 'perf_hooks';
import { GCMetrics } from '@/gc';

describe('GCMetrics', function () {
  let gcMetrics: GCMetrics;

  beforeEach(function () {
    gcMetrics = new GCMetrics();
  });

  describe('constructor', function () {
    it('should initialize with empty metrics', function () {
      expect(gcMetrics.metrics).to.deep.equal({
        gcMajor: 0,
        gcMinor: 0,
        gcIncremental: 0,
        gcWeakCB: 0,
      });
    });
  });

  describe('start', function () {
    let mockObserve: any;

    beforeEach(function () {
      mockObserve = sinon.stub(PerformanceObserver.prototype, 'observe');
    });

    afterEach(function () {
      sinon.restore();
    });

    it('should start observer', function () {
      gcMetrics.start();
      expect(mockObserve.calledOnce).to.be.true;
      expect(gcMetrics.started).to.be.true;
    });

    it('should not start observer if already started', function () {
      gcMetrics.start();
      const result = gcMetrics.start();
      expect(result).to.be.false;

      expect(mockObserve.calledOnce).to.be.true;
    });
  });

  describe('_mapKindToMetric', function () {
    it('should map gc kind to metric', function () {
      const metric = gcMetrics._mapKindToMetric(
        constants.NODE_PERFORMANCE_GC_MAJOR,
      );
      expect(metric).to.equal('gcMajor');
    });

    it('should return undefined for unknown gc kind', function () {
      const metric = gcMetrics._mapKindToMetric(999); // An unknown GC kind
      expect(metric).to.be.undefined;
    });
  });

  describe('reset', function () {
    it('should reset metrics', function () {
      gcMetrics.metrics.gcMajor = 10;
      gcMetrics.reset();
      expect(gcMetrics.metrics).to.deep.equal({
        gcMajor: 0,
        gcMinor: 0,
        gcIncremental: 0,
        gcWeakCB: 0,
      });
    });
  });
});
