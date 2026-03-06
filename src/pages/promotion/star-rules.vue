<template>
  <view class="page-container">
    <!-- 顶部标题 -->
    <view class="header">
      <text class="header-title">升级规则详解</text>
      <text class="header-desc">从普通到金牌，开启您的升级之路</text>
    </view>

    <!-- 升级路径图 -->
    <view class="section">
      <view class="section-header">
        <view class="section-icon">
          <image class="icon-svg" src="/static/icons/icon-path.svg" mode="aspectFit"/>
        </view>
        <text class="section-title">升级路径</text>
      </view>
      <view class="path-flow">
        <view class="path-node" v-for="(item, index) in pathNodes" :key="index">
          <view class="node-circle" :style="{ background: item.bgColor }">
            <text class="node-icon">{{ item.icon }}</text>
          </view>
          <text class="node-name">{{ item.name }}</text>
          <view class="node-arrow" v-if="index < pathNodes.length - 1">
            <text class="arrow-text">→</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 升级条件详情 -->
    <view class="section">
      <view class="section-header">
        <view class="section-icon">
          <image class="icon-svg" src="/static/icons/icon-condition.svg" mode="aspectFit"/>
        </view>
        <text class="section-title">升级条件</text>
      </view>
      <view class="condition-cards">
        <view class="condition-card" v-for="(item, index) in conditions" :key="index">
          <view class="condition-header" :style="{ background: item.bgColor }">
            <text class="condition-level">{{ item.name }}</text>
            <text class="condition-icon">{{ item.icon }}</text>
          </view>
          <view class="condition-body">
            <view class="condition-row">
              <view class="condition-label">
                <image class="label-icon" src="/static/icons/icon-sales.svg" mode="aspectFit"/>
                <text class="label-text">销售额要求</text>
              </view>
              <text class="condition-value">{{ item.salesReq }}</text>
            </view>
            <view class="condition-divider" v-if="item.countReq"></view>
            <view class="condition-row" v-if="item.countReq">
              <view class="condition-label">
                <image class="label-icon" src="/static/icons/icon-users.svg" mode="aspectFit"/>
                <text class="label-text">人数要求</text>
              </view>
              <text class="condition-value">{{ item.countReq }}</text>
            </view>
            <view class="condition-tip" v-if="item.tip">
              <text>{{ item.tip }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 权益对比 -->
    <view class="section">
      <view class="section-header">
        <view class="section-icon">
          <image class="icon-svg" src="/static/icons/icon-benefit.svg" mode="aspectFit"/>
        </view>
        <text class="section-title">权益对比</text>
      </view>
      <view class="compare-table">
        <view class="compare-header">
          <text class="compare-col col-name">权益项目</text>
          <text class="compare-col col-level" v-for="level in [4, 3, 2, 1]" :key="level">
            {{ getLevelShortName(level) }}
          </text>
        </view>
        <view class="compare-row" v-for="(item, index) in compareItems" :key="index">
          <text class="compare-col col-name">{{ item.name }}</text>
          <text class="compare-col col-level" v-for="(val, vIndex) in item.values" :key="vIndex">
            <text :class="['val-' + val.type]">{{ val.text }}</text>
          </text>
        </view>
      </view>
    </view>

    <!-- 底部提示 -->
    <view class="bottom-tips">
      <text class="tips-text">升级后权益立即生效，祝您早日升级金牌！</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { usePromotionConfig } from '@/composables/usePromotionConfig';
import { AGENT_LEVEL_NAMES } from '@/constants/promotion';

const { config, loadConfig, getCommissionRule, getPromotionThreshold } = usePromotionConfig();

// 格式化金额（带千分位）
const formatMoneyYuan = (yuan: number): string => {
  if (yuan >= 10000) {
    return `${(yuan / 10000).toFixed(0)}万`;
  }
  return yuan.toLocaleString();
};

// 升级路径节点 - 从常量生成
const pathNodes = computed(() => {
  const nodes = [
    { level: 4, icon: '普', bgColor: '#9E9E9E' },
    { level: 3, icon: '铜', bgColor: 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)' },
    { level: 2, icon: '银', bgColor: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)' },
    { level: 1, icon: '金', bgColor: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' }
  ];
  return nodes.map(node => ({
    ...node,
    name: AGENT_LEVEL_NAMES[node.level as keyof typeof AGENT_LEVEL_NAMES]
  }));
});

// 获取等级简称
const getLevelShortName = (level: number): string => {
  const shortNames: Record<number, string> = {
    1: '金牌',
    2: '银牌',
    3: '铜牌',
    4: '普通'
  };
  return shortNames[level] || '普通';
};

// 升级条件 - 从配置生成
const conditions = computed(() => {
  const levelConfigs = [
    {
      level: 3,
      icon: '铜',
      bgColor: 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)'
    },
    {
      level: 2,
      icon: '银',
      bgColor: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)'
    },
    {
      level: 1,
      icon: '金',
      bgColor: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
    }
  ];

  return levelConfigs.map(config => {
    const threshold = getPromotionThreshold(config.level);
    const levelName = AGENT_LEVEL_NAMES[config.level as keyof typeof AGENT_LEVEL_NAMES];

    let salesReq = '';
    let countReq = '';
    let tip = '';

    if (config.level === 3) {
      // 普通→铜牌：累计销售额
      salesReq = `累计 ≥ ¥${formatMoneyYuan(threshold?.totalSales || config.value.bronzeTotalSales)}`;
      countReq = '';
      tip = '完成累计销售额即可自动升级';
    } else if (config.level === 2) {
      // 铜牌→银牌：本月销售额 或 团队人数
      salesReq = `本月 ≥ ¥${formatMoneyYuan(threshold?.monthSales || config.value.silverMonthSales)}`;
      countReq = `或团队 ≥ ${threshold?.teamCount || config.value.silverTeamCount}人`;
      tip = '满足任一条件即可升级';
    } else if (config.level === 1) {
      // 银牌→金牌：本月销售额 或 团队人数
      salesReq = `本月 ≥ ¥${formatMoneyYuan(threshold?.monthSales || config.value.goldMonthSales)}`;
      countReq = `或团队 ≥ ${threshold?.teamCount || config.value.goldTeamCount}人`;
      tip = '最高等级，享受全部权益';
    }

    return {
      name: levelName,
      icon: config.icon,
      bgColor: config.bgColor,
      salesReq,
      countReq,
      tip
    };
  });
});

// 权益对比 - 从配置生成
const compareItems = computed(() => {
  // 1. 推广佣金比例
  const commissionRow = {
    name: '推广佣金比例',
    values: [4, 3, 2, 1].map(level => {
      const rule = getCommissionRule(level);
      return {
        text: `${(rule.own * 100).toFixed(0)}%`,
        type: level === 1 ? 'highlight' : 'normal'
      };
    })
  };

  // 2. 上级推广人分成（仅展示是否有上级）
  const upstreamRow = {
    name: '上级推广人分成',
    values: [4, 3, 2, 1].map(level => {
      const rule = getCommissionRule(level);
      const hasUpstream = rule && rule.upstream && rule.upstream.length > 0;
      return {
        text: hasUpstream ? `${(rule.upstream.reduce((a: number, b: number) => a + b, 0) * 100).toFixed(0)}%` : '无',
        type: hasUpstream ? 'normal' : 'no'
      };
    })
  };

  return [commissionRow, upstreamRow];
});

// 加载配置
onMounted(() => {
  loadConfig();
});
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #F5F0E8 0%, #FFFFFF 30%);
  padding-bottom: 100rpx;
}

.header {
  padding: 60rpx 40rpx 40rpx;
  text-align: center;
}

.header-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #3D2914;
  margin-bottom: 16rpx;
}

.header-desc {
  font-size: 28rpx;
  color: #6B5B4F;
}

.section {
  margin: 0 24rpx 32rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(61, 41, 20, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 28rpx;
}

.section-icon {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.section-icon .icon-svg {
  width: 36rpx;
  height: 36rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #3D2914;
}

/* 晋升路径图 */
.path-flow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
}

.path-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.node-circle {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.node-icon {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 700;
}

.node-name {
  font-size: 24rpx;
  color: #6B5B4F;
}

.node-arrow {
  position: absolute;
  right: -60rpx;
  top: 30rpx;
}

.arrow-text {
  font-size: 28rpx;
  color: #D4A574;
}

/* 晋升条件卡片 */
.condition-cards {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.condition-card {
  background: #FAFAFA;
  border-radius: 16rpx;
  overflow: hidden;
}

.condition-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 28rpx;
}

.condition-level {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.condition-icon {
  font-size: 36rpx;
  color: #FFFFFF;
}

.condition-body {
  padding: 24rpx 28rpx;
}

.condition-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.condition-label {
  display: flex;
  align-items: center;
}

.label-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 12rpx;
}

.label-icon .icon-svg {
  width: 28rpx;
  height: 28rpx;
}

.label-text {
  font-size: 26rpx;
  color: #6B5B4F;
}

.condition-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #3D2914;
}

.condition-divider {
  height: 1rpx;
  background: #E8E4DD;
  margin: 16rpx 0;
}

.condition-tip {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  background: #FFF8F0;
  border-radius: 8rpx;
}

.condition-tip text {
  font-size: 24rpx;
  color: #D4A574;
}

/* 权益对比表格 */
.compare-table {
  background: #FAFAFA;
  border-radius: 16rpx;
  overflow: hidden;
}

.compare-header {
  display: flex;
  background: #F5F0E8;
  padding: 20rpx 0;
}

.compare-row {
  display: flex;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F0EBE3;
}

.compare-row:last-child {
  border-bottom: none;
}

.compare-col {
  text-align: center;
}

.col-name {
  width: 200rpx;
  font-size: 26rpx;
  color: #3D2914;
  text-align: left;
  padding-left: 24rpx;
}

.col-level {
  flex: 1;
  font-size: 26rpx;
}

.val-yes {
  color: #00A870;
  font-weight: 600;
}

.val-no {
  color: #9B8B7F;
}

.val-highlight {
  color: #D4A574;
  font-weight: 600;
}

.val-normal {
  color: #6B5B4F;
}

/* 底部提示 */
.bottom-tips {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 40rpx;
  background: linear-gradient(180deg, transparent 0%, #FFFFFF 30%);
}

.tips-text {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: #D4A574;
}
</style>
