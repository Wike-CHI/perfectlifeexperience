<template>
  <MainLayout>
    <view class="announcement-edit-page">
      <view class="edit-card">
        <view class="card-header">
          <text class="card-title">{{ isEdit ? '编辑公告' : '发布公告' }}</text>
        </view>

        <view class="form-section">
          <view class="form-group">
            <text class="form-label">标题 *</text>
            <input
              v-model="formData.title"
              class="form-input"
              placeholder="请输入公告标题"
              :maxlength="100"
            />
          </view>

          <view class="form-row">
            <view class="form-group half">
              <text class="form-label">类型 *</text>
              <picker
                mode="selector"
                :range="typeOptions"
                :value="typeIndex"
                @change="onTypeChange"
              >
                <view class="picker-input">{{ typeOptions[typeIndex] }}</view>
              </picker>
            </view>

            <view class="form-group half">
              <text class="form-label">优先级 (1-5)</text>
              <input
                v-model.number="formData.priority"
                class="form-input"
                type="number"
                :min="1"
                :max="5"
              />
            </view>
          </view>

          <view class="form-group">
            <text class="form-label">内容 *</text>
            <textarea
              v-model="formData.content"
              class="form-textarea"
              placeholder="请输入公告内容"
              :maxlength="2000"
            />
            <text class="char-count">{{ formData.content.length }}/2000</text>
          </view>

          <view class="form-group toggle-row">
            <text class="form-label">立即发布</text>
            <switch :checked="formData.isActive" @change="formData.isActive = $event.detail.value" color="#C9A962" />
          </view>

          <view class="action-buttons">
            <button class="btn cancel" @click="handleCancel">取消</button>
            <button class="btn save" @click="handleSave">{{ formData.isActive ? '发布' : '保存草稿' }}</button>
          </view>
        </view>
      </view>
    </view>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { app } from '@/utils/cloudbase';
import MainLayout from '@/components/MainLayout.vue';

const isEdit = ref(false);
const announcementId = ref('');
const typeOptions = ref(['系统公告', '推广活动', '优惠活动']);
const typeValues = ['system', 'promotion', 'discount'];
const typeIndex = ref(0);

const formData = ref({
  title: '',
  type: 'system',
  content: '',
  priority: 3,
  isActive: true
});

onMounted(async () => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = currentPage.options as any;

  if (options.id) {
    isEdit.value = true;
    announcementId.value = options.id;
    // Load announcement detail if needed
  }
});

const onTypeChange = (e: any) => {
  const index = e.detail.value;
  formData.value.type = typeValues[index];
  typeIndex.value = index;
};

const handleSave = async () => {
  if (!formData.value.title || !formData.value.content) {
    uni.showToast({ title: '请填写必填项', icon: 'none' });
    return;
  }

  try {
    const action = isEdit.value ? 'updateAnnouncement' : 'createAnnouncement';
    const data = isEdit.value ? { id: announcementId.value, ...formData.value } : formData.value;

    const res = await app.callFunction({
      name: 'admin-api',
      data: { action, data }
    });

    if (res.result.code === 0) {
      uni.showToast({ title: isEdit.value ? '更新成功' : '发布成功', icon: 'success' });
      setTimeout(() => {
        uni.navigateBack();
      }, 1000);
    } else {
      uni.showToast({ title: res.result.msg, icon: 'none' });
    }
  } catch (error) {
    console.error('Save error:', error);
    uni.showToast({ title: '保存失败', icon: 'none' });
  }
};

const handleCancel = () => {
  uni.navigateBack();
};
</script>

<style lang="scss" scoped>
@use "@/styles/variables.scss" as *;

.announcement-edit-page {
  padding: $spacing-lg;
}

.edit-card {
  background-color: $bg-card;
  border-radius: $radius-lg;
  overflow: hidden;
}

.card-header {
  padding: $spacing-lg;
  background-color: rgba($color-amber-gold, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.card-title {
  font-family: $font-family-heading;
  font-size: 20px;
  color: $color-amber-gold;
}

.form-section {
  padding: $spacing-lg;
}

.form-group {
  margin-bottom: $spacing-lg;
}

.form-group.half {
  width: calc(50% - #{$spacing-md});
  display: inline-block;
  vertical-align: top;
}

.form-row {
  display: flex;
  gap: $spacing-lg;
}

.form-label {
  display: block;
  font-size: 14px;
  color: $text-secondary;
  margin-bottom: $spacing-sm;
}

.form-input {
  width: 100%;
  height: 44px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: $radius-sm;
  padding: 0 $spacing-md;
  color: $text-primary;
  font-size: 14px;
  box-sizing: border-box;
}

.picker-input {
  width: 100%;
  height: 44px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: $radius-sm;
  padding: 0 $spacing-md;
  color: $text-primary;
  font-size: 14px;
  line-height: 44px;
}

.form-textarea {
  width: 100%;
  min-height: 200px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: $radius-sm;
  padding: $spacing-md;
  color: $text-primary;
  font-size: 14px;
  box-sizing: border-box;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: $text-secondary;
  margin-top: $spacing-xs;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
}

.action-buttons {
  display: flex;
  gap: $spacing-lg;
  margin-top: $spacing-xl * 2;
}

.btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: $radius-sm;
  font-size: 16px;
  font-weight: 600;
}

.btn.cancel {
  background-color: rgba(255, 255, 255, 0.1);
  color: $text-primary;
}

.btn.save {
  background: linear-gradient(135deg, $color-amber-gold 0%, #b8943d 100%);
  color: $bg-primary;
}
</style>
