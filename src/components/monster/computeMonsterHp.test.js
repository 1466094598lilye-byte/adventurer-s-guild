import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMonsterHp } from './computeMonsterHp.js';

const q = (difficulty, status = 'todo') => ({ difficulty, status });

test('空任务 → 0/0', () => {
  assert.deepEqual(computeMonsterHp([]), { current: 0, max: 0 });
});

test('max = 所有任务难度和 (S25 A20 B10 C5)', () => {
  const r = computeMonsterHp([q('S'), q('A'), q('B'), q('C')]);
  assert.equal(r.max, 60);
});

test('current = 未完成任务难度和', () => {
  const r = computeMonsterHp([q('S', 'done'), q('A', 'todo'), q('B', 'todo')]);
  assert.equal(r.max, 55);
  assert.equal(r.current, 30); // A20 + B10，已完成的 S25 不算
});

test('全部完成 → current 0、max 不变', () => {
  const r = computeMonsterHp([q('S', 'done'), q('A', 'done')]);
  assert.equal(r.current, 0);
  assert.equal(r.max, 45);
});

test('未知/缺失难度按 0 计', () => {
  const r = computeMonsterHp([q('X'), q(undefined), q('S')]);
  assert.equal(r.max, 25);
});
