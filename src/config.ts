import { cosmiconfigSync } from 'cosmiconfig';

const moduleName = 'monti';

const explorerSync = cosmiconfigSync(moduleName, {});

const search = explorerSync.search();

export const getConfig = () => ({
  appId: process.env.MONTI_APP_ID || undefined,
  appSecret: process.env.MONTI_APP_SECRET || undefined,
  endpoint: process.env.MONTI_ENDPOINT || 'https://engine.montiapm.com',
  hostname: process.env.MONTI_HOSTNAME || undefined,
  ...(search ? search.config : {}),
});
