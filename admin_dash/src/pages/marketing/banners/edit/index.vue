<template>
  <MainLayout>
    <view class="banner-edit-page">
      <view class="form-card">
        <view class="card-header">
          <text class="card-title">{{ isEdit ? '编辑Banner' : '添加Banner' }}</text>
        </view>

        <view class="form-body">
          <!-- Banner图片 -->
          <view class="form-group">
            <text class="form-label required">Banner图片</text>
            <view class="image-upload-area">
              <image
                v-if="formData.imageUrl"
                :src="formData.imageUrl"
                class="uploaded-image"
                mode="aspectFill"
              />
              <view v-else class="upload-placeholder" @click="chooseImage">
                <text class="upload-icon">+</text>
                <text class="upload-text">点击上传图片</text>
              </view>
              <button
                v-if="formData.imageUrl"
                class="btn-reupload"
                size="mini"
                @click="chooseImage"
              >重新上传</button>
              <button
                v-if="formData.imageUrl"
                class="btn-remove"
                size="mini"
                @click="removeImage"
              >删除</button>
            </view>
            <text class="form-hint">建议尺寸：750x400px，支持JPG/PNG格式</text>
          </view>

          <!-- 标题 -->
          <view class="form-group">
            <text class="form-label">标题</text>
            <input
              v-model="formData.title"
              class="form-input"
              placeholder="请输入Banner标题"
              maxlength="50"
            />
          </view>

          <!-- 跳转链接 -->
          <view class="form-group">
            <text class="form-label">跳转链接</text>
            <input
              v-model="formData.link"
              class="form-input"
              placeholder="请输入跳转链接，如：/pages/product/detail?id=xxx"
            />
          </view>

          <!-- 排序 -->
          <view class="form-group">
            <text class="form-label required">排序</text>
            <input
              v-model.number="formData.sort"
              type="number"
              class="form-input"
              placeholder="数字越小排序越靠前"
            />
            <text class="form-hint">数字越小，显示顺序越靠前</text>
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

interface BannerFormData {
  imageUrl?: string;
  title?: string;
  link?: string;
  sort: number;
  isActive: boolean;
}

const bannerId = ref('');
const isEdit = ref(false);

const formData = ref<BannerFormData>({
  imageUrl: '',
  title: '',
  link: '',
  sort: 0,
  isActive: true
});

onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = currentPage.options as any;

  if (options.id) {
    bannerId.value = options.id;
    isEdit.value = true;
    loadBannerData(options.id);
  }
});

const loadBannerData = async (id: string) => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getBannerDetail',
        data: { id }
      }
    });

    if (res.result?.code === 0 && res.result.data) {
      const banner = res.result.data;
      formData.value = {
        imageUrl: banner.imageUrl,
        title: banner.title || '',
        link: banner.link || '',
        sort: banner.sort || 0,
        isActive: banner.isActive ?? true
      };
    }
  } catch (error) {
    console.error('加载Banner数据失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  }
};

const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0];
      uploadImage(tempFilePath);
    }
  });
};

const uploadImage = async (filePath: string) => {
  try {
    uni.showLoading({ title: '上传中...' });

    // Upload to CloudBase Storage
    const cloudPath = `banners/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;

    const uploadRes = await app.uploadFile({
      cloudPath,
      filePath
    });

    uni.hideLoading();

    if (uploadRes.fileID) {
      formData.value.imageUrl = uploadRes.fileID;
      uni.showToast({
        title: '上传成功',
        icon: 'success'
      });
    } else {
      throw new Error('上传失败');
    }
  } catch (error) {
    uni.hideLoading();
    console.error('图片上传失败:', error);
    uni.showToast({
      title: '上传失败',
      icon: 'none'
    });
  }
};

const removeImage = () => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这张图片吗？',
    success: (res) => {
      if (res.confirm) {
        formData.value.imageUrl = '';
      }
    }
  });
};

const onActiveChange = (e: any) => {
  formData.value.isActive = e.detail.value;
};

const validateForm = (): boolean => {
  if (!formData.value.imageUrl) {
    uni.showToast({
      title: '请上传Banner图片',
      icon: 'none'
    });
    return false;
  }

  if (typeof formData.value.sort !== 'number' || formData.value.sort < 0) {
    uni.showToast({
      title: '请输入有效的排序值',
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

    const action = isEdit.value ? 'updateBanner' : 'createBanner';
    const params = isEdit.value ? { id: bannerId.value, ...formData.value } : formData.value;

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

.banner-edit-page {
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

.form-hint {
  display: block;
  font-size: 24rpx;
  color: $text-secondary;
  margin-top: 10rpx;
}

.image-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15rpx;
}

.uploaded-image {
  width: 100%;
  height: 400rpx;
  border-radius: $border-radius-sm;
  border: 1rpx solid $border-color;
}

.upload-placeholder {
  width: 100%;
  height: 400rpx;
  background: $bg-secondary;
  border: 2rpx dashed $border-color;
  border-radius: $border-radius-sm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15rpx;
}

.upload-icon {
  font-size: 80rpx;
  color: $text-secondary;
  font-weight: 300;
}

.upload-text {
  font-size: 26rpx;
  color: $text-secondary;
}

.btn-reupload,
.btn-remove {
  padding: 12rpx 30rpx;
  border-radius: $border-radius-sm;
  font-size: 26rpx;
  border: none;
}

.btn-reupload {
  background: $primary-color;
  color: $white;
}

.btn-remove {
  background: #F44336;
  color: $white;
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
