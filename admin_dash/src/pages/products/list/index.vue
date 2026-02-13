<template>
  <MainLayout>
    <view class="products-page">
      <!-- Filter Section -->
      <view class="filter-section">
        <view class="filter-row">
          <view class="filter-group">
            <text class="filter-label">分类:</text>
            <picker
              mode="selector"
              :range="categoryOptions"
              :value="categoryIndex"
              @change="onCategoryChange"
            >
              <view class="picker-value">
                {{ categoryOptions[categoryIndex] || '全部' }}
              </view>
            </picker>
          </view>

          <view class="filter-group">
            <text class="filter-label">状态:</text>
            <picker
              mode="selector"
              :range="statusOptions"
              :value="statusIndex"
              @change="onStatusChange"
            >
              <view class="picker-value">
                {{ statusOptions[statusIndex] }}
              </view>
            </picker>
          </view>
        </view>

        <view class="search-row">
          <input
            v-model="searchKeyword"
            class="search-input"
            placeholder="搜索商品名称"
            @confirm="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">搜索</button>
          <button class="add-btn" @click="handleAdd">新增商品</button>
        </view>
      </view>

      <!-- Products Table -->
      <view class="table-container">
        <view class="table-header">
          <text class="col-name">商品名称</text>
          <text class="col-price">价格</text>
          <text class="col-stock">库存</text>
          <text class="col-category">分类</text>
          <text class="col-actions">操作</text>
        </view>

        <view class="table-body">
          <view
            v-for="product in products"
            :key="product._id"
            class="table-row"
          >
            <view class="col-name">
              <image v-if="product.images && product.images[0]" :src="product.images[0]" class="product-thumb" mode="aspectFill" />
              <text class="product-name">{{ product.name }}</text>
            </view>
            <text class="col-price">¥{{ (product.price / 100).toFixed(2) }}</text>
            <text class="col-stock" :class="{ low: product.stock < 10 }">
              {{ product.stock }}
            </text>
            <text class="col-category">{{ product.category }}</text>
            <view class="col-actions">
              <button class="action-btn edit" @click="handleEdit(product)">编辑</button>
              <button class="action-btn delete" @click="handleDelete(product)">删除</button>
            </view>
          </view>
        </view>
      </view>

      <!-- Pagination -->
      <view class="pagination" v-if="totalPages > 1">
        <button
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >上一页</button>
        <text class="page-info">{{ currentPage }} / {{ totalPages }}</text>
        <button
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >下一页</button>
      </view>
    </view>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { app } from '@/utils/cloudbase';
import MainLayout from '@/components/MainLayout.vue';

const products = ref([]);
const categories = ref([]);
const categoryOptions = ref(['全部']);
const categoryIndex = ref(0);
const statusOptions = ref(['全部', '在售', '缺货']);
const statusIndex = ref(0);
const searchKeyword = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const total = ref(0);

const fetchProducts = async () => {
  try {
    const res = await app.callFunction({
      name: 'admin-api',
      data: {
        action: 'getProducts',
        data: {
          page: currentPage.value,
          limit: 20,
          category: categoryOptions.value[categoryIndex.value] === '全部' ? 'all' : categoryOptions.value[categoryIndex.value],
          keyword: searchKeyword.value,
          status: statusIndex.value === 0 ? undefined : (statusIndex.value === 1 ? 'active' : 'inactive')
        }
      }
    });

    if (res.result.code === 0) {
      products.value = res.result.data.list;
      categories.value = res.result.data.categories;
      totalPages.value = res.result.data.totalPages;
      total.value = res.result.data.total;

      // Update category options
      if (categories.value.length > 0 && categoryOptions.value.length === 1) {
        categoryOptions.value = ['全部', ...categories.value.map(c => c.name)];
      }
    }
  } catch (error) {
    console.error('Fetch products error:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

const onCategoryChange = (e: any) => {
  categoryIndex.value = e.detail.value;
  currentPage.value = 1;
  fetchProducts();
};

const onStatusChange = (e: any) => {
  statusIndex.value = e.detail.value;
  currentPage.value = 1;
  fetchProducts();
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchProducts();
};

const changePage = (page: number) => {
  currentPage.value = page;
  fetchProducts();
};

const handleAdd = () => {
  uni.navigateTo({ url: '/pages/products/edit/index' });
};

const handleEdit = (product: any) => {
  uni.navigateTo({
    url: `/pages/products/edit/index?id=${product._id}`
  });
};

const handleDelete = (product: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除"${product.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const deleteRes = await app.callFunction({
            name: 'admin-api',
            data: {
              action: 'deleteProduct',
              data: { id: product._id }
            }
          });

          if (deleteRes.result.code === 0) {
            uni.showToast({ title: '删除成功', icon: 'success' });
            fetchProducts();
          } else {
            uni.showToast({ title: deleteRes.result.msg, icon: 'none' });
          }
        } catch (error) {
          console.error('Delete error:', error);
          uni.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    }
  });
};

onMounted(() => {
  fetchProducts();
});
</script>

<style lang="scss" scoped>
@use "@/styles/variables.scss" as *;

.products-page {
  padding: $spacing-lg;
}

.filter-section {
  background-color: $bg-card;
  border-radius: $radius-md;
  padding: $spacing-lg;
  margin-bottom: $spacing-lg;
}

.filter-row {
  display: flex;
  gap: $spacing-lg;
  margin-bottom: $spacing-md;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.filter-label {
  font-size: 14px;
  color: $text-secondary;
}

.picker-value {
  padding: $spacing-xs $spacing-md;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: $radius-sm;
  font-size: 14px;
  min-width: 100px;
}

.search-row {
  display: flex;
  gap: $spacing-md;
}

.search-input {
  flex: 1;
  height: 40px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: $radius-sm;
  padding: 0 $spacing-md;
  color: $text-primary;
  font-size: 14px;
}

.search-btn, .add-btn {
  height: 40px;
  padding: 0 $spacing-lg;
  border: none;
  border-radius: $radius-sm;
  font-size: 14px;
  font-weight: 600;
}

.search-btn {
  background-color: rgba($color-amber-gold, 0.2);
  color: $color-amber-gold;
}

.add-btn {
  background: linear-gradient(135deg, $color-amber-gold 0%, #b8943d 100%);
  color: $bg-primary;
}

.table-container {
  background-color: $bg-card;
  border-radius: $radius-md;
  overflow: hidden;
}

.table-header {
  display: flex;
  background-color: rgba($color-amber-gold, 0.1);
  padding: $spacing-md;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.table-row {
  display: flex;
  padding: $spacing-md;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
}

.col-name {
  flex: 2;
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.product-thumb {
  width: 40px;
  height: 40px;
  border-radius: $radius-sm;
  object-fit: cover;
}

.product-name {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-price, .col-stock, .col-category {
  flex: 1;
  font-size: 14px;
}

.col-stock.low {
  color: #ff4d4f;
}

.col-actions {
  flex: 1.5;
  display: flex;
  gap: $spacing-sm;
}

.action-btn {
  flex: 1;
  height: 32px;
  border: none;
  border-radius: $radius-sm;
  font-size: 12px;
}

.action-btn.edit {
  background-color: rgba($color-amber-gold, 0.2);
  color: $color-amber-gold;
}

.action-btn.delete {
  background-color: rgba(255, 77, 79, 0.2);
  color: #ff4d4f;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: $spacing-lg;
  margin-top: $spacing-lg;
}

.pagination button {
  height: 36px;
  padding: 0 $spacing-lg;
  background-color: $bg-card;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: $radius-sm;
  color: $text-primary;
  font-size: 14px;
}

.pagination button:disabled {
  opacity: 0.3;
}

.page-info {
  font-size: 14px;
  color: $text-secondary;
}
</style>
