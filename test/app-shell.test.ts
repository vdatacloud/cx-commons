import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import AppShell from '../src/components/AppShell.astro';

describe('AppShell', () => {
    it('frames the page: title, mark, name and every slot in its place', async () => {
        const container = await AstroContainer.create();
        const html = await container.renderToString(AppShell, {
            props: { title: 'Scheduler', brandName: 'Operator console', brandTitle: 'Platform operator console', homeHref: '/home', locale: 'fr' },
            slots: { default: '<p id="page">page</p>', nav: '<a id="nav-link">Jobs</a>', 'below-nav': '<div id="ticker"></div>', footer: '<footer id="foot"></footer>' },
        });
        expect(html).toContain('<html lang="fr">');
        expect(html).toContain('<title>Scheduler</title>');
        expect(html).toContain('href="/home"');
        expect(html).toMatch(/title="Platform operator console"[^>]*>Operator console</);
        const at = (s: string) => html.indexOf(s);
        expect(at('id="nav-link"')).toBeGreaterThan(at('Operator console<'));
        expect(at('id="ticker"')).toBeGreaterThan(at('id="nav-link"'));
        expect(at('<main')).toBeGreaterThan(at('id="ticker"'));
        expect(at('id="page"')).toBeGreaterThan(at('<main'));
        expect(at('id="foot"')).toBeGreaterThan(at('</main>'));
    });

    it('defaults the mark, its alt text and home', async () => {
        const container = await AstroContainer.create();
        const html = await container.renderToString(AppShell, { props: { title: 't', brandName: 'Portal' } });
        expect(html).toContain('src="/favicon.svg" alt="Portal"');
        expect(html).toContain('href="/"');
        expect(html).toContain('<html lang="en">');
    });
});
