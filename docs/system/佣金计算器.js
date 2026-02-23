// 佣金计算器
// 基础假设：
// - 佣金池20元
// - 金牌10元，银牌6元，铜牌3元，普通1元
// - 育成津贴 = 下级佣金 × 2%，从下级佣金扣

function calculateCommission(sellerLevel, chain) {
  /*
    sellerLevel: 卖家等级 (1=金牌, 2=银牌, 3=铜牌, 4=普通)
    chain: 推荐链 [{level: 等级, name: 名称}]
    示例：[{level: 1, name: 'A'}, {level: 2, name: 'B'}, {level: 3, name: 'C'}, {level: 4, name: 'D'}]
  */

  const commissionMap = {
    1: { name: '金牌', base: 10 },
    2: { name: '银牌', base: 6 },
    3: { name: '铜牌', base: 3 },
    4: { name: '普通', base: 1 }
  };

  // 方案1：基础佣金按推荐链位置，育成津贴从下级佣金扣
  console.log('\n=== 方案1：基础佣金按推荐链位置 ===');
  let totalCommission = 0;
  let details = [];

  for (let i = 0; i < chain.length; i++) {
    const person = chain[i];
    const baseCommission = commissionMap[4 - i].base; // 第1级拿10元，第4级拿1元
    const personLevel = commissionMap[person.level];

    details.push({
      name: person.name,
      position: `第${i + 1}级`,
      level: personLevel.name,
      baseCommission: baseCommission,
      nurture: 0,
      total: baseCommission
    });

    totalCommission += baseCommission;
  }

  console.log('总佣金：', totalCommission);
  console.table(details);

  // 方案2：基础佣金按个人等级
  console.log('\n=== 方案2：基础佣金按个人等级 ===');
  totalCommission = 0;
  details = [];

  for (let i = 0; i < chain.length; i++) {
    const person = chain[i];
    const personCommission = commissionMap[person.level].base;

    details.push({
      name: person.name,
      level: commissionMap[person.level].name,
      commission: personCommission
    });

    totalCommission += personCommission;
  }

  console.log('总佣金：', totalCommission);
  console.table(details);

  return { totalCommission, details };
}

// 场景1：普通D卖货（D未升级）
console.log('═══════════════════════════════════════');
console.log('场景1：普通D卖货100元（推荐链：A→B→C→D）');
console.log('═══════════════════════════════════════');
calculateCommission(4, [
  { level: 1, name: 'A' },
  { level: 2, name: 'B' },
  { level: 3, name: 'C' },
  { level: 4, name: 'D' }
]);

// 场景2：D升级到铜牌后卖货
console.log('\n═══════════════════════════════════════');
console.log('场景2：D升级到铜牌后卖货100元（推荐链：A→B→C→D）');
console.log('═══════════════════════════════════════');
calculateCommission(3, [
  { level: 1, name: 'A' },
  { level: 2, name: 'B' },
  { level: 3, name: 'C' },
  { level: 3, name: 'D' } // D升级到铜牌
]);

// 场景3：D继续升级到银牌后卖货
console.log('\n═══════════════════════════════════════');
console.log('场景3：D升级到银牌后卖货100元（推荐链：A→B→C→D）');
console.log('═══════════════════════════════════════');
calculateCommission(2, [
  { level: 1, name: 'A' },
  { level: 2, name: 'B' },
  { level: 3, name: 'C' },
  { level: 2, name: 'D' } // D升级到银牌
]);

console.log('\n=================================');
console.log('育成津贴测试');
console.log('=================================');

// 育成津贴计算
function calculateNurture(subordinateCommission, mentorRate = 0.02) {
  const nurture = subordinateCommission * mentorRate;
  const subordinateNet = subordinateCommission - nurture;

  console.log(`下级佣金：${subordinateCommission}元`);
  console.log(`育成津贴（${mentorRate * 100}%）：${nurture}元`);
  console.log(`下级净得：${subordinateNet}元`);
  console.log(`导师总得：${nurture}元`);

  return { nurture, subordinateNet };
}

console.log('\n--- 场景：D（铜牌）卖货，C是导师 ---');
// D的基础佣金是3元（因为D是铜牌）
// C拿育成津贴：3 × 2% = 0.06元
// D实际得：3 - 0.06 = 2.94元
const result = calculateNurture(3);

console.log('\n--- 推荐链总佣金（含育成津贴）---');
// A：10元
// B：6元
// C：3元（基础） + 0.06元（育成津贴） = 3.06元
// D：3 - 0.06 = 2.94元
// 总计：10 + 6 + 3.06 + 2.94 = 22元 ❌ 超支！

console.log('\n问题：总佣金22元，超过20元限制！');
console.log('解决方案？');
console.log('1. 育成津贴不从基础佣金池出，额外给？');
console.log('   → 总佣金20 + 0.06 = 20.06元，公司拿79.94元');
console.log('2. D升级后，C不再拿D的基础佣金？');
console.log('   → A：10, B：6, C：0.06, D：3 = 19.06元，不足20元');
console.log('3. 调整基础佣金分配？');
