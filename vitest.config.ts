// Astro's Vite config, so tests can render .astro components with the
// container API (test/app-shell.test.ts). Tests that need a DOM say so per
// file (@vitest-environment happy-dom).
import { getViteConfig } from 'astro/config';

export default getViteConfig({ test: {} });
