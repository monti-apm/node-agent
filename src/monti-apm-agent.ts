import { DocSzCache } from "@/doc-sz-cache";

export class MontiApmAgent {
  static _instance: MontiApmAgent;

  static get instance() {
    if (!MontiApmAgent._instance) {
      MontiApmAgent._instance = new MontiApmAgent();
    }
    return MontiApmAgent._instance;
  }


  docSzCache = new DocSzCache(100000, 10);

  constructor() {
    console.log('MontiApmAgent constructor');
  }

  public connect(appId: string, secret: string) {

  }
}