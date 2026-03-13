/**
 * 邀请码绑定状态管理工具
 *
 * 用于管理用户尝试绑定推广人时的状态，特别是绑定失败的场景
 * 提供用户友好的错误反馈和后续重试机制
 */

// 存储键名
const BIND_FAILURE_KEY = 'inviteCode_bind_failure';

/**
 * 邀请码绑定状态接口
 */
export interface InviteCodeBindStatus {
  hasTried: boolean;           // 是否尝试过绑定
  lastAttemptTime?: string;   // 最后尝试时间 (ISO 8601格式)
  lastError?: string;         // 最后的错误信息
  lastInviteCode?: string;    // 最后使用的邀请码
}

/**
 * 保存邀请码绑定失败状态
 *
 * @param error - 错误信息
 * @param inviteCode - 尝试绑定的邀请码
 */
export function saveBindFailureStatus(error: string, inviteCode: string): void {
  try {
    const status: InviteCodeBindStatus = {
      hasTried: true,
      lastAttemptTime: new Date().toISOString(),
      lastError: error,
      lastInviteCode: inviteCode
    };

    uni.setStorageSync(BIND_FAILURE_KEY, status);
    console.log('邀请码绑定失败状态已保存:', status);
  } catch (err) {
    console.error('保存绑定失败状态出错:', err);
  }
}

/**
 * 获取邀请码绑定失败状态
 *
 * @returns 绑定状态对象，如果不存在则返回默认值
 */
export function getBindFailureStatus(): InviteCodeBindStatus {
  try {
    const status = uni.getStorageSync(BIND_FAILURE_KEY);

    // 🔧 修复：严格验证状态对象结构
    if (status && typeof status === 'object' && status.hasTried === true) {
      return status as InviteCodeBindStatus;
    }
  } catch (err) {
    console.error('读取绑定失败状态出错:', err);
  }

  // 返回默认状态
  return {
    hasTried: false
  };
}

/**
 * 清除邀请码绑定失败状态
 *
 * 在绑定成功后调用此函数清除历史失败记录
 */
export function clearBindFailureStatus(): void {
  try {
    uni.removeStorageSync(BIND_FAILURE_KEY);
    console.log('邀请码绑定失败状态已清除');
  } catch (err) {
    console.error('清除绑定失败状态出错:', err);
  }
}

/**
 * 显示邀请码绑定失败提示
 *
 * 如果存在历史失败记录，显示模态框提示用户可以重新绑定
 * 建议在应用启动或用户中心页面调用
 */
export function showBindFailureToast(): void {
  try {
    const status = getBindFailureStatus();

    if (status.hasTried && status.lastError) {
      // 延迟显示，避免与其他提示冲突
      setTimeout(() => {
        uni.showModal({
          title: '推广绑定提示',
          content: `之前尝试绑定的邀请码（${status.lastInviteCode}）无效：${status.lastError}。您可以在"推广中心"页面重新绑定推广人。`,
          showCancel: false,
          confirmText: '我知道了',
          success: (res) => {
            if (res.confirm) {
              console.log('用户已确认绑定失败提示');
            }
          }
        });
      }, 500);
    }
  } catch (err) {
    console.error('显示绑定失败提示出错:', err);
  }
}

/**
 * 显示绑定成功提示
 *
 * @param parentName - 上级推广员名称（可选）
 */
export function showBindSuccessToast(parentName?: string): void {
  try {
    const message = parentName
      ? `成功绑定推广员：${parentName}`
      : '推广绑定成功！';

    uni.showToast({
      title: message,
      icon: 'success',
      duration: 2000
    });

    // 清除失败状态
    clearBindFailureStatus();
  } catch (err) {
    console.error('显示绑定成功提示出错:', err);
  }
}

/**
 * 检查是否需要显示绑定失败提示
 *
 * @returns 如果需要显示则返回 true
 */
export function shouldShowBindFailureReminder(): boolean {
  const status = getBindFailureStatus();
  return status.hasTried && !!status.lastError;
}

/**
 * 获取距离上次绑定失败的时间（小时）
 *
 * @returns 距离上次失败的小时数，如果没有失败记录则返回 null
 */
export function getHoursSinceLastFailure(): number | null {
  try {
    const status = getBindFailureStatus();

    if (status.hasTried && status.lastAttemptTime) {
      const lastAttempt = new Date(status.lastAttemptTime);
      const now = new Date();
      const diffMs = now.getTime() - lastAttempt.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      return diffHours;
    }

    return null;
  } catch (err) {
    console.error('计算距离上次失败时间出错:', err);
    return null;
  }
}

/**
 * 导出工具对象（兼容性）
 */
export default {
  saveBindFailureStatus,
  getBindFailureStatus,
  clearBindFailureStatus,
  showBindFailureToast,
  showBindSuccessToast,
  shouldShowBindFailureReminder,
  getHoursSinceLastFailure
};
