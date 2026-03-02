/**
 * Vitest 全局 Setup 文件
 * 用于 mock 微信小程序 API 和 CloudBase SDK
 */

import { vi } from 'vitest'

// 创建存储模拟
const storageStore: Record<string, any> = {}

// Mock wx 对象
const mockWx = {
  // 云开发相关
  cloud: {
    init: vi.fn(),
    callFunction: vi.fn().mockResolvedValue({
      result: { code: 0, data: {}, msg: 'success' },
      errMsg: 'cloud.callFunction:ok',
    }),
    uploadFile: vi.fn().mockResolvedValue({
      fileID: 'mock-file-id',
      statusCode: 200,
      errMsg: 'cloud.uploadFile:ok',
    }),
    downloadFile: vi.fn().mockResolvedValue({
      tempFilePath: 'mock-temp-path',
    }),
    getTempFileURL: vi.fn().mockResolvedValue({
      fileList: [{ tempFileURL: 'mock-url' }],
    }),
    deleteFile: vi.fn().mockResolvedValue({}),
    database: vi.fn().mockReturnValue({
      collection: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ data: [] }),
      count: vi.fn().mockResolvedValue({ total: 0 }),
      doc: vi.fn().mockReturnThis(),
      command: {
        gte: vi.fn((v: any) => ({ _gte: v })),
        lte: vi.fn((v: any) => ({ _lte: v })),
        lt: vi.fn((v: any) => ({ _lt: v })),
        gt: vi.fn((v: any) => ({ _gt: v })),
        in: vi.fn((v: any) => ({ _in: v })),
        neq: vi.fn((v: any) => ({ _neq: v })),
      },
      RegExp: vi.fn().mockReturnValue({ _regexp: true }),
    }),
  },

  // 存储相关
  getStorageSync: vi.fn((key: string) => {
    return storageStore[key] ?? ''
  }),
  setStorageSync: vi.fn((key: string, value: any) => {
    storageStore[key] = value
  }),
  removeStorageSync: vi.fn((key: string) => {
    delete storageStore[key]
  }),
  clearStorageSync: vi.fn(() => {
    Object.keys(storageStore).forEach(key => delete storageStore[key])
  }),

  // 网络相关
  request: vi.fn().mockResolvedValue({
    data: { code: 0, data: {} },
  }),

  // 导航相关
  navigateTo: vi.fn(),
  navigateBack: vi.fn(),
  redirectTo: vi.fn(),
  reLaunch: vi.fn(),
  switchTab: vi.fn(),

  // 交互相关
  showToast: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  showModal: vi.fn().mockResolvedValue({ confirm: true }),

  // 用户信息
  getUserInfo: vi.fn().mockResolvedValue({
    userInfo: { nickName: 'test', avatarUrl: '' },
  }),
  getUserProfile: vi.fn().mockResolvedValue({
    userInfo: { nickName: 'test', avatarUrl: '' },
  }),

  // 支付
  requestPayment: vi.fn().mockResolvedValue({}),

  // 扫码
  scanCode: vi.fn().mockResolvedValue({
    result: 'mock-scan-result',
  }),

  // 位置
  getLocation: vi.fn().mockImplementation((options: any) => {
    if (options && options.success) {
      options.success({ latitude: 39.9, longitude: 116.4 })
      return
    }
    return Promise.resolve({ latitude: 39.9, longitude: 116.4 })
  }),

  // 系统
  getSystemInfoSync: vi.fn().mockReturnValue({
    model: 'iPhone X',
    pixelRatio: 3,
    windowWidth: 375,
    windowHeight: 812,
    system: 'iOS 15.0',
    platform: 'ios',
    SDKVersion: '2.0.0',
  }),

  // 媒体
  chooseImage: vi.fn().mockResolvedValue({
    tempFilePaths: ['mock-path-1', 'mock-path-2'],
  }),
  chooseVideo: vi.fn().mockResolvedValue({
    tempFilePath: 'mock-video-path',
  }),

  // 授权相关
  authorize: vi.fn().mockImplementation((options: any) => {
    if (options && options.success) {
      options.success()
      return
    }
    return Promise.resolve()
  }),
  openSetting: vi.fn().mockImplementation((options: any) => {
    if (options && options.success) {
      options.success({ authSetting: { 'scope.userLocation': true } })
      return
    }
    return Promise.resolve({ authSetting: { 'scope.userLocation': true } })
  }),

  // 其他
  createIntersectionObserver: vi.fn().mockReturnValue({
    relativeTo: vi.fn().mockReturnThis(),
    observe: vi.fn(),
    disconnect: vi.fn(),
  }),
}

// 将 mockWx 赋值给全局 wx 对象
;(global as any).wx = mockWx

// Mock uni 对象（UniApp）
const mockUni = {
  ...mockWx,
  // UniApp 特有的 API（使用回调方式）
  getStorageSync: mockWx.getStorageSync,
  setStorageSync: mockWx.setStorageSync,
  removeStorageSync: mockWx.removeStorageSync,
  navigateTo: mockWx.navigateTo,
  navigateBack: mockWx.navigateBack,
  showToast: mockWx.showToast,
  showLoading: mockWx.showLoading,
  hideLoading: mockWx.hideLoading,
  showModal: mockWx.showModal,
  request: mockWx.request,
  getLocation: mockWx.getLocation,
  authorize: mockWx.authorize,
  openSetting: mockWx.openSetting,
  getUserProfile: mockWx.getUserProfile,
}

;(global as any).uni = mockUni

// Mock console 方法（可选，减少测试输出噪音）
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
// }

// 导出 mock 对象供测试使用
export { mockWx, mockUni, storageStore }
