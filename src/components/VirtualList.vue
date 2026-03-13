<template>
  <view
    class="virtual-list"
    :style="{ height: containerHeight }"
    @scroll="handleScroll"
    scroll-y
  >
    <!-- 占位容器，撑开总高度 -->
    <view
      class="virtual-list-phantom"
      :style="{ height: totalHeight + 'px' }"
    ></view>

    <!-- 实际渲染的可见项 -->
    <view
      class="virtual-list-content"
      :style="{ transform: `translateY(${offsetY}px)` }"
    >
      <view
        v-for="item in visibleData"
        :key="getItemKey(item)"
        class="virtual-list-item"
        :style="getItemStyle(item)"
      >
        <slot :item="item.data" :index="item.index" />
      </view>
    </view>

    <!-- 加载更多指示器 -->
    <view v-if="loading" class="virtual-list-loading">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { isFeatureEnabled } from '@/config/featureFlags';
import { VIRTUAL_LIST_CONFIG } from '@/config/performance';

interface Props {
  items: any[];
  itemHeight: number;
  visibleCount?: number;
  bufferSize?: number;
  containerHeight?: string;
  loading?: boolean;
  hasMore?: boolean;
  keyField?: string;
}

const props = withDefaults(defineProps<Props>(), {
  visibleCount: VIRTUAL_LIST_CONFIG.visibleCount,
  bufferSize: VIRTUAL_LIST_CONFIG.bufferSize,
  containerHeight: '100vh',
  loading: false,
  hasMore: true,
  keyField: '_id'
});

const emit = defineEmits<{
  scroll: [{ scrollTop: number }];
  loadMore: [];
}>();

// 状态管理
const scrollTop = ref(0);
const startIndex = ref(0);
const endIndex = ref(0);

// 计算总高度
const totalHeight = computed(() => {
  return props.items.length * props.itemHeight;
});

// 计算可见范围
const visibleData = computed(() => {
  const start = Math.max(0, startIndex.value);
  const end = Math.min(props.items.length, endIndex.value);
  const visible = [];

  for (let i = start; i < end; i++) {
    visible.push({
      data: props.items[i],
      index: i
    });
  }

  return visible;
});

// 计算偏移量
const offsetY = computed(() => {
  return startIndex.value * props.itemHeight;
});

// 处理滚动事件
const handleScroll = (e: any) => {
  const { scrollTop: newScrollTop } = e.detail;
  scrollTop.value = newScrollTop;

  // 计算 startIndex
  const newStartIndex = Math.floor(newScrollTop / props.itemHeight);

  // 考虑缓冲区
  startIndex.value = Math.max(0, newStartIndex - props.bufferSize);

  // 计算 endIndex
  endIndex.value = Math.min(
    props.items.length,
    newStartIndex + props.visibleCount + props.bufferSize
  );

  emit('scroll', { scrollTop: newScrollTop });

  // 检查是否需要加载更多
  const threshold = 200; // 距离底部 200px 时触发
  const contentHeight = totalHeight.value;
  const containerHeight = parseFloat(props.containerHeight) || window.innerHeight;

  if (props.hasMore && !props.loading) {
    if (newScrollTop + containerHeight >= contentHeight - threshold) {
      emit('loadMore');
    }
  }
};

// 获取列表项唯一标识
const getItemKey = (item: any) => {
  return props.keyField ? item.data[props.keyField] : item.index;
};

// 获取列表项样式
const getItemStyle = (item: any) => {
  return {
    height: `${props.itemHeight}px`,
    position: 'absolute',
    top: `${item.index * props.itemHeight}px`,
    left: '0',
    right: '0'
  };
};

// 监听 items 变化，重置滚动状态
watch(() => props.items.length, () => {
  // 如果数据从0开始变化，重置滚动位置
  if (props.items.length <= props.visibleCount + props.bufferSize * 2) {
    startIndex.value = 0;
    endIndex.value = Math.min(
      props.items.length,
      props.visibleCount + props.bufferSize
    );
  }
});

// 初始化
onMounted(() => {
  startIndex.value = 0;
  endIndex.value = Math.min(
    props.items.length,
    props.visibleCount + props.bufferSize
  );
});
</script>

<style scoped>
.virtual-list {
  position: relative;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.virtual-list-phantom {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: -1;
}

.virtual-list-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  will-change: transform;
}

.virtual-list-item {
  box-sizing: border-box;
}

.virtual-list-loading {
  position: absolute;
  left: 0;
  right: 0;
  padding: 20rpx 0;
  text-align: center;
  background-color: #fff;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}
</style>
