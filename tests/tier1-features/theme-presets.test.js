import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getThemeModule, resetDatabase } from '../helpers/setup.js';

describe('Tier 1: Glassmorphism Theme System & Presets', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('should contain all 7 curated theme presets with dark and light tokens', async () => {
    const { THEME_PRESETS } = await getThemeModule();
    assert.equal(THEME_PRESETS.length, 7);

    const expectedPresets = [
      'default',
      'midnight-sapphire',
      'cyberpunk-neon',
      'emerald-forest',
      'sunset-amber',
      'rose-velvet',
      'nordic-frost'
    ];

    const presetIds = THEME_PRESETS.map(p => p.id);
    for (const expected of expectedPresets) {
      assert.ok(presetIds.includes(expected), `Missing preset: ${expected}`);
    }

    const requiredTokens = [
      '--bg-primary',
      '--bg-secondary',
      '--card-bg',
      '--card-border',
      '--text-primary',
      '--text-secondary',
      '--accent'
    ];

    for (const preset of THEME_PRESETS) {
      assert.ok(preset.dark, `Preset ${preset.id} missing dark tokens`);
      assert.ok(preset.light, `Preset ${preset.id} missing light tokens`);
      for (const token of requiredTokens) {
        assert.ok(preset.dark[token], `Preset ${preset.id} dark missing token ${token}`);
        assert.ok(preset.light[token], `Preset ${preset.id} light missing token ${token}`);
      }
    }
  });

  it('should convert hex colors to rgb and back correctly', async () => {
    const { hexToRgb, rgbToHex } = await getThemeModule();

    assert.deepEqual(hexToRgb('#0a84ff'), { r: 10, g: 132, b: 255 });
    assert.deepEqual(hexToRgb('#fff'), { r: 255, g: 255, b: 255 });
    assert.equal(hexToRgb('invalid'), null);
    assert.equal(hexToRgb(null), null);

    assert.equal(rgbToHex(10, 132, 255), '#0a84ff');
    assert.equal(rgbToHex(255, 255, 255), '#ffffff');
    assert.equal(rgbToHex(0, 0, 0), '#000000');
  });

  it('should initialize theme mode and apply tokens to document style', async () => {
    const { initTheme } = await getThemeModule();
    const mode = initTheme();

    assert.ok(mode === 'dark' || mode === 'light');
    assert.equal(document.documentElement.getAttribute('data-theme'), mode);
    assert.ok(document.documentElement.style.getPropertyValue('--bg-primary'));
  });

  it('should toggle theme mode between dark and light', async () => {
    const { initTheme, toggleThemeMode } = await getThemeModule();
    initTheme();

    const mode1 = toggleThemeMode();
    assert.equal(document.documentElement.getAttribute('data-theme'), mode1);

    const mode2 = toggleThemeMode();
    assert.equal(document.documentElement.getAttribute('data-theme'), mode2);
    assert.notEqual(mode1, mode2);
  });

  it('should apply custom theme property overrides', async () => {
    const { applyCustomThemeProperties } = await getThemeModule();
    applyCustomThemeProperties({
      '--accent': '#10b981',
      '--bg-primary': '#111827'
    });

    assert.equal(document.documentElement.style.getPropertyValue('--accent'), '#10b981');
    assert.equal(document.documentElement.style.getPropertyValue('--bg-primary'), '#111827');
  });
});
