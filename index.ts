import type { AstroIntegration } from 'astro';

export interface CxCommonsOptions {
  /**
   * Automatically inject the canonical DataCloud LNF global CSS tokens into every page at SSR.
   * @default true
   */
  injectGlobalCss?: boolean;
}

/**
 * Product CX Commons Astro Integration
 * Provides shared Data Cloud LNF design system tokens and Astro UI components.
 */
export default function cxCommons(options: CxCommonsOptions = {}): AstroIntegration {
  const { injectGlobalCss = true } = options;

  return {
    name: '@vdatacloud/cx-commons',
    hooks: {
      'astro:config:setup': ({ injectScript }) => {
        if (injectGlobalCss) {
          injectScript('page-ssr', `import "@vdatacloud/cx-commons/styles/global.css";`);
        }
      },
    },
  };
}
