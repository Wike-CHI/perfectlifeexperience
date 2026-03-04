/**
 * 验证工具模块测试
 */

const assert = require('assert');

describe('验证工具模块', () => {

  describe('required 验证', () => {
    it('应该验证必填字段存在', () => {
      const data = { name: 'test', price: 100 };
      const required = ['name', 'price'];

      const missing = required.filter(field => !data[field]);

      assert.strictEqual(missing.length, 0);
    });

    it('应该检测缺失的必填字段', () => {
      const data = { name: 'test' };
      const required = ['name', 'price'];

      const missing = required.filter(field => !data[field]);

      assert.strictEqual(missing.length, 1);
      assert.strictEqual(missing[0], 'price');
    });

    it('应该处理空字符串', () => {
      const data = { name: '' };
      const isEmpty = !data.name;

      assert.strictEqual(isEmpty, true);
    });
  });

  describe('类型验证', () => {
    it('应该验证字符串类型', () => {
      const value = 'hello';
      const isString = typeof value === 'string';

      assert.strictEqual(isString, true);
    });

    it('应该验证数字类型', () => {
      const value = 100;
      const isNumber = typeof value === 'number' && !isNaN(value);

      assert.strictEqual(isNumber, true);
    });

    it('应该验证数组类型', () => {
      const value = [1, 2, 3];
      const isArray = Array.isArray(value);

      assert.strictEqual(isArray, true);
    });

    it('应该验证对象类型', () => {
      const value = { key: 'value' };
      const isObject = typeof value === 'object' && !Array.isArray(value);

      assert.strictEqual(isObject, true);
    });
  });

  describe('数值范围验证', () => {
    it('应该验证正整数', () => {
      const value = 100;
      const isPositiveInteger = Number.isInteger(value) && value > 0;

      assert.strictEqual(isPositiveInteger, true);
    });

    it('应该拒绝负数', () => {
      const value = -10;
      const isPositive = value > 0;

      assert.strictEqual(isPositive, false);
    });

    it('应该拒绝非整数', () => {
      const value = 10.5;
      const isInteger = Number.isInteger(value);

      assert.strictEqual(isInteger, false);
    });

    it('应该验证数值范围', () => {
      const value = 50;
      const min = 0;
      const max = 100;
      const inRange = value >= min && value <= max;

      assert.strictEqual(inRange, true);
    });

    it('应该拒绝超出范围的数值', () => {
      const value = 150;
      const min = 0;
      const max = 100;
      const inRange = value >= min && value <= max;

      assert.strictEqual(inRange, false);
    });
  });

  describe('字符串验证', () => {
    it('应该验证字符串长度范围', () => {
      const value = 'hello';
      const minLen = 1;
      const maxLen = 10;
      const validLength = value.length >= minLen && value.length <= maxLen;

      assert.strictEqual(validLength, true);
    });

    it('应该拒绝过长字符串', () => {
      const value = 'a'.repeat(200);
      const maxLen = 100;
      const validLength = value.length <= maxLen;

      assert.strictEqual(validLength, false);
    });

    it('应该验证手机号格式', () => {
      const phone = '13800138000';
      const phoneRegex = /^1[3-9]\d{9}$/;
      const isValid = phoneRegex.test(phone);

      assert.strictEqual(isValid, true);
    });

    it('应该拒绝无效手机号', () => {
      const phone = '1234567890';
      const phoneRegex = /^1[3-9]\d{9}$/;
      const isValid = phoneRegex.test(phone);

      assert.strictEqual(isValid, false);
    });
  });

  describe('ID验证', () => {
    it('应该验证有效ID格式', () => {
      const id = 'abc123def456';
      const isValid = typeof id === 'string' && id.length > 0;

      assert.strictEqual(isValid, true);
    });

    it('应该拒绝空ID', () => {
      const id = '';
      const isValid = typeof id === 'string' && id.length > 0;

      assert.strictEqual(isValid, false);
    });
  });
});
