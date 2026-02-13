<template>
  <MainLayout>
    <view class="product-edit-page">
      <view class="edit-card">
        <view class="card-header">
          <text class="card-title">{{ isEdit ? '编辑商品' : '新增商品' }}</text>
        </view>

        <view class="form-section">
          <!-- Basic Info -->
          <view class="form-group">
            <text class="form-label">商品名称 *</text>
            <input
              v-model="formData.name"
              class="form-input"
              placeholder="请输入商品名称"
            />
          </view>

          <view class="form-group">
            <text class="form-label">商品描述 *</text>
            <textarea
              v-model="formData.description"
              class="form-textarea"
              placeholder="请输入商品描述"
              :maxlength="500"
            />
          </view>

          <view class="form-row">
            <view class="form-group half">
              <text class="form-label">价格(分) *</text>
              <input
                v-model.number="formData.price"
                class="form-input"
                type="number"
                placeholder="29900"
              />
            </view>

            <view class="form-group half">
              <text class="form-label">原价(分)</text>
              <input
                v-model.number="formData.originalPrice"
                class="form-input"
                type="number"
                placeholder="39900"
              />
            </view>
          </view>

          <view class="form-row">
            <view class="form-group half">
              <text class="form-label">库存 *</text>
              <input
                v-model.number="formData.stock"
                class="form-input"
                type="number"
                placeholder="100"
              />
            </view>

            <view class="form-group half">
              <text class="form-label">分类 *</text>
              <picker
                mode="selector"
                :range="categoryNames"
                :value="categoryIndex"
                @change="onCategoryChange"
              >
                <view class="picker-input">
                  {{ formData.category || '请选择分类' }}
                </view>
              </picker>
            </view>
          </view>

          <!-- Product Details -->
          <view class="form-row">
            <view class="form-group half">
              <text class="form-label">酒精度(%)</text>
              <input
                v-model.number="formData.alcoholContent"
                class="form-input"
                type="digit"
                placeholder="5.5"
              />
            </view>

            <view class="form-group half">
              <text class="form-label">容量(ml)</text>
              <input
                v-model.number="formData.volume"
                class="form-input"
                type="number"
                placeholder="500"
              />
            </view>
          </view>

          <view class="form-group">
            <text class="form-label">酿造厂</text>
            <input
              v-model="formData.brewery"
              class="form-input"
              placeholder="请输入酿造厂名称"
            />
          </view>

          <!-- Images -->
          <view class="form-group">
            <text class="form-label">商品图片</text>
            <view class="image-upload">
              <view
                v-for="(img, index) in formData.images"
                :key="index"
                class="image-item"
              >
                <image :src="img" mode="aspectFill" />
                <text class="delete-btn" @click="removeImage(index)">×</text>
              </view>
              <view class="upload-btn" @click="uploadImage" v-if="formData.images.length < 9">
                <text class="plus">+</text>
                <text class="text">上传图片</text>
              </view>
            </view>
          </view>

          <!-- Tags -->
          <view class="form-group">
            <text class="form-label">标签</text>
            <view class="tags-input">
              <view
                v-for="(tag, index) in formData.tags"
                :key="index"
                class="tag-item"
              >
                <text>{{ tag }}</text>
                <text @click="removeTag(index)">×</text>
              </view>
              <input
                v-model="newTag"
                class="tag-input"
                placeholder="输入标签后回车"
                @confirm="addTag"
              />
            </view>
          </view>

          <!-- Toggles -->
          <view class="form-row">
            <view class="form-group half">
              <view class="toggle-row">
                <text class="form-label">热销商品</text>
                <switch :checked="formData.isHot" @change="formData.isHot = $event.detail.value" color="#C9A962" />
              </view>
            </view>

            <view class="form-group half">
              <view class="toggle-row">
                <text class="form-label">新品</text>
                <switch :checked="formData.isNew" @change="formData.isNew = $event.detail.value" color="#C9A962" />
              </view>
            </view>
          </view>

          <!-- Actions -->
          <view class="action-buttons">
            <button class="btn cancel" @click="handleCancel">取消</button>
            <button class="btn save" @click="handleSave">保存</button>
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
const productId = ref('');
const categories = ref([]);
const categoryNames = ref([]);
const categoryIndex = ref(0);
const newTag = ref('');

const formData = ref({
  name: '',
  description: '',
  price: 0,
  originalPrice: 0,
  stock: 0,
  category: '',
  alcoholContent: 0,
  volume: 500,
  brewery: '',
  images: [] as string[],
  tags: [] as string[],
  isHot: false,
  isNew: false
});

onMounted(async () => {
  await loadCategories();

  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = currentPage.options as any;

  if (options.id) {
    isEdit.value = true;
    productId.value = options.id;
    await loadProductDetail();
  }
});

const loadCategories = async () => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: { action: 'getCategories' }
    });

    if (res.result.code === 0) {
      categories.value = res.result.data;
      categoryNames.value = categories.value.map(c => c.name);
    }
  } catch (error) {
    console.error('Load categories error:', error);
  }
};

const loadProductDetail = async () => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getProductDetail',
        data: { id: productId.value }
      }
    });

    if (res.result.code === 0) {
      formData.value = {
        ...res.result.data.product,
        images: res.result.data.product.images || [],
        tags: res.result.data.product.tags || []
      };
      categoryIndex.value = categoryNames.value.indexOf(formData.value.category);
    }
  } catch (error) {
    console.error('Load product error:', error);
  }
};

const onCategoryChange = (e: any) => {
  const index = e.detail.value;
  formData.value.category = categoryNames.value[index];
  categoryIndex.value = index;
};

const uploadImage = () => {
  uni.chooseImage({
    count: 9 - formData.value.images.length,
    success: async (res) => {
      for (const filePath of res.tempFilePaths) {
        try {
          const cloudPath = `products/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
          const uploadRes = await app.uploadFile({
            cloudPath,
            filePath
          });
          formData.value.images.push(uploadRes.fileID);
        } catch (error) {
          console.error('Upload error:', error);
          uni.showToast({ title: '上传失败', icon: 'none' });
        }
      }
    }
  });
};

const removeImage = (index: number) => {
  formData.value.images.splice(index, 1);
};

const addTag = () => {
  if (newTag.value.trim() && !formData.value.tags.includes(newTag.value.trim())) {
    formData.value.tags.push(newTag.value.trim());
    newTag.value = '';
  }
};

const removeTag = (index: number) => {
  formData.value.tags.splice(index, 1);
};

const handleSave = async () => {
  if (!formData.value.name || !formData.value.description || !formData.value.price || !formData.value.stock || !formData.value.category) {
    uni.showToast({ title: '请填写必填项', icon: 'none' });
    return;
  }

  try {
    const action = isEdit.value ? 'updateProduct' : 'createProduct';
    const data = isEdit.value ? { id: productId.value, ...formData.value } : formData.value;

    const res = await app.callFunction({
      name: 'admin-api',
      data: { action, data }
    });

    if (res.result.code === 0) {
      uni.showToast({ title: isEdit.value ? '更新成功' : '创建成功', icon: 'success' });
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

.product-edit-page {
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

.form-textarea {
  width: 100%;
  min-height: 100px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: $radius-sm;
  padding: $spacing-md;
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

.image-upload {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-md;
}

.image-item {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: $radius-md;
  overflow: hidden;
}

.image-item image {
  width: 100%;
  height: 100%;
}

.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.upload-btn {
  width: 120px;
  height: 120px;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: $radius-md;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-xs;
}

.upload-btn .plus {
  font-size: 32px;
  color: $text-secondary;
}

.upload-btn .text {
  font-size: 12px;
  color: $text-secondary;
}

.tags-input {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: $radius-sm;
  padding: $spacing-sm;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px $spacing-sm;
  background-color: rgba($color-amber-gold, 0.2);
  border-radius: $radius-sm;
  font-size: 12px;
  color: $color-amber-gold;
}

.tag-item text:last-child {
  cursor: pointer;
}

.tag-input {
  flex: 1;
  min-width: 100px;
  border: none;
  background: transparent;
  color: $text-primary;
  font-size: 14px;
  padding: 4px 0;
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
