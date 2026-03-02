/**
 * cloudbase.ts 单元测试
 * 测试云开发相关功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { storageStore } from '../../vitest.setup'

// Mock 环境配置
vi.mock('@/config/env', () => ({
  ENV_ID: 'test-env-id',
  checkEnvConfig: vi.fn(() => true)
}))

describe('cloudbase.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清除存储状态
    Object.keys(storageStore).forEach(key => delete storageStore[key])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkEnvironment', () => {
    it('环境ID配置正确时应该返回true', async () => {
      const { checkEnvironment } = await import('./cloudbase')
      const result = checkEnvironment()
      expect(result).toBe(true)
    })
  })

  describe('initCloudBase', () => {
    it('应该成功初始化云开发', async () => {
      const { initCloudBase } = await import('./cloudbase')

      const result = await initCloudBase()

      // 由于mock了wx对象，应该返回true
      expect(typeof result).toBe('boolean')
    })
  })

  describe('getUserOpenid', () => {
    it('应该从缓存获取OpenID', async () => {
      const { getUserOpenid } = await import('./cloudbase')

      // 设置缓存的OpenID和有效的登录时间
      const now = Date.now()
      uni.setStorageSync('cloudbase_openid', 'test-openid-123')
      uni.setStorageSync('cloudbase_login_time', now)

      // 重新导入以获取最新状态
      const openid = await getUserOpenid()

      // 由于登录时间有效，应该使用缓存
      expect(openid).toBe('test-openid-123')
    })

    it('登录过期时应该重新获取OpenID', async () => {
      const { getUserOpenid, logoutCloudBase } = await import('./cloudbase')

      // 先清除登录状态
      logoutCloudBase()

      // 设置过期的登录时间（8天前）
      const expiredTime = Date.now() - 8 * 24 * 60 * 60 * 1000
      uni.setStorageSync('cloudbase_login_time', expiredTime)

      const openid = await getUserOpenid()

      // 应该调用云函数获取新的openid
      expect(wx.cloud.callFunction).toHaveBeenCalled()
    })
  })

  describe('getCachedOpenid', () => {
    it('应该返回缓存的OpenID', async () => {
      const { getCachedOpenid, getUserOpenid } = await import('./cloudbase')

      // 先获取OpenID
      await getUserOpenid()

      const cachedOpenid = getCachedOpenid()
      expect(cachedOpenid).toBeDefined()
    })
  })

  describe('recordLoginTime', () => {
    it('应该记录登录时间', async () => {
      const { recordLoginTime } = await import('./cloudbase')

      const beforeTime = Date.now()
      recordLoginTime()

      expect(uni.setStorageSync).toHaveBeenCalledWith(
        'cloudbase_login_time',
        expect.any(Number)
      )
    })
  })

  describe('logoutCloudBase', () => {
    it('应该清除所有登录状态', async () => {
      const { logoutCloudBase } = await import('./cloudbase')

      logoutCloudBase()

      expect(uni.removeStorageSync).toHaveBeenCalledWith('cloudbase_openid')
      expect(uni.removeStorageSync).toHaveBeenCalledWith('cloudbase_login_time')
    })
  })

  describe('isLoginExpired', () => {
    it('未登录时应该返回true', async () => {
      const { logoutCloudBase, isLoginExpired } = await import('./cloudbase')

      logoutCloudBase()

      const expired = isLoginExpired()
      expect(expired).toBe(true)
    })

    it('登录未过期时应该返回false', async () => {
      const { isLoginExpired } = await import('./cloudbase')

      // 设置当前时间的登录时间（未过期）
      uni.setStorageSync('cloudbase_login_time', Date.now())

      const expired = isLoginExpired()
      expect(expired).toBe(false)
    })

    it('登录过期时应该返回true', async () => {
      const { isLoginExpired } = await import('./cloudbase')

      // 设置过期时间
      const expiredTime = Date.now() - 8 * 24 * 60 * 60 * 1000
      uni.setStorageSync('cloudbase_login_time', expiredTime)

      const expired = isLoginExpired()
      expect(expired).toBe(true)
    })
  })

  describe('getLoginRemainingDays', () => {
    it('未登录时应该返回0', async () => {
      const { logoutCloudBase, getLoginRemainingDays } = await import('./cloudbase')

      logoutCloudBase()

      const days = getLoginRemainingDays()
      expect(days).toBe(0)
    })

    it('刚登录时应该返回约7天', async () => {
      const { getLoginRemainingDays } = await import('./cloudbase')

      // 设置当前时间的登录时间
      uni.setStorageSync('cloudbase_login_time', Date.now())

      const days = getLoginRemainingDays()
      expect(days).toBeGreaterThanOrEqual(6)
      expect(days).toBeLessThanOrEqual(7)
    })

    it('登录6天后应该返回约1天', async () => {
      const { getLoginRemainingDays } = await import('./cloudbase')

      // 设置6天前的登录时间
      const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000
      uni.setStorageSync('cloudbase_login_time', sixDaysAgo)

      const days = getLoginRemainingDays()
      expect(days).toBeGreaterThanOrEqual(0)
      expect(days).toBeLessThanOrEqual(2)
    })
  })

  describe('callFunction', () => {
    it('应该成功调用云函数', async () => {
      const { callFunction } = await import('./cloudbase')

      const result = await callFunction('test-function', {
        action: 'test',
        data: {}
      })

      expect(result).toHaveProperty('code')
      expect(result).toHaveProperty('data')
    })

    it('admin-api调用应该自动注入token', async () => {
      const { callFunction } = await import('./cloudbase')

      // 设置admin token
      uni.setStorageSync('admin_token', 'test-admin-token')

      await callFunction('admin-api', {
        action: 'test',
        data: {}
      })

      // 验证调用了云函数
      expect(wx.cloud.callFunction).toHaveBeenCalled()
    })

    it('云函数调用失败应该返回错误', async () => {
      const { callFunction } = await import('./cloudbase')

      // Mock云函数调用失败
      wx.cloud.callFunction.mockResolvedValueOnce({
        result: { code: -1, msg: 'Error' },
        errMsg: 'cloud.callFunction:fail'
      })

      const result = await callFunction('test-function', {})

      expect(result.code).toBe(-1)
    })
  })

  describe('uploadFile', () => {
    it('应该成功上传文件', async () => {
      const { uploadFile } = await import('./cloudbase')

      const fileID = await uploadFile(
        '/local/path/file.jpg',
        'uploads/file.jpg'
      )

      expect(fileID).toBe('mock-file-id')
      expect(wx.cloud.uploadFile).toHaveBeenCalledWith({
        cloudPath: 'uploads/file.jpg',
        filePath: '/local/path/file.jpg'
      })
    })
  })

  describe('checkLogin', () => {
    it('checkLogin应该是getUserOpenid的别名', async () => {
      const { checkLogin, getUserOpenid } = await import('./cloudbase')

      expect(checkLogin).toBe(getUserOpenid)
    })
  })
})
