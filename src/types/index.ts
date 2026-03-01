// 商品数据类型
export interface Product {
  _id?: string;
  _openid?: string;
  name: string;
  enName?: string;
  description: string;
  specs?: string;
  price: number;
  priceList?: Array<{ volume: string; price: number }>;
  originalPrice?: number;
  images: string[];
  category: string;
  tags: string[];
  stock: number;
  sales: number;
  rating: number;
  brewery: string;
  alcoholContent: number;
  volume: number;
  isHot?: boolean;
  isNew?: boolean;
  createTime?: Date;
}

// 分类数据类型
export interface Category {
  _id?: string;
  name: string;
  icon: string;
  sort: number;
  isActive: boolean;
}

// 购物车数据类型
export interface CartItem {
  _id?: string;
  _openid?: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  selected: boolean;
  stock: number;
  category: string;
  specs?: string;
  updateTime?: Date;
}

// 订单商品项
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  specs?: string;
}

// 地址数据类型
export interface Address {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

// 订单数据类型
export interface Order {
  _id?: string;
  _openid?: string;
  orderNo: string;
  products: OrderItem[];
  totalAmount: number;
  shippingFee?: number;
  deliveryType?: 'delivery' | 'pickup';
  status: 'pending' | 'paid' | 'shipping' | 'completed' | 'cancelled' | 'refunded';
  address?: Address;
  remark?: string;
  paymentMethod?: 'wechat' | 'balance';
  deliveryTime?: string;
  createTime: Date;
  payTime?: Date;
  shipTime?: Date;
  completeTime?: Date;
  // 退款相关字段
  refundAmount?: number;         // 已退款金额（分）
  refundStatus?: 'none' | 'partial' | 'full'; // 退款状态
}

// 用户数据类型
export interface UserInfo {
  _id?: string;
  _openid?: string;
  nickName: string;
  avatarUrl: string;
  phone?: string;
  addresses: Address[];
  createTime?: Date;
}

// 轮播图数据类型
export interface Banner {
  _id?: string;
  image: string;
  link: string;
  sort: number;
  isActive: boolean;
  title?: string;
  subtitle?: string;
}

// 钱包数据类型
export interface Wallet {
  balance: number;
  updateTime?: Date;
}

// 交易记录类型
export interface Transaction {
  _id?: string;
  type: 'recharge' | 'payment' | 'refund';
  amount: number;
  title: string;
  status: 'pending' | 'success' | 'failed';
  createTime: Date;
}

// 优惠券模板类型
export interface CouponTemplate {
  _id?: string;
  name: string;
  type: 'amount' | 'discount' | 'no_threshold';
  value: number;
  minAmount?: number;
  totalCount: number;
  receivedCount: number;
  limitPerUser: number;
  startTime: Date;
  endTime: Date;
  validDays: number;
  applicableScope: 'all' | string[];
  description: string;
  isActive: boolean;
  createTime?: Date;
}

// 用户优惠券类型
export interface UserCoupon {
  _id?: string;
  _openid?: string;
  templateId: string;
  template?: CouponTemplate;
  status: 'unused' | 'used' | 'expired';
  receiveTime: Date;
  useTime?: Date;
  expireTime: Date;
  orderNo?: string;
}

// ==================== 推广相关类型 ====================
// 更新记录：2026年2月重构为单一四级代理制

// 奖励类型（只有佣金一种）
export type RewardType = 'commission';

// 代理层级枚举（唯一等级体系）
// 1=金牌推广员, 2=银牌推广员, 3=铜牌推广员, 4=普通会员
export type AgentLevel = 0 | 1 | 2 | 3 | 4;

// 代理层级常量
export const AgentLevelValues = {
  HEAD_OFFICE: 0,   // 总公司
  GOLD: 1,          // 金牌推广员 = 一级代理
  SILVER: 2,        // 银牌推广员 = 二级代理
  BRONZE: 3,        // 铜牌推广员 = 三级代理
  NORMAL: 4         // 普通会员 = 四级代理
} as const;

// 代理层级名称映射
export const AgentLevelNames: Record<AgentLevel, string> = {
  0: '总公司',
  1: '金牌推广员',
  2: '银牌推广员',
  3: '铜牌推广员',
  4: '普通会员'
};

// 业绩追踪对象
export interface Performance {
  totalSales: number;      // 历史累计销售额 (单位: 分)
  monthSales: number;      // 本月销售额 (单位: 分)
  monthTag: string;        // 跨月标识, 如 "2026-02"
  teamCount: number;       // 团队总人数
}

// 推广用户信息
export interface PromotionUser {
  _id?: string;
  _openid?: string;
  nickName: string;
  avatarUrl: string;
  inviteCode: string;
  parentId?: string;
  promotionPath?: string;
  // === 等级（单一体系）===
  agentLevel: AgentLevel;         // 代理层级 (1-4)
  performance: Performance;       // 业绩追踪
  // === 奖励统计 ===
  totalReward: number;
  pendingReward: number;
  // === 其他 ===
  isSuspicious?: boolean;
  createTime?: Date;
}

// 推广关系
export interface PromotionRelation {
  _id?: string;
  userId: string;
  parentId: string;
  level: number;
  path: string;
  createTime?: Date;
}

// 推广订单
export interface PromotionOrder {
  _id?: string;
  orderId: string;
  buyerId: string;
  orderAmount: number;
  status: 'pending' | 'settled' | 'invalid';
  needReview?: boolean;
  createTime?: Date;
  settleTime?: Date;
}

// 奖励记录
export interface RewardRecord {
  _id?: string;
  orderId: string;
  beneficiaryId: string;
  sourceUserId: string;
  level: number;
  orderAmount: number;
  ratio: number;
  amount: number;
  status: 'pending' | 'settled' | 'cancelled' | 'deducted';
  cancelReason?: string;
  createTime?: Date;
  settleTime?: Date;
  // === 新增奖励类型字段 ===
  rewardType: RewardType;         // 奖励类型
  rewardTypeName: string;         // 奖励类型名称
  sourceUser?: {
    nickName: string;
    avatarUrl: string;
  };
}

// 团队统计
export interface TeamStats {
  total: number;
  level1: number;
  level2: number;
  level3: number;
  level4: number;
}

// 晋升进度信息
export interface PromotionProgress {
  currentLevel: AgentLevel;
  currentLevelName: string;
  nextLevel: AgentLevel | null;
  nextLevelName: string | null;
  // 销售额进度
  salesProgress: {
    current: number;
    target: number;
    percent: number;
  };
  // 团队人数进度
  teamProgress: {
    current: number;
    target: number;
    percent: number;
  };
}

// 推广信息响应
export interface PromotionInfo {
  inviteCode: string;
  // === 等级信息 ===
  agentLevel: AgentLevel;
  agentLevelName: string;      // 对外名称（金牌/银牌/铜牌/普通）
  agentLevelInternalName: string; // 内部名称（一级/二级/三级/四级代理）
  // === 奖励统计 ===
  totalReward: number;
  pendingReward: number;
  withdrawableReward: number;
  todayReward: number;
  monthReward: number;
  // === 业绩数据 ===
  performance: Performance;
  // === 晋升进度 ===
  promotionProgress: PromotionProgress | null;
  // === 团队统计 ===
  teamStats: TeamStats;
}

// 钱包交易记录（扩展）
export interface WalletTransaction {
  _id?: string;
  _openid?: string;
  type: 'recharge' | 'payment' | 'refund' | 'reward' | 'reward_deduct';
  amount: number;
  title: string;
  description?: string;
  orderId?: string;
  status: 'pending' | 'success' | 'failed';
  createTime?: Date;
}

// ==================== 佣金计算相关类型 ====================

// 佣金分配结果
export interface CommissionReward {
  beneficiaryId: string;
  beneficiaryName: string;
  type: 'commission';
  typeName: string;
  amount: number;
  ratio: number;
  role: string;  // '推广人' | '1级上级' | '2级上级' | '3级上级'
  agentLevel: AgentLevel;
  agentLevelName: string;
}

// 佣金计算响应
export interface CommissionResponse {
  rewards: CommissionReward[];
  promoterLevel: AgentLevel;
  promoterLevelName: string;
  commissionRule: {
    own: number;
    upstream: number[];
  };
}

// 升级响应
export interface PromotionResponse {
  success: boolean;
  promoted: {
    userId: string;
    from: AgentLevel;
    to: AgentLevel;
  };
  followedUsers?: Array<{
    userId: string;
    fromLevel: AgentLevel;
    toLevel: AgentLevel;
  }>;
}

// ==================== 退款相关类型 ====================

// 退款类型
export type RefundType = 'only_refund' | 'return_refund';

// 退款状态
export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'waiting_receive' | 'processing' | 'success' | 'failed';

// 退款商品项
export interface RefundProductItem {
  productId: string;
  productName: string;
  productImage?: string;
  skuId?: string;
  skuName?: string;
  quantity: number;        // 订单中数量
  refundQuantity: number;  // 退款数量
  price: number;           // 单价
  totalPrice: number;      // 小计
}

// 退货物流信息
export interface ReturnLogistics {
  company: string;      // 物流公司
  trackingNo: string;   // 运单号
  shipTime: Date;       // 寄出时间
}

// 退款记录
export interface Refund {
  _id?: string;
  _openid?: string;
  orderId: string;
  orderNo: string;
  refundNo: string;

  // 退款信息
  refundAmount: number;     // 退款金额（分）
  refundReason: string;     // 退款原因
  refundType: RefundType;   // 退款类型
  refundStatus: RefundStatus; // 退款状态

  // 商品信息
  products?: RefundProductItem[];

  // 物流信息（退货时）
  returnLogistics?: ReturnLogistics;

  // 审核信息
  auditBy?: string;        // 审核管理员ID
  auditTime?: Date;        // 审核时间
  auditRemark?: string;    // 审核备注
  rejectReason?: string;   // 拒绝原因

  // 退款结果
  transactionId?: string;  // 微信退款交易号
  successTime?: Date;      // 退款成功时间
  failedReason?: string;   // 失败原因

  createTime: Date;
  updateTime: Date;
}

// 退款状态显示名称映射
export const RefundStatusNames: Record<RefundStatus, string> = {
  pending: '待审核',
  approved: '已同意',
  rejected: '已拒绝',
  waiting_receive: '等待收货',
  processing: '退款中',
  success: '退款成功',
  failed: '退款失败'
};

// 退款类型显示名称映射
export const RefundTypeNames: Record<RefundType, string> = {
  only_refund: '仅退款',
  return_refund: '退货退款'
};
