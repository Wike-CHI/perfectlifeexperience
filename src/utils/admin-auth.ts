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
        const adminInfo: AdminInfo = res.data

        // 存储管理员信息
        this.setAdminInfo(adminInfo)

        // 如果返回了 token，也存储起来
        if (res.data.token) {
          this.setToken(res.data.token)
        }

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
      if (!adminStr) return null

      const adminInfo: AdminInfo = JSON.parse(adminStr)

      // 检查账号状态
      if (adminInfo.status !== 'active') {
        this.logout()
        return null
      }

      return adminInfo
    } catch (error) {
      console.error('获取管理员信息失败:', error)
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
