<template>
  <view class="container">
    <view class="header">
      <text class="title">商品价格检查</text>
    </view>

    <view class="content">
      <view class="stats">
        <text class="stats-text">共检查 {{ products.length }} 个商品</text>
        <text class="error-text" v-if="problemProducts.length > 0">
          发现 {{ problemProducts.length }} 个异常商品
        </text>
        <text class="success-text" v-else>所有商品价格正常</text>
      </view>

      <view class="product-list" v-if="problemProducts.length > 0">
        <view class="section-title">异常商品列表</view>
        <view class="product-item" v-for="item in problemProducts" :key="item._id">
          <text class="product-name">{{ item.name }}</text>
          <view class="product-info">
            <text class="info-label">价格字段:</text>
            <text class="info-value error">{{ item.price }}</text>
          </view>
          <view class="product-info">
            <text class="info-label">价格列表:</text>
            <text class="info-value">{{ item.priceList ? JSON.stringify(item.priceList) : '无' }}</text>
          </view>
          <view class="product-info">
            <text class="info-label">问题:</text>
            <text class="info-value error">{{ item.problem }}</text>
          </view>
        </view>
      </view>

      <view class="btn-group">
        <button class="btn" @click="checkProducts" :loading="loading">
          {{ loading ? '检查中...' : '开始检查' }}
        </button>
        <button class="btn btn-primary" @click="fixProducts" v-if="problemProducts.length > 0" :loading="fixing">
          {{ fixing ? '修复中...' : '一键修复' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { callFunction } from '@/utils/cloudbase';
import { AdminAuthManager } from '@/utils/admin-auth';

interface Product {
  _id: string;
  name: string;
  price?: number;
  priceList?: Array<{ volume: string; price: number }>;
  problem?: string;
}

const products = ref<Product[]>([]);
const problemProducts = ref<Product[]>([]);
const loading = ref(false);
const fixing = ref(false);

const checkProducts = async () => {
  try {
    loading.value = true;
    problemProducts.value = [];

    const res = await callFunction('admin-api', {
      action: 'getAllProducts',
      adminToken: AdminAuthManager.getToken(),
      data: {}
    });

    if (res.code === 0) {
      products.value = res.data;

      // 检查每个商品的价格
      products.value.forEach(product => {
        let problem = '';

        // 检查price字段
        if (product.price === undefined || product.price === null) {
          problem = '缺少price字段';
        } else if (product.price <= 0) {
          problem = 'price字段值无效（<= 0）';
        }

        // 如果有priceList，检查其价格
        if (product.priceList && product.priceList.length > 0) {
          const invalidPrices = product.priceList.filter(spec => !spec.price || spec.price <= 0);
          if (invalidPrices.length > 0) {
            problem = problem ? problem + '；' : '';
            problem += 'priceList中存在无效价格';
          }
        }

        if (problem) {
          product.problem = problem;
          problemProducts.value.push(product);
        }
      });
    }
  } catch (error) {
    console.error('检查失败:', error);
    uni.showToast({
      title: '检查失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

const fixProducts = async () => {
  uni.showModal({
    title: '确认修复',
    content: `将修复 ${problemProducts.value.length} 个异常商品，是否继续？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          fixing.value = true;

          const res = await callFunction('admin-api', {
            action: 'fixProductPrices',
            adminToken: AdminAuthManager.getToken(),
            data: {
              products: problemProducts.value
            }
          });

          if (res.code === 0) {
            uni.showToast({
              title: '修复成功',
              icon: 'success'
            });
            // 重新检查
            await checkProducts();
          }
        } catch (error) {
          console.error('修复失败:', error);
          uni.showToast({
            title: '修复失败',
            icon: 'none'
          });
        } finally {
          fixing.value = false;
        }
      }
    }
  });
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #F5F0E8;
  padding: 20rpx;
}

.header {
  padding: 40rpx 30rpx;
  background: #3D2914;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #FFFFFF;
}

.content {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 30rpx;
}

.stats {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F5F0E8;
  margin-bottom: 20rpx;
}

.stats-text {
  display: block;
  font-size: 28rpx;
  color: #3D2914;
  margin-bottom: 10rpx;
}

.error-text {
  display: block;
  font-size: 26rpx;
  color: #C44536;
}

.success-text {
  display: block;
  font-size: 26rpx;
  color: #7A9A8E;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 20rpx;
}

.product-list {
  margin-bottom: 30rpx;
}

.product-item {
  background: #FAF9F7;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  border-left: 4rpx solid #C44536;
}

.product-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #3D2914;
  margin-bottom: 15rpx;
}

.product-info {
  display: flex;
  margin-bottom: 10rpx;
}

.info-label {
  font-size: 26rpx;
  color: #9B8B7F;
  min-width: 140rpx;
}

.info-value {
  font-size: 26rpx;
  color: #3D2914;
  flex: 1;
  word-break: break-all;
}

.info-value.error {
  color: #C44536;
  font-weight: 600;
}

.btn-group {
  display: flex;
  gap: 20rpx;
}

.btn {
  flex: 1;
  height: 80rpx;
  background: #FFFFFF;
  border: 2rpx solid #D4A574;
  border-radius: 40rpx;
  font-size: 28rpx;
  color: #D4A574;
  font-weight: 600;
}

.btn-primary {
  background: #D4A574;
  color: #FFFFFF;
  border: none;
}
</style>
