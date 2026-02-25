/**
 * 管理员认证工具类
 * 处理管理员登录、权限验证、登出等操作
 */

import type { AdminInfo, LoginRequest, Permission } from '@/types/admin'
import { callFunction } from './cloudbase'

/**
 * 管理员认证工具类
 */
class AdminAuthManager {
  private static readonly STORAGE_KEY = 'admin_info'
  private static readonly TOKEN_KEY = 'admin_token'

  /**
   * 管理员登录
   * @param username 用户名
   * @param password 密码
   * @returns 管理员信息
   */
  static async login(username: string, password: string): Promise<AdminInfo> {
    try {
      const res = await callFunction('admin-api', {
        action: 'adminLogin',
        data: { username, password }
      })

      if (res.code === 0 && res.data) {
        // 🔧 修复：callFunction 包装了一层返回值
        // callFunction 返回: {code: 0, msg: "success", data: res.result}
        // res.result (云函数返回): {code: 0, data: {...}, msg: "登录成功"}
        // 真正的 adminInfo 在 res.data.data 中！
        const cloudFunctionResult = res.data
        const { token, ...adminInfoData } = cloudFunctionResult.data
        const adminInfo: AdminInfo = {
          ...adminInfoData,
          createTime: new Date(adminInfoData.createTime)
        }

        // 🔍 调试：打印返回的数据
        console.log('📦 callFunction 返回:', res)
        console.log('📦 云函数返回 (res.data):', cloudFunctionResult)
        console.log('📦 真正的 adminInfo (res.data.data):', cloudFunctionResult.data)
        console.log('📦 提取后的 adminInfo:', adminInfo)
        console.log('📦 adminInfo.status:', adminInfo.status)
        console.log('📦 adminInfo.status 类型:', typeof adminInfo.status)
        console.log('📦 adminInfo.status === "active":', adminInfo.status === 'active')

        // 存储管理员信息（不包含 token）
        this.setAdminInfo(adminInfo)

        // 单独存储 token
        if (token) {
          this.setToken(token)
          console.log('✅ Token 已存储:', token.substring(0, 20) + '...')
        }

        // 🔍 调试：验证存储是否成功
        const stored = this.getAdminInfo()
        console.log('📦 从存储读取的数据:', stored)
        console.log('📦 stored?.status:', stored?.status)
        console.log('📦 isLoggedIn():', this.isLoggedIn())

        return adminInfo
      } else {
        throw new Error(res.msg || '登录失败')
      }
    } catch (error: any) {
      console.error('管理员登录失败:', error)
      throw new Error(error.message || '登录失败，请检查网络连接')
    }
  }

  /**
   * 检查管理员是否已登录
   * @returns 是否已登录
   */
  static isLoggedIn(): boolean {
    try {
      const adminInfo = this.getAdminInfo()
      return !!adminInfo && adminInfo.status === 'active'
    } catch (error) {
      return false
    }
  }

  /**
   * 检查是否拥有指定权限
   * @param permission 权限标识
   * @returns 是否拥有权限
   */
  static hasPermission(permission: Permission): boolean {
    try {
      const adminInfo = this.getAdminInfo()
      if (!adminInfo || adminInfo.status !== 'active') {
        return false
      }
      return adminInfo.permissions.includes(permission)
    } catch (error) {
      return false
    }
  }

  /**
   * 检查是否拥有任一权限
   * @param permissions 权限数组
   * @returns 是否拥有任一权限
   */
  static hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission))
  }

  /**
   * 检查是否拥有所有权限
   * @param permissions 权限数组
   * @returns 是否拥有所有权限
   */
  static hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission))
  }

  /**
   * 获取当前登录的管理员信息
   * @returns 管理员信息或 null
   */
  static getAdminInfo(): AdminInfo | null {
    try {
      const adminStr = uni.getStorageSync(this.STORAGE_KEY)

      // 🔍 调试：打印原始存储数据
      console.log('📦 getAdminInfo - 原始存储字符串:', adminStr)
      console.log('📦 getAdminInfo - STORAGE_KEY:', this.STORAGE_KEY)

      if (!adminStr) return null

      const adminInfo: AdminInfo = JSON.parse(adminStr)

      // 🔍 调试：打印解析后的数据
      console.log('📦 getAdminInfo - 解析后的 adminInfo:', adminInfo)
      console.log('📦 getAdminInfo - adminInfo.status:', adminInfo.status)
      console.log('📦 getAdminInfo - status 类型:', typeof adminInfo.status)

      // 检查账号状态
      if (adminInfo.status !== 'active') {
        console.error('❌ 账号状态不是 active，执行 logout')
        this.logout()
        return null
      }

      console.log('✅ getAdminInfo - 验证通过，返回 adminInfo')
      return adminInfo
    } catch (error) {
      console.error('❌ 获取管理员信息失败:', error)
      return null
    }
  }

  /**
   * 设置管理员信息
   * @param adminInfo 管理员信息
   */
  static setAdminInfo(adminInfo: AdminInfo): void {
    try {
      uni.setStorageSync(this.STORAGE_KEY, JSON.stringify(adminInfo))
    } catch (error) {
      console.error('存储管理员信息失败:', error)
    }
  }

  /**
   * 设置 token
   * @param token token 字符串
   */
  static setToken(token: string): void {
    try {
      uni.setStorageSync(this.TOKEN_KEY, token)
    } catch (error) {
      console.error('存储 token 失败:', error)
    }
  }

  /**
   * 获取 token
   * @returns token 字符串或 null
   */
  static getToken(): string | null {
    try {
      return uni.getStorageSync(this.TOKEN_KEY) || null
    } catch (error) {
      return null
    }
  }

  /**
   * 管理员登出
   */
  static logout(): void {
    try {
      // 清除本地存储
      uni.removeStorageSync(this.STORAGE_KEY)
      uni.removeStorageSync(this.TOKEN_KEY)

      // 跳转到登录页
      uni.redirectTo({
        url: '/pagesAdmin/login/index'
      })
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  /**
   * 检查登录状态，未登录则跳转到登录页
   * @returns 是否已登录
   */
  static checkAuth(): boolean {
    if (!this.isLoggedIn()) {
      uni.showToast({
        title: '请先登录',
        icon: 'none'
      })

      setTimeout(() => {
        uni.navigateTo({
          url: '/pagesAdmin/login/index'
        })
      }, 1500)

      return false
    }
    return true
  }

  /**
   * 检查权限，无权限则提示
   * @param permission 需要的权限
   * @returns 是否拥有权限
   */
  static checkPermission(permission: Permission): boolean {
    if (!this.hasPermission(permission)) {
      uni.showToast({
        title: '无权限执行此操作',
        icon: 'none'
      })
      return false
    }
    return true
  }

  /**
   * 刷新管理员信息
   */
  static async refreshAdminInfo(): Promise<void> {
    try {
      const res = await callFunction('admin-api', {
        action: 'getAdminInfo'
      })

      if (res.code === 0 && res.data) {
        this.setAdminInfo(res.data)
      }
    } catch (error) {
      console.error('刷新管理员信息失败:', error)
    }
  }
}

export default AdminAuthManager
