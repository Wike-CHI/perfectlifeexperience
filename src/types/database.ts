/**
 * CloudBase 数据库类型定义
 *
 * 这个文件是数据库集合类型的"唯一真实来源"
 * 每个集合都应该有对应的类型定义
 *
 * 参考: cloudbase-document-database-in-wechat-miniprogram skill
 */

// ============================================================================
// 通用类型
// ============================================================================

/**
 * 分页查询结果
 */
export interface PaginationResult<T> {
  /** 数据列表 */
  data: T[]
  /** 当前页码 */
  page: number
  /** 每页数量 */
  pageSize: number
  /** 总数量 */
  total: number
  /** 是否有更多 */
  hasMore: boolean
}

/**
 * CloudBase 时间戳类型
 */
export type DBDate = Date | string | number

// ============================================================================
// 用户相关
// ============================================================================

/**
 * users 集合
 * 数据库集合名: users
 * 描述: 用户信息表
 *
 * 简化版推广分销系统：
 * - 单轨四级代理制（1=金牌, 2=银牌, 3=铜牌, 4=普通）
 * - 无星级概念
 */
export interface UserDB {
  _id: string
  /** CloudBase 自动添加的用户标识 */
  _openid: string
  /** 昵称 */
  nickName: string
  /** 头像URL */
  avatarUrl: string
  /** 手机号 */
  phone?: string
  /** 推广路径: "grandparentId/parentId" (正序，最老的祖先在前，最近的父节点在后) */
  promotionPath?: string
  /** 直接父节点ID */
  parentId?: string
  /** 邀请码 */
  inviteCode?: string
  /** 代理级别 (1=金牌推广员, 2=银牌推广员, 3=铜牌推广员, 4=普通会员) */
  agentLevel: number
  /** 性能统计 */
  performance: UserPerformance
  /** 团队人数（冗余字段，与performance.teamCount同步） */
  teamCount?: number
  /** 待结算奖励（分） */
  pendingReward?: number
  /** 累计奖励（分） */
  totalReward?: number
  /** 可提现奖励（分） */
  withdrawableReward?: number
  /** 订单数量 */
  orderCount?: number
  /** 注册IP */
  registerIP?: string
  /** 是否可疑用户 */
  isSuspicious?: boolean
  /** 是否管理员 */
  isAdmin?: boolean
  /** 状态 */
  status?: 'active' | 'inactive' | 'banned'
  /** 创建时间 */
  createTime: DBDate
  /** 更新时间 */
  updateTime?: DBDate
}

/**
 * 用户性能统计（简化版，无直推人数）
 */
export interface UserPerformance {
  /** 累计销售额（分） */
  totalSales: number
  /** 当月销售额（分） */
  monthSales: number
  /** 月度标签 (格式: "YYYY-MM") */
  monthTag: string
  /** 团队总人数 */
  teamCount: number
}

/**
 * admins 集合
 * 数据库集合名: admins
 * 描述: 管理员信息表
 */
export interface AdminDB {
  _id: string
  _openid: string
  /** 管理员用户名 */
  username: string
  /** 密码哈希 */
  passwordHash: string
  /** 真实姓名 */
  realName: string
  /** 角色 */
  role: AdminRole
  /** 权限列表 */
  permissions: string[]
  /** 状态 */
  status: 'active' | 'inactive'
  /** 最后登录时间 */
  lastLoginTime?: DBDate
  /** 创建时间 */
  createTime: DBDate
  /** 更新时间 */
  updateTime?: DBDate
}

/**
 * 管理员角色枚举
 */
export enum AdminRole {
  /** 超级管理员 */
  SUPER_ADMIN = 'super_admin',
  /** 运营管理员 */
  OPERATOR = 'operator',
  /** 财务管理员 */
  FINANCE = 'finance',
  /** 客服管理员 */
  CUSTOMER_SERVICE = 'customer_service'
}

// ============================================================================
// 产品相关
// ============================================================================

/**
 * products 集合
 * 数据库集合名: products
 * 描述: 产品信息表
 */
export interface ProductDB {
  _id: string
  /** 产品名称 */
  name: string
  /** 英文名称 */
  enName: string
  /** 产品描述 */
  description: string
  /** 价格（分） */
  price: number
  /** 价格列表（不同规格） */
  priceList: ProductPrice[]
  /** 分类 */
  category: string
  /** 产品图片URL列表 */
  images: string[]
  /** 标签 */
  tags: string[]
  /** 库存 */
  stock: number
  /** 销量 */
  sales: number
  /** 评分 (0-5) */
  rating: number
  /** 是否热门 */
  isHot: boolean
  /** 是否新品 */
  isNew: boolean
  /** 规格说明 */
  specs: string
  /** 酒精含量 (%) */
  alcoholContent: number
  /** 酿造商 */
  brewery: string
  /** 默认容量 (ml) */
  volume: number
  /** 状态 */
  status: 'on_sale' | 'out_of_stock' | 'discontinued'
  /** 创建时间 */
  createTime: DBDate
  /** 更新时间 */
  updateTime?: DBDate
}

/**
 * 产品价格规格
 */
export interface ProductPrice {
  /** 价格（分） */
  price: number
  /** 容量描述 */
  volume: string
}

/**
 * categories 集合
 * 数据库集合名: categories
 * 描述: 产品分类表
 */
export interface CategoryDB {
  _id: string
  /** 分类名称 */
  name: string
  /** 分类图标 */
  icon: string
  /** 排序序号 */
  sortOrder: number
  /** 状态 */
  status: 'active' | 'inactive'
  /** 创建时间 */
  createTime: DBDate
  /** 更新时间 */
  updateTime?: DBDate
}

// ============================================================================
// 订单相关
// ============================================================================

/**
 * orders 集合
 * 数据库集合名: orders
 * 描述: 订单信息表
 */
export interface OrderDB {
  _id: string
  _openid: string
  /** 订单编号 */
  orderNo: string
  /** 订单总金额（分） */
  totalAmount: number
  /** 订单状态 */
  status: OrderStatus
  /** 产品列表 */
  products: OrderProduct[]
  /** 收货地址 */
  address: OrderAddress
  /** 用户备注 */
  remark?: string
  /** 支付方式 */
  payMethod?: 'wechat' | 'wallet' | 'mixed'
  /** 支付时间 */
  payTime?: DBDate
  /** 发货时间 */
  shipTime?: DBDate
  /** 完成时间 */
  completeTime?: DBDate
  /** 快递公司 */
  expressCompany?: string
  /** 快递单号 */
  expressNo?: string
  /** 创建时间 */
  createTime: DBDate
  /** 更新时间 */
  updateTime?: DBDate
}

/**
 * 订单状态枚举
 */
export enum OrderStatus {
  /** 待支付 */
  PENDING = 'pending',
  /** 已支付 */
  PAID = 'paid',
  /** 已发货 */
  SHIPPED = 'shipped',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 退款中 */
  REFUNDING = 'refunding',
  /** 已退款 */
  REFUNDED = 'refunded',
  /** 已取消 */
  CANCELLED = 'cancelled'
}

/**
 * 订单产品
 */
export interface OrderProduct {
  /** 产品ID */
  productId: string
  /** 产品名称 */
  name: string
  /** 产品图片 */
  image: string
  /** 价格（分） */
  price: number
  /** 数量 */
  quantity: number
  /** 规格描述 */
  specs?: string
}

/**
 * 订单收货地址
 */
export interface OrderAddress {
  /** 收货人姓名 */
  userName: string
  /** 联系电话 */
  phone: string
  /** 省份 */
  province: string
  /** 城市 */
  city: string
  /** 区/县 */
  district: string
  /** 详细地址 */
  detail: string
}

/**
 * refunds 集合
 * 数据库集合名: refunds
 * 描述: 退款申请表
 */
export interface RefundDB {
  _id: string
  _openid: string
  /** 订单ID */
  orderId: string
  /** 订单编号 */
  orderNo: string
  /** 退款金额（分） */
  refundAmount: number
  /** 退款原因 */
  reason: string
  /** 退款说明 */
  description?: string
  /** 退款凭证图片 */
  proofImages?: string[]
  /** 退款状态 */
  status: RefundStatus
  /** 审核意见 */
  rejectReason?: string
  /** 申请时间 */
  applyTime: DBDate
  /** 审核时间 */
  auditTime?: DBDate
  /** 完成时间 */
  completeTime?: DBDate
  /** 创建时间 */
  createTime: DBDate
  /** 更新时间 */
  updateTime?: DBDate
}

/**
 * 退款状态枚举
 */
export enum RefundStatus {
  /** 待审核 */
  PENDING = 'pending',
  /** 已批准 */
  APPROVED = 'approved',
  /** 已拒绝 */
  REJECTED = 'rejected',
  /** 退款中 */
  PROCESSING = 'processing',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 已取消 */
  CANCELLED = 'cancelled'
}

// ============================================================================
// 推广系统相关
// ============================================================================

/**
 * promotion_relations 集合
 * 数据库集合名: promotion_relations
 * 描述: 推广关系表
 */
export interface PromotionRelationDB {
  _id: string
  /** 父节点 OpenID */
  parentOpenid: string
  /** 子节点 OpenID */
  childOpenid: string
  /** 层级 (1-4) */
  level: number
  /** 状态 */
  status: 'active' | 'inactive'
  /** 创建时间 */
  createTime: DBDate
  /** 解除时间 */
  removeTime?: DBDate
}

/**
 * promotion_orders 集合
 * 数据库集合名: promotion_orders
 * 描述: 推广订单表（用于奖励计算）
 */
export interface PromotionOrderDB {
  _id: string
  _openid: string
  /** 订单ID */
  orderId: string
  /** 订单编号 */
  orderNo: string
  /** 订单金额（分） */
  orderAmount: number
  /** 购买用户 OpenID */
  buyerOpenid: string
  /** 推广路径 */
  promotionPath: string
  /** 是否已计算奖励 */
  rewardCalculated: boolean
  /** 创建时间 */
  createTime: DBDate
}

/**
 * promotion_logs 集合
 * 数据库集合名: promotion_logs
 * 描述: 推广操作日志表
 */
export interface PromotionLogDB {
  _id: string
  _openid: string
  /** 操作类型 */
  action: 'bind' | 'unbind' | 'calculate_reward' | 'level_up'
  /** 操作详情 */
  details: Record<string, any>
  /** IP地址 */
  ip?: string
  /** 创建时间 */
  createTime: DBDate
}

/**
 * reward_records 集合
 * 数据库集合名: reward_records
 * 描述: 推广奖励记录表
 */
export interface RewardRecordDB {
  _id: string
  /** 受益用户ID */
  beneficiaryId: string
  /** 订单ID */
  orderId: string
  /** 订单金额（分） */
  orderAmount?: number
  /** 佣金比例 */
  ratio?: number
  /** 奖励金额（分） */
  amount: number
  /** 奖励类型 */
  rewardType: RewardType
  /** 奖励类型名称 */
  rewardTypeName?: string
  /** 奖励状态 */
  status: RewardStatus
  /** 推广层级 (1-4) */
  level: number
  /** 来源用户ID（下单用户） */
  sourceUserId?: string
  /** 来源用户信息（冗余字段） */
  sourceUser?: {
    _id: string
    nickName: string
    avatarUrl: string
  }
  /** 创建时间 */
  createTime: DBDate
  /** 结算时间 */
  settleTime?: DBDate
  /** 推广关系ID */
  relationId?: string
  /** 退款扣回金额（分） */
  revokeAmount?: number
  /** 退款扣回比例 */
  revokeRatio?: number
  /** 退款扣回时间 */
  revokeTime?: DBDate
  /** 退款扣回原因 */
  revokeReason?: string
  /** 部分扣回累计金额（分） */
  deductedAmount?: number
  /** 取消原因 */
  cancelReason?: string
}

/**
 * 奖励类型枚举（简化版，仅推广佣金）
 */
export enum RewardType {
  /** 推广佣金 */
  COMMISSION = 'commission'
}

/**
 * 奖励状态枚举
 */
export enum RewardStatus {
  /** 待结算 */
  PENDING = 'pending',
  /** 已结算 */
  SETTLED = 'settled',
  /** 已取消 */
  CANCELLED = 'cancelled',
  /** 已扣回 */
  DEDUCTED = 'deducted'
}

/**
 * commission_wallets 集合
 * 数据库集合名: commission_wallets
 * 描述: 佣金钱包表
 */
export interface CommissionWalletDB {
  _id: string
  _openid: string
  /** 可用余额（分） */
  balance: number
  /** 冻结金额（分）- 提现申请中冻结 */
  frozenAmount?: number
  /** 累计佣金（分） */
  totalCommission: number
  /** 累计提现（分） */
  totalWithdrawn: number
  /** 创建时间 */
  createTime: DBDate
  /** 更新时间 */
  updateTime: DBDate
}

/**
 * commission_transactions 集合
 * 数据库集合名: commission_transactions
 * 描述: 佣金交易记录表
 */
export interface CommissionTransactionDB {
  _id: string
  _openid: string
  /** 交易类型 */
  type: 'reward_settlement' | 'withdraw_apply' | 'withdraw_success' | 'withdraw_rejected' | 'reward_deduct'
  /** 交易金额（分）正数为收入，负数为支出 */
  amount: number
  /** 交易标题 */
  title?: string
  /** 交易描述 */
  description?: string
  /** 关联订单ID */
  orderId?: string
  /** 关联奖励记录ID */
  rewardId?: string
  /** 关联提现单号 */
  withdrawNo?: string
  /** 关联提现记录ID */
  withdrawalId?: string
  /** 交易状态 */
  status: 'pending' | 'success' | 'failed'
  /** 创建时间 */
  createTime: DBDate
}

/**
 * withdrawals 集合
 * 数据库集合名: withdrawals
 * 描述: 提现记录表
 */
export interface WithdrawalDB {
  _id: string
  _openid: string
  /** 提现单号 */
  withdrawNo: string
  /** 提现金额（分） */
  amount: number
  /** 提现状态 */
  status: 'pending' | 'approved' | 'rejected' | 'success'
  /** 申请时间 */
  applyTime: DBDate
  /** 审批人ID */
  approvedBy?: string
  /** 审批时间 */
  approvedTime?: DBDate
  /** 拒绝人ID */
  rejectedBy?: string
  /** 拒绝时间 */
  rejectedTime?: DBDate
  /** 拒绝原因 */
  rejectReason?: string
  /** 转账状态 */
  transferStatus?: 'pending' | 'success' | 'failed' | 'manual'
  /** 转账失败原因 */
  transferError?: string
  /** 转账时间 */
  transferTime?: DBDate
  /** 更新时间 */
  updateTime?: DBDate
}

// ============================================================================
// 钱包相关
// ============================================================================

/**
 * user_wallets 集合
 * 数据库集合名: user_wallets
 * 描述: 用户钱包表
 */
export interface UserWalletDB {
  _id: string
  _openid: string
  /** 余额（分） */
  balance: number
  /** 累计充值（分） */
  totalRecharge: number
  /** 累计消费（分） */
  totalConsumption: number
  /** 累计退款（分） */
  totalRefund: number
  /** 创建时间 */
  createTime: DBDate
  /** 更新时间 */
  updateTime: DBDate
}

/**
 * recharge_orders 集合
 * 数据库集合名: recharge_orders
 * 描述: 充值订单表
 */
export interface RechargeOrderDB {
  _id: string
  _openid: string
  /** 充值订单号 */
  orderNo: string
  /** 充值金额（分） */
  amount: number
  /** 支付方式 */
  payMethod: 'wechat'
  /** 订单状态 */
  status: 'pending' | 'paid' | 'failed' | 'cancelled'
  /** 支付时间 */
  payTime?: DBDate
  /** 创建时间 */
  createTime: DBDate
}

/**
 * wallet_transactions 集合
 * 数据库集合名: wallet_transactions
 * 描述: 钱包交易记录表
 */
export interface WalletTransactionDB {
  _id: string
  _openid: string
  /** 交易类型 */
  type: TransactionType
  /** 交易金额（分）正数为收入，负数为支出 */
  amount: number
  /** 交易前余额（分） */
  balanceBefore: number
  /** 交易后余额（分） */
  balanceAfter: number
  /** 关联订单ID */
  orderId?: string
  /** 交易说明 */
  description: string
  /** 创建时间 */
  createTime: DBDate
}

/**
 * 交易类型枚举
 */
export enum TransactionType {
  /** 充值 */
  RECHARGE = 'recharge',
  /** 消费 */
  CONSUMPTION = 'consumption',
  /** 退款 */
  REFUND = 'refund',
  /** 佣金收入 */
  COMMISSION = 'commission',
  /** 提现 */
  WITHDRAW = 'withdraw',
  /** 提现失败退款 */
  WITHDRAW_REFUND = 'withdraw_refund'
}

// ============================================================================
// 优惠券相关
// ============================================================================

/**
 * coupon_templates 集合
 * 数据库集合名: coupon_templates
 * 描述: 优惠券模板表
 */
export interface CouponTemplateDB {
  _id: string
  /** 优惠券名称 */
  name: string
  /** 优惠券描述 */
  description: string
  /** 优惠券类型 */
  type: CouponType
  /** 优惠金额（分）或折扣率（%） */
  value: number
  /** 最低消费金额（分） */
  minAmount?: number
  /** 有效期（天） */
  validityDays: number
  /** 总发行量 */
  totalQuantity: number
  /** 已领取数量 */
  claimedQuantity: number
  /** 状态 */
  status: 'active' | 'inactive' | 'expired'
  /** 创建时间 */
  createTime: DBDate
  /** 更新时间 */
  updateTime?: DBDate
}

/**
 * 优惠券类型枚举
 */
export enum CouponType {
  /** 满减券 */
  DISCOUNT = 'discount',
  /** 折扣券 */
  PERCENTAGE = 'percentage'
}

/**
 * user_coupons 集合
 * 数据库集合名: user_coupons
 * 描述: 用户优惠券表
 */
export interface UserCouponDB {
  _id: string
  _openid: string
  /** 优惠券模板ID */
  templateId: string
  /** 优惠券名称（冗余） */
  name: string
  /** 优惠券类型 */
  type: CouponType
  /** 优惠金额或折扣率 */
  value: number
  /** 最低消费金额（分） */
  minAmount?: number
  /** 开始时间 */
  startTime: DBDate
  /** 结束时间 */
  endTime: DBDate
  /** 使用状态 */
  status: 'unused' | 'used' | 'expired'
  /** 使用订单ID */
  orderId?: string
  /** 创建时间 */
  createTime: DBDate
}
