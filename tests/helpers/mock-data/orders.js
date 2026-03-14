/**
 * 订单Mock数据
 * 包含不同状态的订单用于测试
 */
module.exports = {
  // 待支付订单
  pending: {
    _id: 'order_pending_001',
    orderNo: 'ON2026031400001',
    userId: 'user_level4_001',
    products: [{
      productId: 'product_active_001',
      name: '大友元气精酿啤酒',
      image: 'https://example.com/beer1.jpg',
      quantity: 2,
      price: 2800,
      specs: '500ml'
    }],
    totalAmount: 5600,
    actualAmount: 5600,
    status: 'pending', // 待支付
    paymentMethod: '',
    createTime: new Date(),
    payTime: null,
    address: {
      userName: '张三',
      phone: '13800000004',
      province: '北京市',
      city: '北京市',
      district: '朝阳区',
      detail: 'xxx街道xxx号'
    }
  },

  // 已支付订单
  paid: {
    _id: 'order_paid_001',
    orderNo: 'ON2026031400002',
    userId: 'user_level4_001',
    products: [{
      productId: 'product_active_001',
      name: '大友元气精酿啤酒',
      image: 'https://example.com/beer1.jpg',
      quantity: 1,
      price: 2800,
      specs: '500ml'
    }],
    totalAmount: 2800,
    actualAmount: 2800,
    status: 'paid', // 已支付
    paymentMethod: 'balance',
    createTime: new Date(Date.now() - 3600000),
    payTime: new Date(Date.now() - 3000000),
    address: {
      userName: '张三',
      phone: '13800000004',
      province: '北京市',
      city: '北京市',
      district: '朝阳区',
      detail: 'xxx街道xxx号'
    }
  },

  // 已完成订单
  completed: {
    _id: 'order_completed_001',
    orderNo: 'ON2026031300001',
    userId: 'user_regular_001',
    products: [{
      productId: 'product_hot_001',
      name: '人气精酿',
      image: 'https://example.com/beer4.jpg',
      quantity: 3,
      price: 3200,
      specs: '500ml'
    }],
    totalAmount: 9600,
    actualAmount: 9600,
    status: 'completed', // 已完成
    paymentMethod: 'wechat',
    createTime: new Date('2026-03-13'),
    payTime: new Date('2026-03-13'),
    completeTime: new Date('2026-03-14'),
    address: {
      userName: '李四',
      phone: '13800000006',
      province: '上海市',
      city: '上海市',
      district: '浦东新区',
      detail: 'yyy路yyy号'
    }
  },

  // 已退款订单
  refunded: {
    _id: 'order_refunded_001',
    orderNo: 'ON2026031200001',
    userId: 'user_level3_001',
    products: [{
      productId: 'product_active_001',
      name: '大友元气精酿啤酒',
      image: 'https://example.com/beer1.jpg',
      quantity: 1,
      price: 2800,
      specs: '500ml'
    }],
    totalAmount: 2800,
    actualAmount: 2800,
    status: 'refunded', // 已退款
    paymentMethod: 'balance',
    createTime: new Date('2026-03-12'),
    payTime: new Date('2026-03-12'),
    refundTime: new Date('2026-03-13'),
    refundReason: '不想要了',
    address: {
      userName: '王五',
      phone: '13800000003',
      province: '广州市',
      city: '广州市',
      district: '天河区',
      detail: 'zzz大道zzz号'
    }
  },

  // 大额订单（用于佣金测试）
  largeOrder: {
    _id: 'order_large_001',
    orderNo: 'ON2026031400003',
    userId: 'user_level4_001',
    products: [{
      productId: 'product_multispec_001',
      name: '多规格精酿套装',
      image: 'https://example.com/set.jpg',
      quantity: 10,
      price: 8800,
      specs: '1500ml'
    }],
    totalAmount: 88000, // 880元
    actualAmount: 88000,
    status: 'paid',
    paymentMethod: 'wechat',
    createTime: new Date(),
    payTime: new Date(),
    address: {
      userName: '赵六',
      phone: '13800000004',
      province: '深圳市',
      city: '深圳市',
      district: '南山区',
      detail: 'aaa路aaa号'
    }
  }
};
