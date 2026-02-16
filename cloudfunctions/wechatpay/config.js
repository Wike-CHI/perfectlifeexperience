/**
 * 微信支付配置文件
 * 注意：生产环境建议使用环境变量，这里为了方便调试直接配置
 */

module.exports = {
  // 商户号
  mchid: '1106489077',
  
  // 小程序 AppID
  appid: 'wx4a0b93c3660d1404',
  
  // 商户证书序列号
  serialNo: '7E6308D94D16350E963D7CC53E12A07EC038673B',
  
  // APIv3 密钥
  apiV3Key: 'Ku2nNPDI0sg7sxwwTKthLBTRqczR3GRj',
  
  // 支付回调地址
  notifyUrl: 'https://cloud1-6gmp2q0y3171c353.ap-shanghai.tcb-api.tencentyun.com/wechatpay',
  
  // 商户私钥 (PEM格式)
  // 从 apiclient_key.pem 读取的内容
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC2Ed8mJAEnHY7x
N1PnIm7nOnk6iTnV4D1NJtr8m+5meoCKLy7hMNxCKxxJZ+9OiIVwGLyPH6alPHEJ
GLNCwsgI6fflbdXd0KUHKKHvRS/Q5uoPLPYbzIAjKg0jo/PAJPxjmbrjs9EuJzwd
B2ZuR5PAe+s4BpNn3t05UpMCf8vdbD7S+3mmVHhBtpnGlG+H55dQHHEptQs/C2p3
Y7pm5lPx8IdvqZjL8MkdtXeoSG7XrubObn0RGqvkR1NnFcRL/+YbtAjFGz7xrPlV
57u4KHUSJXK5rmPxp9/ePdR2wNbrMry+fi4qhbtL7CZrWe2ALYFyf9uphtHZv3mN
VG2Doq5jAgMBAAECggEBAIW9IvlVQTOGVtWBGrSRan2XSi1hV4ZvLRhbDki4Eapd
GcZnWjw4M9K28BRLsFEznzD0Oq23RiXh+/X+ms7TXTSPCHUS9SH2fQKBKlIjtDfz
JsL29+D7mrQ502T2rbnacTqIVeukzmbkkxePtAIVucaOP/3rdqO55S6SJUKUtR9z
gSGSWosLgEkREf3n9mYOnMjUyhZoIVA2hHSfpcQ9Gcd63/kYPOwyH3tmQFLMPgIm
BOgb+xVPBjvWA4TaWIP1ypY1iZtn/GNcYq7KQ2H8Eiffa+2U1BnpYcbpykf3spJc
xvZIKVPmCMuBauAlDB3sia7RBnLTmii+3VyitmSdsuECgYEA7ZggKNf07XRMaVxS
YrnO2n9HfFNUzhIcYFwQnzLaxCbg1GFADWb7eH/shJo5kxS1jBu1s1naarq9NTyA
tElVf/WScEa+dUBo8ncsUV+Id5onkP6lqjgZ1rySk/WqXKdETdRLn0JHTXdW6wgg
K85HAMnRaOE0fW2bYPuqajpbXu0CgYEAxCybkKJEVvuGFK7IocHWyAzJihoywy7O
eDYlrel5WnaGlmzggQ3g8FAoI9MMaG/uRueOFFmVEMwizn13chR//eX58mxxjLt+
PElhniP1zDnZkp4Ji86KrSyVW4Jq2OliCSL/GuSsdjP+gyCatbQRDBh9fxP+c6sI
5mn4s1S+SI8CgYB0PF5PXQeIO8M+MFplzj0yi94vJp1wi0+ynJfNKpX4LIUFoeYy
KFWSaBMP9FuCZzlCKDRGYAkI+f6i0sysZswbY8qWfyWiOzacmEzoKnKbAKGmv83Q
bs3FTk/vbto/pd02rkuoyEYV0fKF3V3P0ITQD+wRAUwqqLrBQZ3nhlE5KQKBgDWn
0cDEcRatYuXjTGLZxqoevTz1n269LaG5haLEmfmBM5yPGPSTXDO+aMwrnFgwTSa9
jKHKQrg+bUK3FGVyb/N85FlHCeOpIITSuU1snn0GUZkFeqzviASHji5iRGEhrDu9
g7LSWs1VuUYaM9aA8qyxQhnw2QbAAAYtc+Vwxz7HAoGADP1+rTPfhXnQOjiTZ0o7
yEN/CKpAYuabYqG9OGptyzKhQzvsetr8WKM8F0kdWA2H9A91aE7RCKOtE3MlheaR
UYk38f/3CS0fEjfAMUlLqcq4lcTHDYxGev5rcnL/9MNNTio1dakdixxH38aEmikJ
dB2ouTi08maLlrn3OZGLZo8=
-----END PRIVATE KEY-----`
};
