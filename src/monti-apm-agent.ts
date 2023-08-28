import { DocSzCache } from '@/doc-sz-cache';
import { Monti } from 'monti-apm-core';
import os from 'os';
import { version } from '../package.json';
import config from 'config';
import { System } from '@/models/system';

export class MontiApmAgent {
  static instance: MontiApmAgent;

  appSecret: string;
  appId: string;
  hostname: string;

  core: Monti;

  docSzCache = new DocSzCache(100000, 10);

  systemModel: System;

  constructor(
    appId: string,
    appSecret: string,
    endpoint: string = config.get('Monti.endpoint'),
    hostname = (config.get('Monti.hostname') as string) || os.hostname(),
  ) {
    this.appId = appId;
    this.appSecret = appSecret;
    this.hostname = hostname;

    this.systemModel = System.getInstance();

    this.core = new Monti({
      appId,
      appSecret,
      endpoint,
      hostname,
      agentVersion: `node-agent@${version}`,
    });
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

    await this.core.sendData(payload);
  }
}

if (config.get('Monti.appId') && config.get('Monti.appSecret')) {
  MontiApmAgent.connect(
    config.get('Monti.appId'),
    config.get('Monti.appSecret'),
  );
}
