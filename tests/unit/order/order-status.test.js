/**
 * 订单状态流转单元测试
 *
 * 测试订单从创建到完成的状态变化:
 * - 正常流程: 待支付 → 已支付 → 已发货 → 已完成
 * - 取消流程: 待支付 → 已取消
 * - 退款流程: 已支付/已发货 → 已退款
 * - 状态约束: 某些状态转换不允许
 *
 * @see cloudfunctions/order/constants.js - OrderStatus
 */

const assert = require('assert');

// ==================== 订单状态常量 ====================

/**
 * 订单状态枚举(与 cloudfunctions/order/constants.js 保持一致)
 */
const OrderStatus = {
  PENDING: 'pending',       // 待支付
  PAID: 'paid',            // 已支付
  SHIPPING: 'shipping',     // 配送中
  COMPLETED: 'completed',   // 已完成
  CANCELLED: 'cancelled',   // 已取消
  REFUNDED: 'refunded'      // 已退款
};

// ==================== 状态流转规则 ====================

/**
 * 允许的状态转换规则
 * Key: 当前状态
 * Value: 允许转换到的下一个状态数组
 */
const StatusTransitions = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.SHIPPING, OrderStatus.REFUNDED],
  [OrderStatus.SHIPPING]: [OrderStatus.COMPLETED, OrderStatus.REFUNDED],
  [OrderStatus.COMPLETED]: [], // 已完成是终态
  [OrderStatus.CANCELLED]: [], // 已取消是终态
  [OrderStatus.REFUNDED]: []   // 已退款是终态
};

/**
 * 检查状态转换是否允许
 * @param {string} currentStatus - 当前状态
 * @param {string} newStatus - 目标状态
 * @returns {boolean} 是否允许转换
 */
function canTransitionTo(currentStatus, newStatus) {
  const allowedTransitions = StatusTransitions[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

/**
 * 执行状态转换
 * @param {object} order - 订单对象
 * @param {string} newStatus - 新状态
 * @returns {object} { success, message, order }
 */
function transitionOrderStatus(order, newStatus) {
  const currentStatus = order.status;

  if (!currentStatus) {
    return {
      success: false,
      message: '订单状态缺失',
      order
    };
  }

  if (currentStatus === newStatus) {
    return {
      success: true,
      message: '状态未变化',
      order
    };
  }

  if (!canTransitionTo(currentStatus, newStatus)) {
    return {
      success: false,
      message: `不允许从 ${currentStatus} 转换到 ${newStatus}`,
      order
    };
  }

  // 执行状态转换
  order.status = newStatus;
  order.updateTime = new Date().toISOString();

  return {
    success: true,
    message: `状态已从 ${currentStatus} 更新为 ${newStatus}`,
    order
  };
}

// ==================== 测试套件 ====================

describe('订单状态流转测试', () => {

  describe('正常订单流程', () => {

    it('应该正确流转: 待支付 → 已支付', () => {
      // Arrange
      const order = { status: OrderStatus.PENDING, id: 'order_001' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.PAID);

      // Assert
      assert.strictEqual(result.success, true, '应该允许流转');
      assert.strictEqual(order.status, OrderStatus.PAID, '状态应该更新为已支付');

      console.log('✅ 待支付 → 已支付 流转正确');
    });

    it('应该正确流转: 已支付 → 配送中', () => {
      // Arrange
      const order = { status: OrderStatus.PAID, id: 'order_002' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.SHIPPING);

      // Assert
      assert.strictEqual(result.success, true, '应该允许流转');
      assert.strictEqual(order.status, OrderStatus.SHIPPING, '状态应该更新为配送中');

      console.log('✅ 已支付 → 配送中 流转正确');
    });

    it('应该正确流转: 配送中 → 已完成', () => {
      // Arrange
      const order = { status: OrderStatus.SHIPPING, id: 'order_003' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.COMPLETED);

      // Assert
      assert.strictEqual(result.success, true, '应该允许流转');
      assert.strictEqual(order.status, OrderStatus.COMPLETED, '状态应该更新为已完成');

      console.log('✅ 配送中 → 已完成 流转正确');
    });

    it('应该支持完整流程: 待支付 → 已支付 → 配送中 → 已完成', () => {
      // Arrange
      const order = { status: OrderStatus.PENDING, id: 'order_004' };
      const expectedFlow = [
        OrderStatus.PENDING,
        OrderStatus.PAID,
        OrderStatus.SHIPPING,
        OrderStatus.COMPLETED
      ];

      // Act
      const actualFlow = [order.status];
      actualFlow.push(transitionOrderStatus(order, OrderStatus.PAID).order.status);
      actualFlow.push(transitionOrderStatus(order, OrderStatus.SHIPPING).order.status);
      actualFlow.push(transitionOrderStatus(order, OrderStatus.COMPLETED).order.status);

      // Assert
      assert.deepStrictEqual(actualFlow, expectedFlow, '应该按顺序流转');

      console.log('✅ 完整订单流程流转正确: pending → paid → shipping → completed');
    });
  });

  describe('取消订单流程', () => {

    it('待支付订单应该可以取消', () => {
      // Arrange
      const order = { status: OrderStatus.PENDING, id: 'order_005' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.CANCELLED);

      // Assert
      assert.strictEqual(result.success, true, '待支付订单应该可以取消');
      assert.strictEqual(order.status, OrderStatus.CANCELLED, '状态应该更新为已取消');

      console.log('✅ 待支付订单可以取消');
    });

    it('已支付订单不应该直接取消(需要退款流程)', () => {
      // Arrange
      const order = { status: OrderStatus.PAID, id: 'order_006' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.CANCELLED);

      // Assert
      assert.strictEqual(result.success, false, '已支付订单不应该直接取消');
      assert.ok(result.message.includes('不允许'), '应该返回不允许的错误信息');

      console.log('✅ 已支付订单不能直接取消(需退款)');
    });

    it('已取消订单是终态,不能再流转', () => {
      // Arrange
      const order = { status: OrderStatus.CANCELLED, id: 'order_007' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.PAID);

      // Assert
      assert.strictEqual(result.success, false, '已取消订单不能再流转');

      console.log('✅ 已取消订单是终态');
    });
  });

  describe('退款订单流程', () => {

    it('已支付订单应该可以退款', () => {
      // Arrange
      const order = { status: OrderStatus.PAID, id: 'order_008' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.REFUNDED);

      // Assert
      assert.strictEqual(result.success, true, '已支付订单应该可以退款');
      assert.strictEqual(order.status, OrderStatus.REFUNDED, '状态应该更新为已退款');

      console.log('✅ 已支付订单可以退款');
    });

    it('配送中订单应该可以退款', () => {
      // Arrange
      const order = { status: OrderStatus.SHIPPING, id: 'order_009' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.REFUNDED);

      // Assert
      assert.strictEqual(result.success, true, '配送中订单应该可以退款');
      assert.strictEqual(order.status, OrderStatus.REFUNDED, '状态应该更新为已退款');

      console.log('✅ 配送中订单可以退款');
    });

    it('待支付订单不应该退款(还未支付)', () => {
      // Arrange
      const order = { status: OrderStatus.PENDING, id: 'order_010' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.REFUNDED);

      // Assert
      assert.strictEqual(result.success, false, '待支付订单不应该退款');

      console.log('✅ 待支付订单不能退款(还未支付)');
    });

    it('已退款订单是终态,不能再流转', () => {
      // Arrange
      const order = { status: OrderStatus.REFUNDED, id: 'order_011' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.PAID);

      // Assert
      assert.strictEqual(result.success, false, '已退款订单不能再流转');

      console.log('✅ 已退款订单是终态');
    });
  });

  describe('非法状态转换', () => {

    it('不应该允许: 待支付 → 已完成(跳过中间状态)', () => {
      // Arrange
      const order = { status: OrderStatus.PENDING, id: 'order_012' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.COMPLETED);

      // Assert
      assert.strictEqual(result.success, false, '不应该跳过中间状态');
      assert.ok(result.message.includes('不允许'), '应该返回不允许的错误信息');

      console.log('✅ 正确阻止非法状态转换(跳过中间状态)');
    });

    it('不应该允许: 已完成 → 已支付(逆向流转)', () => {
      // Arrange
      const order = { status: OrderStatus.COMPLETED, id: 'order_013' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.PAID);

      // Assert
      assert.strictEqual(result.success, false, '不应该允许逆向流转');

      console.log('✅ 正确阻止逆向状态流转');
    });

    it('不应该允许: 已取消 → 已支付(从终态恢复)', () => {
      // Arrange
      const order = { status: OrderStatus.CANCELLED, id: 'order_014' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.PAID);

      // Assert
      assert.strictEqual(result.success, false, '不应该从终态恢复');

      console.log('✅ 正确阻止从终态恢复');
    });

    it('不应该允许: 已退款 → 配送中(从终态恢复)', () => {
      // Arrange
      const order = { status: OrderStatus.REFUNDED, id: 'order_015' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.SHIPPING);

      // Assert
      assert.strictEqual(result.success, false, '不应该从终态恢复');

      console.log('✅ 正确阻止从终态恢复');
    });
  });

  describe('状态转换辅助函数', () => {

    it('canTransitionTo应该正确判断允许的转换', () => {
      // Arrange & Act & Assert
      assert.strictEqual(canTransitionTo(OrderStatus.PENDING, OrderStatus.PAID), true);
      assert.strictEqual(canTransitionTo(OrderStatus.PENDING, OrderStatus.CANCELLED), true);
      assert.strictEqual(canTransitionTo(OrderStatus.PAID, OrderStatus.SHIPPING), true);
      assert.strictEqual(canTransitionTo(OrderStatus.PAID, OrderStatus.REFUNDED), true);
      assert.strictEqual(canTransitionTo(OrderStatus.SHIPPING, OrderStatus.COMPLETED), true);
      assert.strictEqual(canTransitionTo(OrderStatus.SHIPPING, OrderStatus.REFUNDED), true);

      console.log('✅ canTransitionTo正确判断允许的转换');
    });

    it('canTransitionTo应该正确判断不允许的转换', () => {
      // Arrange & Act & Assert
      assert.strictEqual(canTransitionTo(OrderStatus.PENDING, OrderStatus.SHIPPING), false);
      assert.strictEqual(canTransitionTo(OrderStatus.PENDING, OrderStatus.COMPLETED), false);
      assert.strictEqual(canTransitionTo(OrderStatus.PAID, OrderStatus.PENDING), false);
      assert.strictEqual(canTransitionTo(OrderStatus.COMPLETED, OrderStatus.SHIPPING), false);
      assert.strictEqual(canTransitionTo(OrderStatus.CANCELLED, OrderStatus.PAID), false);

      console.log('✅ canTransitionTo正确判断不允许的转换');
    });

    it('所有终态状态都不应有后续转换', () => {
      // Arrange
      const terminalStates = [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REFUNDED];
      const allStates = Object.values(OrderStatus);

      // Act & Assert
      terminalStates.forEach(terminalState => {
        const transitions = StatusTransitions[terminalState] || [];
        assert.strictEqual(transitions.length, 0, `${terminalState} 应该是终态`);
      });

      console.log('✅ 所有终态状态验证正确');
    });
  });

  describe('订单状态元数据', () => {

    it('订单状态应该包含更新时间', () => {
      // Arrange
      const order = { status: OrderStatus.PENDING, id: 'order_016' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.PAID);

      // Assert
      if (result.success) {
        assert.ok(order.updateTime, '状态转换后应该有更新时间');
        assert.strictEqual(typeof order.updateTime, 'string', '更新时间应为字符串');
      }

      console.log('✅ 订单状态包含更新时间');
    });

    it('状态未改变时应该返回成功但不更新时间', () => {
      // Arrange
      const order = { status: OrderStatus.PENDING, id: 'order_017', updateTime: '2026-03-14T10:00:00Z' };

      // Act
      const result = transitionOrderStatus(order, OrderStatus.PENDING);

      // Assert
      assert.strictEqual(result.success, true, '状态未改变应返回成功');
      assert.ok(result.message.includes('未变化'), '应该提示状态未变化');
      assert.strictEqual(order.updateTime, '2026-03-14T10:00:00Z', '不应更新时间');

      console.log('✅ 状态未改变时不更新时间');
    });

    it('状态缺失时应该返回错误', () => {
      // Arrange
      const order = { id: 'order_018' }; // 缺少status字段

      // Act
      const result = transitionOrderStatus(order, OrderStatus.PAID);

      // Assert
      assert.strictEqual(result.success, false, '状态缺失应该返回错误');
      assert.ok(result.message.includes('缺失'), '错误信息应包含"缺失"');

      console.log('✅ 状态缺失时正确返回错误');
    });
  });

  describe('业务场景验证', () => {

    it('用户主动取消订单流程', () => {
      // Arrange: 用户下单后反悔,取消订单
      const order = { status: OrderStatus.PENDING, id: 'order_019' };

      // Act
      const cancelResult = transitionOrderStatus(order, OrderStatus.CANCELLED);

      // Assert
      assert.strictEqual(cancelResult.success, true, '用户应该可以取消待支付订单');

      console.log('✅ 用户主动取消订单流程正确');
    });

    it('订单支付后发货流程', () => {
      // Arrange: 模拟真实订单流程
      const order = { status: OrderStatus.PENDING, id: 'order_020' };

      // Act
      const payResult = transitionOrderStatus(order, OrderStatus.PAID);
      const shipResult = transitionOrderStatus(order, OrderStatus.SHIPPING);

      // Assert
      assert.strictEqual(payResult.success, true, '支付应成功');
      assert.strictEqual(shipResult.success, true, '发货应成功');
      assert.strictEqual(order.status, OrderStatus.SHIPPING, '最终状态应为配送中');

      console.log('✅ 订单支付后发货流程正确');
    });

    it('用户申请退款流程', () => {
      // Arrange: 订单已发货,用户申请退款
      const order = { status: OrderStatus.SHIPPING, id: 'order_021' };

      // Act
      const refundResult = transitionOrderStatus(order, OrderStatus.REFUNDED);

      // Assert
      assert.strictEqual(refundResult.success, true, '配送中订单应该可以退款');
      assert.strictEqual(order.status, OrderStatus.REFUNDED, '状态应更新为已退款');

      console.log('✅ 用户申请退款流程正确');
    });

    it('完整的订单生命周期', () => {
      // Arrange: 完整模拟从下单到完成
      const order = { status: OrderStatus.PENDING, id: 'order_022' };

      // Act: 完整流程
      const flow = [
        { action: () => transitionOrderStatus(order, OrderStatus.PAID), expected: OrderStatus.PAID },
        { action: () => transitionOrderStatus(order, OrderStatus.SHIPPING), expected: OrderStatus.SHIPPING },
        { action: () => transitionOrderStatus(order, OrderStatus.COMPLETED), expected: OrderStatus.COMPLETED }
      ];

      // Assert
      flow.forEach((step, index) => {
        assert.strictEqual(step.action().success, true, `步骤${index + 1}应成功`);
        assert.strictEqual(order.status, step.expected, `步骤${index + 1}状态应为${step.expected}`);
      });

      console.log('✅ 完整的订单生命周期验证正确');
    });
  });
});
