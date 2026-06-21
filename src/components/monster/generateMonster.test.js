import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMonster } from './generateMonster.js';

test('同一日期种子输出完全稳定(刷新不变)', () => {
  const a = generateMonster('2026-06-04');
  const b = generateMonster('2026-06-04');
  assert.deepEqual(a, b);
});

test('网格尺寸 = height 行 × width 列', () => {
  const m = generateMonster('2026-06-04');
  assert.equal(m.grid.length, m.height);
  for (const row of m.grid) assert.equal(row.length, m.width);
});

test('网格左右对称', () => {
  const m = generateMonster('2026-06-04');
  for (let r = 0; r < m.height; r++) {
    for (let c = 0; c < m.width; c++) {
      assert.equal(m.grid[r][c], m.grid[r][m.width - 1 - c], `(${r},${c}) 不对称`);
    }
  }
});

test('不是全空也不是全满(看得出是个怪兽)', () => {
  const m = generateMonster('2026-06-04');
  const filled = m.grid.flat().filter(x => x > 0).length;
  const total = m.height * m.width;
  assert.ok(filled > 0, '不能全空');
  assert.ok(filled < total, '不能全满');
});

test('不同日期产生不同怪兽(形状或配色不同)', () => {
  const days = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05'];
  const sigs = days.map(d => {
    const m = generateMonster(d);
    return JSON.stringify(m.grid) + '|' + m.color;
  });
  const unique = new Set(sigs);
  assert.ok(unique.size >= 4, `5 个日期只生成了 ${unique.size} 种怪兽,多样性不足`);
});

test('color 是合法颜色字符串', () => {
  const m = generateMonster('2026-06-04');
  assert.equal(typeof m.color, 'string');
  assert.ok(/^#|^hsl|^rgb/.test(m.color), `color 格式异常: ${m.color}`);
});

test('每只怪兽有一对左右对称的方块眼睛(值 2)', () => {
  for (const d of ['a','b','c','d','e','f','g','h','i','j','k','l','m','n']) {
    const m = generateMonster(d);
    const eyes = [];
    for (let r = 0; r < m.height; r++)
      for (let c = 0; c < m.width; c++)
        if (m.grid[r][c] === 2) eyes.push([r, c]);
    assert.equal(eyes.length, 2, `${d}: 应恰好两只眼睛,实际 ${eyes.length}`);
    assert.equal(eyes[0][0], eyes[1][0], `${d}: 两眼应同一行`);
    assert.equal(eyes[0][1], m.width - 1 - eyes[1][1], `${d}: 两眼应左右对称`);
  }
});
