/**
 * wx-server-sdk 模拟模块
 * 用于本地测试云函数
 */

const mockDatabase = () => ({
  collection: () => ({
    where: () => ({
      get: async () => ({ data: [] }),
      update: async () => ({ stats: { updated: 0 } }),
      remove: async () => ({ stats: { removed: 0 } })
    }),
    add: async () => ({ _id: 'test-id' }),
    doc: () => ({
      get: async () => ({ data: {} }),
      update: async () => ({ stats: { updated: 1 } }),
      remove: async () => ({ stats: { removed: 1 } })
    }),
    limit: function() { return this; },
    skip: function() { return this; },
    orderBy: function() { return this; },
    field: function() { return this; }
  }),
  command: {
    eq: (val) => ({ $eq: val }),
    neq: (val) => ({ $neq: val }),
    gt: (val) => ({ $gt: val }),
    gte: (val) => ({ $gte: val }),
    lt: (val) => ({ $lt: val }),
    lte: (val) => ({ $lte: val }),
    in: (arr) => ({ $in: arr }),
    and: (...args) => ({ $and: args }),
    or: (...args) => ({ $or: args }),
    exists: (val) => ({ $exists: val })
  }
});

module.exports = {
  init: (config) => {
    console.log('[Mock] wx-server-sdk initialized:', config);
  },

  database: mockDatabase,

  getWXContext: () => ({
    OPENID: 'test-openid-123',
    APPID: 'test-appid-456',
    ENV: 'test-env',
    SOURCE: 'wx'
  }),

  DYNAMIC_CURRENT_ENV: 'test-dynamic-env',

  callFunction: async (params) => {
    console.log('[Mock] Calling function:', params.name);
    return {
      result: {
        code: 0,
        data: {},
        msg: 'Mock function call success'
      }
    };
  },

  uploadFile: async (params) => {
    console.log('[Mock] Uploading file:', params.cloudPath);
    return {
      fileID: 'test-file-id'
    };
  },

  downloadFile: async (params) => {
    console.log('[Mock] Downloading file:', params.fileID);
    return {
      tempFilePath: '/tmp/test-file'
    };
  },

  deleteFile: async (params) => {
    console.log('[Mock] Deleting file:', params.fileList);
    return {
      fileList: params.fileList.map(id => ({ fileID: id, status: 0 }))
    };
  },

  getTempFileURL: async (params) => {
    console.log('[Mock] Getting temp file URL:', params.fileList);
    return {
      fileList: params.fileList.map(id => ({
        fileID: id,
        tempFileURL: 'https://example.com/temp/' + id
      }))
    };
  }
};
