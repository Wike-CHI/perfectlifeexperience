/**
 * api.ts 单元测试
 * 测试前端API层功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock cloudbase
vi.mock('./cloudbase', () => ({
  callFunction: vi.fn(async (name: string, data: any) => {
    // 模拟云函数返回
    // 模拟云函数返回
    if (name === 'product') {
      if (data.action === 'getProducts') {
        return {
          code: 0,
          data: {
            code: 0,
            msg: 'success',
            data: [{ _id: '1', name: '测试商品', price: 100 }],
            total: 1
          }
        }
      }
      if (data.action === 'getProductDetail') {
        return {
          code: 0,
          data: {
            code: 0,
            msg: 'success',
            data: { _id: data.data.id, name: '测试商品详情' }
          }
        }
      }
      if (data.action === 'getCategories') {
        return {
          code: 0,
          data: {
            code: 0,
            msg: 'success',
            data: [{ _id: '1', name: '测试分类' }]
          }
        }
      }
      if (data.action === 'getHomePageData') {
        return {
          code: 0,
          data: {
            code: 0,
            msg: 'success',
            data: {
              hotProducts: [],
              newProducts: [],
              topSalesProducts: []
            }
          }
        }
      }
      if (data.action === 'getHotProducts') {
        return {
          code: 0,
          data: {
            code: 0,
            msg: 'success',
            data: [{ _id: '1', name: '热门商品' }]
          }
        }
      }
      if (data.action === 'getNewProducts') {
        return {
          code: 0,
          data: {
            code: 0,
            msg: 'success',
            data: [{ _id: '1', name: '新品' }]
          }
        }
      }
    }
    if (name === 'order') {
      if (data.action === 'createOrder') {
        return {
          code: 0,
          data: {
            code: 0,
            msg: 'success',
            data: { orderId: 'order_123' }
          }
        }
      }
      if (data.action === 'getOrders') {
        return {
          code: 0,
          data: {
            code: 0,
            msg: 'success',
            data: { orders: [] }
          }
        }
      }
      if (data.action === 'updateOrderStatus') {
        return { code: 0, data: null }
      }
      if (data.action === 'cancelOrder') {
        return { code: 0, data: null }
      }
    }
    if (name === 'user') {
      if (data.action === 'getUserInfo') {
        return {
          code: 0,
          data: {
            userInfo: { _id: 'user_1', nickName: '测试用户' }
          }
        }
      }
      if (data.action === 'loginOrUpdate') {
        return {
          code: 0,
          data: {
            success: true,
            isNewUser: true,
            userId: 'user_1',
            message: '登录成功'
          }
        }
      }
    }
    if (name === 'wallet') {
      if (data.action === 'getBalance') {
        return {
          code: 0,
          data: { balance: 10000 }
        }
      }
      if (data.action === 'getTransactions') {
        return {
          code: 0,
          data: { list: [], total: 0 }
        }
      }
    }
    if (name === 'commission-wallet') {
      if (data.action === 'getBalance') {
        return {
          code: 0,
          data: {
            data: {
              balance: 5000,
              frozenAmount: 0,
              totalCommission: 10000,
              totalWithdrawn: 5000
            }
          }
        }
      }
    }
    if (name === 'promotion') {
      if (data.action === 'getInfo') {
        return {
          code: 0,
          data: {
            data: {
              inviteCode: 'ABC123',
              agentLevel: 1,
              teamCount: 10
            }
          }
        }
      }
    }
    if (name === 'coupon') {
      if (data.action === 'getTemplates') {
        return {
          code: 0,
          data: [{ _id: '1', name: '优惠券' }]
        }
      }
      if (data.action === 'getMyCoupons') {
        return {
          code: 0,
          data: []
        }
      }
    }
    return { code: 0, data: null }
  }),
  logoutCloudBase: vi.fn()
}))

describe('api.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清除本地存储
    uni.removeStorageSync('local_cart')
    uni.removeStorageSync('local_user')
    uni.removeStorageSync('local_orders')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== 商品相关 API 测试 ====================
  describe('商品API', () => {
    describe('getHomePageData', () => {
      it('应该成功获取首页聚合数据', async () => {
        const { getHomePageData } = await import('./api')

        const result = await getHomePageData()

        expect(result).toHaveProperty('hotProducts')
        expect(result).toHaveProperty('newProducts')
        expect(result).toHaveProperty('topSalesProducts')
      })
    })

    describe('getProducts', () => {
      it('应该成功获取商品列表', async () => {
        const { getProducts } = await import('./api')

        const products = await getProducts()

        expect(Array.isArray(products)).toBe(true)
      })

      it('应该支持分类筛选', async () => {
        const { getProducts } = await import('./api')

        const products = await getProducts({ category: 'beer' })

        expect(Array.isArray(products)).toBe(true)
      })
    })

    describe('getProductDetail', () => {
      it('应该成功获取商品详情', async () => {
        const { getProductDetail } = await import('./api')

        const product = await getProductDetail('product_1')

        expect(product).toBeDefined()
      })
    })

    describe('getHotProducts', () => {
      it('应该成功获取热门商品', async () => {
        const { getHotProducts } = await import('./api')

        const products = await getHotProducts(6)

        expect(Array.isArray(products)).toBe(true)
      })
    })

    describe('getNewProducts', () => {
      it('应该成功获取新品', async () => {
        const { getNewProducts } = await import('./api')

        const products = await getNewProducts(6)

        expect(Array.isArray(products)).toBe(true)
      })
    })

    describe('getCategories', () => {
      it('应该成功获取分类列表', async () => {
        const { getCategories } = await import('./api')

        const categories = await getCategories()

        expect(Array.isArray(categories)).toBe(true)
      })
    })
  })

  // ==================== 购物车相关 API 测试 ====================
  describe('购物车API', () => {
    describe('getCartItems', () => {
      it('空购物车应该返回空数组', async () => {
        const { getCartItems } = await import('./api')

        const items = await getCartItems()

        expect(items).toEqual([])
      })

      it('应该返回购物车中的商品', async () => {
        const { getCartItems, addToCart } = await import('./api')

        await addToCart({
          productId: '1',
          name: '测试商品',
          price: 100,
          quantity: 2,
          image: '',
          specs: '规格1'
        })

        const items = await getCartItems()

        expect(items.length).toBe(1)
        expect(items[0].productId).toBe('1')
      })
    })

    describe('addToCart', () => {
      it('应该添加新商品到购物车', async () => {
        const { addToCart, getCartItems } = await import('./api')

        await addToCart({
          productId: '1',
          name: '测试商品',
          price: 100,
          quantity: 1,
          image: '',
          specs: '规格1'
        })

        const items = await getCartItems()

        expect(items.length).toBe(1)
        expect(items[0].quantity).toBe(1)
      })

      it('相同商品应该累加数量', async () => {
        const { addToCart, getCartItems } = await import('./api')

        await addToCart({
          productId: '1',
          name: '测试商品',
          price: 100,
          quantity: 1,
          image: '',
          specs: '规格1'
        })

        await addToCart({
          productId: '1',
          name: '测试商品',
          price: 100,
          quantity: 2,
          image: '',
          specs: '规格1'
        })

        const items = await getCartItems()

        expect(items.length).toBe(1)
        expect(items[0].quantity).toBe(3)
      })

      it('不同规格应该作为不同商品', async () => {
        const { addToCart, getCartItems } = await import('./api')

        await addToCart({
          productId: '1',
          name: '测试商品',
          price: 100,
          quantity: 1,
          image: '',
          specs: '规格1'
        })

        await addToCart({
          productId: '1',
          name: '测试商品',
          price: 100,
          quantity: 1,
          image: '',
          specs: '规格2'
        })

        const items = await getCartItems()

        expect(items.length).toBe(2)
      })
    })

    describe('updateCartQuantity', () => {
      it('应该更新商品数量', async () => {
        const { addToCart, updateCartQuantity, getCartItems } = await import('./api')

        await addToCart({
          productId: '1',
          name: '测试商品',
          price: 100,
          quantity: 1,
          image: '',
          specs: '规格1'
        })

        const items = await getCartItems()
        await updateCartQuantity(items[0]._id, 5)

        const updatedItems = await getCartItems()
        expect(updatedItems[0].quantity).toBe(5)
      })

      it('数量为0时应该删除商品', async () => {
        const { addToCart, updateCartQuantity, getCartItems } = await import('./api')

        await addToCart({
          productId: '1',
          name: '测试商品',
          price: 100,
          quantity: 1,
          image: '',
          specs: '规格1'
        })

        const items = await getCartItems()
        await updateCartQuantity(items[0]._id, 0)

        const updatedItems = await getCartItems()
        expect(updatedItems.length).toBe(0)
      })
    })

    describe('removeFromCart', () => {
      it('应该删除购物车商品', async () => {
        const { addToCart, removeFromCart, getCartItems } = await import('./api')

        await addToCart({
          productId: '1',
          name: '测试商品',
          price: 100,
          quantity: 1,
          image: '',
          specs: '规格1'
        })

        const items = await getCartItems()
        await removeFromCart(items[0]._id)

        const updatedItems = await getCartItems()
        expect(updatedItems.length).toBe(0)
      })
    })

    describe('clearCart', () => {
      it('应该清空购物车', async () => {
        const { addToCart, clearCart, getCartItems } = await import('./api')

        await addToCart({
          productId: '1',
          name: '测试商品',
          price: 100,
          quantity: 1,
          image: '',
          specs: '规格1'
        })

        await clearCart()

        const items = await getCartItems()
        expect(items.length).toBe(0)
      })
    })

    describe('calculateCartTotal', () => {
      it('应该计算选中商品总价', async () => {
        const { calculateCartTotal } = await import('./api')

        const items = [
          { _id: '1', productId: '1', name: '商品1', price: 100, quantity: 2, selected: true, specs: '' },
          { _id: '2', productId: '2', name: '商品2', price: 200, quantity: 1, selected: true, specs: '' },
          { _id: '3', productId: '3', name: '商品3', price: 300, quantity: 1, selected: false, specs: '' }
        ]

        const total = calculateCartTotal(items)

        // 100*2 + 200*1 = 400
        expect(total).toBe(400)
      })

      it('没有选中商品时应该返回0', async () => {
        const { calculateCartTotal } = await import('./api')

        const items = [
          { _id: '1', productId: '1', name: '商品1', price: 100, quantity: 2, selected: false, specs: '' }
        ]

        const total = calculateCartTotal(items)

        expect(total).toBe(0)
      })
    })
  })

  // ==================== 订单相关 API 测试 ====================
  describe('订单API', () => {
    describe('createOrder', () => {
      it('应该成功创建订单', async () => {
        const { createOrder } = await import('./api')

        const result = await createOrder({
          items: [],
          totalAmount: 1000,
          payAmount: 1000,
          status: 'pending',
          address: {} as any,
          remark: ''
        })

        expect(result).toHaveProperty('_id')
      })
    })

    describe('getOrders', () => {
      it('应该成功获取订单列表', async () => {
        const { getOrders } = await import('./api')

        const orders = await getOrders()

        expect(Array.isArray(orders)).toBe(true)
      })
    })

    describe('updateOrderStatus', () => {
      it('应该成功更新订单状态', async () => {
        const { updateOrderStatus } = await import('./api')

        const result = await updateOrderStatus('order_1', 'paid')

        expect(result.stats.updated).toBe(1)
      })
    })

    describe('cancelOrder', () => {
      it('应该成功取消订单', async () => {
        const { cancelOrder } = await import('./api')

        const result = await cancelOrder('order_1')

        expect(result.stats.updated).toBe(1)
      })
    })
  })

  // ==================== 用户相关 API 测试 ====================
  describe('用户API', () => {
    describe('getUserInfo', () => {
      it('未登录时应该返回null', async () => {
        const { getUserInfo } = await import('./api')

        const user = await getUserInfo()

        expect(user).toBeNull()
      })

      it('应该返回本地存储的用户信息', async () => {
        const { getUserInfo, saveUserInfo } = await import('./api')

        await saveUserInfo({ nickName: '测试用户' })

        const user = await getUserInfo()

        expect(user).not.toBeNull()
        expect(user?.nickName).toBe('测试用户')
      })
    })

    describe('saveUserInfo', () => {
      it('应该保存用户信息', async () => {
        const { saveUserInfo, getUserInfo } = await import('./api')

        await saveUserInfo({
          nickName: '新用户',
          avatarUrl: 'https://example.com/avatar.png'
        })

        const user = await getUserInfo()

        expect(user?.nickName).toBe('新用户')
      })

      it('更新已存在的用户信息', async () => {
        const { saveUserInfo, getUserInfo } = await import('./api')

        await saveUserInfo({ nickName: '用户1' })
        await saveUserInfo({ nickName: '用户2' })

        const user = await getUserInfo()

        expect(user?.nickName).toBe('用户2')
      })
    })

    describe('isUserLoggedIn', () => {
      it('未登录时应该返回false', async () => {
        const { isUserLoggedIn } = await import('./api')

        const result = await isUserLoggedIn()

        expect(result).toBe(false)
      })

      it('已登录时应该返回true', async () => {
        const { isUserLoggedIn, saveUserInfo } = await import('./api')

        await saveUserInfo({ nickName: '测试用户' })

        const result = await isUserLoggedIn()

        expect(result).toBe(true)
      })
    })

    describe('logout', () => {
      it('应该清除用户登录状态', async () => {
        const { saveUserInfo, logout, getUserInfo } = await import('./api')

        await saveUserInfo({ nickName: '测试用户' })
        await logout()

        const user = await getUserInfo()

        expect(user).toBeNull()
      })
    })

    describe('isLoginExpired', () => {
      it('未登录时应该返回true', async () => {
        const { isLoginExpired } = await import('./api')

        const expired = isLoginExpired()

        expect(expired).toBe(true)
      })
    })
  })

  // ==================== 钱包相关 API 测试 ====================
  describe('钱包API', () => {
    describe('getWalletBalance', () => {
      it('应该成功获取钱包余额', async () => {
        const { getWalletBalance } = await import('./api')

        const result = await getWalletBalance()

        expect(result).toHaveProperty('balance')
      })
    })

    describe('getWalletTransactions', () => {
      it('应该成功获取交易记录', async () => {
        const { getWalletTransactions } = await import('./api')

        const result = await getWalletTransactions()

        expect(result).toHaveProperty('list')
        expect(result).toHaveProperty('total')
      })
    })
  })

  // ==================== 佣金钱包相关 API 测试 ====================
  describe('佣金钱包API', () => {
    describe('getCommissionWalletBalance', () => {
      it('应该成功获取佣金钱包余额', async () => {
        const { getCommissionWalletBalance } = await import('./api')

        const result = await getCommissionWalletBalance()

        expect(result).toHaveProperty('balance')
        expect(result).toHaveProperty('frozenAmount')
        expect(result).toHaveProperty('totalCommission')
        expect(result).toHaveProperty('totalWithdrawn')
      })
    })
  })

  // ==================== 推广相关 API 测试 ====================
  describe('推广API', () => {
    describe('getPromotionInfo', () => {
      it('应该成功获取推广信息', async () => {
        const { getPromotionInfo } = await import('./api')

        const result = await getPromotionInfo()

        expect(result).toHaveProperty('inviteCode')
      })
    })
  })

  // ==================== 优惠券相关 API 测试 ====================
  describe('优惠券API', () => {
    describe('getCouponTemplates', () => {
      it('应该成功获取优惠券模板', async () => {
        const { getCouponTemplates } = await import('./api')

        const result = await getCouponTemplates()

        expect(Array.isArray(result)).toBe(true)
      })
    })

    describe('getMyCoupons', () => {
      it('应该成功获取我的优惠券', async () => {
        const { getMyCoupons } = await import('./api')

        const result = await getMyCoupons()

        expect(Array.isArray(result)).toBe(true)
      })
    })

    describe('calculateCouponDiscount', () => {
      it('满减券应该正确计算优惠', async () => {
        const { calculateCouponDiscount } = await import('./api')

        const coupon = {
          _id: '1',
          template: {
            type: 'amount',
            value: 1000,
            minAmount: 2000
          }
        } as any

        const discount = calculateCouponDiscount(coupon, 5000)

        expect(discount).toBe(1000)
      })

      it('折扣券应该正确计算优惠', async () => {
        const { calculateCouponDiscount } = await import('./api')

        const coupon = {
          _id: '1',
          template: {
            type: 'discount',
            value: 90 // 9折
          }
        } as any

        const discount = calculateCouponDiscount(coupon, 10000)

        // 10000 * (100 - 90) / 100 = 1000
        expect(discount).toBe(1000)
      })

      it('不满足最低消费应该返回0', async () => {
        const { calculateCouponDiscount } = await import('./api')

        const coupon = {
          _id: '1',
          template: {
            type: 'amount',
            value: 1000,
            minAmount: 5000
          }
        } as any

        const discount = calculateCouponDiscount(coupon, 3000)

        expect(discount).toBe(0)
      })
    })
  })

  // ==================== 工具函数测试 ====================
  describe('工具函数', () => {
    describe('formatPrice', () => {
      it('应该正确格式化价格（分转元）', async () => {
        const { formatPrice } = await import('./api')

        expect(formatPrice(100)).toBe('1.00')
        expect(formatPrice(1234)).toBe('12.34')
        expect(formatPrice(0)).toBe('0.00')
      })
    })
  })
})
