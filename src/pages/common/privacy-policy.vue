<template>
  <view class="container">
    <view class="header-bg"></view>
    <view class="content-wrapper">
      <view class="card">
        <view class="title-section">
          <text class="main-title">隐私政策</text>
          <text class="subtitle">生效日期：2025年2月8日</text>
        </view>
        
        <view class="article-content">
          <view class="section">
            <text class="section-title">1. 引言</text>
            <text class="paragraph">
              大友元气（以下简称"我们"）非常重视用户的隐私和个人信息保护。您在使用我们的服务时，我们可能会收集和使用您的相关信息。我们希望通过本《隐私政策》向您说明，在使用我们服务时，我们如何收集、使用、保存、共享和转让这些信息。
            </text>
            <text class="paragraph">
              本政策与您所使用的服务息息相关，希望您仔细阅读。
            </text>
          </view>

          <view class="section">
            <text class="section-title">2. 我们如何收集和使用您的信息</text>
            <text class="paragraph">
              为了向您提供更好的服务，我们可能会收集以下信息：
            </text>
            <view class="list-item">
              <text class="dot">•</text>
              <text class="list-text">个人身份信息：包括但不限于您的姓名、电话号码、收货地址等，主要用于订单配送和客户服务。</text>
            </view>
            <view class="list-item">
              <text class="dot">•</text>
              <text class="list-text">设备信息：包括设备型号、操作系统版本、唯一设备标识符等，用于保障账户安全和系统稳定性。</text>
            </view>
            <view class="list-item">
              <text class="dot">•</text>
              <text class="list-text">日志信息：包括您的浏览记录、点击记录、IP地址等，用于优化我们的服务体验。</text>
            </view>
          </view>

          <view class="section">
            <text class="section-title">3. 我们如何共享、转让、公开披露您的信息</text>
            <text class="paragraph">
              我们不会向任何无关第三方提供、出售、出租、分享或交易您的个人信息，除非事先得到您的许可，或该第三方和我们（含关联公司）单独或共同为您提供服务，且在该服务结束后，其将被禁止访问包括其以前能够访问的所有这些资料。
            </text>
          </view>

          <view class="section">
            <text class="section-title">4. 我们如何保护您的信息</text>
            <text class="paragraph">
              我们已使用符合业界标准的安全防护措施保护您提供的个人信息，防止数据遭到未经授权访问、公开披露、使用、修改、损坏或丢失。我们会采取一切合理可行的措施，保护您的个人信息。
            </text>
          </view>

          <view class="section">
            <text class="section-title">5. 您的权利</text>
            <text class="paragraph">
              按照中国相关的法律、法规、标准，以及其他国家、地区的通行做法，我们保障您对自己的个人信息行使以下权利：访问您的个人信息、更正您的个人信息、删除您的个人信息、改变您授权同意的范围等。
            </text>
          </view>

          <view class="section">
            <text class="section-title">6. 联系我们</text>
            <text class="paragraph">
              如果您对本隐私政策有任何疑问、意见或建议，通过以下方式与我们联系：
            </text>
            <view class="contact-info">
              <text class="contact-item">公司名称：瑞安市来风餐饮店（个人独资）</text>
              <text class="contact-item">品牌名称：大友元气</text>
              <text class="contact-item">联系电话：135 6618 6557</text>
              <text class="contact-item">联系地址：中国浙江省温州市瑞安市瑞光大道1308号德信铂瑞湾二期30楼05-06</text>
              <text class="contact-item">官方网站：perfectlifeexpensive.com</text>
            </view>
          </view>
        </view>
      </view>
      
      <view class="footer">
        <text class="copyright">Copyright © 2024 大友元气 All Rights Reserved</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// 页面逻辑简单，无需特殊处理
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #FDF8F3;
  position: relative;
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 400rpx;
  background: linear-gradient(180deg, #D4A574 0%, #FDF8F3 100%);
  z-index: 0;
}

.content-wrapper {
  position: relative;
  z-index: 1;
  padding: 40rpx 30rpx;
}

.card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 30rpx rgba(61, 41, 20, 0.05);
  margin-bottom: 40rpx;
}

.title-section {
  text-align: center;
  margin-bottom: 50rpx;
  border-bottom: 2rpx solid #F5F0E8;
  padding-bottom: 30rpx;
}

.main-title {
  display: block;
  font-size: 44rpx;
  font-weight: bold;
  color: #3D2914;
  margin-bottom: 16rpx;
}

.subtitle {
  font-size: 26rpx;
  color: #9B8B7F;
}

.section {
  margin-bottom: 40rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #3D2914;
  margin-bottom: 20rpx;
  position: relative;
  padding-left: 20rpx;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8rpx;
  bottom: 8rpx;
  width: 6rpx;
  background: #D4A574;
  border-radius: 3rpx;
}

.paragraph {
  font-size: 28rpx;
  color: #6B5B4F;
  line-height: 1.8;
  margin-bottom: 20rpx;
  display: block;
  text-align: justify;
}

.list-item {
  display: flex;
  margin-bottom: 16rpx;
  padding-left: 10rpx;
}

.dot {
  color: #D4A574;
  margin-right: 12rpx;
  font-weight: bold;
}

.list-text {
  flex: 1;
  font-size: 28rpx;
  color: #6B5B4F;
  line-height: 1.6;
}

.contact-info {
  background: #FDF8F3;
  padding: 30rpx;
  border-radius: 16rpx;
  margin-top: 20rpx;
}

.contact-item {
  display: block;
  font-size: 26rpx;
  color: #5D3924;
  margin-bottom: 12rpx;
  line-height: 1.5;
}

.contact-item:last-child {
  margin-bottom: 0;
}

.footer {
  text-align: center;
  padding-bottom: 40rpx;
}

.copyright {
  font-size: 24rpx;
  color: #BDB0A4;
}
</style>