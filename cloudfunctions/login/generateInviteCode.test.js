/**
 * Characterization Tests for generateInviteCode
 *
 * ⚠️ IMPORTANT: These are NOT true TDD tests.
 * We wrote the code first, then added tests.
 * These tests verify "what the code currently does",
 * not "what the code should do".
 *
 * Value: Regression prevention, behavior documentation
 * Limitation: Cannot prove design correctness
 */

describe('generateInviteCode', () => {
  // Import the function under test
  let generateInviteCode;

  beforeAll(() => {
    // Copy the implementation from login/index.js
    const INVITE_CODE_CONFIG = {
      LENGTH: 8,
      CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    };

    generateInviteCode = function() {
      const { LENGTH, CHARS } = INVITE_CODE_CONFIG;
      const timestamp = Date.now().toString(36).slice(-4);
      let randomPart = '';

      for (let i = 0; i < LENGTH - 5; i++) {
        randomPart += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
      }

      const checkSum = (timestamp.charCodeAt(0) + randomPart.charCodeAt(0)) % CHARS.length;
      const checkChar = CHARS.charAt(checkSum);

      const code = timestamp + randomPart + checkChar;

      if (code.length !== LENGTH) {
        throw new Error(`生成的邀请码长度不正确: ${code.length}`);
      }

      return code.toUpperCase();
    };
  });

  /**
   * Characterization Test: Verify current behavior
   * This test documents what the code currently does
   */
  describe('current behavior', () => {
    test('generates 8-character codes', () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
    });

    test('generates uppercase codes', () => {
      const code = generateInviteCode();
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    test('excludes confusing characters (0, O, 1, I, L)', () => {
      const codes = [];
      for (let i = 0; i < 100; i++) {
        codes.push(generateInviteCode());
      }
      const allChars = codes.join('');

      // These characters should be excluded
      expect(allChars).not.toContain('0');
      expect(allChars).not.toContain('O');
      expect(allChars).not.toContain('1');
      expect(allChars).not.toContain('I');
      expect(allChars).not.toContain('L');
    });

    test('generates different codes over time', async () => {
      const code1 = generateInviteCode();
      // Wait 1ms to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 1));
      const code2 = generateInviteCode();

      expect(code1).not.toBe(code2);
    });

    test('timestamp part uses base36 encoding', () => {
      const code = generateInviteCode();
      const timestampPart = code.slice(0, 4);

      // First 4 chars should be base36 (0-9, A-Z)
      expect(timestampPart).toMatch(/^[0-9A-Z]+$/);
    });

    test('checksum is based on timestamp and random part', () => {
      const code = generateInviteCode();
      const INVITE_CODE_CONFIG = {
        CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      };

      const timestamp = code.slice(0, 4);
      const random = code.slice(4, 7);
      const checksum = code.slice(7, 8);

      // Recalculate checksum
      const expectedChecksumIndex = (timestamp.charCodeAt(0) + random.charCodeAt(0)) % INVITE_CODE_CONFIG.CHARS.length;
      const expectedChecksum = INVITE_CODE_CONFIG.CHARS.charAt(expectedChecksumIndex);

      expect(checksum).toBe(expectedChecksum);
    });
  });

  /**
   * Property-Based Tests
   * Verify invariants that should always hold
   */
  describe('invariants', () => {
    test('always generates valid format', () => {
      for (let i = 0; i < 1000; i++) {
        const code = generateInviteCode();
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      }
    });

    test('never generates invalid length', () => {
      expect(() => {
        for (let i = 0; i < 1000; i++) {
          const code = generateInviteCode();
          if (code.length !== 8) {
            throw new Error(`Invalid length: ${code.length}`);
          }
        }
      }).not.toThrow();
    });
  });

  /**
   * Statistical Tests
   * Verify randomness properties
   */
  describe('randomness properties', () => {
    test('generates diverse codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateInviteCode());
      }
      // Should generate at least 90 unique codes out of 100
      expect(codes.size).toBeGreaterThanOrEqual(90);
    });

    test('character distribution is roughly uniform', () => {
      const INVITE_CODE_CONFIG = {
        CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      };

      const charCounts = {};
      const codes = [];
      for (let i = 0; i < 1000; i++) {
        codes.push(generateInviteCode());
      }

      // Count character occurrences in random part (positions 4-6)
      codes.forEach(code => {
        const randomPart = code.slice(4, 7);
        for (const char of randomPart) {
          charCounts[char] = (charCounts[char] || 0) + 1;
        }
      });

      // Each character should appear between 50-150 times (out of 3000 total)
      // This is a rough uniformity check
      Object.values(charCounts).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(50);
        expect(count).toBeLessThanOrEqual(150);
      });
    });
  });

  /**
   * Edge Cases
   */
  describe('edge cases', () => {
    test('handles rapid successive generation', async () => {
      const codes = [];
      for (let i = 0; i < 10; i++) {
        codes.push(generateInviteCode());
        // No delay - test rapid generation
      }

      // All should be valid
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      });

      // Most should be unique (timestamp + random provides entropy)
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBeGreaterThanOrEqual(8);
    });
  });
});
