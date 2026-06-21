/**
 * 怪兽血量 = 当天任务难度之和（纯函数）。
 *   max     = 所有任务的难度血量和
 *   current = 未完成任务的难度血量和（完成一个任务就掉对应的血）
 * 难度血量：S=25 A=20 B=10 C=5
 */
const DIFFICULTY_HP = { S: 25, A: 20, B: 10, C: 5 };

export function computeMonsterHp(quests) {
  let max = 0;
  let current = 0;
  for (const q of quests) {
    const hp = DIFFICULTY_HP[q.difficulty] || 0;
    max += hp;
    if (q.status !== 'done') current += hp;
  }
  return { current, max };
}
