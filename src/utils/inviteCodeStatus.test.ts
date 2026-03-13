/**
 * Characterization Tests for inviteCodeStatus utility
 *
 * ⚠️ IMPORTANT: These are NOT true TDD tests.
 * We wrote the code first, then added tests.
 * These tests verify "what the code currently does",
 * not "what the code should do".
 *
 * Value: Regression prevention, behavior documentation
 * Limitation: Cannot prove design correctness
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as inviteCodeStatus from './inviteCodeStatus';

// Mock storage
const mockStorage = new Map<string, any>();

// Mock uni API with vi.fn
const mockSetStorageSync = vi.fn();
const mockGetStorageSync = vi.fn();
const mockRemoveStorageSync = vi.fn();
const mockShowModal = vi.fn();
const mockShowToast = vi.fn();

vi.mock('@dcloudio/uni-app', () => ({
  default: {
    setStorageSync: mockSetStorageSync,
    getStorageSync: mockGetStorageSync,
    removeStorageSync: mockRemoveStorageSync,
    showModal: mockShowModal,
    showToast: mockShowToast
  }
}));

describe('inviteCodeStatus - Characterization Tests', () => {
  const BIND_FAILURE_KEY = 'inviteCode_bind_failure';

  beforeEach(() => {
    // Clear mock storage FIRST
    mockStorage.clear();

    // THEN reset all mocks
    vi.clearAllMocks();
    mockSetStorageSync.mockReset();
    mockGetStorageSync.mockReset();
    mockRemoveStorageSync.mockReset();
    mockShowModal.mockReset();
    mockShowToast.mockReset();

    // FINALLY setup fresh implementations
    mockSetStorageSync.mockImplementation((key: string, value: any) => {
      mockStorage.set(key, value);
    });

    mockGetStorageSync.mockImplementation((key: string) => {
      const value = mockStorage.get(key);
      // uni.getStorageSync returns empty string when key doesn't exist
      return value !== undefined ? value : '';
    });

    mockRemoveStorageSync.mockImplementation((key: string) => {
      mockStorage.delete(key);
    });

    mockShowModal.mockImplementation((options: any) => {
      if (options.success) {
        setTimeout(() => options.success({ confirm: true }), 0);
      }
    });

    mockShowToast.mockImplementation(() => {
      // Mock toast
    });
  });

  /**
   * saveBindFailureStatus Tests
   */
  describe('saveBindFailureStatus', () => {
    it('saves failure status to storage', () => {
      const error = '邀请码无效';
      const inviteCode = 'TEST1234';

      inviteCodeStatus.saveBindFailureStatus(error, inviteCode);

      const saved = mockStorage.get(BIND_FAILURE_KEY);
      expect(saved).toBeDefined();
      expect(saved.hasTried).toBe(true);
      expect(saved.lastError).toBe(error);
      expect(saved.lastInviteCode).toBe(inviteCode);
    });

    it('includes timestamp in ISO 8601 format', () => {
      inviteCodeStatus.saveBindFailureStatus('error', 'CODE1234');

      const saved = mockStorage.get(BIND_FAILURE_KEY);
      expect(saved.lastAttemptTime).toBeDefined();
      expect(saved.lastAttemptTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('overwrites previous failure status', () => {
      inviteCodeStatus.saveBindFailureStatus('error1', 'CODE1');
      inviteCodeStatus.saveBindFailureStatus('error2', 'CODE2');

      const saved = mockStorage.get(BIND_FAILURE_KEY);
      expect(saved.lastError).toBe('error2');
      expect(saved.lastInviteCode).toBe('CODE2');
    });

    it('handles special characters in error message', () => {
      const error = '邀请码格式错误：必须为8位大写字母+数字';
      const inviteCode = 'TEST1234';

      expect(() => {
        inviteCodeStatus.saveBindFailureStatus(error, inviteCode);
      }).not.toThrow();

      const saved = mockStorage.get(BIND_FAILURE_KEY);
      expect(saved.lastError).toBe(error);
    });
  });

  /**
   * getBindFailureStatus Tests
   */
  describe('getBindFailureStatus', () => {
    it('returns default status when no failure exists', () => {
      const status = inviteCodeStatus.getBindFailureStatus();

      expect(status).toBeDefined();
      expect(status.hasTried).toBe(false);
      expect(status.lastError).toBeUndefined();
      expect(status.lastInviteCode).toBeUndefined();
    });

    it('returns saved failure status', () => {
      const error = '测试错误';
      const inviteCode = 'ABCD1234';
      inviteCodeStatus.saveBindFailureStatus(error, inviteCode);

      const status = inviteCodeStatus.getBindFailureStatus();

      expect(status.hasTried).toBe(true);
      expect(status.lastError).toBe(error);
      expect(status.lastInviteCode).toBe(inviteCode);
      expect(status.lastAttemptTime).toBeDefined();
    });

    it('handles corrupted storage data gracefully', () => {
      mockStorage.set(BIND_FAILURE_KEY, 'invalid json');

      const status = inviteCodeStatus.getBindFailureStatus();

      // Should return default status on error
      expect(status.hasTried).toBe(false);
    });
  });

  /**
   * clearBindFailureStatus Tests
   */
  describe('clearBindFailureStatus', () => {
    it('removes failure status from storage', () => {
      inviteCodeStatus.saveBindFailureStatus('error', 'CODE1234');
      expect(mockStorage.has(BIND_FAILURE_KEY)).toBe(true);

      inviteCodeStatus.clearBindFailureStatus();

      expect(mockStorage.has(BIND_FAILURE_KEY)).toBe(false);
    });

    it('does not throw when storage is empty', () => {
      expect(() => {
        inviteCodeStatus.clearBindFailureStatus();
      }).not.toThrow();
    });
  });

  /**
   * showBindFailureToast Tests
   */
  describe('showBindFailureToast', () => {
    it('shows modal when failure status exists', () => {
      inviteCodeStatus.saveBindFailureStatus('邀请码无效', 'TEST1234');

      expect(() => {
        inviteCodeStatus.showBindFailureToast();
      }).not.toThrow();
    });

    it('does not show modal when no failure status', () => {
      expect(() => {
        inviteCodeStatus.showBindFailureToast();
      }).not.toThrow();
    });
  });

  /**
   * showBindSuccessToast Tests
   */
  describe('showBindSuccessToast', () => {
    it('shows success toast without parent name', () => {
      expect(() => {
        inviteCodeStatus.showBindSuccessToast();
      }).not.toThrow();
    });

    it('shows success toast with parent name', () => {
      const parentName = '张三';
      expect(() => {
        inviteCodeStatus.showBindSuccessToast(parentName);
      }).not.toThrow();
    });

    it('clears failure status when showing success', () => {
      inviteCodeStatus.saveBindFailureStatus('error', 'CODE1234');
      expect(mockStorage.has(BIND_FAILURE_KEY)).toBe(true);

      inviteCodeStatus.showBindSuccessToast();

      expect(mockStorage.has(BIND_FAILURE_KEY)).toBe(false);
    });
  });

  /**
   * shouldShowBindFailureReminder Tests
   */
  describe('shouldShowBindFailureReminder', () => {
    it('returns false when no failure status', () => {
      const shouldShow = inviteCodeStatus.shouldShowBindFailureReminder();
      expect(shouldShow).toBe(false);
    });

    it('returns false when failure exists but no error', () => {
      mockStorage.set(BIND_FAILURE_KEY, { hasTried: true });

      const shouldShow = inviteCodeStatus.shouldShowBindFailureReminder();
      expect(shouldShow).toBe(false);
    });

    it('returns true when failure status with error', () => {
      inviteCodeStatus.saveBindFailureStatus('error', 'CODE1234');

      const shouldShow = inviteCodeStatus.shouldShowBindFailureReminder();
      expect(shouldShow).toBe(true);
    });
  });

  /**
   * getHoursSinceLastFailure Tests
   */
  describe('getHoursSinceLastFailure', () => {
    it('returns null when no failure status', () => {
      const hours = inviteCodeStatus.getHoursSinceLastFailure();
      expect(hours).toBeNull();
    });

    it('returns null when no timestamp', () => {
      mockStorage.set(BIND_FAILURE_KEY, {
        hasTried: true,
        lastError: 'error'
      });

      const hours = inviteCodeStatus.getHoursSinceLastFailure();
      expect(hours).toBeNull();
    });

    it('calculates hours correctly for recent failure', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      mockStorage.set(BIND_FAILURE_KEY, {
        hasTried: true,
        lastError: 'error',
        lastAttemptTime: oneHourAgo.toISOString()
      });

      const hours = inviteCodeStatus.getHoursSinceLastFailure();
      expect(hours).toBeCloseTo(1, 1);
    });

    it('calculates hours correctly for old failure', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      mockStorage.set(BIND_FAILURE_KEY, {
        hasTried: true,
        lastError: 'error',
        lastAttemptTime: threeDaysAgo.toISOString()
      });

      const hours = inviteCodeStatus.getHoursSinceLastFailure();
      expect(hours).toBeCloseTo(72, 0);
    });
  });

  /**
   * Integration Scenarios
   */
  describe('integration scenarios', () => {
    it('handles complete failure workflow', () => {
      // 1. Initial state: no failures
      expect(inviteCodeStatus.shouldShowBindFailureReminder()).toBe(false);

      // 2. User fails to bind
      inviteCodeStatus.saveBindFailureStatus('邀请码无效', 'WRONG123');
      expect(inviteCodeStatus.shouldShowBindFailureReminder()).toBe(true);

      // 3. Check hours since failure
      const hours = inviteCodeStatus.getHoursSinceLastFailure();
      expect(hours).not.toBeNull();
      expect(hours).toBeLessThan(1);

      // 4. User successfully binds later
      inviteCodeStatus.showBindSuccessToast();
      expect(inviteCodeStatus.shouldShowBindFailureReminder()).toBe(false);
    });

    it('handles multiple failed attempts', () => {
      // First attempt
      inviteCodeStatus.saveBindFailureStatus('错误1', 'CODE1');
      let status = inviteCodeStatus.getBindFailureStatus();
      expect(status.lastError).toBe('错误1');

      // Second attempt (overwrites)
      inviteCodeStatus.saveBindFailureStatus('错误2', 'CODE2');
      status = inviteCodeStatus.getBindFailureStatus();
      expect(status.lastError).toBe('错误2');
      expect(status.lastInviteCode).toBe('CODE2');
    });
  });
});
