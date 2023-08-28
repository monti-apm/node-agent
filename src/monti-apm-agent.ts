import { DocSzCache } from "@/doc-sz-cache";
import { Monti } from "monti-apm-core";
import os from "os";
import { version } from '../package.json';
import config from 'config'

export class MontiApmAgent {
  static instance: MontiApmAgent;

  appSecret: string;
  appId: string;
  core: Monti;

  docSzCache = new DocSzCache(100000, 10);

  constructor(
    appId: string,
    appSecret: string,
    endpoint: string = config.get('Monti.endpoint'),
    hostname = config.get('Monti.hostname') || os.hostname(),
  ) {
    this.appId = appId;
    this.appSecret = appSecret;

    this.core = new Monti({
      appId,
      appSecret,
      endpoint,
      hostname,
      agentVersion: `node-agent@${version}`
    });
  }

  static connect(
    appId: string,
    appSecret: string,
    endpoint?: string,
    hostname?: string,
  ) {
    MontiApmAgent.instance = new MontiApmAgent(appId, appSecret, endpoint, hostname);
  }
}

if (config.get('Monti.appId') && config.get('Monti.appSecret')) {
  MontiApmAgent.connect(
    config.get('Monti.appId'),
    config.get('Monti.appSecret'),
  );
}