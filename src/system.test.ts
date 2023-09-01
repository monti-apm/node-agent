import sinon from 'sinon';
import { EventLoopMonitor } from '@/event-loop-monitor';
import { GCMetrics } from '@/gc';
import { Ntp } from '@/ntp';
import { MontiApmAgent } from '@/monti-apm-agent';
import { System } from '@/system';

describe('System', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    sandbox.stub(EventLoopMonitor.prototype, 'start');
    sandbox.stub(EventLoopMonitor.prototype, 'on');
    sandbox.stub(EventLoopMonitor.prototype, 'status').returns({
      pctBlock: 0.1,
      elapsedTime: 1000,
      totalLag: 100,
    });

    sandbox.stub(GCMetrics.prototype, 'start');
    sandbox.stub(GCMetrics.prototype, 'reset');

    sandbox.stub(Ntp, '_now').returns(1629931263711); // Replace with some sample time
    sandbox.stub(Ntp.instance, 'syncTime').callsFake((time) => time);

    sandbox.stub(process, 'memoryUsage').returns({
      rss: 100,
      arrayBuffers: 50,
      external: 25,
      heapUsed: 30,
      heapTotal: 60,
    });

    sandbox.stub(process, '_getActiveRequests').returns(new Array(10));
    sandbox.stub(process, '_getActiveHandles').returns(new Array(5));
    sandbox.stub(process, 'hrtime').returns([123456789, 987654321]);
    sandbox.stub(process, 'cpuUsage').returns({ user: 50000, system: 50000 });

    sandbox.stub(MontiApmAgent, 'instance').value({
      docSzCache: {
        setPcpu: () => {},
      },
    });
  });

  afterEach(() => {
    // Restore all the mocks and stubs
    sandbox.restore();
  });

  it('should return a singleton instance', () => {
    const instance1 = System.getInstance();
    const instance2 = System.getInstance();
    expect(instance1).to.equal(instance2);
  });

  it('should correctly initialize instance variables', () => {
    const system = System.getInstance();

    expect(system).to.have.property('startTime').to.be.a('number');
    expect(system).to.have.property('newSessions').to.equal(0);
    expect(system).to.have.property('sessionTimeout').to.equal(1800000); // 1000 * 60 * 30
    expect(system).to.have.property('evloopMonitor').to.be.an('object');
    expect(system).to.have.property('gcMetrics').to.be.an('object');
    expect(system).to.have.property('cpuTime').to.be.an('array');
    expect(system).to.have.property('previousCpuUsage').to.be.an('object');
  });

  it('should build payload correctly', () => {
    const system = System.getInstance();
    const payload = system.buildPayload();

    expect(payload).to.have.property('systemMetrics').to.be.an('array');
    expect(payload.systemMetrics[0])
      .to.have.property('startTime')
      .to.be.a('number');
    expect(payload.systemMetrics[0])
      .to.have.property('endTime')
      .to.be.a('number');
    expect(payload.systemMetrics[0])
      .to.have.property('memory')
      .to.be.a('number');
  });

  it('should correctly calculate CPU usage and update cpuHistory', () => {
    const system = System.getInstance();
    system.cpuUsage();
    expect(system.cpuHistory).to.have.lengthOf(1);
    const cpuEntry = system.cpuHistory[0];
    expect(cpuEntry).to.have.property('time').to.be.a('number');
    expect(cpuEntry).to.have.property('usage').to.be.a('number');
    expect(cpuEntry).to.have.property('user').to.be.a('number');
    expect(cpuEntry).to.have.property('sys').to.be.a('number');
  });
});
