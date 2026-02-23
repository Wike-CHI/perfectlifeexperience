<template>
  <view class="announcements-page">
    <view class="page-header">
      <text class="page-title">公告管理</text>
      <button class="add-btn" @click="goToAdd">添加公告</button>
    </view>

    <view class="list">
      <view v-for="item in list" :key="item._id" class="list-item" @click="goToEdit(item._id)">
        <view class="item-header">
          <text class="item-title">{{ item.title }}</text>
          <text :class="['item-status', item.isActive ? 'active' : 'inactive']">
            {{ item.isActive ? '已发布' : '草稿' }}
          </text>
        </view>
        <text class="item-time">{{ formatDate(item.createTime) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/utils/cloudbase'

const list = ref<any[]>([])

onMounted(() => {
  loadList()
})

const loadList = async () => {
  try {
    const res = await callFunction('admin-api', {
      action: 'getAnnouncements',
      data: { page: 1, limit: 20 }
    })
    if (res.result?.code === 0) {
      list.value = res.result.data.list || []
    }
  } catch (e) {
    console.error('加载公告失败', e)
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString()
}

const goToAdd = () => {
  uni.navigateTo({ url: '/pagesAdmin/announcements/edit' })
}

const goToEdit = (id: string) => {
  uni.navigateTo({ url: `/pagesAdmin/announcements/edit?id=${id}` })
}
</script>

<style lang="scss" scoped>
.announcements-page {
  padding: 20rpx;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
}

.add-btn {
  padding: 15rpx 30rpx;
  background: #C9A962;
  color: #fff;
  border-radius: 8rpx;
}

.list-item {
  background: #fff;
  border-radius: 12rpx;
  padding: 25rpx;
  margin-bottom: 20rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15rpx;
}

.item-title {
  font-size: 28rpx;
  font-weight: bold;
}

.item-status {
  padding: 5rpx 15rpx;
  border-radius: 8rpx;
  font-size: 22rpx;

  &.active {
    background: #4CAF50;
    color: #fff;
  }

  &.inactive {
    background: #999;
    color: #fff;
  }
}

.item-time {
  font-size: 24rpx;
  color: #999;
}
</style>
