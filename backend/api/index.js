// Legacy bootstrapper so `npm run start` / `npm run dev` continue to work.
// It delegates to the TypeScript server to keep the runtime definitions centralized.

require('ts-node/register/transpile-only');
require('tsconfig-paths/register');

require('../src/server');
