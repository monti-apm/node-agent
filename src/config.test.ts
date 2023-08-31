import { expect } from 'chai';
import { getConfig } from '@/config';

describe('Config', () => {
  it('default', () => {
    const config = getConfig();

    expect(config.appId).to.equal(undefined);
    expect(config.appSecret).to.equal(undefined);
    expect(config.endpoint).to.equal('https://engine.montiapm.com');
    expect(config.hostname).to.equal(undefined);
  });

  it('environment variables', () => {
    process.env.MONTI_APP_ID = 'test-app-id';
    process.env.MONTI_APP_SECRET = 'test-app-secret';
    process.env.MONTI_ENDPOINT = 'test-endpoint';
    process.env.MONTI_HOSTNAME = 'test-hostname';

    const config = getConfig();

    expect(config.appId).to.equal('test-app-id');
    expect(config.appSecret).to.equal('test-app-secret');
    expect(config.endpoint).to.equal('test-endpoint');
    expect(config.hostname).to.equal('test-hostname');
  });
});
