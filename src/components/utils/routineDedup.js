/**
 * routine 重复任务的去重 / 清理决策（纯函数）
 *
 * 背景：base44 平台没有唯一约束 / 原子写，并发生成 routine 时会产生重复记录。
 * 这个函数统一决定「显示哪些」和「该删哪些」，读路径和写入清理共用同一套规则，
 * 保证屏幕上保留的那条 == 数据库里保留的那条。
 *
 * 规则（按 originalActionHint 分组，只处理 isRoutine 且 originalActionHint 非空的任务）：
 *  - 同名组里有 done：done 全部保留（永不自动删，多条 done 交给用户手动处理），删掉组里所有 todo
 *  - 同名组里全是 todo：保留 created_date 最早的一条，其余 todo 删除
 *  - originalActionHint 为空 / null：绝不参与去重，绝不删（安全线，防误删不相关任务）
 *  - 非 routine 任务：原样保留，不参与
 *
 * @param {Array} quests 同一天的任务数组
 * @returns {{ visible: Array, duplicateTodoIds: Array }}
 *   visible: 去重后应显示的任务（保持输入顺序）
 *   duplicateTodoIds: 应删除的多余 todo 的 id 列表
 */
export function resolveRoutineDuplicates(quests) {
  // 按 originalActionHint 分组，只收 isRoutine 且 originalActionHint 非空的任务
  const groups = new Map();
  for (const q of quests) {
    if (!q.isRoutine) continue;
    const key = q.originalActionHint;
    if (!key) continue; // null / 空串：安全线，绝不参与去重
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(q);
  }

  const toDelete = new Set();
  for (const group of groups.values()) {
    if (group.length < 2) continue; // 无重复
    const todos = group.filter(q => q.status !== 'done');
    const hasDone = group.some(q => q.status === 'done');
    if (hasDone) {
      // 有 done：done 全留，删掉所有 todo
      for (const t of todos) toDelete.add(t.id);
    } else {
      // 全是 todo：留 created_date 最早的一条，其余删
      const sorted = [...todos].sort((a, b) => {
        const ta = a.created_date ? new Date(a.created_date).getTime() : Infinity;
        const tb = b.created_date ? new Date(b.created_date).getTime() : Infinity;
        if (ta !== tb) return ta - tb;
        return String(a.id).localeCompare(String(b.id)); // 平手时 id 稳定排序
      });
      for (let i = 1; i < sorted.length; i++) toDelete.add(sorted[i].id);
    }
  }

  const visible = quests.filter(q => !toDelete.has(q.id));
  return { visible, duplicateTodoIds: [...toDelete] };
}
