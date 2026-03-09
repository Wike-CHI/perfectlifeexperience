# 序列化工具使用指南

## 快速开始

### 安装导入
```typescript
import { safeClone, safeStringify, hasCircularReference, safeLog } from '@/utils/serialization'
```

### 基本用法

#### 1. 安全克隆对象
```typescript
// ❌ 错误：直接传递响应式对象
const res = await callFunction('api', {
  data: reactiveData  // 包含循环引用
})

// ✅ 正确：使用安全克隆
const res = await callFunction('api', {
  data: safeClone(reactiveData)  // 移除响应式属性和循环引用
})
```

#### 2. 安全日志输出
```typescript
// ❌ 错误：直接输出复杂对象
console.log('Data:', complexObject)

// ✅ 正确：使用安全日志
safeLog('Data:', complexObject)
// 或
console.log('Data:', safeStringify(complexObject))
```

#### 3. 检测循环引用
```typescript
if (hasCircularReference(obj)) {
  console.warn('对象包含循环引用')
  // 处理循环引用情况
}
```

## 使用场景

### 场景 1: 云函数调用
```typescript
import { safeClone } from '@/utils/serialization'
import { callFunction } from '@/utils/cloudbase'

const requestData = safeClone({
  page: currentPage.value,  // ref
  keyword: searchQuery.value,  // computed
  filters: activeFilters.value  // reactive
})

const res = await callFunction('admin-api', {
  action: 'getData',
  data: requestData
})
```

### 场景 2: 缓存数据
```typescript
import { safeClone } from '@/utils/serialization'

// 缓存前先克隆
const cachedData = safeClone(complexReactiveObject)
uni.setStorageSync('cache_key', JSON.stringify(cachedData))
```

### 场景 3: 日志调试
```typescript
import { safeLog } from '@/utils/serialization'

// 安全地输出复杂对象
safeLog('用户数据:', userInfo)
safeLog('订单详情:', orderDetail)
```

### 场景 4: API 请求
```typescript
import { safeClone } from '@/utils/serialization'

const submitData = safeClone({
  user: currentUser.value,
  items: cartItems.value,
  address: shippingAddress.value
})

await api.createOrder(submitData)
```

## 工具函数说明

### safeClone(obj)
**功能**: 深度克隆对象，移除响应式属性和循环引用

**参数**:
- `obj`: any - 要克隆的对象

**返回值**: T - 克隆后的纯 JavaScript 对象

**特性**:
- ✅ 移除 Vue 响应式属性
- ✅ 处理循环引用
- ✅ 保留基本数据类型
- ✅ 支持嵌套对象和数组
- ⚠️ 丢失 Function、Symbol、undefined

**示例**:
```typescript
const reactive = ref({ name: 'test' })
const cloned = safeClone(reactive)
// { name: 'test' }  (没有 __v_isRef 等属性)
```

### safeStringify(obj)
**功能**: 安全地序列化对象为 JSON 字符串

**参数**:
- `obj`: any - 要序列化的对象

**返回值**: string - JSON 字符串或错误信息

**特性**:
- ✅ 不会抛出循环引用错误
- ✅ 返回友好的错误信息

**示例**:
```typescript
const json = safeStringify(complexObject)
// 成功: '{"name":"test"}'
// 失败: '[Object contains circular references...]'
```

### hasCircularReference(obj)
**功能**: 检测对象是否包含循环引用

**参数**:
- `obj`: any - 要检测的对象

**返回值**: boolean - 是否包含循环引用

**示例**:
```typescript
if (hasCircularReference(data)) {
  console.warn('数据包含循环引用，已自动处理')
}
```

### safeLog(label, obj)
**功能**: 安全地打印对象到控制台

**参数**:
- `label`: string - 日志标签
- `obj`: any - 要打印的对象

**示例**:
```typescript
safeLog('API 请求:', requestData)
safeLog('响应数据:', response)
```

## 注意事项

### ⚠️ 会被过滤的数据
- `Function` - 函数
- `Symbol` - 符号
- `undefined` - 未定义值
- Vue 内部属性 - `__v_isRef`, `__v_isReadonly` 等

### ✅ 支持的数据类型
- 基本类型（string, number, boolean, null）
- 普通对象
- 数组
- Date（自动转为 ISO 字符串）
- 嵌套结构

### 📝 最佳实践

1. **总是在传递到外部系统前克隆**
   ```typescript
   // 云函数调用
   callFunction('api', { data: safeClone(reactiveData) })

   // 缓存存储
   cache.set('key', safeClone(reactiveData))

   // 日志输出
   safeLog('Data:', reactiveData)
   ```

2. **不要克隆敏感数据**
   ```typescript
   // ❌ 避免克隆密码等敏感信息
   safeClone({ password: 'secret' })

   // ✅ 先过滤再克隆
   const safeData = safeClone({
     username: user.username,
     email: user.email
   })
   ```

3. **处理克隆失败**
   ```typescript
   try {
     const cloned = safeClone(data)
     // 使用 cloned
   } catch (error) {
     console.error('克隆失败:', error)
     // 降级处理
   }
   ```

## 常见问题

### Q: 为什么我的 function 被移除了？
A: `JSON.stringify` 无法序列化函数。如果需要传递函数，请考虑：
- 使用字符串形式传递函数名
- 在服务端定义函数逻辑
- 使用特殊的数据结构代替函数

### Q: Date 对象变成了字符串？
A: 这是正常行为。Date 对象会被自动转为 ISO 格式字符串。

### Q: 如何保留 undefined 值？
A: 可以在克隆后手动处理：
```typescript
const cloned = safeClone(data)
cloned.someField = data.someField ?? undefined
```

### Q: 性能影响如何？
A: 对于大多数对象（<1000个属性），性能影响可忽略。对于超大对象，可以考虑：
- 使用浅拷贝
- 手动构建传递数据
- 使用 `structuredClone()`（浏览器环境）

## 迁移指南

### 从 JSON.parse(JSON.stringify()) 迁移

**之前**:
```typescript
const cloned = JSON.parse(JSON.stringify(data))
```

**之后**:
```typescript
const cloned = safeClone(data)
```

**优势**:
- ✅ 自动处理循环引用
- ✅ 更好的错误处理
- ✅ 移除 Vue 响应式属性
- ✅ 统一的 API

---

**最后更新**: 2026-03-09
**版本**: v1.0
**相关文档**: [循环引用错误修复](./2026-03-09-circular-reference-fix.md)
