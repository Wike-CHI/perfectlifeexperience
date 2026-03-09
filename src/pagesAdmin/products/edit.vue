<template>
  <view class="product-edit-page">
    <view class="page-title">{{ isEdit ? '编辑商品' : '添加商品' }}</view>

    <view class="form">
      <!-- 基本信息 -->
      <view class="section-title">基本信息</view>

      <view class="form-item">
        <text class="label">商品名称 *</text>
        <input class="input" v-model="formData.name" placeholder="请输入商品名称" />
      </view>

      <view class="form-item">
        <text class="label">英文名称</text>
        <input class="input" v-model="formData.enName" placeholder="请输入英文名称" />
      </view>

      <!-- 商品图片 -->
      <view class="form-item">
        <text class="label">商品图片</text>
        <view class="image-list">
          <view v-for="(img, index) in formData.images" :key="index" class="image-item">
            <image class="preview-img" :src="img" mode="aspectFill" />
            <view class="delete-btn" @click="removeImage(index)">×</view>
          </view>
          <view v-if="formData.images.length < 9" class="add-image-btn" @click="chooseImage">
            <text class="add-icon">+</text>
            <text class="add-text">添加图片</text>
          </view>
        </view>
        <text class="image-tip">最多9张图片</text>
      </view>

      <view class="form-item">
        <text class="label">商品分类 *</text>
        <picker class="picker" :range="categories" range-key="name" :value="selectedCategoryIndex" @change="onCategoryChange">
          <view class="picker-display">
            <text v-if="selectedCategoryIndex >= 0">{{ categories[selectedCategoryIndex].name }}</text>
            <text v-else class="placeholder">请选择分类</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">价格（元） *</text>
        <input class="input" type="digit" v-model="formData.price" placeholder="请输入价格" />
      </view>

      <view class="form-item">
        <text class="label">库存 *</text>
        <input class="input" type="number" v-model="formData.stock" placeholder="请输入库存" />
      </view>

      <view class="form-item">
        <text class="label">商品描述</text>
        <textarea class="textarea" v-model="formData.description" placeholder="请输入商品描述" />
      </view>

      <!-- 产品属性 -->
      <view class="section-title">产品属性</view>

      <view class="form-item">
        <text class="label">规格说明</text>
        <input class="input" v-model="formData.specs" placeholder="如：500ml/瓶" />
      </view>

      <view class="form-item">
        <text class="label">酒精含量 (%)</text>
        <input class="input" type="digit" v-model="formData.alcoholContent" placeholder="如：5.0" />
      </view>

      <view class="form-item">
        <text class="label">酿造商</text>
        <input class="input" v-model="formData.brewery" placeholder="请输入酿造商名称" />
      </view>

      <view class="form-item">
        <text class="label">容量 (ml)</text>
        <input class="input" type="number" v-model="formData.volume" placeholder="如：500" />
      </view>

      <view class="form-item">
        <text class="label">标签（多个用逗号分隔）</text>
        <input class="input" v-model="formData.tagsInput" placeholder="如：热销,新品,推荐" />
      </view>

      <!-- 销售设置 -->
      <view class="section-title">销售设置</view>

      <view class="form-item switch-item">
        <text class="label">是否上架</text>
        <switch :checked="formData.isActive" @change="(e: any) => formData.isActive = e.detail.value" color="#C9A962" />
      </view>

      <view class="form-item switch-item">
        <text class="label">是否热门</text>
        <switch :checked="formData.isHot" @change="(e: any) => formData.isHot = e.detail.value" color="#C9A962" />
      </view>

      <view class="form-item switch-item">
        <text class="label">是否新品</text>
        <switch :checked="formData.isNew" @change="(e: any) => formData.isNew = e.detail.value" color="#C9A962" />
      </view>

      <!-- 多规格价格 -->
      <view class="section-title">多规格价格（可选）</view>
      <view class="price-list-tip">添加规格后，用户端将显示规格选择</view>

      <view v-for="(spec, index) in formData.priceList" :key="index" class="price-spec-item">
        <input class="input spec-input" v-model="spec.volume" placeholder="规格如: 500ml" />
        <input class="input price-input" type="digit" v-model="spec.price" placeholder="价格(元)" />
        <view class="delete-spec-btn" @click="removeSpec(index)">×</view>
      </view>

      <view class="add-spec-btn" @click="addSpec">+ 添加规格</view>

      <button class="submit-btn" @click="handleSubmit">{{ isEdit ? '保存' : '创建' }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'
import AdminAuthManager from '@/utils/admin-auth'
import AdminCacheManager from '@/utils/admin-cache'

/**
 * 商品编辑页面 - 添加/编辑商品
 * 需要管理员权限
 */

const isEdit = ref(false)
const productId = ref('')
const categories = ref<any[]>([])
const selectedCategoryIndex = ref(-1)

const formData = ref({
  // 基本信息
  name: '',
  enName: '',
  images: [] as string[],
  category: '',
  price: '',
  stock: '',
  description: '',
  // 产品属性
  specs: '',
  alcoholContent: '',
  brewery: '',
  volume: '',
  tagsInput: '',
  // 销售设置
  isActive: true,
  isHot: false,
  isNew: false,
  // 多规格价格
  priceList: [] as Array<{ volume: string; price: string }>
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
      console.log('分类列表:', JSON.stringify(list))
      categories.value = list
    } else {
      console.error('获取分类失败:', res)
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
    uni.showLoading({ title: '加载中...' })

    console.log('加载商品详情, ID:', productId.value)

    const res = await callFunction('admin-api', {
      action: 'getProductDetail',
      adminToken: AdminAuthManager.getToken(),
      data: { id: productId.value }
    })

    console.log('云函数返回结果:', JSON.stringify(res))

    uni.hideLoading()

    // 云函数返回格式: { code: 0, data: { product: {...}, categories: [...] } }
    // 需要从 data.product 中提取商品数据
    const productData = res.data?.product || res.data?.data || res.data

    console.log('提取的商品数据:', JSON.stringify(productData))

    if (res.code === 0 && productData) {
      // 设置分类
      const categoryName = productData.category || ''
      const catIndex = categories.value.findIndex(c => c.name === categoryName)
      selectedCategoryIndex.value = catIndex >= 0 ? catIndex : -1

      // 处理标签数组为逗号分隔字符串
      const tagsStr = Array.isArray(productData.tags) ? productData.tags.join(',') : ''

      // 处理多规格价格（从分转换为元）
      const priceList = Array.isArray(productData.priceList)
        ? productData.priceList.map((spec: any) => ({
            volume: spec.volume || '',
            price: spec.price ? (spec.price / 100).toFixed(2) : ''
          }))
        : []

      formData.value = {
        // 基本信息
        name: productData.name || '',
        enName: productData.enName || '',
        images: Array.isArray(productData.images) ? productData.images : [],
        category: categoryName,
        price: productData.price ? (productData.price / 100).toFixed(2) : '0',
        stock: String(productData.stock || 0),
        description: productData.description || '',
        // 产品属性
        specs: productData.specs || '',
        alcoholContent: productData.alcoholContent ? String(productData.alcoholContent) : '',
        brewery: productData.brewery || '',
        volume: productData.volume ? String(productData.volume) : '',
        tagsInput: tagsStr,
        // 销售设置
        isActive: productData.isActive !== false,
        isHot: productData.isHot === true,
        isNew: productData.isNew === true,
        // 多规格价格
        priceList: priceList
      }

      console.log('表单数据已填充:', JSON.stringify(formData.value))
    } else {
      console.error('加载商品失败 - code:', res.code, 'msg:', res.msg)
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('加载商品异常', e)
    uni.showToast({ title: '加载异常', icon: 'none' })
  }
}

// 添加规格
const addSpec = () => {
  formData.value.priceList.push({ volume: '', price: '' })
}

// 删除规格
const removeSpec = (index: number) => {
  formData.value.priceList.splice(index, 1)
}

// 选择图片
const chooseImage = () => {
  uni.chooseImage({
    count: 9 - formData.value.images.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      res.tempFilePaths.forEach((path: string) => {
        uploadImage(path)
      })
    }
  })
}

// 上传图片
const uploadImage = async (filePath: string) => {
  uni.showLoading({ title: '上传中...' })
  try {
    // 读取文件为 base64
    const base64 = await getFileBase64(filePath)

    // 调用云函数上传
    const res = await callFunction('admin-api', {
      action: 'uploadProductImage',
      adminToken: AdminAuthManager.getToken(),
      data: {
        base64Data: base64,
        fileName: 'product_' + Date.now() + '.jpg'
      }
    })

    uni.hideLoading()

    if (res.code === 0 && res.data && res.data.url) {
      formData.value.images.push(res.data.url)
    } else {
      uni.showToast({ title: res.msg || '上传失败', icon: 'none' })
    }
  } catch (e: any) {
    uni.hideLoading()
    console.error('上传图片失败', e)
    uni.showToast({ title: '上传失败', icon: 'none' })
  }
}

// 删除图片
const removeImage = (index: number) => {
  formData.value.images.splice(index, 1)
}

// 获取文件base64
const getFileBase64 = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: 'base64',
      success: (res) => {
        resolve(res.data as string)
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
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
    if (!formData.value.price) {
      uni.showToast({ title: '请输入价格', icon: 'none' })
      return
    }
    if (formData.value.stock === '' || formData.value.stock === null || formData.value.stock === undefined) {
      uni.showToast({ title: '请输入库存', icon: 'none' })
      return
    }

    // 处理标签：逗号分隔转为数组
    const tags = formData.value.tagsInput
      ? formData.value.tagsInput.split(',').map(t => t.trim()).filter(t => t)
      : []

    // 处理多规格价格
    const priceList = formData.value.priceList
      .filter(spec => spec.volume && spec.price)
      .map(spec => ({
        volume: spec.volume,
        price: Math.round(parseFloat(spec.price) * 100) // 转换为分
      }))

    // 构建完整的产品数据
    const data: any = {
      // 基本信息
      name: formData.value.name,
      enName: formData.value.enName || '',
      images: formData.value.images || [],
      category: formData.value.category,
      price: Math.round(parseFloat(formData.value.price || '0') * 100),
      stock: parseInt(formData.value.stock) || 0,
      description: formData.value.description || '',
      // 产品属性
      specs: formData.value.specs || '',
      alcoholContent: formData.value.alcoholContent ? parseFloat(formData.value.alcoholContent) : null,
      brewery: formData.value.brewery || '',
      volume: formData.value.volume ? parseInt(formData.value.volume) : null,
      tags: tags,
      // 销售设置
      isActive: formData.value.isActive,
      isHot: formData.value.isHot,
      isNew: formData.value.isNew,
      // 多规格价格
      priceList: priceList.length > 0 ? priceList : []
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
      // 🔧 清除管理端产品缓存，确保列表页显示最新数据
      AdminCacheManager.clearByType('products')
      console.log('[管理端缓存] 已清除产品列表缓存')

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
  padding-bottom: 60rpx;
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

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #C9A962;
  margin: 30rpx 0 20rpx;
  padding-left: 20rpx;
  border-left: 6rpx solid #C9A962;
}

.section-title:first-of-type {
  margin-top: 0;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-item.switch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-item.switch-item .label {
  margin-bottom: 0;
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
  margin-top: 40rpx;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.image-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}

.preview-img {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}

.delete-btn {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 40rpx;
  height: 40rpx;
  line-height: 40rpx;
  text-align: center;
  background: #ff4d4f;
  color: #fff;
  border-radius: 50%;
  font-size: 28rpx;
}

.add-image-btn {
  width: 160rpx;
  height: 160rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #ddd;
  border-radius: 8rpx;
}

.add-icon {
  font-size: 48rpx;
  color: #999;
}

.add-text {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}

.image-tip {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}

.price-list-tip {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 20rpx;
}

.price-spec-item {
  display: flex;
  align-items: center;
  gap: 15rpx;
  margin-bottom: 20rpx;
}

.spec-input {
  flex: 1;
}

.price-input {
  width: 180rpx;
}

.delete-spec-btn {
  width: 60rpx;
  height: 60rpx;
  line-height: 60rpx;
  text-align: center;
  background: #ff4d4f;
  color: #fff;
  border-radius: 8rpx;
  font-size: 36rpx;
}

.add-spec-btn {
  width: 100%;
  height: 70rpx;
  line-height: 70rpx;
  text-align: center;
  border: 2rpx dashed #C9A962;
  color: #C9A962;
  border-radius: 8rpx;
  font-size: 28rpx;
}
</style>
