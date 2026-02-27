import { useRef } from 'react';
import { format, subDays } from 'date-fns';
import { base44 } from '@/api/base44Client';

/**
 * useDayRollover hook
 * 负责日更逻辑：连胜检查 + 调用后端 runDailyRollover（规划任务+routine任务）+ 昨日未完成顺延 + 清理
 */
export function useDayRollover({
  user,
  today,
  yesterday,
  quests,
  batchInvalidateQueries,
  setToast,
  setIsDayRolloverInProgress,
  setStreakBreakInfo,
  checkAndAwardMilestone,
  normalizeDate,
  t,
  language,
}) {
  const isRolloverRunningRef = useRef(false);

  const runYesterdayRollover = async (yesterdayQuests) => {
    const oldQuests = yesterdayQuests.filter(q => q.status === 'todo' && !q.isRoutine);
    if (oldQuests.length > 0) {
      for (const quest of oldQuests) {
        await base44.entities.Quest.update(quest.id, { date: today });
      }
      batchInvalidateQueries(['quests']);
      setToast(t('questboard_toast_yesterday_quests_delayed', { count: oldQuests.length }));
      setTimeout(() => setToast(null), 3000);
    }
  };

  const cleanOldChests = async (sevenDaysAgoStr) => {
    const allChests = await base44.entities.DailyChest.filter({ opened: true }, '-date', 200);
    for (const chest of allChests) {
      if (chest.date && chest.date < sevenDaysAgoStr) {
        await base44.entities.DailyChest.delete(chest.id);
      }
    }
  };

  const cleanOldQuests = async (sevenDaysAgoStr) => {
    const doneQuests = await base44.entities.Quest.filter({ status: 'done' }, '-date', 500);
    const routineQuestsMap = new Map();
    for (const quest of doneQuests) {
      if (quest.isRoutine && quest.originalActionHint) {
        const existing = routineQuestsMap.get(quest.originalActionHint);
        if (!existing || new Date(quest.created_date) > new Date(existing.created_date)) {
          routineQuestsMap.set(quest.originalActionHint, quest);
        }
      }
    }
    const protectedIds = new Set(Array.from(routineQuestsMap.values()).map(q => q.id));
    for (const quest of doneQuests) {
      if (quest.isLongTermProject || protectedIds.has(quest.id) || !quest.date) continue;
      if (quest.date < sevenDaysAgoStr) {
        await base44.entities.Quest.delete(quest.id);
      }
    }
  };

  const cleanOldLongTermProjects = async (twoYearsAgoStr) => {
    const allProjects = await base44.entities.LongTermProject.list();
    const oldProjects = allProjects.filter(p =>
      p.status === 'completed' && p.completionDate && p.completionDate < twoYearsAgoStr
    );
    for (const project of oldProjects) {
      const allQuests = await base44.entities.Quest.list();
      for (const quest of allQuests.filter(q => q.longTermProjectId === project.id)) {
        await base44.entities.Quest.delete(quest.id);
      }
      await base44.entities.LongTermProject.delete(project.id);
    }
    if (oldProjects.length > 0) batchInvalidateQueries(['hasLongTermQuests', 'quests']);
  };

  const handleDayRollover = async () => {
    if (!user || isRolloverRunningRef.current) return;
    isRolloverRunningRef.current = true;

    try {
      const lastClearDate = user?.lastClearDate;

      // ── 步骤0A: 存储前天完成率 ──
      const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');
      const existingSummary = await base44.entities.DailySummary.filter({ date: twoDaysAgo });
      if (existingSummary.length === 0) {
        const twoDaysAgoQuests = await base44.entities.Quest.filter({ date: twoDaysAgo });
        const completed = twoDaysAgoQuests.filter(q => q.status === 'done').length;
        const total = twoDaysAgoQuests.length;
        await base44.entities.DailySummary.create({
          date: twoDaysAgo,
          completionRate: total === 0 ? 0 : completed / total,
          totalQuests: total,
          completedQuests: completed,
        });
      }

      // ── 步骤0B: 检查连胜 ──
      const alreadyHandled = lastClearDate &&
        new Date(normalizeDate(lastClearDate)).getTime() >= new Date(normalizeDate(yesterday)).getTime();

      if (!alreadyHandled) {
        let completionRate;
        const yesterdaySummary = await base44.entities.DailySummary.filter({ date: yesterday });
        if (yesterdaySummary.length > 0) {
          completionRate = yesterdaySummary[0].completionRate;
        } else {
          const yQuests = await base44.entities.Quest.filter({ date: yesterday });
          const completed = yQuests.filter(q => q.status === 'done').length;
          const total = yQuests.length;
          completionRate = total === 0 ? 0 : completed / total;
          await base44.entities.DailySummary.create({
            date: yesterday, completionRate, totalQuests: total, completedQuests: completed,
          });
        }

        if (completionRate === 1) {
          const newStreak = (user?.streakCount || 0) + 1;
          await base44.auth.updateMe({
            streakCount: newStreak,
            longestStreak: Math.max(newStreak, user?.longestStreak || 0),
            lastClearDate: yesterday,
          });
          batchInvalidateQueries(['user']);
          await checkAndAwardMilestone(newStreak);
        } else {
          const currentStreak = user?.streakCount || 0;
          if (currentStreak > 0) {
            setStreakBreakInfo({
              incompleteDays: 1,
              currentStreak,
              freezeTokenCount: user?.freezeTokenCount || 0,
            });
            setIsDayRolloverInProgress(false);
            return;
          } else {
            await base44.auth.updateMe({ lastClearDate: yesterday });
            batchInvalidateQueries(['user']);
          }
        }
      }

      // ── 步骤1+2: 调用后端 runDailyRollover（规划任务 + routine任务，幂等保护）──
      setIsDayRolloverInProgress(true);
      const { data: rolloverResult } = await base44.functions.invoke('runDailyRollover', {});
      console.log('后端日更结果:', rolloverResult);
      if (rolloverResult && !rolloverResult.skipped) {
        batchInvalidateQueries(['quests', 'user']);
        if (rolloverResult.results?.plannedQuestsCreated > 0) {
          setToast(t('questboard_toast_planned_quests_loaded', { count: rolloverResult.results.plannedQuestsCreated }));
          setTimeout(() => setToast(null), 3000);
        }
      }

      // ── 步骤3: 昨日未完成任务顺延 ──
      const yesterdayQuests = await base44.entities.Quest.filter({ date: yesterday });
      await runYesterdayRollover(yesterdayQuests);

      setIsDayRolloverInProgress(false);

      // ── 步骤4-6: 清理（延迟，不阻塞UI）──
      setTimeout(async () => {
        const sevenDaysAgoStr = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        const twoYearsAgoStr = format(subDays(new Date(), 730), 'yyyy-MM-dd');
        await cleanOldChests(sevenDaysAgoStr);
        await cleanOldQuests(sevenDaysAgoStr);
        await cleanOldLongTermProjects(twoYearsAgoStr);
      }, 200);

    } catch (error) {
      console.error('日更逻辑失败:', error);
      setIsDayRolloverInProgress(false);
    } finally {
      isRolloverRunningRef.current = false;
    }
  };

  return { handleDayRollover };
}