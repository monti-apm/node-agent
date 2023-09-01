import { Retry } from '@/retry';
import { isServer } from '@/environment';
import fetch from 'cross-fetch';

interface NtpOptions {
  endpoint?: string;
  disableNtp?: boolean;
}

export class Ntp {
  private readonly isDisabled: boolean;
  private readonly path: string = '/simplentp/sync';
  private endpoint = 'https://enginex.kadira.io';
  private diff: number;
  private synced: boolean;
  private reSyncCount: number;
  private reSync: Retry;

  constructor(options?: NtpOptions) {
    const { endpoint, disableNtp } = options || {};

    this.isDisabled = disableNtp || false;

    if (endpoint) this.setEndpoint(endpoint);

    this.diff = 0;
    this.synced = false;
    this.reSyncCount = 0;
    this.reSync = new Retry({
      baseTimeout: 1000 * 60,
      maxTimeout: 1000 * 60 * 10,
      minCount: 0,
    });
  }

  static _instance: Ntp;

  static get instance() {
    if (!Ntp._instance) {
      Ntp._instance = new Ntp();
    }
    return Ntp._instance;
  }

  static _now(): number {
    const now = Date.now();

    if (typeof now === 'number') {
      return now;
    }

    // @ts-ignore
    if (now instanceof Date) {
      // @ts-ignore
      return now.getTime();
    }

    return new Date().getTime();
  }

  public setEndpoint(endpoint: string): void {
    this.endpoint = endpoint;
  }

  public getTime(): number {
    return Ntp._now() + Math.round(this.diff);
  }

  public syncTime(localTime: number): number {
    return localTime + Math.ceil(this.diff);
  }

  public sync(): void {
    if (this.endpoint === null || this.isDisabled) {
      return;
    }

    const logger = getLogger();
    logger('init sync');
    let retryCount = 0;

    const retry = new Retry({
      baseTimeout: 1000 * 20,
      maxTimeout: 1000 * 60,
      minCount: 1,
      minTimeout: 0,
    });

    const syncTime = () => {
      if (retryCount < 5) {
        logger('attempt time sync with server', retryCount);
        retry.retryLater(retryCount++, cacheDns);
      } else {
        logger('maximum retries reached');
        this.reSync.retryLater(this.reSyncCount++, (...args) => {
          this.sync(...args);
        });
      }
    };

    const cacheDns = () => {
      this.getServerTime((err) => {
        if (!err) {
          calculateTimeDiff();
        } else {
          syncTime();
        }
      });
    };

    const calculateTimeDiff = () => {
      const clientStartTime = new Date().getTime();
      this.getServerTime((err, serverTime) => {
        if (!err && serverTime) {
          const networkTime = (new Date().getTime() - clientStartTime) / 2;
          const serverStartTime = serverTime - networkTime;
          this.diff = serverStartTime - clientStartTime;
          this.synced = true;
          this.reSync.retryLater(this.reSyncCount++, (...args) => {
            this.sync(...args);
          });
          logger('successfully updated diff value', this.diff);
        } else {
          syncTime();
        }
      });
    };

    syncTime();
  }

  public getServerTime(
    callback: (err?: Error, serverTime?: number) => void,
  ): void {
    if (this.endpoint === null) {
      throw new Error('getServerTime requires the endpoint to be set');
    }

    if (this.isDisabled) {
      throw new Error('getServerTime requires NTP to be enabled');
    }

    const url = `${this.endpoint}${
      this.path
    }?noCache=${new Date().getTime()}-${Math.random()}`;

    fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();
      })
      .then((content) => {
        const serverTime = parseInt(content, 10);
        callback(undefined, serverTime);
      })
      .catch((error) => {
        callback(error);
      });
  }
}

function getLogger(): (message?: any, ...optionalParams: any[]) => void {
  if (isServer) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('debug')('kadira:ntp');
  }

  return function log(message?: any, ...optionalParams: any[]) {
    let canLog = false;
    try {
      canLog =
        global.localStorage.getItem('LOG_KADIRA') !== null &&
        typeof console !== 'undefined';
    } catch (e) {
      /* empty */
    }

    if (!canLog) {
      return;
    }

    if (message) {
      message = `kadira:ntp ${message}`;
      optionalParams.unshift(message);
    }

    console.log(...optionalParams);
  };
}
