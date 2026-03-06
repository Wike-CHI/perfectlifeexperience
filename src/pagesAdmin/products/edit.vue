<template>
  <view class="product-edit-page">
    <view class="page-title">{{ isEdit ? '编辑商品' : '添加商品' }}</view>

    <view class="form">
      <view class="form-item">
        <text class="label">商品名称</text>
        <input class="input" v-model="formData.name" placeholder="请输入商品名称" />
      </view>

      <view class="form-item">
        <text class="label">商品分类</text>
        <picker class="picker" :range="categories" range-key="name" :value="selectedCategoryIndex" @change="onCategoryChange">
          <view class="picker-display">
            <text v-if="selectedCategoryIndex >= 0">{{ categories[selectedCategoryIndex].name }}</text>
            <text v-else class="placeholder">请选择分类</text>
          </view>
        </picker>
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
import { ref, computed, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'

/**
 * 商品编辑页面 - 添加/编辑商品
 * 需要管理员权限
 */

const isEdit = ref(false)
const productId = ref('')
const categories = ref<any[]>([])
const selectedCategoryIndex = ref(-1)

const formData = ref({
  name: '',
  category: '',
  price: '',
  stock: '',
  description: ''
})

// 计算选中分类的索引
const onCategoryChange = (e: any) => {
  const index = parseInt(e.detail.value)
  selectedCategoryIndex.value = index
  if (categories.value[index]) {
    formData.value.category = categories.value[index].name
  }
}

// 加载分类列表
const loadCategories = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getCategories',
      adminToken: AdminAuthManager.getToken()
    })
    console.log('分类数据:', JSON.stringify(res))
    if (res.code === 0 && res.data) {
      // 兼容不同的返回格式: {list: [...]} 或 {[...]} 直接是数组
      let list: any[] = []
      if (Array.isArray(res.data)) {
        list = res.data
      } else if (res.data.list) {
        list = res.data.list
      } else if (res.data.categories) {
        list = res.data.categories
      }
      categories.value = list
    }
  } catch (error) {
    console.error('加载分类失败', error)
  }
}

// 权限检查
onMounted(async () => {
  if (!AdminAuthManager.checkAuth()) return

  // 加载分类列表
  await loadCategories()

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
    const res = await callFunction('admin-api', {
      action: 'getProductDetail',
      adminToken: AdminAuthManager.getToken(),
      data: { id: productId.value }
    })
    // 使用 extractData 兼容返回格式
    const data = res.data?.data || res.data
    if (res.code === 0 && data) {
      // 设置分类
      const categoryName = data.category || ''
      const catIndex = categories.value.findIndex(c => c.name === categoryName)
      selectedCategoryIndex.value = catIndex >= 0 ? catIndex : -1

      formData.value = {
        name: data.name || '',
        category: categoryName,
        price: (data.price / 100).toFixed(2),
        stock: String(data.stock || 0),
        description: data.description || ''
      }
    }
  } catch (e) {
    console.error('加载商品失败', e)
  }
}

const handleSubmit = async () => {
  try {
    // 验证必填字段
    if (!formData.value.name) {
      uni.showToast({ title: '请输入商品名称', icon: 'none' })
      return
    }
    if (!formData.value.category) {
      uni.showToast({ title: '请选择商品分类', icon: 'none' })
      return
    }

    const data = {
      name: formData.value.name,
      category: formData.value.category,
      price: Math.round(parseFloat(formData.value.price || '0') * 100),
      stock: parseInt(formData.value.stock) || 0,
      description: formData.value.description
    }

    const action = isEdit.value ? 'updateProduct' : 'createProduct'
    const params = isEdit.value ? { id: productId.value, ...data } : data

    console.log('提交数据:', JSON.stringify(params))

    const res = await callFunction('admin-api', {
      action,
      adminToken: AdminAuthManager.getToken(),
      data: params
    })

    console.log('响应结果:', JSON.stringify(res))

    if (res.code === 0) {
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 1500)
    } else {
      uni.showToast({ title: res.msg || '保存失败', icon: 'none' })
    }
  } catch (e: any) {
    console.error('保存失败', e)
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
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

.picker {
  width: 100%;
}

.picker-display {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  background: #fff;
}

.picker-display .placeholder {
  color: #999;
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
