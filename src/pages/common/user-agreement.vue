<template>
  <view class="container">
    <view class="header-bg"></view>
    <view class="content-wrapper">
      <view class="card">
        <view class="title-section">
          <text class="main-title">用户协议</text>
          <text class="subtitle">生效日期：2024年2月8日</text>
        </view>
        
        <view class="article-content">
          <view class="section">
            <text class="section-title">1. 服务条款确认与接纳</text>
            <text class="paragraph">
              欢迎使用大友元气服务。本协议是您与瑞安市来风餐饮店（以下简称"我们"）之间关于您使用大友元气服务所订立的协议。
            </text>
            <text class="paragraph">
              请您在注册或使用服务前，务必仔细阅读并充分理解本协议的全部内容。当您点击"同意"或开始使用我们的服务时，即表示您已阅读、理解并同意签署本协议。
            </text>
          </view>

          <view class="section">
            <text class="section-title">2. 账号注册与使用</text>
            <view class="list-item">
              <text class="dot">•</text>
              <text class="list-text">您在使用本服务时可能需要注册一个账号。您应当保证注册信息的真实性、准确性和完整性。</text>
            </view>
            <view class="list-item">
              <text class="dot">•</text>
              <text class="list-text">您的账号仅限您本人使用，禁止以任何形式转让、借用或售卖。</text>
            </view>
            <view class="list-item">
              <text class="dot">•</text>
              <text class="list-text">您有责任妥善保管您的账号信息及密码，因您保管不善可能导致遭受盗号或密码失窃，责任由您自行承担。</text>
            </view>
          </view>

          <view class="section">
            <text class="section-title">3. 用户行为规范</text>
            <text class="paragraph">
              您在使用本服务过程中，不得发布、传送、传播、储存违反国家法律法规禁止的内容，包括但不限于：
            </text>
            <view class="list-item">
              <text class="dot">•</text>
              <text class="list-text">违反宪法确定的基本原则的；</text>
            </view>
            <view class="list-item">
              <text class="dot">•</text>
              <text class="list-text">危害国家安全，泄露国家秘密，颠覆国家政权，破坏国家统一的；</text>
            </view>
            <view class="list-item">
              <text class="dot">•</text>
              <text class="list-text">侮辱或者诽谤他人，侵害他人合法权益的；</text>
            </view>
            <view class="list-item">
              <text class="dot">•</text>
              <text class="list-text">含有法律、行政法规禁止的其他内容的。</text>
            </view>
          </view>

          <view class="section">
            <text class="section-title">4. 知识产权声明</text>
            <text class="paragraph">
              我们提供的服务中包含的任何文本、图片、图形、音频和/或视频资料均受版权、商标和/或其它财产所有权法律的保护，未经相关权利人同意，上述资料均不得在任何媒体直接或间接发布、播放、出于播放或发布目的而改写或再发行，或者被用于其他任何商业目的。
            </text>
          </view>

          <view class="section">
            <text class="section-title">5. 免责声明</text>
            <text class="paragraph">
              鉴于网络服务的特殊性，我们不保证服务不会中断，对服务的及时性、安全性、准确性也不作担保。对于因不可抗力或我们不能控制的原因造成的网络服务中断或其它缺陷，我们不承担任何责任，但将尽力减少因此而给您造成的损失和影响。
            </text>
          </view>

          <view class="section">
            <text class="section-title">6. 法律适用与管辖</text>
            <text class="paragraph">
              本协议的订立、执行和解释及争议的解决均应适用中华人民共和国法律。如双方就本协议内容或其执行发生任何争议，双方应尽量友好协商解决；协商不成时，任何一方均可向公司所在地人民法院提起诉讼。
            </text>
          </view>

          <view class="section">
            <text class="section-title">7. 联系方式</text>
            <text class="paragraph">
              如您对本协议有任何疑问，请联系我们：
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