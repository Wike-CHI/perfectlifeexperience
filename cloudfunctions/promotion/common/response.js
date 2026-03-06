/**
 * 统一响应格式
 */
const success = (data = null, message = 'success') => ({ code: 0, msg: message, data });
const error = (code = -1, message = 'error', details = null) => {
  const res = { code, msg: message };
  if (details) res.details = details;
  return res;
};

const ErrorCodes = {
  SUCCESS: 0,
  UNKNOWN_ERROR: -1,
  INVALID_PARAMS: -2,
  NOT_LOGGED_IN: -3,
  UNAUTHORIZED: -4
};

module.exports = { success, error, ErrorCodes };
