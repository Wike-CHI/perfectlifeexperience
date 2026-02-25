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
  status: 'pending' | 'paid' | 'shipping' | 'completed' | 'cancelled';
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

// 奖励类型枚举
export type RewardType = 'commission' | 'repurchase' | 'management' | 'nurture';

// 星级身份枚举
export type StarLevel = 0 | 1 | 2 | 3;

// 代理层级枚举
export type AgentLevel = 0 | 1 | 2 | 3 | 4;

// 业绩追踪对象
export interface Performance {
  totalSales: number;      // 历史累计销售额 (单位: 分)
  monthSales: number;      // 本月销售额 (单位: 分)
  monthTag: string;        // 跨月标识, 如 "2026-02"
  directCount: number;     // 直推有效人数
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
  // === 双轨制身份 ===
  starLevel: StarLevel;           // 星级身份 (0-3)
  agentLevel: AgentLevel;         // 代理层级 (0-4)
  performance: Performance;       // 业绩追踪
  mentorId?: string;              // 育成导师ID
  // === 奖励统计 ===
  totalReward: number;
  pendingReward: number;
  // === 奖励分类统计 ===
  commissionReward?: number;      // 基础佣金累计
  repurchaseReward?: number;      // 复购奖励累计
  managementReward?: number;      // 团队管理奖累计
  nurtureReward?: number;         // 育成津贴累计
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
  currentLevel: StarLevel;
  nextLevel: StarLevel | null;
  // 金额进度
  salesProgress: {
    current: number;
    target: number;
    percent: number;
  };
  // 人数进度
  countProgress: {
    current: number;
    target: number;
    percent: number;
  };
}

// 推广信息响应
export interface PromotionInfo {
  inviteCode: string;
  // === 双轨制身份 ===
  starLevel: StarLevel;
  agentLevel: AgentLevel;
  starLevelName: string;       // 星级名称
  agentLevelName: string;      // 代理层级名称
  // === 奖励统计 ===
  totalReward: number;
  pendingReward: number;
  todayReward: number;
  monthReward: number;
  // === 分类奖励统计 ===
  commissionReward: number;    // 基础佣金
  repurchaseReward: number;    // 复购奖励
  managementReward: number;    // 团队管理奖
  nurtureReward: number;       // 育成津贴
  // === 业绩数据 ===
  performance: Performance;
  // === 晋升进度 ===
  promotionProgress: PromotionProgress;
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

// ==================== 推广体系V2类型定义 ====================

// V2佣金分配结果
export interface CommissionV2Reward {
  beneficiaryId: string;
  beneficiaryName: string;
  type: 'commission';
  amount: number;
  ratio: number;
  role: string;  // '推广人' | '1级上级' | '2级上级' | '3级上级'
}

// V2佣金计算响应
export interface CommissionV2Response {
  rewards: CommissionV2Reward[];
  promoterLevel: number;
  commissionRule: {
    own: number;
    upstream: number[];
  };
}

// 升级历史记录
export interface PromotionHistoryItem {
  from: number;
  to: number;
  type: 'self' | 'follow' | 'star_promotion';
  triggeredBy?: string;
  timestamp: Date;
  oldPath?: string;
  newPath?: string;
}

// 升级响应
export interface PromotionResponse {
  success: boolean;
  promoted: {
    userId: string;
    from: number;
    to: number;
    newPath: string;
  };
  followUpdates: Array<{
    childId: string;
    childName: string;
    from: number;
    to: number;
  }>;
}

// 推广用户信息（V2）
export interface PromotionUserV2 {
  _openid: string;
  agentLevel: number;  // 1-4
  starLevel: number;   // 0-3
  promotionPath: string;
  promotionHistory: PromotionHistoryItem[];
  nickName: string;
  avatarUrl: string;
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
