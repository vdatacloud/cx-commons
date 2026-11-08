// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { esc, fragment } from '../src/sdk/html';

describe('esc', () => {
    it('escapes markup and both quote kinds', () => {
        expect(esc(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
        expect(esc(null)).toBe('');
        expect(esc(undefined)).toBe('');
        expect(esc(42)).toBe('42');
    });
});

describe('fragment', () => {
    it('turns escaped markup into nodes, never running what was escaped', () => {
        const f = fragment(`<b>${esc('<img src=x onerror=alert(1)>')}</b>`);
        const b = f.firstChild as HTMLElement;
        expect(b.tagName).toBe('B');
        expect(b.textContent).toBe('<img src=x onerror=alert(1)>');
        expect(b.querySelector('img')).toBeNull();
    });
});
