/**
 * 简单日志模块
 */
const createLogger = (module) => ({
  info: (...args) => console.log(`[${module}]`, new Date().toISOString(), ...args),
  error: (...args) => console.error(`[${module}]`, new Date().toISOString(), ...args),
  warn: (...args) => console.warn(`[${module}]`, new Date().toISOString(), ...args),
  debug: (...args) => console.log(`[${module}]`, new Date().toISOString(), ...args)
});

module.exports = { createLogger };
