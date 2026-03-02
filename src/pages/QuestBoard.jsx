import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Filter, Loader2, Sparkles, Briefcase, ChevronDown, ChevronUp, Check, Plus, Calendar as CalendarIcon, Gift } from 'lucide-react';
import QuestCard from '../components/quest/QuestCard';
import PraiseDialog from '../components/quest/PraiseDialog';
import ChestOpening from '../components/treasure/ChestOpening';
import QuestEditFormModal from '../components/quest/QuestEditFormModal';
import EndOfDaySummaryAndPlanning from '../components/quest/EndOfDaySummaryAndPlanning';
import JointPraiseDialog from '../components/quest/JointPraiseDialog';
import StreakBreakDialog from '../components/streak/StreakBreakDialog';
import CalendarModal from '../components/CalendarModal';
import { useDayRollover } from '../components/quest/useDayRollover';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/components/LanguageContext';
import { getTaskNamingPrompt } from '@/components/prompts';
import { getGuestData, addGuestEntity, updateGuestEntity, deleteGuestEntity } from '@/components/utils/guestData';
import { playSound, stopSound } from '@/components/AudioManager';
import { normalizeDate } from '@/components/utils/dateUtils';
import { useNavigate } from 'react-router-dom';

export default function QuestBoard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [showChest, setShowChest] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingQuests, setPendingQuests] = useState([]);
  const [expandedPending, setExpandedPending] = useState(null);
  const [editingQuest, setEditingQuest] = useState(null);
  const [toast, setToast] = useState(null);
  const [milestoneReward, setMilestoneReward] = useState(null);
  const [showPlanningDialog, setShowPlanningDialog] = useState(false);
  const [showCelebrationInPlanning, setShowCelebrationInPlanning] = useState(false);
  const [isConfirmingPending, setIsConfirmingPending] = useState(false);
  const [showJointPraise, setShowJointPraise] = useState(false);
  const [completedProject, setCompletedProject] = useState(null);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [streakBreakInfo, setStreakBreakInfo] = useState(null);
  const [isDayRolloverInProgress, setIsDayRolloverInProgress] = useState(false);
  const [fromChestOpen, setFromChestOpen] = useState(false);
  const [rolloverLoadingSeconds, setRolloverLoadingSeconds] = useState(0);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [rolloverError, setRolloverError] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const queryClient = useQueryClient();
  const { language, t } = useLanguage();
  const invalidationTimeoutRef = useRef(null);
  const rolloverTimerRef = useRef(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // 日更加载动态文案
  const rolloverLoadingMessages = {
    zh: [
      { text: '推开协会大门...', duration: 3 },
      { text: '神秘智者抬起头,感知到你的到来', duration: 2 },
      { text: '首席书记官翻开今日的记录本', duration: 2 },
      { text: '协会总管开始清点你的任务清单', duration: 2 },
      { text: '大长老从座位上缓缓起身', duration: 2 },
      { text: '战术大师在作战图上标注今日要点', duration: 2 },
      { text: '荣誉骑士团长检查你的装备状态', duration: 2 },
      { text: '智者点燃今日的引路明灯', duration: 2 },
      { text: '协会总管在做最后确认...', duration: 2 },
      { text: '任务清单内容较多,正在整理...', duration: 2 }
    ],
    en: [
      { text: 'Entering the guild...', duration: 3 },
      { text: 'Sage senses your arrival...', duration: 2 },
      { text: 'Scribe opens today\'s log...', duration: 2 },
      { text: 'Steward reviewing your tasks...', duration: 2 },
      { text: 'Elder rises from seat...', duration: 2 },
      { text: 'Tactician marking key points...', duration: 2 },
      { text: 'Knight checking your gear...', duration: 2 },
      { text: 'Sage lights today\'s lantern...', duration: 2 },
      { text: 'Steward doing final checks...', duration: 2 },
      { text: 'Organizing task details...', duration: 2 }
    ]
  };

  const getCurrentLoadingMessage = () => {
    const messages = rolloverLoadingMessages[language];
    let accumulatedTime = 0;
    for (const msg of messages) {
      accumulatedTime += msg.duration;
      if (rolloverLoadingSeconds < accumulatedTime) return msg.text;
    }
    return messages[messages.length - 1].text;
  };

  const batchInvalidateQueries = (keys) => {
    if (invalidationTimeoutRef.current) clearTimeout(invalidationTimeoutRef.current);
    invalidationTimeoutRef.current = setTimeout(() => {
      keys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
    }, 100);
  };

  // 🔥 Safari后台保持：监测日期变化，自动刷新页面
  useEffect(() => {
    const lastRenderedDate = format(new Date(), 'yyyy-MM-dd');
    const checkDateChange = () => {
      if (document.visibilityState === 'visible') {
        const currentDate = format(new Date(), 'yyyy-MM-dd');
        if (currentDate !== lastRenderedDate) window.location.reload();
      }
    };
    document.addEventListener('visibilitychange', checkDateChange);
    return () => document.removeEventListener('visibilitychange', checkDateChange);
  }, []);

  // 实时更新当前小时
  useEffect(() => {
    const updateHour = () => setCurrentHour(new Date().getHours());
    updateHour();
    const interval = setInterval(updateHour, 60000);
    return () => clearInterval(interval);
  }, []);

  // 日更加载计时器
  useEffect(() => {
    if (isDayRolloverInProgress) {
      setRolloverLoadingSeconds(0);
      rolloverTimerRef.current = setInterval(() => {
        setRolloverLoadingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (rolloverTimerRef.current) { clearInterval(rolloverTimerRef.current); rolloverTimerRef.current = null; }
      setRolloverLoadingSeconds(0);
    }
    return () => { if (rolloverTimerRef.current) clearInterval(rolloverTimerRef.current); };
  }, [isDayRolloverInProgress]);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try { return await base44.auth.me(); } catch { return null; }
    },
    retry: false, staleTime: 10000, refetchOnWindowFocus: false,
  });

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ['quests', today],
    enabled: !!user || user === null,
    cacheTime: 0,
    queryFn: async () => {
      if (!user) {
        return getGuestData('quests').filter(q => q.date === today);
      }
      try {
        const allQuests = await base44.entities.Quest.filter({ date: today }, '-created_date');
        const routineQuests = allQuests.filter(q => q.isRoutine);
        const nonRoutineQuests = allQuests.filter(q => !q.isRoutine);

        let decryptedNonRoutineQuests = [];
        if (nonRoutineQuests.length > 0) {
          try {
            const { data } = await base44.functions.invoke('decryptQuestData', {
              encryptedQuests: nonRoutineQuests.map(quest => ({
                encryptedTitle: quest.title,
                encryptedActionHint: quest.actionHint
              }))
            });
            decryptedNonRoutineQuests = nonRoutineQuests.map((quest, index) => ({
              ...quest,
              title: data.decryptedQuests[index].title || quest.title,
              actionHint: data.decryptedQuests[index].actionHint || quest.actionHint
            }));
          } catch (error) {
            console.error('❌ 批量解密失败:', error);
            decryptedNonRoutineQuests = nonRoutineQuests;
          }
        }
        return [...routineQuests, ...decryptedNonRoutineQuests];
      } catch (error) {
        console.error('获取任务失败:', error);
        return [];
      }
    },
    retry: 2, retryDelay: 1000, staleTime: 5000, refetchOnWindowFocus: false,
  });

  const { data: hasAnyLongTermQuests = false, isLoading: isLoadingLongTermQuests } = useQuery({
    queryKey: ['hasLongTermQuests'],
    queryFn: async () => {
      try {
        const allLongTermQuests = await base44.entities.Quest.filter({ isLongTermProject: true });
        return allLongTermQuests.filter(q => q.status !== 'done').length > 0;
      } catch { return false; }
    },
    enabled: true, staleTime: 5000, refetchOnWindowFocus: true,
  });

  // ── checkAndAwardMilestone (needed by useDayRollover) ──
  const checkAndAwardMilestone = async (newStreak) => {
    if (!user) return;
    const milestones = [
      { days: 7, title: '新秀冒险家', tokens: 1, icon: '🌟' },
      { days: 21, title: '精英挑战者', tokens: 2, icon: '⚔️' },
      { days: 50, title: '连胜大师', tokens: 3, icon: '🏆' },
      { days: 100, title: '传奇不灭', tokens: 5, icon: '👑' }
    ];
    const unlockedMilestones = user?.unlockedMilestones || [];
    for (const milestone of milestones) {
      if (newStreak === milestone.days && !unlockedMilestones.includes(milestone.days)) {
        const { data: lootResult } = await base44.functions.invoke('callDeepSeek', {
          prompt: `你是【星陨纪元冒险者工会】的宝物铸造大师。一位冒险者达成了${milestone.days}天连胜的惊人成就，获得了「${milestone.title}」称号。请为这个里程碑铸造一件独一无二的纪念战利品。\n\n里程碑：${milestone.days}天连胜\n称号：${milestone.title}\n象征图标：${milestone.icon}\n\n要求：\n1. 名称：要体现"${milestone.days}天"和"连胜"的概念，并与称号呼应\n2. 简介：RPG风格，强调这是只有坚持${milestone.days}天才能获得的珍贵纪念品，暗示这份毅力的价值\n3. 图标：使用 ${milestone.icon} 作为基础，可以组合其他emoji\n\n请生成：`,
          response_json_schema: { type: "object", properties: { name: { type: "string" }, flavorText: { type: "string" }, icon: { type: "string" } } }
        });
        await base44.entities.Loot.create({ ...lootResult, rarity: 'Legendary', obtainedAt: new Date().toISOString() });
        await base44.auth.updateMe({ freezeTokenCount: (user?.freezeTokenCount || 0) + milestone.tokens, title: milestone.title, unlockedMilestones: [...unlockedMilestones, milestone.days] });
        setMilestoneReward({ ...milestone, loot: lootResult });
        batchInvalidateQueries(['user', 'loot']);
        break;
      }
    }
  };

  // ── 日更 hook（规划任务+routine任务后端化，连胜检查，昨日顺延，清理）──
  const { handleDayRollover } = useDayRollover({
    user, today, yesterday, quests,
    batchInvalidateQueries, setToast,
    setIsDayRolloverInProgress, setStreakBreakInfo,
    checkAndAwardMilestone, normalizeDate, t, language,
  });

  useEffect(() => {
    if (user && !isLoading) {
      handleDayRollover();
    }
  }, [user?.id]);

  // Handle use token (called from StreakBreakDialog)
  const handleUseToken = async () => {
    try {
      await base44.auth.updateMe({ freezeTokenCount: (user?.freezeTokenCount || 0) - 1, lastClearDate: yesterday });
      batchInvalidateQueries(['user']);
      setStreakBreakInfo(null);
      setToast(t('questboard_toast_freeze_token_used'));
      setTimeout(() => setToast(null), 3000);
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('使用冻结券失败:', error);
      alert(t('questboard_alert_use_token_failed'));
    }
  };

  // Handle break streak (called from StreakBreakDialog)
  const handleBreakStreak = async () => {
    try {
      await base44.auth.updateMe({ streakCount: 0, streakManuallyReset: true, lastClearDate: yesterday });
      batchInvalidateQueries(['user']);
      setStreakBreakInfo(null);
      setToast(t('questboard_toast_streak_broken'));
      setTimeout(() => setToast(null), 3000);
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('重置连胜失败:', error);
      alert(t('questboard_alert_break_streak_failed'));
    }
  };

  const createQuestMutation = useMutation({
    mutationFn: async (questData) => {
      if (!user) return addGuestEntity('quests', questData);
      if (questData.isRoutine) return base44.entities.Quest.create(questData);
      const { data: encrypted } = await base44.functions.invoke('encryptQuestData', { title: questData.title, actionHint: questData.actionHint });
      return base44.entities.Quest.create({ ...questData, title: encrypted.encryptedTitle, actionHint: encrypted.encryptedActionHint });
    },
    onMutate: async (newQuest) => {
      await queryClient.cancelQueries({ queryKey: ['quests', today] });
      const previousQuests = queryClient.getQueryData(['quests', today]);
      queryClient.setQueryData(['quests', today], (old = []) => [...old, { ...newQuest, id: `temp_${Date.now()}`, created_date: new Date().toISOString(), updated_date: new Date().toISOString(), created_by: user?.email || 'guest' }]);
      return { previousQuests };
    },
    onError: (err, newQuest, context) => { queryClient.setQueryData(['quests', today], context.previousQuests); },
    onSuccess: async () => { batchInvalidateQueries(['quests', 'user']); }
  });

  const updateQuestMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (!user) return updateGuestEntity('quests', id, data);
      const updateData = { ...data };
      if (data.isRoutine) return base44.entities.Quest.update(id, updateData);
      if (data.title !== undefined || data.actionHint !== undefined || data.originalActionHint !== undefined) {
        const { data: encrypted } = await base44.functions.invoke('encryptQuestData', { title: data.title, actionHint: data.actionHint, originalActionHint: data.originalActionHint });
        if (data.title !== undefined) updateData.title = encrypted.encryptedTitle;
        if (data.actionHint !== undefined) updateData.actionHint = encrypted.encryptedActionHint;
        if (data.originalActionHint !== undefined) updateData.originalActionHint = encrypted.originalActionHint;
      }
      return base44.entities.Quest.update(id, updateData);
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['quests', today] });
      const previousQuests = queryClient.getQueryData(['quests', today]);
      queryClient.setQueryData(['quests', today], (old = []) => old.map(quest => quest.id === id ? { ...quest, ...data, updated_date: new Date().toISOString() } : quest));
      return { previousQuests };
    },
    onError: (err, variables, context) => { queryClient.setQueryData(['quests', today], context.previousQuests); },
    onSuccess: () => { batchInvalidateQueries(['quests']); }
  });

  const deleteQuestMutation = useMutation({
    mutationFn: (id) => {
      if (!user) return deleteGuestEntity('quests', id);
      return base44.entities.Quest.delete(id);
    },
    onSuccess: () => { batchInvalidateQueries(['quests']); }
  });

  const handleTextSubmit = async () => {
    if (!textInput.trim() || isProcessing) return;
    setIsProcessing(true);
    const loadingAudio = await playSound('loadingLoop', { loop: true });
    try {
      const { data: result } = await base44.functions.invoke('callDeepSeek', {
        prompt: getTaskNamingPrompt(language, textInput.trim(), false),
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string", description: language === 'zh' ? "必须严格是【2字类型】+正好7个汉字的描述！例如：【征讨】踏破晨曦五里征途。描述必须正好7个字，不能多也不能少！绝对不能包含'任务'二字！" : "Must strictly follow [Category]: <5-8 Word Epic Phrase> format!" },
            actionHint: { type: "string", description: language === 'zh' ? "用户的原始输入，完全保持原样" : "User's original input, keep as-is" },
            difficulty: { type: "string", enum: ["C", "B", "A", "S"] },
            rarity: { type: "string", enum: ["Common", "Rare", "Epic", "Legendary"] }
          },
          required: ["title", "actionHint", "difficulty", "rarity"]
        }
      });
      setPendingQuests(prev => [...prev, { ...result, tags: [], tempId: Date.now() }]);
      setTextInput('');
    } catch (error) {
      console.error('任务处理错误:', error);
      alert(t('questboard_alert_task_parse_failed', { message: error.message || t('common_try_again') }));
    }
    if (loadingAudio) stopSound(loadingAudio);
    setIsProcessing(false);
  };

  const handleUpdatePendingQuest = (tempId, field, value) => {
    setPendingQuests(prev => prev.map(q => q.tempId === tempId ? { ...q, [field]: value } : q));
  };

  const handleDeletePendingQuest = (tempId) => {
    setPendingQuests(prev => prev.filter(q => q.tempId !== tempId));
    if (expandedPending === tempId) setExpandedPending(null);
  };

  const handleConfirmPendingQuests = async () => {
    if (pendingQuests.length === 0 || isConfirmingPending) return;
    setIsConfirmingPending(true);
    const loadingAudio = await playSound('loadingLoop', { loop: true });
    try {
      if (!user) {
        for (const quest of pendingQuests) {
          addGuestEntity('quests', { title: quest.title, actionHint: quest.actionHint, difficulty: quest.difficulty, rarity: quest.rarity, date: today, status: 'todo', source: 'text', tags: quest.tags || [] });
        }
      } else {
        const { data: encryptedData } = await base44.functions.invoke('encryptQuestData', { quests: pendingQuests.map(quest => ({ title: quest.title, actionHint: quest.actionHint })) });
        await Promise.all(pendingQuests.map(async (quest, index) => {
          const encrypted = encryptedData.encryptedQuests[index];
          await base44.entities.Quest.create({ title: encrypted.encryptedTitle, actionHint: encrypted.encryptedActionHint, difficulty: quest.difficulty, rarity: quest.rarity, date: today, status: 'todo', source: 'text', tags: quest.tags || [] });
        }));
      }
      batchInvalidateQueries(['quests', 'user']);
      setPendingQuests([]);
      setExpandedPending(null);
      await playSound('questAdded');
      setToast(t('questboard_toast_quests_added_to_board', { count: pendingQuests.length }));
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error('创建任务失败:', error);
      alert(t('questboard_alert_create_quest_failed'));
    }
    if (loadingAudio) stopSound(loadingAudio);
    setIsConfirmingPending(false);
  };

  const handleComplete = async (quest) => {
    try {
      await updateQuestMutation.mutateAsync({ id: quest.id, data: { status: 'done' } });
      await playSound('questCompleted');
      setSelectedQuest(quest);
      batchInvalidateQueries(['quests']);
      if (quest.isLongTermProject && quest.longTermProjectId) {
        setTimeout(async () => {
          try {
            const projectQuests = await base44.entities.Quest.filter({ longTermProjectId: quest.longTermProjectId });
            const allDone = projectQuests.every(q => q.status === 'done');
            if (allDone && projectQuests.length > 0) {
              const project = await base44.entities.LongTermProject.filter({ id: quest.longTermProjectId });
              if (project.length > 0 && project[0].status === 'active') {
                await base44.entities.LongTermProject.update(project[0].id, { status: 'completed', completionDate: today });
                setCompletedProject(project[0]);
                setTimeout(() => setShowJointPraise(true), 1000);
              }
            }
          } catch (error) { console.error('检查大项目完成状态时出错:', error); }
        }, 500);
      }
    } catch (error) { console.error('更新任务状态失败:', error); }
  };

  const handleReopen = async (quest) => {
    await updateQuestMutation.mutateAsync({ id: quest.id, data: { status: 'todo' } });
    const messages = [t('questboard_reopen_toast_1'), t('questboard_reopen_toast_2'), t('questboard_reopen_toast_3'), t('questboard_reopen_toast_4')];
    setToast(messages[Math.floor(Math.random() * messages.length)]);
    setTimeout(() => setToast(null), 2000);
  };

  const handleEditQuestSave = async ({ actionHint, isRoutine, originalActionHint }) => {
    try {
      const contentChanged = actionHint !== editingQuest.actionHint;
      let newTitle = editingQuest.title;
      if (contentChanged) {
        const { data: result } = await base44.functions.invoke('callDeepSeek', {
          prompt: getTaskNamingPrompt(language, actionHint, true),
          response_json_schema: { type: "object", properties: { title: { type: "string", description: language === 'zh' ? "必须严格是【2字类型】+正好7个汉字的描述！" : "Must strictly follow [Category]: <5-8 Word Epic Phrase> format! Phrase must be 5-8 words exactly!" } }, required: ["title"] }
        });
        newTitle = result.title;
      }
      if (contentChanged && isRoutine && editingQuest.isRoutine && editingQuest.originalActionHint && user) {
        const allRoutineQuests = await base44.entities.Quest.filter({ isRoutine: true }, '-created_date', 200);
        const oldRoutineQuests = allRoutineQuests.filter(q => q.originalActionHint === editingQuest.originalActionHint && q.id !== editingQuest.id);
        for (const oldQuest of oldRoutineQuests) {
          await base44.entities.Quest.update(oldQuest.id, { isRoutine: false, originalActionHint: null });
        }
      }
      await updateQuestMutation.mutateAsync({ id: editingQuest.id, data: { title: newTitle, actionHint, difficulty: editingQuest.difficulty, rarity: editingQuest.rarity, tags: editingQuest.tags || [], isRoutine, originalActionHint: isRoutine ? actionHint : null, date: editingQuest.date } });
      setToast(isRoutine ? t('questboard_toast_set_as_routine') : contentChanged ? t('questboard_toast_quest_updated') : t('questboard_toast_changes_saved'));
      setTimeout(() => setToast(null), 2000);
      setEditingQuest(null);
      batchInvalidateQueries(['quests', 'user']);
    } catch (error) {
      console.error("更新失败", error);
      alert(t('questboard_alert_update_failed'));
    }
  };

  const handleChestClose = async () => {
    setShowChest(false);
    batchInvalidateQueries(['chest', 'quests']);
  };

  const handleOpenChest = async () => {
    if (!user) { alert(language === 'zh' ? '访客模式下无法开启宝箱（需要登录保存战利品）' : 'Cannot open chest in guest mode (login required to save loot)'); return; }
    const chests = await base44.entities.DailyChest.filter({ date: today });
    if (chests.length === 0) await base44.entities.DailyChest.create({ date: today, opened: false });
    setShowChest(true);
  };

  const handlePlanSaved = async (plannedQuests) => {
    if (!user) { alert(language === 'zh' ? '访客模式下无法规划明日任务（需要登录保存数据）' : 'Cannot plan tomorrow\'s quests in guest mode (login required to save data)'); return; }
    try {
      await base44.auth.updateMe({ nextDayPlannedQuests: plannedQuests, lastPlannedDate: today });
      batchInvalidateQueries(['user']);
      setToast(t('questboard_toast_plan_saved_success', { count: plannedQuests.length }));
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('保存规划失败:', error);
      alert(t('questboard_alert_save_plan_failed'));
    }
  };

  const handleOpenPlanning = () => {
    if (!user) { alert(language === 'zh' ? '游客模式下无法规划明日任务（需要登录保存数据）' : 'Cannot plan tomorrow\'s quests in guest mode (login required to save data)'); return; }
    setFromChestOpen(false);
    setShowCelebrationInPlanning(false);
    setShowPlanningDialog(true);
  };

  const filteredQuests = quests.filter(quest => {
    if (filter === 'all') return true;
    if (filter === 'done') return quest.status === 'done';
    if (filter === 'todo') return quest.status === 'todo';
    return true;
  });

  const nextDayPlannedCount = (user?.nextDayPlannedQuests || []).length;
  const canShowPlanningButton = currentHour >= 21 && user?.lastPlannedDate !== today;
  const allQuestsDone = quests.length > 0 && quests.every(q => q.status === 'done');

  const { data: todayChest } = useQuery({
    queryKey: ['chest', today],
    queryFn: async () => {
      try { const chests = await base44.entities.DailyChest.filter({ date: today }); return chests.length > 0 ? chests[0] : null; }
      catch { return null; }
    },
    staleTime: 5000, refetchOnWindowFocus: false,
  });

  const canOpenChest = allQuestsDone && (!todayChest || !todayChest.opened);

  const difficultyColors = { C: '#FFE66D', B: '#FF6B35', A: '#C44569', S: '#000', R: 'linear-gradient(135deg, #FFE66D 0%, #FFA94D 100%)' };

  // Pull-to-refresh handlers
  const handleTouchStart = (e) => { if (window.scrollY === 0 && !isRefreshing) { setPullStartY(e.touches[0].clientY); setIsPulling(true); } };
  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing) return;
    const distance = e.touches[0].clientY - pullStartY;
    if (distance > 0 && window.scrollY === 0) setPullDistance(Math.min(distance, 120));
  };
  const handleTouchEnd = async () => {
    if (!isPulling || isRefreshing) return;
    if (pullDistance > 80) {
      setIsRefreshing(true);
      await queryClient.invalidateQueries(['quests']);
      setTimeout(() => { setIsRefreshing(false); setPullDistance(0); }, 500);
    } else { setPullDistance(0); }
    setIsPulling(false);
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--bg-primary)' }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* Pull-to-refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div className="fixed top-0 left-0 right-0 flex items-center justify-center transition-all duration-200" style={{ height: `${pullDistance}px`, backgroundColor: 'var(--color-cyan)', opacity: pullDistance / 100, zIndex: 40 }}>
          <Loader2 className={`w-8 h-8 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={3} style={{ transform: `rotate(${pullDistance * 3}deg)`, transition: isRefreshing ? 'none' : 'transform 0.1s' }} />
        </div>
      )}
      
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 p-4 transform -rotate-1" style={{ backgroundColor: 'var(--bg-black)', color: 'var(--color-yellow)', border: '5px solid var(--color-yellow)', boxShadow: '8px 8px 0px var(--color-yellow)' }}>
          <h1 className="text-3xl font-black uppercase text-center">⚔️ {t('questboard_title')} ⚔️</h1>
          <p className="text-center font-bold mt-2 text-sm">{language === 'zh' ? format(new Date(), 'yyyy年MM月dd日') : format(new Date(), 'MMMM dd, yyyy')}</p>
        </div>

        <div className="p-4 mb-6" style={{ backgroundColor: 'var(--bg-warning)', border: '4px solid var(--border-primary)', boxShadow: '6px 6px 0px var(--border-primary)' }}>
          <div className="flex gap-3 mb-3">
            <Button
              onClick={() => {
                if (canOpenChest) { handleOpenChest(); }
                else if (todayChest?.opened) { setToast(language === 'zh' ? '今天已经开过宝箱了，明天再来' : 'Chest already opened today, come back tomorrow'); setTimeout(() => setToast(null), 2000); }
                else { setToast(language === 'zh' ? '完成今日所有委托后开启' : 'Complete all quests to unlock'); setTimeout(() => setToast(null), 2000); }
              }}
              aria-label={language === 'zh' ? '打开每日宝箱' : 'Open daily chest'}
              className="flex-shrink-0 flex items-center justify-center font-black overflow-visible"
              style={{ width: '64px', height: '64px', backgroundColor: canOpenChest ? 'var(--color-cyan)' : '#E0E0E0', border: '4px solid var(--border-primary)', boxShadow: '5px 5px 0px var(--border-primary)', opacity: canOpenChest ? 1 : 0.6 }}
            >
              <Gift className="w-16 h-16" strokeWidth={3} aria-hidden="true" style={{ color: '#FFF', width: '48px', height: '48px' }} />
            </Button>

            <Input
              type="text"
              placeholder={t('questboard_input_placeholder')}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') handleTextSubmit(); }}
              disabled={isProcessing}
              className="flex-1 h-16 px-4 font-bold text-lg"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '4px solid var(--border-primary)', boxShadow: '5px 5px 0px var(--border-primary)', color: 'var(--text-primary)' }}
            />

            <Button
              onClick={handleTextSubmit}
              disabled={isProcessing || !textInput.trim()}
              aria-label={language === 'zh' ? '添加任务' : 'Add quest'}
              className="flex-shrink-0 w-16 h-16 flex items-center justify-center font-black"
              style={{ backgroundColor: 'var(--color-pink)', border: '4px solid var(--border-primary)', boxShadow: '5px 5px 0px var(--border-primary)', opacity: (!textInput.trim() || isProcessing) ? 0.5 : 1 }}
            >
              {isProcessing ? <Loader2 className="w-12 h-12 animate-spin" aria-hidden="true" style={{ color: '#FFF' }} /> : <Sparkles className="w-14 h-14" strokeWidth={3} aria-hidden="true" style={{ color: '#FFF', fill: 'none' }} />}
            </Button>
          </div>

          <Button onClick={() => navigate('/long-term-project')} aria-label={t('questboard_longterm_btn')} className="w-full py-3 font-black uppercase flex items-center justify-center gap-2" style={{ backgroundColor: '#9B59B6', color: 'var(--text-inverse)', border: '4px solid var(--border-primary)', boxShadow: '5px 5px 0px var(--border-primary)' }}>
            <Briefcase className="w-5 h-5" strokeWidth={3} aria-hidden="true" />
            {t('questboard_longterm_btn')}
          </Button>
          <p className="font-bold text-center mt-2" style={{ color: 'var(--text-secondary)' }}>{t('questboard_longterm_hint')}</p>

          {pendingQuests.length > 0 && (
            <div className="mt-4 p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '3px solid var(--border-primary)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black uppercase">{t('questboard_pending_quests_title', { count: pendingQuests.length })}</h3>
              </div>
              <div className="space-y-2 mb-3">
                {pendingQuests.map((quest) => (
                  <div key={quest.tempId} style={{ backgroundColor: 'var(--bg-primary)', border: '3px solid var(--border-primary)' }}>
                    <div className="p-3 flex items-start justify-between cursor-pointer gap-3" onClick={() => setExpandedPending(expandedPending === quest.tempId ? null : quest.tempId)}>
                      <div className="flex-1 min-w-0 flex items-start gap-3">
                        <span className="px-2 py-1 text-sm font-black flex-shrink-0" style={{ backgroundColor: difficultyColors[quest.difficulty], color: quest.difficulty === 'S' ? 'var(--color-yellow)' : 'var(--text-primary)', border: '2px solid var(--border-primary)' }}>{quest.difficulty}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm mb-1 break-words leading-tight">{quest.title}</p>
                          <p className="font-bold text-gray-600 break-words">({quest.actionHint})</p>
                        </div>
                      </div>
                      {expandedPending === quest.tempId ? <ChevronUp className="w-5 h-5 flex-shrink-0 mt-1" strokeWidth={3} /> : <ChevronDown className="w-5 h-5 flex-shrink-0 mt-1" strokeWidth={3} />}
                    </div>
                    {expandedPending === quest.tempId && (
                      <div className="px-3 pb-3 pt-0" style={{ borderTop: '2px solid var(--border-primary)' }}>
                        <div className="mb-3 mt-3">
                          <label className="block font-bold uppercase mb-2">{t('questboard_pending_quest_content_label')}</label>
                          <Input type="text" value={quest.actionHint} onChange={(e) => handleUpdatePendingQuest(quest.tempId, 'actionHint', e.target.value)} className="w-full px-3 py-2 font-bold text-sm" style={{ border: '2px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                        </div>
                        <div className="mb-3">
                          <label className="block font-bold uppercase mb-2">{t('questboard_pending_quest_difficulty_label')}</label>
                          <div className="grid grid-cols-4 gap-2">
                            {['C', 'B', 'A', 'S'].map(level => (
                              <Button key={level} onClick={() => handleUpdatePendingQuest(quest.tempId, 'difficulty', level)} className="py-2 font-black" style={{ backgroundColor: quest.difficulty === level ? difficultyColors[level] : '#F0F0F0', color: level === 'S' && quest.difficulty === level ? 'var(--color-yellow)' : 'var(--text-primary)', border: quest.difficulty === level ? '3px solid var(--border-primary)' : '2px solid var(--border-primary)' }}>{level}</Button>
                            ))}
                          </div>
                        </div>
                        <Button onClick={() => handleDeletePendingQuest(quest.tempId)} className="w-full py-2 font-bold uppercase" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--color-orange)', border: '2px solid var(--color-orange)' }}>{t('questboard_pending_quest_delete_button')}</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Button onClick={handleConfirmPendingQuests} disabled={isConfirmingPending} className="w-full py-3 font-black uppercase flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--color-cyan)', border: '4px solid var(--border-primary)', boxShadow: '4px 4px 0px var(--border-primary)', opacity: isConfirmingPending ? 0.5 : 1 }}>
                {isConfirmingPending ? (<><Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />{t('common_adding')}...</>) : (<><Check className="w-5 h-5" strokeWidth={3} />{t('questboard_pending_quest_confirm_button', { count: pendingQuests.length })}</>)}
              </Button>
            </div>
          )}
        </div>

        {(isLoadingLongTermQuests || hasAnyLongTermQuests) && (
          <div className="mb-6 p-4" style={{ backgroundColor: '#9B59B6', border: '4px solid var(--border-primary)', boxShadow: '6px 6px 0px var(--border-primary)' }}>
            <Button onClick={() => { if (!user) { alert(language === 'zh' ? '访客模式下无法查看日程表（需要登录）' : 'Cannot view calendar in guest mode (login required)'); return; } setShowCalendarModal(true); }} disabled={isLoadingLongTermQuests || !user} className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3 text-white" style={{ opacity: (isLoadingLongTermQuests || !user) ? 0.6 : 1 }}>
              {isLoadingLongTermQuests ? (<><Loader2 className="w-6 h-6 animate-spin" strokeWidth={3} />{language === 'zh' ? '检查中...' : 'Checking...'}</>) : (<><CalendarIcon className="w-6 h-6" strokeWidth={3} />{t('questboard_calendar_btn')}</>)}
            </Button>
            <p className="text-center font-bold mt-2 text-white">{t('questboard_calendar_hint')}</p>
          </div>
        )}

        {user && (nextDayPlannedCount > 0 || canShowPlanningButton) && (
          <div className="mb-6 p-4" style={{ backgroundColor: 'var(--color-pink)', border: '4px solid var(--border-primary)', boxShadow: '6px 6px 0px var(--border-primary)' }}>
            {nextDayPlannedCount > 0 && (
              <Button onClick={handleOpenPlanning} className="w-full py-3 font-black uppercase flex items-center justify-center gap-2 mb-3" style={{ backgroundColor: '#FFE66D', border: '3px solid #000', boxShadow: '4px 4px 0px #000' }}>
                <CalendarIcon className="w-5 h-5" strokeWidth={3} />
                {t('questboard_planned_quests')} {nextDayPlannedCount} {t('common_items')}{language === 'zh' ? '委托' : ' quests'}
              </Button>
            )}
            {canShowPlanningButton && (
              <Button onClick={handleOpenPlanning} className="w-full py-3 font-black uppercase flex items-center justify-center gap-2" style={{ backgroundColor: '#FFE66D', border: '3px solid #000', boxShadow: '4px 4px 0px #000' }}>
                <CalendarIcon className="w-5 h-5" strokeWidth={3} />
                {t('questboard_plan_tomorrow')}
              </Button>
            )}
            {!canShowPlanningButton && nextDayPlannedCount === 0 && user?.lastPlannedDate !== today && (
              <p className="text-center font-bold text-white mt-2">💡 {language === 'zh' ? '晚上9点后可规划明日任务（或完成今日所有任务后自动弹出）' : 'Plan tomorrow\'s quests after 9 PM (or automatically after completing all today\'s quests)'}</p>
            )}
          </div>
        )}

        <div className="flex gap-3 mb-4">
          {['all', 'todo', 'done'].map(f => (
            <Button key={f} onClick={() => setFilter(f)} className="flex-1 py-2 font-black uppercase" style={{ backgroundColor: filter === f ? 'var(--color-cyan)' : 'var(--bg-secondary)', color: 'var(--text-primary)', border: '3px solid var(--border-primary)', boxShadow: filter === f ? '4px 4px 0px var(--border-primary)' : '2px 2px 0px var(--border-primary)', transform: filter === f ? 'scale(1.02)' : 'scale(1)' }}>
              <Filter className="w-4 h-4 inline mr-1" strokeWidth={3} />
              {t(`questboard_filter_${f}`)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-12 h-12 animate-spin" strokeWidth={4} /></div>
        ) : filteredQuests.length === 0 ? (
          <div className="p-8 text-center" style={{ backgroundColor: 'var(--bg-secondary)', border: '4px solid var(--border-primary)', boxShadow: '6px 6px 0px var(--border-primary)' }}>
            <p className="text-2xl font-black uppercase mb-2" style={{ color: 'var(--text-primary)' }}>{t('questboard_no_quests')}</p>
            <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>{t('questboard_no_quests_hint')}</p>
          </div>
        ) : (
          <div>
            {filteredQuests.map(quest => (
              <QuestCard key={quest.id} quest={quest} onComplete={handleComplete} onEdit={(q) => setEditingQuest(q)} onDelete={(id) => deleteQuestMutation.mutate(id)} onReopen={handleReopen} />
            ))}
          </div>
        )}

        {selectedQuest && <PraiseDialog quest={selectedQuest} onClose={() => setSelectedQuest(null)} onAddNote={() => { alert(t('questboard_alert_review_notes_wip')); }} />}
        {showChest && <ChestOpening date={today} onClose={handleChestClose} onLootGenerated={() => { batchInvalidateQueries(['loot']); }} />}
        {editingQuest && <QuestEditFormModal quest={editingQuest} onSave={handleEditQuestSave} onClose={() => setEditingQuest(null)} />}
        {showPlanningDialog && user && <EndOfDaySummaryAndPlanning showCelebration={showCelebrationInPlanning} currentStreak={user?.streakCount || 0} fromChestOpen={fromChestOpen} onClose={() => { setShowPlanningDialog(false); setShowCelebrationInPlanning(false); setFromChestOpen(false); }} onPlanSaved={handlePlanSaved} />}
        {showJointPraise && completedProject && <JointPraiseDialog project={completedProject} onClose={() => { setShowJointPraise(false); setCompletedProject(null); }} />}

        <CalendarModal isOpen={showCalendarModal} onClose={() => setShowCalendarModal(false)} />

        {milestoneReward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
            <div className="relative max-w-lg w-full p-8 transform" style={{ backgroundColor: '#FFE66D', border: '6px solid #000', boxShadow: '15px 15px 0px #000' }}>
              <div className="text-center">
                <div className="text-7xl mb-4 animate-bounce">{milestoneReward.icon}</div>
                <h2 className="text-3xl font-black uppercase mb-3" style={{ color: '#000' }}>🎊 {t('milestone_reached')} 🎊</h2>
                <div className="mb-6 p-4" style={{ backgroundColor: '#FFF', border: '4px solid #000' }}>
                  <p className="text-2xl font-black mb-3">{milestoneReward.days}{t('milestone_days_streak')}</p>
                  <p className="text-xl font-black uppercase mb-3" style={{ color: '#C44569' }}>「{milestoneReward.title}」</p>
                  <p className="font-bold text-sm leading-relaxed mb-4">{t('milestone_congrats', { days: milestoneReward.days })}</p>
                  <div className="space-y-3">
                    <div className="p-3" style={{ backgroundColor: '#4ECDC4', border: '3px solid #000' }}><p className="font-black">{t('milestone_freeze_token_label')} +{milestoneReward.tokens}</p></div>
                    <div className="p-3" style={{ backgroundColor: '#FF6B35', border: '3px solid #000' }}><p className="font-black text-white">🏅 {milestoneReward.title} {t('milestone_title_badge_label')}</p></div>
                    <div className="p-3 text-left" style={{ backgroundColor: '#C44569', border: '3px solid #000' }}>
                      <div className="flex items-center gap-3 mb-2"><span className="text-3xl">{milestoneReward.loot.icon}</span><p className="font-black text-white">{milestoneReward.loot.name}</p></div>
                      <p className="font-bold text-sm text-white leading-relaxed">{milestoneReward.loot.flavorText}</p>
                    </div>
                  </div>
                </div>
                <Button onClick={() => setMilestoneReward(null)} className="w-full py-4 font-black uppercase text-xl" style={{ backgroundColor: '#000', color: '#FFE66D', border: '5px solid #FFE66D', boxShadow: '6px 6px 0px #FFE66D' }}>{t('milestone_claim_button')}</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {streakBreakInfo && <StreakBreakDialog incompleteDays={streakBreakInfo.incompleteDays} currentStreak={streakBreakInfo.currentStreak} freezeTokenCount={streakBreakInfo.freezeTokenCount} onUseToken={handleUseToken} onBreakStreak={handleBreakStreak} onClose={() => setStreakBreakInfo(null)} />}

      {isDayRolloverInProgress && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999 }}>
          <div className="relative max-w-md w-full p-8 transform" style={{ backgroundColor: '#FFE66D', border: '5px solid #000', boxShadow: '12px 12px 0px #000' }}>
            <div className="text-center">
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" strokeWidth={4} style={{ color: '#000' }} />
              <h2 className="text-2xl font-black uppercase mb-2" style={{ color: '#000' }}>{language === 'zh' ? '⚙️ 工会同步中 ⚙️' : '⚙️ Guild Syncing ⚙️'}</h2>
              <p className="text-base font-black mb-4" style={{ color: '#C44569' }}>💡 {getCurrentLoadingMessage()}</p>
              <div className="p-4" style={{ backgroundColor: '#FFF', border: '3px solid #000' }}>
                <p className="font-bold leading-relaxed">{language === 'zh' ? '正在加载今日委托和规划任务，请稍候片刻...' : 'Loading today\'s quests and planned tasks, please wait...'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 animate-fade-in-out" style={{ backgroundColor: '#4ECDC4', border: '4px solid #000', boxShadow: '6px 6px 0px #000', maxWidth: '90%' }}>
          <p className="font-black text-center">{toast}</p>
        </div>
      )}

      <style>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translate(-50%, -10px); }
          10%, 90% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -10px); }
        }
        .animate-fade-in-out { animation: fade-in-out 2s ease-in-out; }
      `}</style>
    </div>
  );
}