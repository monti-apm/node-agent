import { expect } from 'chai';
import crypto from 'crypto';
import { EventLoopMonitor } from '@/event-loop-monitor';

function blockEventLoop() {
  const start = Date.now();
  while (Date.now() - start < 100) {
    const salt = crypto.randomBytes(128).toString('base64');
    crypto.pbkdf2Sync('42555', salt, 10000, 512, 'sha512');
  }
}

describe('EventLoopMonitor', function () {
  it('basic usage', function (done) {
    const monitor = new EventLoopMonitor(100);
    monitor.start();

    // Saturate the event loop so that we can detect lag.
    blockEventLoop();

    setTimeout(function () {
      const status = monitor.status();

      expect(status.pctBlock).to.be.above(0);
      expect(status.totalLag).to.be.above(0);
      expect(status.elapsedTime).to.be.above(0);

      monitor.stop();
      done();
    }, 300);
  });

  it('usage just after created', function (done) {
    const monitor = new EventLoopMonitor(100);
    monitor.start();

    const status = monitor.status();
    expect(status.pctBlock).to.equal(0);

    monitor.stop();
    done();
  });

  it('usage just after stopped', function (done) {
    const monitor = new EventLoopMonitor(100);
    monitor.start();

    // Saturate the event loop so that we can detect lag.
    blockEventLoop();

    setTimeout(function () {
      let status = monitor.status();

      expect(status.pctBlock).to.be.above(0);

      monitor.stop();

      status = monitor.status();
      expect(status.pctBlock).to.equal(0);

      done();
    }, 200);
  });
});
