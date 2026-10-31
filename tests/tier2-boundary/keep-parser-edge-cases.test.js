import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getStorageModule } from '../helpers/setup.js';
import { mockPaymentModes } from '../helpers/fixtures.js';

describe('Tier 2: Google Keep Parser Boundary & Edge Cases', () => {
  it('should return empty array for empty or whitespace-only text', async () => {
    const { parseGoogleKeepText } = await getStorageModule();

    assert.deepEqual(parseGoogleKeepText('', mockPaymentModes), []);
    assert.deepEqual(parseGoogleKeepText('   \n\n   \t  \n', mockPaymentModes), []);
  });

  it('should use current date when no date header is present in note text', async () => {
    const { parseGoogleKeepText } = await getStorageModule();
    const today = new Date().toISOString().split('T')[0];

    const noteWithoutDate = '50$ - Bank - Dinner at restaurant';
    const parsed = parseGoogleKeepText(noteWithoutDate, mockPaymentModes);

    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].amount, 50);
    assert.equal(parsed[0].date, today);
  });

  it('should default to bank account when an unrecognized payment mode is mentioned', async () => {
    const { parseGoogleKeepText } = await getStorageModule();

    const textWithUnknownMode = `
October 15, 2026
15$ - BitcoinWallet - Coffee beans
`;
    const parsed = parseGoogleKeepText(textWithUnknownMode, mockPaymentModes);

    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].amount, 15);
    // BitcoinWallet is not in mockPaymentModes -> defaults to 'bank'
    assert.equal(parsed[0].paymentModeId, 'bank');
  });

  it('should preserve unicode, emojis, and special punctuation in descriptions', async () => {
    const { parseGoogleKeepText } = await getStorageModule();

    const unicodeNote = `
October 15, 2026
45$ - Cash - Café René déjeuner (croissant 🥐 & cappuccino ☕) #fun!
`;
    const parsed = parseGoogleKeepText(unicodeNote, mockPaymentModes);

    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].amount, 45);
    assert.ok(parsed[0].description.includes('Café René'));
    assert.ok(parsed[0].description.includes('🥐'));
    assert.ok(parsed[0].description.includes('☕'));
  });

  it('should handle consecutive date headers without creating empty transactions', async () => {
    const { parseGoogleKeepText } = await getStorageModule();

    const textConsecutiveDates = `
October 12, 2026
October 13, 2026
October 14, 2026
25$ - Bank - Pharmacy items
`;
    const parsed = parseGoogleKeepText(textConsecutiveDates, mockPaymentModes);

    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].date, '2026-10-14');
    assert.equal(parsed[0].amount, 25);
  });
});
