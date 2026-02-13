/**
 * 微信云开发 API 类型定义
 *
 * 功能：
 * - 定义完整的 WxCloud 接口
 * - 移除 any 类型
 * - 提供编译时类型检查
 */

/**
 * 云函数调用选项
 */
export interface WxCloudCallFunctionOptions {
  name: string;
  data?: Record<string, unknown>;
}

/**
 * 云函数调用结果
 */
export interface WxCloudCallFunctionResult {
  errMsg?: string;
  result: unknown;
}

/**
 * 云开发配置选项
 */
export interface WxCloudInitOptions {
  env?: string;
  traceUser?: boolean;
  traceUser?: WxCloudTraceUserOptions;
}

/**
 * 追踪用户选项
 */
export interface WxCloudTraceUserOptions {
  /**
   * 是否需要追踪普通用户信息
   * true: �umi 会被追踪
   * false: umi 不会被追踪
   */
  umi?: boolean;
}

/**
 * 数据库集合引用
 */
export interface DBCollectionReference {
  /**
   * 获取集合引用
   * @param name 集合名称
   */
  collection: (name: string) => DBQuery;

  /**
   * 获取文档引用
   * @param name 文档 ID
   */
  doc: (name: string) => DBDocumentReference;
}

/**
 * 数据库查询对象
 */
export interface DBQuery {
  /**
   * 添加查询条件
   * @param condition 查询条件
   */
  where: (condition: DBQueryCondition) => DBQuery;

  /**
   * 排序
   * @param field 字段名
   * @param order 排序方向 (asc/desc)
   */
  orderBy: (field: string, order: 'asc' | 'desc') => DBQuery;

  /**
   * 限制返回数量
   * @param limit 限制数量
   */
  limit: (limit: number) => DBQuery;

  /**
   * 跳过指定数量
   * @param offset 跳过数量
   */
  skip: (offset: number) => DBQuery;

  /**
   * 执行查询
   */
  get: () => Promise<DBQueryResult>;

  /**
   * 统计数量
   */
  count: () => Promise<DBCountResult>;
}

/**
 * 数据库查询条件
 */
export type DBQueryCondition =
  | { [key: string]: string | number | boolean }
  | {
      [key: string]: DBCommand;
    };

/**
 * 数据库命令
 */
export interface DBCommand {
  /**
   * 设置字段值
   */
  set: any;

  /**
   * 移除字段
   */
  remove: true;
}

/**
 * 数据库文档引用
 */
export interface DBDocumentReference {
  /**
   * 获取文档详细信息
   */
  get: () => Promise<DBDocumentResult>;

  /**
   * 更新文档
   * @param options 更新选项
   */
  update: (options: { data: Record<string, unknown> }) => Promise<DBUpdateResult>;

  /**
   * 删除文档
   */
  remove: () => Promise<DBUpdateResult>;
}

/**
 * 数据库查询结果
 */
export interface DBQueryResult {
  data: any[];
  errMsg: string;
}

/**
 * 数据库文档结果
 */
export interface DBDocumentResult {
  data: any;
  errMsg: string;
}

/**
 * 数据库更新结果
 */
export interface DBUpdateResult {
  stats: {
    updated: number;
    created: number;
    removed: number;
  };
  errMsg: string;
}

/**
 * 数据库计数结果
 */
export interface DBCountResult {
  total: number;
  errMsg: string;
}

/**
 * 数据库聚合操作
 */
export interface DBAggregate {
  /**
   * 聚合阶段
   */
  aggregate: {
    (pipeline: any[]): any;
  };

  /**
   * 执行聚合
   */
  end: boolean;
}

/**
 * 服务器日期对象
 */
export interface ServerDate {
  $date: number;
}

/**
 * 云数据库命令
 */
export interface DBCommandClass {
  /**
   * 字段值增加
   */
  inc: (value: number) => { $inc: number };

  /**
   * 字段值乘法
   */
  mul: (value: number) => { $mul: number };

  /**
   * 字段存在条件
   */
  exists: (value: boolean) => { $exists: boolean };

  /**
   * 字段不存在条件
   */
  notExists: (value: boolean) => { $notExists: boolean };

  /**
   * 字段大于等于
   */
  gte: (value: number) => { $gte: number };

  /**
   * 字段大于
   */
  gt: (value: number) => { $gt: number };

  /**
   * 字段小于等于
   */
  lte: (value: number) => { $lte: number };

  /**
   * 字段小于
   */
  lt: (value: number) => { $lt: number };

  /**
   * 字段等于
   */
  eq: (value: any) => { $eq: any };

  /**
   * 字段不等于
   */
  neq: (value: any) => { $neq: any };

  /**
   * IN 查询
   */
  in: (values: any[]) => { $in: any[] };

  /**
   * 正则表达式查询
   */
  RegExp: (options: {
    regexp: string;
    options?: string;
  }) => { $regex: { $regex: string; $options?: string } };
}

/**
 * 云存储 API
 */
export interface WxCloudUploadFileOptions {
  cloudPath: string;
  fileContent: any;
}

export interface WxCloudUploadFileResult {
  fileID: string;
  statusCode: number;
  errMsg: string;
}

export interface WxCloudGetTempFileURLOptions {
  fileList: string[];
}

export interface WxCloudGetTempFileURLResult {
  fileList: Array<{
    fileID: string;
    tempFileURL: string;
    status: number;
    errMsg: string;
  }>;
  errMsg: string;
}

/**
 * 微信云开发主接口
 */
export interface WxCloud {
  /**
   * 初始化云开发
   */
  init: (options: WxCloudInitOptions) => void;

  /**
   * 数据库引用
   */
  database: DBCollectionReference;

  /**
   * 调用云函数
   */
  callFunction: (options: WxCloudCallFunctionOptions) => Promise<WxCloudCallFunctionResult>;

  /**
   * 上传文件到云存储
   */
  uploadFile: (options: WxCloudUploadFileOptions) => Promise<WxCloudUploadFileResult>;

  /**
   * 获取临时文件链接
   */
  getTempFileURL: (options: WxCloudGetTempFileURLOptions) => Promise<WxCloudGetTempFileURLResult>;

  /**
   * 获取微信上下文
   */
  getWXContext: () => WxContext;
}

/**
 * 微信上下文
 */
export interface WxContext {
  OPENID: string;
  APPID: string;
  UNIONID?: string;
}

/**
 * 云函数主接口
 */
export interface WxCloudFunctionExports {
  main: (event: any, context: any) => Promise<any>;
}

/**
 * 声明 wx 全局对象
 */
declare const wx: {
  cloud: WxCloud;
};

/**
 * 云函数导出
 */
export interface CloudFunctionExports {
  [name: string]: WxCloudFunctionExports;
}

/**
 * 服务器日期构造函数
 */
export interface DBServerDateConstructor {
  (): ServerDate;
}

/**
 * 数据库命令类
 */
export const DBCommand: DBCommandClass;

/**
 * 声明 db 全局对象
 */
declare const db: {
  command: DBCommandClass;
  serverDate: DBServerDateConstructor;
}

/**
 * 类型守卫：检查是否为字符串
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 类型守卫：检查是否为数字
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

/**
 * 类型守卫：检查是否为对象
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 类型守卫：检查是否为数组
 */
export function isArray(value: unknown): value is any[] {
  return Array.isArray(value);
}

/**
 * 类型守卫：检查是否为函数
 */
export function isFunction(value: unknown): value is (...args: any[]) => any {
  return typeof value === 'function';
}
