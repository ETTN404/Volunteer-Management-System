import { describe, expect, it } from 'vitest';
import { am } from './am';
import { translate } from './index';

describe('i18n', () => {
  it('falls back to the English text when a string has no translation', () => {
    expect(translate('am', 'A sentence nobody translated')).toBe('A sentence nobody translated');
    expect(translate('en', 'Check in')).toBe('Check in');
  });

  it('fills placeholders in both languages', () => {
    expect(translate('en', '{n} spots left', { n: 3 })).toBe('3 spots left');
    expect(translate('am', '{n} spots left', { n: 3 })).toBe('3 ቦታ ቀርቷል');
  });

  it('keeps every placeholder of the English key in the Amharic text', () => {
    const broken = Object.entries(am).filter(([en, tr]) => {
      const want = (en.match(/\{\w+\}/g) ?? []).sort().join();
      const got = (tr.match(/\{\w+\}/g) ?? []).sort().join();
      return want !== got;
    });
    expect(broken).toEqual([]);
  });

  it('keeps the everyday loanwords instead of formal coinages', () => {
    expect(am['Check in']).toContain('ቼክ-ኢን');
    expect(am['Password']).toBe('ፓስወርድ');
    expect(am['QR code']).toContain('QR');
  });
});
