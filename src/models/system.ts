import { EventLoopMonitor } from '@/event-loop-monitor';
import { DDSketch } from 'monti-apm-sketches-js';
import { GCMetrics } from '@/gc';
import { Ntp } from '@/ntp';
import { MontiApmAgent } from '@/monti-apm-agent';

type CPUHistoryEntry = {
  time: number;
  usage: number;
  sys: number;
  user: number;
};

type MetricPayload = {
  startTime: number;
  endTime: number;
  sessions?: number;
  memory: number;
  memoryArrayBuffers: number;
  memoryExternal: number;
  memoryHeapUsed: number;
  memoryHeapTotal: number;
  newSessions: number;
  activeRequests: number;
  activeHandles: number;
  pctEvloopBlock: number;
  evloopHistogram: any;
  gcMajorDuration: number;
  gcMinorDuration: number;
  gcIncrementalDuration: number;
  gcWeakCBDuration: number;
  pcpu: number;
  pcpuUser: number;
  pcpuSystem: number;
  cpuHistory: CPUHistoryEntry[];
};

export class System {
  static _instance: System;
  static getInstance() {
    if (!System._instance) {
      System._instance = new System();
    }
    return System._instance;
  }

  startTime: number;
  newSessions: number;
  sessionTimeout: number;
  evloopHistogram: DDSketch;
  evloopMonitor: EventLoopMonitor;
  gcMetrics: GCMetrics;
  cpuTime: [number, number];
  previousCpuUsage: NodeJS.CpuUsage;
  cpuHistory: CPUHistoryEntry[] = [];
  currentCpuUsage = 0;

  constructor() {
    this.startTime = Ntp._now();
    this.newSessions = 0;
    // 30 min
    this.sessionTimeout = 1000 * 60 * 30;

    this.evloopHistogram = new DDSketch({
      alpha: 0.02,
    });

    this.evloopMonitor = new EventLoopMonitor(200);
    this.evloopMonitor.start();
    this.evloopMonitor.on('lag', (lag) => {
      // store as microsecond
      this.evloopHistogram.add(lag * 1000);
    });

    this.gcMetrics = new GCMetrics();
    this.gcMetrics.start();

    this.cpuTime = process.hrtime();
    this.previousCpuUsage = process.cpuUsage();

    setInterval(() => {
      this.cpuUsage();
    }, 2000);
  }

  buildPayload() {
    const now = Ntp._now();

    const metrics: MetricPayload = {} as any;

    metrics.startTime = Ntp.instance.syncTime(this.startTime);
    metrics.endTime = Ntp.instance.syncTime(now);

    const memoryUsage = process.memoryUsage();
    metrics.memory = memoryUsage.rss / (1024 * 1024);
    metrics.memoryArrayBuffers =
      (memoryUsage.arrayBuffers || 0) / (1024 * 1024);
    metrics.memoryExternal = memoryUsage.external / (1024 * 1024);
    metrics.memoryHeapUsed = memoryUsage.heapUsed / (1024 * 1024);
    metrics.memoryHeapTotal = memoryUsage.heapTotal / (1024 * 1024);

    metrics.newSessions = this.newSessions;
    this.newSessions = 0;

    metrics.activeRequests = process._getActiveRequests().length;
    metrics.activeHandles = process._getActiveHandles().length;

    // track eventloop metrics
    metrics.pctEvloopBlock = this.evloopMonitor.status().pctBlock;
    metrics.evloopHistogram = this.evloopHistogram;
    this.evloopHistogram = new DDSketch({
      alpha: 0.02,
    });

    metrics.gcMajorDuration = this.gcMetrics.metrics.gcMajor;
    metrics.gcMinorDuration = this.gcMetrics.metrics.gcMinor;
    metrics.gcIncrementalDuration = this.gcMetrics.metrics.gcIncremental;
    metrics.gcWeakCBDuration = this.gcMetrics.metrics.gcWeakCB;

    this.gcMetrics.reset();

    metrics.pcpu = 0;
    metrics.pcpuUser = 0;
    metrics.pcpuSystem = 0;

    if (this.cpuHistory.length > 0) {
      const lastCpuUsage = this.cpuHistory[this.cpuHistory.length - 1];
      metrics.pcpu = lastCpuUsage.usage * 100;
      metrics.pcpuUser = lastCpuUsage.user * 100;
      metrics.pcpuSystem = lastCpuUsage.sys * 100;
    }

    metrics.cpuHistory = this.cpuHistory.map((entry) => ({
      time: Ntp.instance.syncTime(entry.time),
      usage: entry.usage,
      sys: entry.sys,
      user: entry.user,
    }));

    this.cpuHistory = [];
    this.startTime = now;
    return { systemMetrics: [metrics] };
  }

  cpuUsage() {
    const elapTimeMS = hrtimeToMS(process.hrtime(this.cpuTime));
    const elapUsage = process.cpuUsage(this.previousCpuUsage);
    const elapUserMS = elapUsage.user / 1000;
    const elapSystMS = elapUsage.system / 1000;
    const totalUsageMS = elapUserMS + elapSystMS;
    const totalUsagePercent = totalUsageMS / elapTimeMS;

    this.cpuHistory.push({
      time: Ntp._now(),
      usage: totalUsagePercent,
      user: elapUserMS / elapTimeMS,
      sys: elapSystMS / elapUsage.system,
    });

    this.currentCpuUsage = totalUsagePercent * 100;
    MontiApmAgent.instance.docSzCache.setPcpu(this.currentCpuUsage);

    this.cpuTime = process.hrtime();
    this.previousCpuUsage = process.cpuUsage();
  }

  handleSessionActivity(msg, session) {
    if (msg.msg === 'connect' && !msg.session) {
      this.countNewSession(session);
    } else if (['sub', 'method'].indexOf(msg.msg) !== -1) {
      if (!this.isSessionActive(session)) {
        this.countNewSession(session);
      }
    }
    session._activeAt = Date.now();
  }

  countNewSession(session) {
    if (!isLocalAddress(session.socket)) {
      this.newSessions++;
    }
  }

  isSessionActive(session) {
    const inactiveTime = Date.now() - session._activeAt;
    return inactiveTime < this.sessionTimeout;
  }
}

function hrtimeToMS(hrtime) {
  return hrtime[0] * 1000 + hrtime[1] / 1000000;
}

// ------------------------------------------------------------------------- //

// http://regex101.com/r/iF3yR3/2
// eslint-disable-next-line no-useless-escape
const isLocalHostRegex =
  /^(?:.*\.local|localhost)(?::\d+)?|127(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/;

// http://regex101.com/r/hM5gD8/1
const isLocalAddressRegex =
  /^127(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/;

function isLocalAddress(socket) {
  const host = socket.headers['host'];
  if (host) {
    return isLocalHostRegex.test(host);
  }
  const address = socket.headers['x-forwarded-for'] || socket.remoteAddress;
  if (address) {
    return isLocalAddressRegex.test(address);
  }
}
