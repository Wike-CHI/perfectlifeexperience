// 解决方案测试
console.log('=================================');
console.log('解决方案测试：D升级到铜牌后');
console.log('=================================\n');

// 推荐链：A(金牌) → B(银牌) → C(铜牌) → D(普通→铜牌)

// ========== 方案1：育成津贴额外给 ==========
console.log('【方案1】育成津贴额外给，不从20元池出');
console.log('-----------------------------------');
console.log('基础佣金（20元）：');
console.log('  A（金牌）：10元');
console.log('  B（银牌）：6元');
console.log('  C（铜牌）：3元');
console.log('  D（铜牌）：3元');  // D升级后，基础佣金变成3元
console.log('  小计：22元 ❌ 超支2元');

console.log('\n育成津贴（额外给）：');
console.log('  C（导师）：3 × 2% = 0.06元');

console.log('\n总发放：20元（基础） + 0.06元（津贴） = 20.06元');
console.log('公司收入：100 - 20.06 = 79.94元');

// ========== 方案2：D升级后，C不再拿D的基础佣金 ==========
console.log('\n\n【方案2】D升级后，C不再拿D的基础佣金，只拿育成津贴');
console.log('-----------------------------------');
console.log('基础佣金（从20元池分）：');
console.log('  A（金牌）：10元');
console.log('  B（银牌）：6元');
console.log('  C（铜牌）：0元（D升级，C失去基础佣金）');
console.log('  D（铜牌）：3元');
console.log('  小计：19元');

console.log('\n育成津贴（从D佣金扣）：');
console.log('  D的佣金：3元');
console.log('  C（导师）：3 × 2% = 0.06元');
console.log('  D实际得：3 - 0.06 = 2.94元');

console.log('\n总发放：10 + 6 + 0.06 + 2.94 = 19元');
console.log('公司收入：100 - 19 = 81元 ✅ 多赚1元');

console.log('\n问题：C收益暴跌（3元 → 0.06元），C不愿意D升级！');

// ========== 方案3：D升级后，推荐链缩短 ==========
console.log('\n\n【方案3】D升级到铜牌后，脱离C的推荐链，直接和B对接');
console.log('-----------------------------------');
console.log('新推荐链：A(金牌) → B(银牌) → D(铜牌)');
console.log('C被跳过，C和D不再有关系');

console.log('\n基础佣金（从20元池分）：');
console.log('  A（金牌）：10元');
console.log('  B（银牌）：6元');
console.log('  D（铜牌）：3元');
console.log('  C（铜牌）：0元（被跳过）');
console.log('  小计：19元');

console.log('\n育成津贴（从D佣金扣）：');
console.log('  B作为D的导师：3 × 2% = 0.06元');
console.log('  D实际得：3 - 0.06 = 2.94元');

console.log('\n总发放：10 + 6.06 + 2.94 = 19元');
console.log('公司收入：100 - 19 = 81元 ✅');

console.log('\n问题：C完全失去D，C不愿意培养D！');

// ========== 方案4：20元按等级重新分配（推荐）==========
console.log('\n\n【方案4】20元按当前等级重新分配');
console.log('-----------------------------------');
console.log('推荐链：A(金牌1级) → B(银牌2级) → C(铜牌3级) → D(铜牌4级)');
console.log('但是！D升级到铜牌后，佣金比例调整');

console.log('\n基础佣金（20元重新分配）：');
console.log('  原本：A(10元) + B(6元) + C(3元) + D(1元) = 20元');
console.log('  现在：D升级，需要重新分配');

// 方法4.1：D升级后，占用自己的份额 + 育成津贴
console.log('\n方法4.1：D拿自己的份额，C拿育成津贴');
const D_base = 3;
const C_nurture = D_base * 0.02;  // 0.06元
const D_net = D_base - C_nurture; // 2.94元

console.log('  A（金牌）：10元');
console.log('  B（银牌）：6元');
console.log('  C（铜牌+导师）：3 + 0.06 = 3.06元');
console.log('  D（铜牌）：3 - 0.06 = 2.94元');
console.log('  总计：10 + 6 + 3.06 + 2.94 = 22元 ❌ 还是超支！');

// 方法4.2：从C的基础佣金扣津贴
console.log('\n方法4.2：育成津贴从C的基础佣金扣');
console.log('  A（金牌）：10元');
console.log('  B（银牌）：6元');
console.log('  C（铜牌+导师）：3 + 0.06 = 3.06元（但津贴从哪来？）');
console.log('  D（铜牌）：3元');
console.log('  总计：22.06元 ❌ 更超！');

// 方法4.3：D升级后，C/D共享3元
console.log('\n方法4.3：D升级后，C和D共享原本的4元（C的3元+D的1元）');
const C_D_total = 4;  // 原本C(3) + D(1)
const D_share = 3;    // D升级到铜牌，应该拿3元
const C_share = C_D_total - D_share;  // 4 - 3 = 1元

console.log('  A（金牌）：10元');
console.log('  B（银牌）：6元');
console.log('  C（铜牌）：1元（原本3元，现在D占了2元）');
console.log('  D（铜牌）：3元（升级后）');
console.log('  总计：10 + 6 + 1 + 3 = 20元 ✅');

console.log('\n育成津贴（从D的3元里扣）：');
const nurture = 3 * 0.02;  // 0.06元
console.log('  C（导师）：0.06元');
console.log('  D实际得：3 - 0.06 = 2.94元');

console.log('\n最终分配：');
console.log('  A：10元');
console.log('  B：6元');
console.log('  C：1 + 0.06 = 1.06元（比原本3元少1.94元）❌');
console.log('  D：2.94元');
console.log('  总计：20元 ✅');

console.log('\n问题：C收益暴跌（3元 → 1.06元），C不愿意D升级！');

// ========== 方案5：C双重收益（用户选择）==========
console.log('\n\n【方案5】C双重收益（C拿基础佣金+育成津贴）');
console.log('-----------------------------------');
console.log('用户选择：C拿D的基础佣金3元 + 育成津贴0.06元');

console.log('\n基础佣金（20元池）：');
console.log('  A（金牌）：10元');
console.log('  B（银牌）：6元');
console.log('  C（铜牌）：3元');
console.log('  D（铜牌）：3元');
console.log('  小计：22元 ❌ 超支2元');

console.log('\n育成津贴（从D佣金扣）：');
console.log('  C（导师）：3 × 2% = 0.06元');
console.log('  D实际得：3 - 0.06 = 2.94元');

console.log('\n总发放：10 + 6 + 3.06 + 2.94 = 22元');
console.log('公司收入：100 - 22 = 78元（比预期少2元）');

console.log('\n用户说的"从D佣金里抵扣"是指：');
console.log('  D的3元佣金 - 0.06元津贴 = 2.94元');
console.log('  但基础佣金池还是22元，超支了！');

console.log('\n\n=================================');
console.log('总结：方案选择');
console.log('=================================');
console.log('方案1：育成津贴额外给 → 公司拿79.94元（少0.06元）');
console.log('方案2：C失去基础佣金 → C不愿意培养D');
console.log('方案3：推荐链缩短 → C完全失去D');
console.log('方案4：重新分配20元 → C收益大幅减少');
console.log('方案5：C双重收益 → 超支2元，公司拿78元');
console.log('');
console.log('用户需要明确：');
console.log('1. 20元是硬上限吗？');
console.log('2. 如果C拿双重收益，超支的2元谁出？');
console.log('3. 育成津贴从哪里出？');
