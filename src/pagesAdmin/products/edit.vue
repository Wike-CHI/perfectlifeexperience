<template>
  <view class="product-edit-page">
    <view class="page-title">{{ isEdit ? '编辑商品' : '添加商品' }}</view>

    <view class="form">
      <view class="form-item">
        <text class="label">商品名称</text>
        <input class="input" v-model="formData.name" placeholder="请输入商品名称" />
      </view>

      <view class="form-item">
        <text class="label">价格（元）</text>
        <input class="input" type="digit" v-model="formData.price" placeholder="请输入价格" />
      </view>

      <view class="form-item">
        <text class="label">库存</text>
        <input class="input" type="number" v-model="formData.stock" placeholder="请输入库存" />
      </view>

      <view class="form-item">
        <text class="label">商品描述</text>
        <textarea class="textarea" v-model="formData.description" placeholder="请输入商品描述" />
      </view>

      <button class="submit-btn" @click="handleSubmit">{{ isEdit ? '保存' : '创建' }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'

const isEdit = ref(false)
const productId = ref('')

const formData = ref({
  name: '',
  price: '',
  stock: '',
  description: ''
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  if (options.id) {
    isEdit.value = true
    productId.value = options.id
    loadProduct()
  }
})

const loadProduct = async () => {
  try {
    const res = await callFunction('product', {
      action: 'getProductDetail',
      data: { id: productId.value }
    })
    if (res.code === 0 && res.data) {
      formData.value = {
        name: res.data.name || '',
        price: (res.data.price / 100).toFixed(2),
        stock: String(res.data.stock || 0),
        description: res.data.description || ''
      }
    }
  } catch (e) {
    console.error('加载商品失败', e)
  }
}

const handleSubmit = async () => {
  try {
    const data = {
      name: formData.value.name,
      price: Math.round(parseFloat(formData.value.price) * 100),
      stock: parseInt(formData.value.stock) || 0,
      description: formData.value.description
    }

    const action = isEdit.value ? 'updateProduct' : 'createProduct'
    const params = isEdit.value ? { id: productId.value, ...data } : data

    const res = await callFunction('product', {
      action,
      data: params
    })

    if (res.code === 0) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 1500)
    }
  } catch (e) {
    console.error('保存失败', e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.product-edit-page {
  padding: 20rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 40rpx;
}

.form {
  background: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  margin-bottom: 15rpx;
  color: #333;
}

.input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.submit-btn {
  width: 100%;
  height: 80rpx;
  background: #C9A962;
  color: #fff;
  border-radius: 8rpx;
  font-size: 32rpx;
}
</style>
