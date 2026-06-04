import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoutineDuplicates } from './routineDedup.js';

// 造一个 routine 任务，默认 todo、有 originalActionHint、有 created_date
const mk = (o = {}) => ({
  id: 'id',
  status: 'todo',
  isRoutine: true,
  originalActionHint: 'study',
  created_date: '2026-06-01T08:00:00.000Z',
  date: '2026-06-01',
  ...o,
});

test('空数组返回空结果', () => {
  assert.deepEqual(resolveRoutineDuplicates([]), { visible: [], duplicateTodoIds: [] });
});

test('单条 routine 无重复：保留，不删', () => {
  const a = mk({ id: 'a' });
  const r = resolveRoutineDuplicates([a]);
  assert.deepEqual(r.visible.map(x => x.id), ['a']);
  assert.deepEqual(r.duplicateTodoIds, []);
});

test('同名两条 todo：留最早，删较晚（输入顺序打乱也成立）', () => {
  const early = mk({ id: 'early', created_date: '2026-06-01T08:00:00.000Z' });
  const late = mk({ id: 'late', created_date: '2026-06-01T09:00:00.000Z' });
  const r = resolveRoutineDuplicates([late, early]);
  assert.deepEqual(r.duplicateTodoIds, ['late']);
  assert.deepEqual(r.visible.map(x => x.id), ['early']);
});

test('同名三条 todo：留最早，删其余两条', () => {
  const t1 = mk({ id: 't1', created_date: '2026-06-01T08:00:00.000Z' });
  const t2 = mk({ id: 't2', created_date: '2026-06-01T08:05:00.000Z' });
  const t3 = mk({ id: 't3', created_date: '2026-06-01T08:10:00.000Z' });
  const r = resolveRoutineDuplicates([t1, t2, t3]);
  assert.deepEqual(r.duplicateTodoIds.sort(), ['t2', 't3']);
  assert.deepEqual(r.visible.map(x => x.id), ['t1']);
});

test('同名 1 done + 1 todo：留 done，删 todo', () => {
  const done = mk({ id: 'done', status: 'done', created_date: '2026-06-01T08:00:00.000Z' });
  const todo = mk({ id: 'todo', status: 'todo', created_date: '2026-06-01T09:00:00.000Z' });
  const r = resolveRoutineDuplicates([done, todo]);
  assert.deepEqual(r.duplicateTodoIds, ['todo']);
  assert.deepEqual(r.visible.map(x => x.id), ['done']);
});

test('同名两条 done：都保留，不自动删（交给用户手动）', () => {
  const d1 = mk({ id: 'd1', status: 'done', created_date: '2026-06-01T08:00:00.000Z' });
  const d2 = mk({ id: 'd2', status: 'done', created_date: '2026-06-01T09:00:00.000Z' });
  const r = resolveRoutineDuplicates([d1, d2]);
  assert.deepEqual(r.duplicateTodoIds, []);
  assert.deepEqual(r.visible.map(x => x.id).sort(), ['d1', 'd2']);
});

test('同名 2 done + 1 todo：留两条 done，删 todo', () => {
  const d1 = mk({ id: 'd1', status: 'done', created_date: '2026-06-01T08:00:00.000Z' });
  const d2 = mk({ id: 'd2', status: 'done', created_date: '2026-06-01T08:30:00.000Z' });
  const todo = mk({ id: 'td', status: 'todo', created_date: '2026-06-01T09:00:00.000Z' });
  const r = resolveRoutineDuplicates([d1, d2, todo]);
  assert.deepEqual(r.duplicateTodoIds, ['td']);
  assert.deepEqual(r.visible.map(x => x.id).sort(), ['d1', 'd2']);
});

test('安全线：originalActionHint 为 null 的多条 routine 全部保留，绝不删', () => {
  const a = mk({ id: 'a', originalActionHint: null });
  const b = mk({ id: 'b', originalActionHint: null });
  const r = resolveRoutineDuplicates([a, b]);
  assert.deepEqual(r.duplicateTodoIds, []);
  assert.deepEqual(r.visible.map(x => x.id).sort(), ['a', 'b']);
});

test('安全线：originalActionHint 为空串的多条 routine 全部保留', () => {
  const a = mk({ id: 'a', originalActionHint: '' });
  const b = mk({ id: 'b', originalActionHint: '' });
  const r = resolveRoutineDuplicates([a, b]);
  assert.deepEqual(r.duplicateTodoIds, []);
  assert.deepEqual(r.visible.map(x => x.id).sort(), ['a', 'b']);
});

test('非 routine 任务即使同名也不去重', () => {
  const a = mk({ id: 'a', isRoutine: false, originalActionHint: 'x' });
  const b = mk({ id: 'b', isRoutine: false, originalActionHint: 'x' });
  const r = resolveRoutineDuplicates([a, b]);
  assert.deepEqual(r.duplicateTodoIds, []);
  assert.deepEqual(r.visible.map(x => x.id).sort(), ['a', 'b']);
});

test('混合场景：只删该删的 routine 重复，非 routine 与空名不受影响', () => {
  const dupEarly = mk({ id: 'de', originalActionHint: 'A', created_date: '2026-06-01T08:00:00.000Z' });
  const dupLate = mk({ id: 'dl', originalActionHint: 'A', created_date: '2026-06-01T09:00:00.000Z' });
  const other = mk({ id: 'ot', originalActionHint: 'B' });
  const nonRoutine = mk({ id: 'nr', isRoutine: false, originalActionHint: 'A' });
  const noHint = mk({ id: 'nh', originalActionHint: null });
  const r = resolveRoutineDuplicates([dupEarly, dupLate, other, nonRoutine, noHint]);
  assert.deepEqual(r.duplicateTodoIds, ['dl']);
  assert.deepEqual(r.visible.map(x => x.id).sort(), ['de', 'nh', 'nr', 'ot']);
});
