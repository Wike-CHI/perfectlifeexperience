<template>
  <MainLayout>
    <view class="coupon-edit-page">
      <view class="form-card">
        <view class="card-header">
          <text class="card-title">{{ isEdit ? '编辑优惠券' : '创建优惠券' }}</text>
        </view>

        <view class="form-body">
          <!-- 优惠券名称 -->
          <view class="form-group">
            <text class="form-label required">优惠券名称</text>
            <input
              v-model="formData.name"
              class="form-input"
              placeholder="请输入优惠券名称"
              maxlength="50"
            />
          </view>

          <!-- 优惠券类型 -->
          <view class="form-group">
            <text class="form-label required">优惠券类型</text>
            <picker
              mode="selector"
              :range="typeOptions"
              :value="typeIndex"
              @change="onTypeChange"
            >
              <view class="form-picker">
                {{ typeOptions[typeIndex] }}
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>

          <!-- 面值/折扣 -->
          <view class="form-group">
            <text class="form-label required">
              {{ formData.type === 'percent' ? '折扣比例' : '优惠金额' }}
            </text>
            <view class="input-with-unit">
              <input
                v-model="formData.discount"
                type="digit"
                class="form-input"
                :placeholder="formData.type === 'percent' ? '请输入折扣比例(1-99)' : '请输入优惠金额'"
              />
              <text class="input-unit">{{ formData.type === 'percent' ? '%' : '元' }}</text>
            </view>
          </view>

          <!-- 最低消费 -->
          <view class="form-group">
            <text class="form-label required">最低消费</text>
            <view class="input-with-unit">
              <input
                v-model="formData.minAmount"
                type="digit"
                class="form-input"
                placeholder="请输入最低消费金额"
              />
              <text class="input-unit">元</text>
            </view>
          </view>

          <!-- 发放总量 -->
          <view class="form-group">
            <text class="form-label">发放总量</text>
            <input
              v-model="formData.totalLimit"
              type="number"
              class="form-input"
              placeholder="留空表示不限制"
            />
            <text class="form-hint">留空表示不限制发放数量</text>
          </view>

          <!-- 每人限领 -->
          <view class="form-group">
            <text class="form-label">每人限领</text>
            <input
              v-model="formData.perUserLimit"
              type="number"
              class="form-input"
              placeholder="请输入每人限领数量"
            />
          </view>

          <!-- 有效期类型 -->
          <view class="form-group">
            <text class="form-label required">有效期类型</text>
            <picker
              mode="selector"
              :range="validityTypeOptions"
              :value="validityTypeIndex"
              @change="onValidityTypeChange"
            >
              <view class="form-picker">
                {{ validityTypeOptions[validityTypeIndex] }}
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>

          <!-- 固定有效期 -->
          <template v-if="formData.validityType === 'fixed'">
            <view class="form-group">
              <text class="form-label required">开始时间</text>
              <picker
                mode="time"
                :value="formData.startTime"
                @change="onStartTimeChange"
              >
                <view class="form-picker">
                  {{ formData.startTime || '请选择开始时间' }}
                  <text class="picker-arrow">›</text>
                </view>
              </picker>
            </view>

            <view class="form-group">
              <text class="form-label required">结束时间</text>
              <picker
                mode="time"
                :value="formData.endTime"
                @change="onEndTimeChange"
              >
                <view class="form-picker">
                  {{ formData.endTime || '请选择结束时间' }}
                  <text class="picker-arrow">›</text>
                </view>
              </picker>
            </view>
          </template>

          <!-- 领取后有效天数 -->
          <template v-if="formData.validityType === 'relative'">
            <view class="form-group">
              <text class="form-label required">有效天数</text>
              <input
                v-model="formData.validDays"
                type="number"
                class="form-input"
                placeholder="请输入领取后有效天数"
              />
            </view>
          </template>

          <!-- 适用商品 -->
          <view class="form-group">
            <text class="form-label">适用商品</text>
            <picker
              mode="selector"
              :range="scopeOptions"
              :value="scopeIndex"
              @change="onScopeChange"
            >
              <view class="form-picker">
                {{ scopeOptions[scopeIndex] }}
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>

          <!-- 使用说明 -->
          <view class="form-group">
            <text class="form-label">使用说明</text>
            <textarea
              v-model="formData.description"
              class="form-textarea"
              placeholder="请输入使用说明"
              maxlength="500"
            />
          </view>

          <!-- 是否启用 -->
          <view class="form-group switch-group">
            <text class="form-label">立即启用</text>
            <switch
              :checked="formData.isActive"
              @change="onActiveChange"
              color="#C9A962"
            />
          </view>
        </view>
      </view>

      <!-- Action Buttons -->
      <view class="action-buttons">
        <button class="btn-cancel" @click="handleCancel">取消</button>
        <button class="btn-save" @click="handleSave">保存</button>
      </view>
    </view>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { app } from '@/utils/cloudbase';
import MainLayout from '@/components/MainLayout.vue';

interface CouponFormData {
  name: string;
  type: string;
  discount: number;
  minAmount: number;
  totalLimit?: number;
  perUserLimit?: number;
  validityType: string;
  startTime?: string;
  endTime?: string;
  validDays?: number;
  scope: string;
  description?: string;
  isActive: boolean;
}

const couponId = ref('');
const isEdit = ref(false);

const formData = ref<CouponFormData>({
  name: '',
  type: 'fixed',
  discount: 0,
  minAmount: 0,
  totalLimit: undefined,
  perUserLimit: 1,
  validityType: 'fixed',
  startTime: '',
  endTime: '',
  validDays: 30,
  scope: 'all',
  description: '',
  isActive: true
});

const typeOptions = ref(['满减券', '折扣券']);
const typeValues = ['fixed', 'percent'];
const typeIndex = ref(0);

const validityTypeOptions = ref(['固定时间', '领取后有效']);
const validityTypeValues = ['fixed', 'relative'];
const validityTypeIndex = ref(0);

const scopeOptions = ref(['全部商品', '指定分类', '指定商品']);
const scopeValues = ['all', 'category', 'product'];
const scopeIndex = ref(0);

onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = currentPage.options as any;

  if (options.id) {
    couponId.value = options.id;
    isEdit.value = true;
    loadCouponData(options.id);
  }
});

const loadCouponData = async (id: string) => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getCouponDetail',
        data: { id }
      }
    });

    if (res.result?.code === 0 && res.result.data) {
      const coupon = res.result.data;
      formData.value = {
        name: coupon.name || '',
        type: coupon.type || 'fixed',
        discount: coupon.discount || 0,
        minAmount: coupon.minAmount || 0,
        totalLimit: coupon.totalLimit,
        perUserLimit: coupon.perUserLimit,
        validityType: coupon.validityType || 'fixed',
        startTime: coupon.startTime,
        endTime: coupon.endTime,
        validDays: coupon.validDays,
        scope: coupon.scope || 'all',
        description: coupon.description,
        isActive: coupon.isActive ?? true
      };

      // Update picker indices
      typeIndex.value = typeValues.indexOf(coupon.type) || 0;
      validityTypeIndex.value = validityTypeValues.indexOf(coupon.validityType) || 0;
      scopeIndex.value = scopeValues.indexOf(coupon.scope) || 0;
    }
  } catch (error) {
    console.error('加载优惠券数据失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  }
};

const onTypeChange = (e: any) => {
  typeIndex.value = e.detail.value;
  formData.value.type = typeValues[typeIndex.value];
};

const onValidityTypeChange = (e: any) => {
  validityTypeIndex.value = e.detail.value;
  formData.value.validityType = validityTypeValues[validityTypeIndex.value];
};

const onScopeChange = (e: any) => {
  scopeIndex.value = e.detail.value;
  formData.value.scope = scopeValues[scopeIndex.value];
};

const onStartTimeChange = (e: any) => {
  formData.value.startTime = e.detail.value;
};

const onEndTimeChange = (e: any) => {
  formData.value.endTime = e.detail.value;
};

const onActiveChange = (e: any) => {
  formData.value.isActive = e.detail.value;
};

const validateForm = (): boolean => {
  if (!formData.value.name.trim()) {
    uni.showToast({
      title: '请输入优惠券名称',
      icon: 'none'
    });
    return false;
  }

  if (!formData.value.discount || formData.value.discount <= 0) {
    uni.showToast({
      title: '请输入有效的优惠金额/折扣',
      icon: 'none'
    });
    return false;
  }

  if (formData.value.type === 'percent' && (formData.value.discount < 1 || formData.value.discount > 99)) {
    uni.showToast({
      title: '折扣比例应在1-99之间',
      icon: 'none'
    });
    return false;
  }

  if (!formData.value.minAmount || formData.value.minAmount <= 0) {
    uni.showToast({
      title: '请输入有效的最低消费金额',
      icon: 'none'
    });
    return false;
  }

  if (formData.value.validityType === 'fixed') {
    if (!formData.value.startTime || !formData.value.endTime) {
      uni.showToast({
        title: '请选择开始和结束时间',
        icon: 'none'
      });
      return false;
    }
  }

  if (formData.value.validityType === 'relative' && !formData.value.validDays) {
    uni.showToast({
      title: '请输入有效天数',
      icon: 'none'
    });
    return false;
  }

  return true;
};

const handleSave = async () => {
  if (!validateForm()) {
    return;
  }

  try {
    uni.showLoading({ title: '保存中...' });

    // Convert amounts to cents
    const data = {
      ...formData.value,
      discount: Math.round(formData.value.discount * 100),
      minAmount: Math.round(formData.value.minAmount * 100)
    };

    const action = isEdit.value ? 'updateCoupon' : 'createCoupon';
    const params = isEdit.value ? { id: couponId.value, ...data } : data;

    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action,
        data: params
      }
    });

    uni.hideLoading();

    if (res.result?.code === 0) {
      uni.showToast({
        title: isEdit.value ? '更新成功' : '创建成功',
        icon: 'success'
      });

      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    } else {
      uni.showToast({
        title: res.result?.msg || '保存失败',
        icon: 'none'
      });
    }
  } catch (error) {
    uni.hideLoading();
    console.error('保存失败:', error);
    uni.showToast({
      title: '保存失败',
      icon: 'none'
    });
  }
};

const handleCancel = () => {
  uni.navigateBack();
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.coupon-edit-page {
  padding: 20rpx;
  padding-bottom: 150rpx;
}

.form-card {
  background: $card-bg;
  border-radius: $border-radius;
  box-shadow: $box-shadow;
  margin-bottom: 20rpx;
}

.card-header {
  padding: 30rpx;
  border-bottom: 1rpx solid $border-color;
}

.card-title {
  font-size: 36rpx;
  font-weight: 600;
  color: $text-primary;
}

.form-body {
  padding: 30rpx;
}

.form-group {
  margin-bottom: 30rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: $text-primary;
  margin-bottom: 15rpx;
  font-weight: 500;

  &.required::before {
    content: '*';
    color: #F44336;
    margin-right: 5rpx;
  }
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  background: $input-bg;
  border: 1rpx solid $border-color;
  border-radius: $border-radius-sm;
  font-size: 28rpx;
  color: $text-primary;
  box-sizing: border-box;
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80rpx;
  padding: 0 20rpx;
  background: $input-bg;
  border: 1rpx solid $border-color;
  border-radius: $border-radius-sm;
  font-size: 28rpx;
  color: $text-primary;
}

.picker-arrow {
  color: $text-secondary;
  font-size: 40rpx;
  margin-left: 10rpx;
}

.form-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 20rpx;
  background: $input-bg;
  border: 1rpx solid $border-color;
  border-radius: $border-radius-sm;
  font-size: 28rpx;
  color: $text-primary;
  box-sizing: border-box;
}

.form-hint {
  display: block;
  font-size: 24rpx;
  color: $text-secondary;
  margin-top: 10rpx;
}

.input-with-unit {
  display: flex;
  align-items: center;
  position: relative;

  .form-input {
    flex: 1;
    padding-right: 80rpx;
  }

  .input-unit {
    position: absolute;
    right: 20rpx;
    font-size: 26rpx;
    color: $text-secondary;
  }
}

.switch-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-buttons {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  background: $card-bg;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.btn-cancel,
.btn-save {
  flex: 1;
  padding: 25rpx;
  border-radius: $border-radius;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
}

.btn-cancel {
  background: $bg-secondary;
  color: $text-primary;
}

.btn-save {
  background: $primary-color;
  color: $white;
}
</style>
