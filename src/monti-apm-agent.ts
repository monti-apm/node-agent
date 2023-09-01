import { DocSzCache } from '@/doc-sz-cache';
import { Monti } from '@monti-apm/core';
import os from 'os';
import { name, version } from '../package.json';
import { System } from '@/system';
import { getConfig } from '@/config';

const config = getConfig();

export class MontiApmAgent {
  static instance: MontiApmAgent;

  appSecret: string;
  appId: string;
  hostname: string;

  payloadTimeout: number;

  core: Monti;

  docSzCache = new DocSzCache(100000, 10);

  systemModel: System;

  constructor(
    appId: string,
    appSecret: string,
    endpoint: string = config.endpoint,
    hostname = config.hostname || os.hostname(),
    payloadTimeout = 20_000,
  ) {
    this.appId = appId;
    this.appSecret = appSecret;
    this.hostname = hostname;
    this.payloadTimeout = payloadTimeout;
    this.systemModel = System.getInstance();

    this.core = new Monti({
      appId,
      appSecret,
      endpoint,
      hostname,
      agentVersion: `${name}@${version}`,
    });

    this.handshake();
  }

  async sendAppStats() {
    const appStats = {
      nodeVersion: process.version,
      protocolVersion: '1.0.0',
    };

    return this.core.sendData({
      startTime: new Date(),
      appStats,
    });
  }

  async handshake() {
    try {
      await this.core._checkAuth();

      console.log('Monti APM: Connected');

      this.schedulePayloadSend();
      await this.sendAppStats();
    } catch (err: any) {
      if (err.message === 'Unauthorized') {
        console.log(
          'Monti APM: Authentication failed, check your "appId" & "appSecret"',
        );
      } else {
        console.log(`Monti APM: Unable to connect. ${err.message}`);
      }
    }
  }

  schedulePayloadSend() {
    setTimeout(() => {
      this.schedulePayloadSend();
      this.sendPayload().catch(console.error);
    }, this.payloadTimeout);
  }

  static connect(
    appId: string,
    appSecret: string,
    endpoint?: string,
    hostname?: string,
  ) {
    MontiApmAgent.instance = new MontiApmAgent(
      appId,
      appSecret,
      endpoint,
      hostname,
    );
  }

  async buildPayload() {
    return {
      host: this.hostname,
      ...this.systemModel.buildPayload(),
    };
  }

  async sendPayload() {
    const payload = await this.buildPayload();

    console.log('Sending payload', payload);

    await this.core.sendData(payload);
  }
}

if (config.appId && config.appSecret) {
  MontiApmAgent.connect(config.appId, config.appSecret);
}
