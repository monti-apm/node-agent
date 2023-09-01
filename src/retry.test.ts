import sinon from 'sinon';
import { Retry } from '@/retry';

describe('Retry', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('should instantiate with default values', () => {
    const retry = new Retry();
    expect(retry).to.be.instanceOf(Retry);
  });

  it('should instantiate with custom values', () => {
    const retry = new Retry({ baseTimeout: 2000, maxTimeout: 50000 });
    expect(retry).to.be.instanceOf(Retry);
  });

  it('should clear existing timer', () => {
    const retry = new Retry();
    const fn = sinon.fake();

    retry.retryLater(1, fn);
    retry.clear();

    clock.tick(10000);
    expect(fn.callCount).to.equal(0);
  });

  it('should calculate timeout correctly for the first call', () => {
    const retry = new Retry();
    const timeout = retry.timeout(1);

    expect(timeout).to.be.at.least(10);
  });

  it('should not exceed max timeout', () => {
    const retry = new Retry({
      fuzz: 0,
    });
    const timeout = retry.timeout(100);

    expect(timeout).to.be.at.most(5 * 60000);
  });

  it('should call the retry function after the calculated time', () => {
    const retry = new Retry();
    const fn = sinon.fake();
    const calculatedTimeout = retry.retryLater(1, fn);

    clock.tick(calculatedTimeout - 1);
    expect(fn.callCount).to.equal(0);

    clock.tick(1);
    expect(fn.callCount).to.equal(1);
  });
});
