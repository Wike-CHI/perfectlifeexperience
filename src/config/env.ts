/**
 * 环境配置文件
 *
 * ⚠️ 安全提示：
 * - 生产环境请通过 CI/CD 构建参数注入真实值
 * - 不要在此文件中提交生产环境的真实 ID
 * - 此文件中的默认值仅用于开发调试
 */

// 开发环境默认配置（仅本地使用）
const DEV_CONFIG = {
  ENV_ID: 'cloud1-6gmp2q0y3171c353',
  WEIXIN_APPID: 'wx4a0b93c3660d1404'
};

// 获取环境变量的辅助函数
function getEnvVar(key: keyof typeof DEV_CONFIG): string {
  // 1. 首先尝试从 Vite 环境变量读取 (VITE_*)
  const viteKey = `VITE_${key}`;
  const viteValue = import.meta.env[viteKey];
  if (viteValue && viteValue !== 'undefined' && viteValue !== '' && viteValue !== 'your-env-id-here') {
    return viteValue;
  }

  // 2. 开发环境使用默认值
  if (import.meta.env.DEV) {
    return DEV_CONFIG[key];
  }

  // 3. 生产环境返回空字符串（强制要求配置）
  return '';
}

// 云开发环境ID
export const ENV_ID: string = getEnvVar('ENV_ID');

// 微信小程序 AppID
export const WEIXIN_APPID: string = getEnvVar('WEIXIN_APPID');

// 环境检查
export function checkEnvConfig(): boolean {
  if (!ENV_ID) {
    console.error('❌ 云开发环境ID未配置');
    console.error('请检查：');
    console.error('1. 开发环境：src/config/env.ts 中的 DEV_CONFIG');
    console.error('2. 生产环境：构建时注入 VITE_ENV_ID 环境变量');
    return false;
  }
  return true;
}

// 开发环境提示
if (import.meta.env.DEV) {
  console.log('🔧 开发环境 - 环境ID:', ENV_ID);
}
