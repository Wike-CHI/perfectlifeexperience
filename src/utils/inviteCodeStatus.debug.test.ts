/**
 * Debug Test - diagnose the issue
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as inviteCodeStatus from './inviteCodeStatus';

const mockStorage = new Map<string, any>();

const mockSetStorageSync = vi.fn();
const mockGetStorageSync = vi.fn();
const mockRemoveStorageSync = vi.fn();

vi.mock('@dcloudio/uni-app', () => ({
  default: {
    setStorageSync: mockSetStorageSync,
    getStorageSync: mockGetStorageSync,
    removeStorageSync: mockRemoveStorageSync
  }
}));

describe('Debug: getBindFailureStatus behavior', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.clearAllMocks();

    mockSetStorageSync.mockImplementation((key: string, value: any) => {
      mockStorage.set(key, value);
    });

    mockGetStorageSync.mockImplementation((key: string) => {
      const value = mockStorage.get(key);
      return value !== undefined ? value : '';
    });

    mockRemoveStorageSync.mockImplementation((key: string) => {
      mockStorage.delete(key);
    });
  });

  it('diagnostic: what does getBindFailureStatus return when empty?', () => {
    const status = inviteCodeStatus.getBindFailureStatus();
    console.log('Empty status:', JSON.stringify(status));
    console.log('hasTried value:', status.hasTried);
    console.log('hasTried type:', typeof status.hasTried);
    console.log('hasTried === true:', status.hasTried === true);
    console.log('!!status.hasTried:', !!status.hasTried);

    expect(status.hasTried).toBe(false);
  });

  it('diagnostic: what does getHoursSinceLastFailure return when empty?', () => {
    const hours = inviteCodeStatus.getHoursSinceLastFailure();
    console.log('Hours value:', hours);
    console.log('Hours type:', typeof hours);
    console.log('Hours === null:', hours === null);
    console.log('Hours === 0:', hours === 0);

    expect(hours).toBeNull();
  });

  it('diagnostic: after setting a failure, then clearing', () => {
    // Set a failure
    inviteCodeStatus.saveBindFailureStatus('test error', 'CODE123');
    let status = inviteCodeStatus.getBindFailureStatus();
    console.log('After save - hasTried:', status.hasTried);

    // Clear it
    inviteCodeStatus.clearBindFailureStatus();
    status = inviteCodeStatus.getBindFailureStatus();
    console.log('After clear - hasTried:', status.hasTried);
    console.log('After clear - full status:', JSON.stringify(status));

    // Check hours
    const hours = inviteCodeStatus.getHoursSinceLastFailure();
    console.log('Hours after clear:', hours);

    expect(hours).toBeNull();
  });
});
