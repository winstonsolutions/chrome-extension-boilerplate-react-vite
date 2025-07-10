import { resolve } from 'node:path';
import { makeEntryPointPlugin } from '@extension/hmr';
import { getContentScriptEntries, withPageConfig } from '@extension/vite-config';
import { IS_DEV } from '@extension/env';
import { build } from 'vite';
import { build as buildTW } from 'tailwindcss/lib/cli/build';

const rootDir = resolve(import.meta.dirname);
const srcDir = resolve(rootDir, 'src');
const matchesDir = resolve(srcDir, 'matches');

const configs = Object.entries(getContentScriptEntries(matchesDir)).map(([name, entry]) => ({
  name,
  config: withPageConfig({
    mode: IS_DEV ? 'development' : undefined,
    resolve: {
      alias: {
        '@src': srcDir,
      },
    },
    publicDir: resolve(rootDir, 'public'),
    plugins: [IS_DEV && makeEntryPointPlugin()],
    build: {
      lib: {
        name: name,
        formats: ['iife'],
        entry,
        fileName: name,
      },
      outDir: resolve(rootDir, '..', '..', 'dist', 'content-runtime'),
    },
  }),
}));

// 序列化构建以避免资源争用导致的SIGKILL
for (const { name, config } of configs) {
  const folder = resolve(matchesDir, name);
  const args = {
    ['--input']: resolve(folder, 'index.css'),
    ['--output']: resolve(rootDir, 'dist', name, 'index.css'),
    ['--config']: resolve(rootDir, 'tailwind.config.ts'),
    ['--watch']: false, // 临时禁用watch模式避免SIGKILL
  };
  await buildTW(args);
  //@ts-expect-error This is hidden property into vite's resolveConfig()
  config.configFile = false;
  await build(config);
}
