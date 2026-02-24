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
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/components/LanguageContext';
import { getTaskNamingPrompt } from '@/components/prompts';
import { getGuestData, setGuestData, addGuestEntity, updateGuestEntity, deleteGuestEntity } from '@/components/utils/guestData';
import { playSound, stopSound } from '@/components/AudioManager';
import { isSameDate, normalizeDate, getPreviousWorkday } from '@/components/utils/dateUtils';
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
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { language, t } = useLanguage();

  // 🔧 防止并发执行的 ref
  const isRolloverRunningRef = useRef(false);
  


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
      if (rolloverLoadingSeconds < accumulatedTime) {
        return msg.text;
      }
    }

    return messages[messages.length - 1].text;
  };

  // 🔥 优化：批量刷新查询，避免频繁触发
  const batchInvalidateQueries = (keys) => {
    if (invalidationTimeoutRef.current) {
      clearTimeout(invalidationTimeoutRef.current);
    }

    invalidationTimeoutRef.current = setTimeout(() => {
      keys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    }, 100);
  };

  // 🔥 Safari后台保持：监测日期变化，自动刷新页面
  useEffect(() => {
    const lastRenderedDate = format(new Date(), 'yyyy-MM-dd');
    const checkDateChange = () => {
      if (document.visibilityState === 'visible') {
        const currentDate = format(new Date(), 'yyyy-MM-dd');
        if (currentDate !== lastRenderedDate) {
          window.location.reload();
        }
      }
    };
    document.addEventListener('visibilitychange', checkDateChange);
    return () => document.removeEventListener('visibilitychange', checkDateChange);
  }, []);

  // 实时更新当前小时，用于判断是否显示"规划明日"板块
  useEffect(() => {
    const updateHour = () => {
      const newHour = new Date().getHours();
      setCurrentHour(newHour);
    };

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
      if (rolloverTimerRef.current) {
        clearInterval(rolloverTimerRef.current);
        rolloverTimerRef.current = null;
      }
      setRolloverLoadingSeconds(0);
    }

    return () => {
      if (rolloverTimerRef.current) {
        clearInterval(rolloverTimerRef.current);
      }
    };
  }, [isDayRolloverInProgress]);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        return null;
      }
    },
    retry: false,
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ['quests', today],
    enabled: !!user || user === null,
    cacheTime: 0,
    queryFn: async () => {
      // 访客模式：从 localStorage 读取
      if (!user) {
        const guestQuests = getGuestData('quests');
        const todayQuests = guestQuests.filter(q => q.date === today);
        
        return todayQuests;
      }

      // 登录模式：从后端读取并解密
      try {
        const allQuests = await base44.entities.Quest.filter({ date: today }, '-created_date');

        // 🔥 分离 routine（明文）和非 routine（需解密）任务
        const routineQuests = allQuests.filter(q => q.isRoutine);
        const nonRoutineQuests = allQuests.filter(q => !q.isRoutine);

        console.log(`今日任务：${routineQuests.length} 个 routine（明文），${nonRoutineQuests.length} 个非 routine（需解密）`);

        // Routine 任务：直接使用明文
        let decryptedNonRoutineQuests = [];

        // 非 routine 任务：批量解密
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

            console.log(`✅ 成功解密 ${decryptedNonRoutineQuests.length} 个非 routine 任务`);
          } catch (error) {
            console.error('❌ 批量解密失败:', error);
            // 解密失败时，保留原始数据（可能显示为乱码，但至少不会丢失任务）
            decryptedNonRoutineQuests = nonRoutineQuests;
          }
        }

        // 合并 routine（明文）和非 routine（解密后）任务
        return [...routineQuests, ...decryptedNonRoutineQuests];
      } catch (error) {
        console.error('获取任务失败:', error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    });

    const { data: hasAnyLongTermQuests = false, isLoading: isLoadingLongTermQuests } = useQuery({
    queryKey: ['hasLongTermQuests'],
    queryFn: async () => {
      console.log('=== 🔍 检查未完成的大项目任务 ===');
      try {
        const allLongTermQuests = await base44.entities.Quest.filter({ 
          isLongTermProject: true 
        });
        
        const incompleteTasks = allLongTermQuests.filter(q => q.status !== 'done');
        console.log('📋 未完成的大项目任务数量:', incompleteTasks.length);
        
        if (incompleteTasks.length > 0) {
          console.log('✅ 有未完成任务，显示按钮');
        } else {
          console.log('❌ 无未完成任务，不显示按钮');
        }
        
        return incompleteTasks.length > 0;
      } catch (error) {
        console.error('❌ 检查失败:', error);
        return false;
      }
    },
    enabled: true,
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  // 日更逻辑：检查连胜中断 + 未完成任务顺延 + 明日规划任务创建 + 每日修炼任务生成 + 清理旧任务 + 清理旧宝箱记录 + 清理旧大项目
  useEffect(() => {
    // 🔥 辅助函数1: 处理明日规划任务
    const runNextDayPlannedQuests = async ({ today, batchInvalidateQueries, setToast, language, t, currentUserData }) => {
      console.log('=== 步骤1: 检查明日规划任务 ===');

      try {
        const nextDayPlanned = currentUserData?.nextDayPlannedQuests || [];
        const lastPlanned = currentUserData?.lastPlannedDate;

        console.log('nextDayPlanned:', nextDayPlanned);
        console.log('lastPlanned:', lastPlanned);
        console.log('today:', today);
        console.log('条件: nextDayPlanned.length > 0 =', nextDayPlanned.length > 0);
        console.log('条件: lastPlanned存在 =', !!lastPlanned);
        console.log('条件: lastPlanned < today =', lastPlanned < today);

        if (nextDayPlanned.length > 0 && lastPlanned && lastPlanned < today) {
          console.log(`✅ 发现 ${nextDayPlanned.length} 项已规划任务，开始创建...`);

          // 🔧 【关键】立即清空规划列表，防止并发重复创建
          await base44.auth.updateMe({
            nextDayPlannedQuests: []
          });
          console.log('✅ 已清空规划列表（防止并发重复）');

          try {
            // 🔥 批量加密所有任务（并行）
            const { data: encryptedData } = await base44.functions.invoke('encryptQuestData', {
              quests: nextDayPlanned.map(quest => ({
                title: quest.title,
                actionHint: quest.actionHint
              }))
            });

            // 🔥 批量创建所有任务（并行）
            await Promise.all(
              nextDayPlanned.map(async (plannedQuest, index) => {
                const encrypted = encryptedData.encryptedQuests[index];
                await base44.entities.Quest.create({
                  title: encrypted.encryptedTitle,
                  actionHint: encrypted.encryptedActionHint,
                  difficulty: plannedQuest.difficulty,
                  rarity: plannedQuest.rarity,
                  date: today,
                  status: 'todo',
                  source: 'ai',
                  tags: plannedQuest.tags || []
                });
              })
            )

              console.log('✅ 明日规划任务全部创建成功');

            batchInvalidateQueries(['quests', 'user']);
            setToast(t('questboard_toast_planned_quests_loaded', { count: nextDayPlanned.length }));
            setTimeout(() => setToast(null), 3000);
          } catch (error) {
            console.error('❌ 创建规划任务时出错:', error);
            alert(language === 'zh' 
              ? `创建规划任务失败：${error.message}，请刷新页面重试` 
              : `Failed to create planned quests: ${error.message}, please refresh`);
            throw error;
          }
        } else {
          console.log('❌ 没有符合条件的明日规划任务');
        }
      } catch (error) {
        console.error('❌ 运行明日规划任务步骤失败:', error);
      }
    };

    // 🔥 辅助函数2: 处理每日修炼任务
    /**
     * 处理每日修炼任务的生成、更新和删除
     * @param {Object} params - 参数对象
     * @param {string} params.today - 今天的日期 (YYYY-MM-DD)
     * @param {Function} params.batchInvalidateQueries - 批量刷新查询的函数
     * @param {Array} params.todayQuests - 今日已有的任务列表
     * @param {Function} params.setToast - 设置 Toast 提示的函数
     * @param {Function} params.t - 翻译函数
     * @returns {Promise<Object>} 返回操作统计 { updated: number, deleted: number, created: number }
     */
    const runRoutineQuestsGeneration = async ({ today, batchInvalidateQueries, todayQuests, setToast, t }) => {
      console.log('=== 步骤5: 开始处理每日修炼任务 ===');

      // 初始化操作计数器
      let updatedCount = 0;
      let deletedCount = 0;
      let createdCount = 0;

      try {
        // ========================================
        // 步骤 5.1: 获取历史的例行任务模板（排除今天）
        // ========================================
        console.log('步骤 5.1: 获取历史的例行任务模板（已明文存储，排除今天）...');

        // 获取所有标记为 isRoutine: true 的任务作为模板
        const allRoutineTemplates = await base44.entities.Quest.filter({ 
          isRoutine: true
        }, '-created_date', 200);
        console.log(`从历史记录中找到 ${allRoutineTemplates.length} 个例行任务`);

        // 🔥 关键：排除今天的任务（避免把今天已创建的任务再次作为模板）
        const templatesExcludingToday = allRoutineTemplates.filter(t => t.date !== today);
        console.log(`排除今天的任务后，剩余 ${templatesExcludingToday.length} 个可用作模板的历史任务`);

        // Routine 任务现在以明文存储，不需要解密
        // 直接构建活跃模板 Map: originalActionHint -> 最新的模板
        const activeTemplatesMap = new Map();
        for (const template of templatesExcludingToday) {
          // 使用 originalActionHint 作为唯一标识
          const templateKey = template.originalActionHint;

          // 跳过没有 originalActionHint 的模板（可能是旧数据）
          if (!templateKey) {
            console.warn(`跳过无效模板 (ID: ${template.id}, 缺少 originalActionHint)`);
            continue;
          }

          // 如果该键已存在，比较日期和创建时间，保留最新的
          const existing = activeTemplatesMap.get(templateKey);
          if (!existing || 
              template.date > existing.date || 
              (template.date === existing.date && new Date(template.created_date) > new Date(existing.created_date))) {
            activeTemplatesMap.set(templateKey, template);
          }
        }

        console.log(`整理后得到 ${activeTemplatesMap.size} 个唯一的活跃模板`);

        // ========================================
        // 步骤 5.2: 识别并更新今日已存在的过时例行任务
        // ========================================
        console.log('步骤 5.2: 检查并更新过时的例行任务...');
        
        const todayRoutineQuests = todayQuests.filter(q => q.isRoutine && q.source === 'routine');
        console.log(`找到 ${todayRoutineQuests.length} 个今日例行任务`);

        for (const todayQuest of todayRoutineQuests) {
          const questKey = todayQuest.originalActionHint;
          if (!questKey) {
            console.warn(`任务 ${todayQuest.id} 缺少 originalActionHint，跳过`);
            continue;
          }

          // 检查此任务对应的模板是否还存在
          const template = activeTemplatesMap.get(questKey);
          if (!template) {
            // 模板不存在，稍后在步骤 5.3 中会删除此任务
            continue;
          }

          // 比较任务内容是否与模板一致（现在都是明文，直接比较）
          const questActionHint = todayQuest.actionHint;
          const templateActionHint = template.originalActionHint || template.actionHint;

          // 如果 actionHint 不同，说明模板被修改了，需要更新今日任务
          if (questActionHint !== templateActionHint) {
            console.log(`任务 ${todayQuest.id} 内容已过时，准备更新...`);
            console.log(`  旧内容: ${questActionHint}`);
            console.log(`  新内容: ${templateActionHint}`);

            try {
              // 重新生成标题（因为内容变了）
              const { data: newTitleResult } = await base44.functions.invoke('callDeepSeek', {
                prompt: `你是【星陨纪元冒险者工会】的首席史诗书记官。

              **当前冒险者每日修炼内容：** ${templateActionHint}

              请为这个每日修炼任务生成**全新的**RPG风格标题（只需要标题，不需要重新评定难度）。

              要求：
              1. 标题要有变化，不要每天都一样（但核心内容要体现任务本质）
              2. 格式：【2字类型】+ 7字标题
              3. 保持任务的核心特征

              只返回标题。`,
                response_json_schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" }
                  },
                  required: ["title"]
                }
              });

              // Routine 任务不加密，直接更新明文内容
              await base44.entities.Quest.update(todayQuest.id, {
                title: newTitleResult.title,
                actionHint: templateActionHint,
                difficulty: template.difficulty,
                rarity: template.rarity,
                originalActionHint: templateActionHint
              });

              updatedCount++;
              console.log(`✅ 任务 ${todayQuest.id} 已更新`);
            } catch (error) {
              console.error(`更新任务 ${todayQuest.id} 失败:`, error);
            }
          } else {
            console.log(`任务 ${todayQuest.id} 内容与模板一致，无需更新`);
          }
        }

        console.log(`步骤 5.2 完成 - 更新了 ${updatedCount} 个过时任务`);

        // ========================================
        // 步骤 5.3: 识别并删除废弃的例行任务
        // ========================================
        console.log('步骤 5.3: 检查并删除废弃的例行任务...');

        for (const todayQuest of todayRoutineQuests) {
          const questKey = todayQuest.originalActionHint;
          if (!questKey) {
            console.warn(`任务 ${todayQuest.id} 缺少 originalActionHint，跳过`);
            continue;
          }

          // 检查此任务对应的模板是否还存在于活跃模板列表中
          const templateExists = activeTemplatesMap.has(questKey);

          if (!templateExists) {
            console.log(`任务 ${todayQuest.id} 的模板已不存在，准备删除...`);
            console.log(`  任务内容: ${todayQuest.actionHint}`);
            console.log(`  原始标识: ${questKey}`);

            try {
              await base44.entities.Quest.delete(todayQuest.id);
              deletedCount++;
              console.log(`✅ 已删除废弃任务 ${todayQuest.id}`);
            } catch (error) {
              console.error(`删除任务 ${todayQuest.id} 失败:`, error);
            }
          }
        }

        console.log(`步骤 5.3 完成 - 删除了 ${deletedCount} 个废弃任务`);

        // ========================================
        // 步骤 5.4: 生成今日缺失的例行任务
        // ========================================
        console.log('步骤 5.4: 检查并生成缺失的例行任务...');

        // 重新获取今日任务列表（因为可能有任务被更新或删除）
        const refreshedTodayQuests = await base44.entities.Quest.filter({ date: today }, '-created_date');
        console.log(`重新获取今日任务，当前数量: ${refreshedTodayQuests.length}`);

        // Routine 任务已经是明文，不需要解密
        // 筛选需要创建的任务
        const toCreate = [];
        for (const [actionHintPlain, templateQuest] of activeTemplatesMap) {
          // 🔥 修复重复任务问题：只使用 originalActionHint 作为唯一标识进行判断
          const alreadyExists = refreshedTodayQuests.some(
            q => q.isRoutine && q.originalActionHint === actionHintPlain
          );
          if (!alreadyExists) {
            toCreate.push({ actionHintPlain, templateQuest });
          }
        }

        console.log('需要创建的每日修炼任务数量:', toCreate.length);

        if (toCreate.length > 0) {
            // 🔥 并行调用 LLM 生成所有标题
            const llmResults = await Promise.all(
              toCreate.map(({ actionHintPlain }) =>
                base44.functions.invoke('callDeepSeek', {
                  prompt: `你是【星陨纪元冒险者工会】的首席史诗书记官。

            **当前冒险者每日修炼内容：** ${actionHintPlain}

            请为这个每日修炼任务生成**全新的**RPG风格标题（只需要标题，不需要重新评定难度）。

            要求：
            1. 标题要有变化，不要每天都一样（但核心内容要体现任务本质）
            2. 格式：【2字类型】+ 7字标题
            3. 保持任务的核心特征

            只返回标题。`,
                  response_json_schema: {
                    type: "object",
                    properties: {
                      title: { type: "string" }
                    },
                    required: ["title"]
                  }
                }).then(res => res.data).catch(err => {
                  console.error(`LLM生成标题失败: ${actionHintPlain}`, err);
                  return null;
                })
              )
            );

            // 🔥 串行创建任务（防止并发竞争导致重复，每次创建前再次检查）
            for (let i = 0; i < toCreate.length; i++) {
              const { actionHintPlain, templateQuest } = toCreate[i];
              const result = llmResults[i];
              if (!result) continue;

              try {
                // 创建前再次检查（防止并发/重试导致重复）
                const checkAgain = await base44.entities.Quest.filter({ date: today, isRoutine: true }, '-created_date', 200);
                const alreadyCreated = checkAgain.some(q => q.originalActionHint === actionHintPlain);
                if (alreadyCreated) {
                  console.log(`⚠️ 已存在，跳过创建: ${actionHintPlain}`);
                  continue;
                }
                await base44.entities.Quest.create({
                  title: result.title,
                  actionHint: actionHintPlain,
                  difficulty: templateQuest.difficulty,
                  rarity: templateQuest.rarity,
                  date: today,
                  status: 'todo',
                  source: 'routine',
                  isRoutine: true,
                  originalActionHint: actionHintPlain,
                  tags: []
                });
              } catch (error) {
                console.error(`创建每日修炼任务失败: ${actionHintPlain}`, error);
              }
            }

            createdCount = toCreate.length;
          }
          } catch (error) {
          console.error('❌ 运行每日修炼任务步骤失败:', error);
          throw error;
          }

          // ========================================
          // 步骤 5.5: 更新缓存和 UI 提示
          // ========================================
          console.log('步骤 5.5: 刷新缓存和显示提示...');

          // 统一刷新查询缓存
          batchInvalidateQueries(['quests']);

          // 如果有更新、删除或创建操作，显示 Toast 提示
          if (updatedCount > 0 || deletedCount > 0 || createdCount > 0) {
          const messages = [];
          if (updatedCount > 0) {
          messages.push(language === 'zh' 
            ? `更新 ${updatedCount} 项` 
            : `Updated ${updatedCount}`);
          }
          if (deletedCount > 0) {
          messages.push(language === 'zh' 
            ? `删除 ${deletedCount} 项` 
            : `Deleted ${deletedCount}`);
          }
          if (createdCount > 0) {
          messages.push(language === 'zh' 
            ? `新增 ${createdCount} 项` 
            : `Created ${createdCount}`);
          }

          const toastMessage = language === 'zh'
          ? `✅ 每日修炼任务已同步：${messages.join('、')}`
          : `✅ Daily routine quests synced: ${messages.join(', ')}`;

          setToast(toastMessage);
          setTimeout(() => setToast(null), 3000);
          }

          // 返回操作统计
          console.log(`✅ 每日修炼任务处理完成 - 更新: ${updatedCount}, 删除: ${deletedCount}, 创建: ${createdCount}`);
          return { updated: updatedCount, deleted: deletedCount, created: createdCount };
          };

    // 🔥 辅助函数3: 处理昨天未完成任务
    const runYesterdayQuestsRollover = async ({ yesterday, today, batchInvalidateQueries, setToast, t, yesterdayQuests }) => {
      console.log('=== 步骤4: 处理昨天未完成任务 ===');

      try {
        const oldQuests = yesterdayQuests.filter(q => q.status === 'todo');
        
        if (oldQuests.length > 0) {
          console.log(`发现 ${oldQuests.length} 项昨日未完成任务，开始顺延...`);
          
          for (const quest of oldQuests) {
            if (!quest.isRoutine) {
              await base44.entities.Quest.update(quest.id, { date: today });
            }
          }
          
          batchInvalidateQueries(['quests']);
          const nonRoutineCount = oldQuests.filter(q => !q.isRoutine).length;
          if (nonRoutineCount > 0) {
            setToast(t('questboard_toast_yesterday_quests_delayed', { count: nonRoutineCount }));
            setTimeout(() => setToast(null), 3000);
          }
        }
      } catch (error) {
        console.error('❌ 运行昨日任务顺延步骤失败:', error);
        throw error;
      }
    };

    // 🔥 辅助函数4: 清理旧宝箱记录
    const cleanOldChests = async ({ sevenDaysAgoStr }) => {
      console.log('=== 步骤3: 开始清理旧宝箱记录 ===');
      
      try {
        const allChests = await base44.entities.DailyChest.filter({ opened: true }, '-date', 200);
        let deletedChestCount = 0;
        
        for (const chest of allChests) {
          if (!chest.date) continue;
          if (chest.date < sevenDaysAgoStr) {
            await base44.entities.DailyChest.delete(chest.id);
            deletedChestCount++;
          }
        }
        
        if (deletedChestCount > 0) {
          console.log(`✅ 已清理 ${deletedChestCount} 个7天前的宝箱记录`);
        }
      } catch (error) {
        console.error('清理宝箱记录时出错:', error);
      }
    };

    // 🔥 辅助函数5: 清理旧任务
    const cleanOldQuests = async ({ sevenDaysAgoStr }) => {
      console.log('=== 步骤2: 开始清理旧任务 ===');
      
      try {
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
        
        const protectedQuestIds = new Set(
          Array.from(routineQuestsMap.values()).map(q => q.id)
        );
        
        let deletedCount = 0;
        
        for (const quest of doneQuests) {
          if (quest.isLongTermProject) continue;
          if (protectedQuestIds.has(quest.id)) continue;
          if (!quest.date) continue;
          
          if (quest.date < sevenDaysAgoStr) {
            await base44.entities.Quest.delete(quest.id);
            deletedCount++;
          }
        }
        
        if (deletedCount > 0) {
          console.log(`✅ 已清理 ${deletedCount} 个7天前的已完成任务`);
        }
      } catch (error) {
        console.error('清理旧任务时出错:', error);
      }
    };

    // 🔥 辅助函数6: 清理旧的大项目记录
    const cleanOldLongTermProjects = async ({ twoYearsAgoStr, batchInvalidateQueries }) => {
      console.log('=== 步骤6: 开始清理旧的大项目记录 ===');
      
      try {
        console.log('📅 2年前日期:', twoYearsAgoStr);
        
        // 查询所有大项目
        const allProjects = await base44.entities.LongTermProject.list();
        
        // 筛选出已完成且超过2年的项目
        const oldProjects = allProjects.filter(project => {
          return project.status === 'completed' && 
                 project.completionDate && 
                 project.completionDate < twoYearsAgoStr;
        });
        
        if (oldProjects.length > 0) {
          console.log(`🎯 找到 ${oldProjects.length} 个需要清理的旧项目`);
          
          let totalQuestsDeleted = 0;
          let projectsDeleted = 0;
          
          // 删除关联的任务和项目本身
          for (const project of oldProjects) {
            try {
              // 查询并删除关联任务
              const allQuests = await base44.entities.Quest.list();
              const relatedQuests = allQuests.filter(q => q.longTermProjectId === project.id);
              
              for (const quest of relatedQuests) {
                try {
                  await base44.entities.Quest.delete(quest.id);
                  totalQuestsDeleted++;
                } catch (error) {
                  console.error(`删除关联任务失败 (ID: ${quest.id}):`, error);
                }
              }
              
              // 删除项目本身
              await base44.entities.LongTermProject.delete(project.id);
              projectsDeleted++;
              console.log(`✅ 已清理项目: ${project.projectName} (完成于: ${project.completionDate})`);
            } catch (error) {
              console.error(`清理项目失败 (${project.projectName}):`, error);
            }
          }
          
          console.log(`✅ 大项目清理完成 - 删除 ${projectsDeleted} 个项目，${totalQuestsDeleted} 个关联任务`);
          batchInvalidateQueries(['hasLongTermQuests', 'quests']);
        } else {
          console.log('✅ 没有需要清理的旧大项目');
        }
      } catch (error) {
        console.error('清理旧大项目时出错:', error);
      }
    };

    // This function contains the actual rollover steps 1-6, independent of the streak break decision
    const executeDayRolloverLogic = async (currentUser, currentTodayQuests) => {
      console.log('=== 执行日更逻辑 (步骤 1-6) ===');

      try {
        // 计算日期常量
        const sevenDaysAgoDate = new Date();
        sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
        const sevenDaysAgoStr = format(sevenDaysAgoDate, 'yyyy-MM-dd');

        const twoYearsAgo = new Date();
        twoYearsAgo.setDate(twoYearsAgo.getDate() - 730);
        const twoYearsAgoStr = format(twoYearsAgo, 'yyyy-MM-dd');

        // 🔥 核心任务：必须顺序执行，用户立即可见
        console.log('=== 开始执行核心任务 ===');

        // 步骤1: 处理明日规划任务（创建为今日任务）
        await runNextDayPlannedQuests({ 
          today, 
          batchInvalidateQueries, 
          setToast, 
          language, 
          t,
          currentUserData: currentUser
        });

        // 步骤2: 处理每日修炼任务（自动生成今日任务）
        await runRoutineQuestsGeneration({ 
          today,
          batchInvalidateQueries,
          todayQuests: currentTodayQuests,
          setToast,
          t
        });

        // 步骤3: 处理昨天未完成任务（顺延到今天）
        const yesterdayQuests = await base44.entities.Quest.filter({ date: yesterday });
        await runYesterdayQuestsRollover({ 
          yesterday, 
          today, 
          batchInvalidateQueries, 
          setToast, 
          t,
          yesterdayQuests
        });

        console.log('✅ 核心任务执行完成');

        // 🔧 核心任务完成后立即关闭加载弹窗
        setIsDayRolloverInProgress(false);

        // 🔥 清理任务：延迟执行，不阻塞用户体验
        console.log('=== 开始异步清理任务 ===');

        setTimeout(async () => {
          try {
            // 步骤4: 清理旧宝箱记录
            await cleanOldChests({ sevenDaysAgoStr });

            // 步骤5: 清理旧任务
            await cleanOldQuests({ sevenDaysAgoStr });

            // 步骤6: 清理旧大项目
            await cleanOldLongTermProjects({ 
              twoYearsAgoStr, 
              batchInvalidateQueries 
            });

            console.log('✅ 清理任务执行完成');
          } catch (error) {
            console.error('❌ 清理任务执行失败:', error);
          }
        }, 100); // 延迟100ms执行清理任务

        // ✅ 连胜更新已在步骤0统一处理，无需兜底检查

        console.log('=== 日更逻辑执行完成 ===');
        } catch (error) {
        console.error('❌ 日更逻辑执行失败:', error);
        // 发生错误时也要关闭加载状态和并发锁
        setIsDayRolloverInProgress(false);
        isRolloverRunningRef.current = false;
        }
        };


    const handleDayRollover = async (currentUser, currentTodayQuests) => {
      // 游客模式下跳过日更逻辑
      if (!currentUser) {
        console.log('游客模式，跳过日更逻辑');
        return;
      }

      // 如果正在处理连胜中断，跳过
      if (streakBreakInfo) {
        console.log('正在处理连胜中断，跳过日更逻辑');
        return;
      }

      // 🔧 【防止并发】如果日更逻辑正在执行中，直接跳过
      if (isRolloverRunningRef.current) {
        console.log('⚠️ 日更逻辑正在执行中，跳过重复调用');
        return;
      }





      // 🔧 标记开始执行
      isRolloverRunningRef.current = true;

      try {
        console.log('=== 开始执行日更逻辑 (Initial Check) ===');

        // 步骤 0A：先计算并存储前一天（前天）的完成率到 DailySummary
        console.log('=== 步骤 0A: 计算并存储前天的完成率 ===');
        const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');
        
        try {
          // 检查是否已经存储过前天的数据
          const existingSummary = await base44.entities.DailySummary.filter({ date: twoDaysAgo });
          
          if (existingSummary.length === 0) {
            console.log(`计算前天 (${twoDaysAgo}) 的完成率...`);
            const twoDaysAgoQuests = await base44.entities.Quest.filter({ date: twoDaysAgo });
            const completedCount = twoDaysAgoQuests.filter(q => q.status === 'done').length;
            const totalCount = twoDaysAgoQuests.length;
            const completionRate = totalCount === 0 ? 0 : completedCount / totalCount;
            
            await base44.entities.DailySummary.create({
              date: twoDaysAgo,
              completionRate: completionRate,
              totalQuests: totalCount,
              completedQuests: completedCount
            });
            
            console.log(`✅ 前天完成率已存储: ${(completionRate * 100).toFixed(1)}% (${completedCount}/${totalCount})`);
          } else {
            console.log('✅ 前天的完成率已存在，跳过');
          }
        } catch (error) {
          console.error('❌ 存储前天完成率失败:', error);
          // 不阻塞日更流程
        }

        // 步骤 0B：基于 DailySummary 中昨天的完成率检查连胜
        console.log('=== 步骤 0B: 基于 DailySummary 检查连胜 ===');
        const lastClearDate = currentUser?.lastClearDate;

        console.log('📅 日期信息:');
        console.log('  - today:', today);
        console.log('  - yesterday:', yesterday);
        console.log('  - lastClearDate:', lastClearDate);

        // 如果 lastClearDate >= yesterday，说明昨天的连胜已处理，跳过
        if (lastClearDate && new Date(normalizeDate(lastClearDate)).getTime() >= new Date(normalizeDate(yesterday)).getTime()) {
          console.log('✅ 昨天的连胜已处理（lastClearDate >= yesterday），跳过');
        } else {
          // 昨天不是休息日，从 DailySummary 读取完成率
          console.log('🔍 从 DailySummary 读取昨天的完成率...');
          
          let completionRate;
          try {
            const yesterdaySummary = await base44.entities.DailySummary.filter({ date: yesterday });
            
            if (yesterdaySummary.length > 0) {
              completionRate = yesterdaySummary[0].completionRate;
              console.log(`📊 从 DailySummary 读取: 昨天完成率 ${(completionRate * 100).toFixed(1)}%`);
            } else {
              // 如果 DailySummary 中没有昨天的数据，则实时计算（兜底逻辑）
              console.log('⚠️ DailySummary 中没有昨天的数据，实时计算...');
              const yesterdayQuests = await base44.entities.Quest.filter({ date: yesterday });
              const completedCount = yesterdayQuests.filter(q => q.status === 'done').length;
              const totalCount = yesterdayQuests.length;
              completionRate = totalCount === 0 ? 0 : completedCount / totalCount;
              
              // 顺便存储到 DailySummary
              await base44.entities.DailySummary.create({
                date: yesterday,
                completionRate: completionRate,
                totalQuests: totalCount,
                completedQuests: completedCount
              });
              
              console.log(`📊 实时计算完成率: ${(completionRate * 100).toFixed(1)}% (${completedCount}/${totalCount})`);
            }
          } catch (error) {
            console.error('❌ 读取/计算昨天完成率失败:', error);
            // 兜底：假设完成率为 100%，避免误判
            completionRate = 1;
          }
          
          if (completionRate === 1) {
            // 完成率 100%，连胜 +1
            console.log('✅ 昨天完成率 100%，连胜 +1');
            const newStreak = (currentUser?.streakCount || 0) + 1;
            const newLongestStreak = Math.max(newStreak, currentUser?.longestStreak || 0);
            
            await base44.auth.updateMe({
              streakCount: newStreak,
              longestStreak: newLongestStreak,
              lastClearDate: yesterday
            });
            
            batchInvalidateQueries(['user']);
            await checkAndAwardMilestone(newStreak);
            console.log(`✅ 连胜已更新为 ${newStreak} 天`);
          } else {
            // 完成率 < 100%，触发连胜中断
            console.log('❌ 昨天有未完成任务，触发连胜中断检查');
            const currentStreak = currentUser?.streakCount || 0;
            const freezeTokenCount = currentUser?.freezeTokenCount || 0;
            
            if (currentStreak > 0) {

              
              setStreakBreakInfo({
                incompleteDays: 1,
                currentStreak: currentStreak,
                freezeTokenCount: freezeTokenCount
              });
              
              console.log('弹出连胜中断对话框，暂停其他日更逻辑');
              setIsDayRolloverInProgress(false);
              return;
            } else {
              // 连胜本来就是 0，直接更新 lastClearDate
              console.log('连胜本来就是 0，更新 lastClearDate');
              await base44.auth.updateMe({ lastClearDate: yesterday });
              batchInvalidateQueries(['user']);
            }
          }
        }



        // 立即显示加载弹窗
        setIsDayRolloverInProgress(true);
        await executeDayRolloverLogic(currentUser, currentTodayQuests);

        } finally {
        // 🔧 执行完成后释放并发锁
        isRolloverRunningRef.current = false;
        console.log('✅ 日更并发锁已释放');
        }
        };

      // 🔧 只在数据加载完成后执行一次
      if (user && !isLoading && quests.length >= 0) {
        handleDayRollover(user, quests);
      }
    }, [user?.id, isLoading, quests.length]); // 当用户登录状态、加载状态或任务数量变化时触发

  // Handle use token (called from StreakBreakDialog)
  const handleUseToken = async () => {
    try {
      // 🔧 修复：使用冻结券时，将 lastClearDate 设置为昨天，表示"昨天已处理"
      // 这样刷新后就不会再次触发连胜中断检查
      await base44.auth.updateMe({
        freezeTokenCount: (user?.freezeTokenCount || 0) - 1,
        lastClearDate: yesterday  // 关键修复：标记昨天已处理
      });

      batchInvalidateQueries(['user']);
      setStreakBreakInfo(null);

      setToast(t('questboard_toast_freeze_token_used'));
      setTimeout(() => setToast(null), 3000);

      // 刷新页面以确保所有数据同步（日更逻辑会在刷新后自动执行）
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('使用冻结券失败:', error);
      alert(t('questboard_alert_use_token_failed'));
    }
  };

  // Handle break streak (called from StreakBreakDialog)
  const handleBreakStreak = async () => {
    try {
      // 🔧 添加 streakManuallyReset 标记，区分"用户主动重置"和"bug导致丢失"
      await base44.auth.updateMe({
        streakCount: 0,
        streakManuallyReset: true,
        lastClearDate: yesterday  // 标记昨天已处理，避免再次触发连胜中断检查
      });

      batchInvalidateQueries(['user']);
      setStreakBreakInfo(null);

      setToast(t('questboard_toast_streak_broken'));
      setTimeout(() => setToast(null), 3000);

      // 刷新页面以确保所有数据同步（日更逻辑会在刷新后自动执行）
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('重置连胜失败:', error);
      alert(t('questboard_alert_break_streak_failed'));
    }
  };

  const createQuestMutation = useMutation({
    mutationFn: async (questData) => {
      console.log('=== createQuestMutation 开始 ===');
      console.log('原始数据:', questData);

      // 访客模式：直接保存到 localStorage（无需加密）
      if (!user) {
        const newQuest = addGuestEntity('quests', questData);
        console.log('访客任务创建成功（localStorage）');
        return newQuest;
      }

      // 登录模式：检查是否为 routine 任务
      if (questData.isRoutine) {
        // Routine 任务不加密，直接保存
        console.log('Routine 任务，跳过加密');
        const result = await base44.entities.Quest.create(questData);
        console.log('Routine 任务创建成功');
        return result;
      }

      // 非 routine 任务：加密后保存到后端
      const { data: encrypted } = await base44.functions.invoke('encryptQuestData', {
        title: questData.title,
        actionHint: questData.actionHint
      });

      console.log('加密完成，准备创建任务');

      const result = await base44.entities.Quest.create({
        ...questData,
        title: encrypted.encryptedTitle,
        actionHint: encrypted.encryptedActionHint
      });

      console.log('任务创建成功');
      return result;
    },
    onMutate: async (newQuest) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['quests', today] });

      // Snapshot previous value
      const previousQuests = queryClient.getQueryData(['quests', today]);

      // Optimistically update
      queryClient.setQueryData(['quests', today], (old = []) => [
        ...old,
        {
          ...newQuest,
          id: `temp_${Date.now()}`,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          created_by: user?.email || 'guest'
        }
      ]);

      return { previousQuests };
    },
    onError: (err, newQuest, context) => {
      queryClient.setQueryData(['quests', today], context.previousQuests);
    },
    onSuccess: async () => {
      batchInvalidateQueries(['quests', 'user']);
    }
  });

  const updateQuestMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // 访客模式：直接更新 localStorage（无需加密）
      if (!user) {
        const updated = updateGuestEntity('quests', id, data);
        return updated;
      }

      // 登录模式：检查是否为 routine 任务
      const updateData = { ...data };

      // 如果是 routine 任务，不加密
      if (data.isRoutine) {
        console.log('更新 Routine 任务，跳过加密');
        return base44.entities.Quest.update(id, updateData);
      }

      // 非 routine 任务：加密后更新后端
      if (data.title !== undefined || data.actionHint !== undefined || data.originalActionHint !== undefined) {
        const toEncrypt = {
          title: data.title,
          actionHint: data.actionHint,
          originalActionHint: data.originalActionHint
        };

        const { data: encrypted } = await base44.functions.invoke('encryptQuestData', toEncrypt);

        if (data.title !== undefined) updateData.title = encrypted.encryptedTitle;
        if (data.actionHint !== undefined) updateData.actionHint = encrypted.encryptedActionHint;
        if (data.originalActionHint !== undefined) updateData.originalActionHint = encrypted.originalActionHint;
      }

      return base44.entities.Quest.update(id, updateData);
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['quests', today] });

      const previousQuests = queryClient.getQueryData(['quests', today]);

      queryClient.setQueryData(['quests', today], (old = []) =>
        old.map(quest => 
          quest.id === id 
            ? { ...quest, ...data, updated_date: new Date().toISOString() }
            : quest
        )
      );

      return { previousQuests };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['quests', today], context.previousQuests);
    },
    onSuccess: () => {
      batchInvalidateQueries(['quests']);
    }
  });

  const deleteQuestMutation = useMutation({
    mutationFn: (id) => {
      // 访客模式：从 localStorage 删除
      if (!user) {
        return deleteGuestEntity('quests', id);
      }

      // 登录模式：从后端删除
      return base44.entities.Quest.delete(id);
    },
    onSuccess: () => {
      batchInvalidateQueries(['quests']);
    }
  });

  const handleTextSubmit = async () => {
    if (!textInput.trim() || isProcessing) return;
    
    setIsProcessing(true);
    const loadingAudio = await playLoadingSound();
    try {
      const { data: result } = await base44.functions.invoke('callDeepSeek', {
        prompt: getTaskNamingPrompt(language, textInput.trim(), false),
        response_json_schema: {
          type: "object",
          properties: {
            title: { 
              type: "string",
              description: language === 'zh'
                ? "必须严格是【2字类型】+正好7个汉字的描述！例如：【征讨】踏破晨曦五里征途。描述必须正好7个字，不能多也不能少！绝对不能包含'任务'二字！"
                : "Must strictly follow [Category]: <5-8 Word Epic Phrase> format! Category is action type, Phrase is 5-8 words. Example: [Conquest]: Dawn March Through Five Miles. Phrase must be 5-8 words exactly! Absolutely cannot include the word 'task' or 'quest'!"
            },
            actionHint: { 
              type: "string", 
              description: language === 'zh'
                ? "用户的原始输入，完全保持原样"
                : "User's original input, keep as-is"
            },
            difficulty: { type: "string", enum: ["C", "B", "A", "S"] },
            rarity: { type: "string", enum: ["Common", "Rare", "Epic", "Legendary"] }
          },
          required: ["title", "actionHint", "difficulty", "rarity"]
        }
      });

      setPendingQuests(prev => [...prev, {
        ...result,
        tags: [],
        tempId: Date.now()
      }]);
      
      setTextInput('');
    } catch (error) {
      console.error('任务处理错误:', error);
      alert(t('questboard_alert_task_parse_failed', { message: error.message || t('common_try_again') }));
    }
    if (loadingAudio) stopSound(loadingAudio);
    setIsProcessing(false);
  };

  const handleUpdatePendingQuest = (tempId, field, value) => {
    setPendingQuests(prev => prev.map(q => 
      q.tempId === tempId ? { ...q, [field]: value } : q
    ));
  };

  const handleDeletePendingQuest = (tempId) => {
    setPendingQuests(prev => prev.filter(q => q.tempId !== tempId));
    if (expandedPending === tempId) {
      setExpandedPending(null);
    }
  };

  const playQuestAddedSound = async () => {
    await playSound('questAdded');
  };

  const playLoadingSound = async () => {
    return await playSound('loadingLoop', { loop: true });
  };

  const handleConfirmPendingQuests = async () => {
    if (pendingQuests.length === 0 || isConfirmingPending) return;
    
    setIsConfirmingPending(true);
    const loadingAudio = await playLoadingSound();
    try {
      // 访客模式：直接批量创建
      if (!user) {
        for (const quest of pendingQuests) {
          addGuestEntity('quests', {
            title: quest.title,
            actionHint: quest.actionHint,
            difficulty: quest.difficulty,
            rarity: quest.rarity,
            date: today,
            status: 'todo',
            source: 'text',
            tags: quest.tags || []
          });
        }
      } else {
        // 登录模式：批量加密后创建
        const { data: encryptedData } = await base44.functions.invoke('encryptQuestData', {
          quests: pendingQuests.map(quest => ({
            title: quest.title,
            actionHint: quest.actionHint
          }))
        });

        // 批量创建所有任务
        await Promise.all(
          pendingQuests.map(async (quest, index) => {
            const encrypted = encryptedData.encryptedQuests[index];
            await base44.entities.Quest.create({
              title: encrypted.encryptedTitle,
              actionHint: encrypted.encryptedActionHint,
              difficulty: quest.difficulty,
              rarity: quest.rarity,
              date: today,
              status: 'todo',
              source: 'text',
              tags: quest.tags || []
            });
          })
        );
      }

      batchInvalidateQueries(['quests', 'user']);
      setPendingQuests([]);
      setExpandedPending(null);
      await playQuestAddedSound();
      setToast(t('questboard_toast_quests_added_to_board', { count: pendingQuests.length }));
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error('创建任务失败:', error);
      alert(t('questboard_alert_create_quest_failed'));
    }
    if (loadingAudio) stopSound(loadingAudio);
    setIsConfirmingPending(false);
  };

  const checkAndAwardMilestone = async (newStreak) => {
    // 访客模式：禁用里程碑奖励
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
          prompt: `你是【星陨纪元冒险者工会】的宝物铸造大师。一位冒险者达成了${milestone.days}天连胜的惊人成就，获得了「${milestone.title}」称号。请为这个里程碑铸造一件独一无二的纪念战利品。

里程碑：${milestone.days}天连胜
称号：${milestone.title}
象征图标：${milestone.icon}

要求：
1. 名称：要体现"${milestone.days}天"和"连胜"的概念，并与称号呼应
2. 简介：RPG风格，强调这是只有坚持${milestone.days}天才能获得的珍贵纪念品，暗示这份毅力的价值
3. 图标：使用 ${milestone.icon} 作为基础，可以组合其他emoji

请生成：`,
          response_json_schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              flavorText: { type: "string" },
              icon: { type: "string" }
            }
          }
        });

        await base44.entities.Loot.create({
          ...lootResult,
          rarity: 'Legendary',
          obtainedAt: new Date().toISOString()
        });

        await base44.auth.updateMe({
          freezeTokenCount: (user?.freezeTokenCount || 0) + milestone.tokens,
          title: milestone.title,
          unlockedMilestones: [...unlockedMilestones, milestone.days]
        });

        setMilestoneReward({
          ...milestone,
          loot: lootResult
        });

        batchInvalidateQueries(['user', 'loot']);
        
        break;
      }
    }
  };

  const handleComplete = async (quest) => {
    console.log('=== 开始处理任务完成 ===');
    console.log('任务信息:', quest);
    
    try {
      await updateQuestMutation.mutateAsync({
        id: quest.id,
        data: { status: 'done' }
      });
      console.log('任务状态更新成功');
      
      // 播放任务完成音效
      await playSound('questCompleted');
      
      // 显示表扬弹窗
      setSelectedQuest(quest);

      batchInvalidateQueries(['quests']);
      console.log('查询缓存已刷新');

      // ✅ 连胜更新已移至 handleDayRollover 统一处理（基于完成率判断）

      // 处理大项目完成检查
      if (quest.isLongTermProject && quest.longTermProjectId) {
        setTimeout(async () => {
          try {
            const projectQuests = await base44.entities.Quest.filter({ 
              longTermProjectId: quest.longTermProjectId 
            });
            
            const allDone = projectQuests.every(q => q.status === 'done');
            
            if (allDone && projectQuests.length > 0) {
              console.log('=== 大项目所有任务已完成 ===');
              
              const project = await base44.entities.LongTermProject.filter({ 
                id: quest.longTermProjectId 
              });
              
              if (project.length > 0 && project[0].status === 'active') {
                await base44.entities.LongTermProject.update(project[0].id, {
                  status: 'completed',
                  completionDate: today
                });
                
                setCompletedProject(project[0]);
                setTimeout(() => {
                  setShowJointPraise(true);
                }, 1000);
              }
            }
          } catch (error) {
            console.error('检查大项目完成状态时出错:', error);
          }
        }, 500);
      }
      
      // 不再自动弹宝箱，改为手动开箱按钮
    } catch (error) {
      console.error('更新任务状态失败:', error);
    }
  };

  const handleReopen = async (quest) => {
    await updateQuestMutation.mutateAsync({
      id: quest.id,
      data: { status: 'todo' }
    });
    
    const messages = [
      t('questboard_reopen_toast_1'),
      t('questboard_reopen_toast_2'),
      t('questboard_reopen_toast_3'),
      t('questboard_reopen_toast_4')
    ];
    
    const message = messages[Math.floor(Math.random() * messages.length)];
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const handleEditQuestSave = async ({ actionHint, isRoutine, originalActionHint }) => {
    try {
      const contentChanged = actionHint !== editingQuest.actionHint;
      
      let newTitle = editingQuest.title;
      
      if (contentChanged) {
        const { data: result } = await base44.functions.invoke('callDeepSeek', {
          prompt: getTaskNamingPrompt(language, actionHint, true),
          response_json_schema: {
            type: "object",
            properties: {
              title: { 
                type: "string",
                description: language === 'zh'
                  ? "必须严格是【2字类型】+正好7个汉字的描述！"
                  : "Must strictly follow [Category]: <5-8 Word Epic Phrase> format! Phrase must be 5-8 words exactly!"
              }
            },
            required: ["title"]
          }
        });
        
        newTitle = result.title;
      }

      // 🔥 如果内容改变且是 routine 任务，废弃旧模板
      if (contentChanged && isRoutine && editingQuest.isRoutine && editingQuest.originalActionHint) {
        console.log('=== 检测到 routine 任务内容修改，废弃旧模板 ===');
        console.log('旧 originalActionHint:', editingQuest.originalActionHint);
        console.log('新 actionHint:', actionHint);
        
        // 只在登录模式下执行（访客模式无需处理模板）
        if (user) {
          try {
            // 找到所有旧模板的 routine 任务（现在都是明文，直接比对）
            const allRoutineQuests = await base44.entities.Quest.filter({ 
              isRoutine: true
            }, '-created_date', 200);
            
            const oldRoutineQuests = allRoutineQuests.filter((q) => {
              // Routine 任务现在是明文，直接比对 originalActionHint
              return q.originalActionHint === editingQuest.originalActionHint && q.id !== editingQuest.id;
            });
            
            console.log(`找到 ${oldRoutineQuests.length} 个旧模板任务，准备废弃`);
            
            // 将这些旧模板标记为非 routine
            for (const oldQuest of oldRoutineQuests) {
              await base44.entities.Quest.update(oldQuest.id, {
                isRoutine: false,
                originalActionHint: null
              });
              console.log(`✅ 已废弃旧模板: ${oldQuest.id}`);
            }
          } catch (error) {
            console.error('废弃旧模板失败:', error);
            // 不阻塞主流程，继续执行
          }
        }
      }

      const updateData = {
        title: newTitle,
        actionHint: actionHint,
        difficulty: editingQuest.difficulty,
        rarity: editingQuest.rarity,
        tags: editingQuest.tags || [],
        isRoutine: isRoutine,
        originalActionHint: isRoutine ? actionHint : null,
        date: editingQuest.date
      };

      await updateQuestMutation.mutateAsync({
        id: editingQuest.id,
        data: updateData
      });

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
    console.log('=== 宝箱关闭 ===');
    setShowChest(false);
    batchInvalidateQueries(['chest', 'quests']);
  };

  const handleOpenChest = async () => {
    console.log('=== 手动开启宝箱 ===');

    // 访客模式：禁用开启宝箱
    if (!user) {
      alert(language === 'zh' 
        ? '访客模式下无法开启宝箱（需要登录保存战利品）' 
        : 'Cannot open chest in guest mode (login required to save loot)');
      return;
    }

    // 确保宝箱已创建
    const chests = await base44.entities.DailyChest.filter({ date: today });
    if (chests.length === 0) {
      await base44.entities.DailyChest.create({ 
        date: today, 
        opened: false 
      });
    }

    setShowChest(true);
  };

  const handlePlanSaved = async (plannedQuests) => {
    // 访客模式：禁用规划功能
    if (!user) {
      alert(language === 'zh'
        ? '访客模式下无法规划明日任务（需要登录保存数据）'
        : 'Cannot plan tomorrow\'s quests in guest mode (login required to save data)');
      return;
    }
    
    try {
      await base44.auth.updateMe({
        nextDayPlannedQuests: plannedQuests,
        lastPlannedDate: today
      });
      
      batchInvalidateQueries(['user']);
      setToast(t('questboard_toast_plan_saved_success', { count: plannedQuests.length }));
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('保存规划失败:', error);
      alert(t('questboard_alert_save_plan_failed'));
    }
  };

  const handleOpenPlanning = () => {
    if (!user) {
      alert(language === 'zh'
        ? '游客模式下无法规划明日任务（需要登录保存数据）'
        : 'Cannot plan tomorrow\'s quests in guest mode (login required to save data)');
      return;
    }
    
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

  // 检查是否所有任务都完成
  const allQuestsDone = quests.length > 0 && quests.every(q => q.status === 'done');

  // 检查今日宝箱状态
  const { data: todayChest } = useQuery({
    queryKey: ['chest', today],
    queryFn: async () => {
      try {
        const chests = await base44.entities.DailyChest.filter({ date: today });
        return chests.length > 0 ? chests[0] : null;
      } catch (error) {
        console.error('获取宝箱失败:', error);
        return null;
      }
    },
    staleTime: 5000,
    refetchOnWindowFocus: false,
  });

  const canOpenChest = allQuestsDone && (!todayChest || !todayChest.opened);

  const difficultyColors = {
    C: '#FFE66D',
    B: '#FF6B35',
    A: '#C44569',
    S: '#000',
    R: 'linear-gradient(135deg, #FFE66D 0%, #FFA94D 100%)'
  };

  // Pull-to-refresh handlers
  const handleTouchStart = (e) => {
    if (window.scrollY === 0 && !isRefreshing) {
      setPullStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - pullStartY;
    
    if (distance > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(distance, 120));
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling || isRefreshing) return;
    
    if (pullDistance > 80) {
      setIsRefreshing(true);
      await queryClient.invalidateQueries(['quests']);
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 500);
    } else {
      setPullDistance(0);
    }
    
    setIsPulling(false);
  };

  return (
    <div 
      className="min-h-screen p-4" 
      style={{ backgroundColor: 'var(--bg-primary)' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div 
          className="fixed top-0 left-0 right-0 flex items-center justify-center transition-all duration-200"
          style={{
            height: `${pullDistance}px`,
            backgroundColor: 'var(--color-cyan)',
            opacity: pullDistance / 100,
            zIndex: 40
          }}
        >
          <Loader2 
            className={`w-8 h-8 ${isRefreshing ? 'animate-spin' : ''}`}
            strokeWidth={3}
            style={{
              transform: `rotate(${pullDistance * 3}deg)`,
              transition: isRefreshing ? 'none' : 'transform 0.1s'
            }}
          />
        </div>
      )}
      
      <div className="max-w-2xl mx-auto">
        <div 
          className="mb-6 p-4 transform -rotate-1"
          style={{
            backgroundColor: 'var(--bg-black)',
            color: 'var(--color-yellow)',
            border: '5px solid var(--color-yellow)',
            boxShadow: '8px 8px 0px var(--color-yellow)'
          }}
        >
          <h1 className="text-3xl font-black uppercase text-center">
            ⚔️ {t('questboard_title')} ⚔️
          </h1>
          <p className="text-center font-bold mt-2 text-sm">
            {language === 'zh' 
              ? format(new Date(), 'yyyy年MM月dd日')
              : format(new Date(), 'MMMM dd, yyyy')}
          </p>
        </div>



        <div 
          className="p-4 mb-6"
          style={{
            backgroundColor: 'var(--bg-warning)',
            border: '4px solid var(--border-primary)',
            boxShadow: '6px 6px 0px var(--border-primary)'
          }}
        >
          <div className="flex gap-3 mb-3">
            <Button
              onClick={() => {
                if (canOpenChest) {
                  handleOpenChest();
                } else if (todayChest?.opened) {
                  setToast(language === 'zh' ? '今天已经开过宝箱了，明天再来' : 'Chest already opened today, come back tomorrow');
                  setTimeout(() => setToast(null), 2000);
                } else {
                  setToast(language === 'zh' ? '完成今日所有委托后开启' : 'Complete all quests to unlock');
                  setTimeout(() => setToast(null), 2000);
                }
              }}
              aria-label={language === 'zh' ? '打开每日宝箱' : 'Open daily chest'}
              className="flex-shrink-0 flex items-center justify-center font-black overflow-visible"
              style={{
                width: '64px',
                height: '64px',
                backgroundColor: canOpenChest ? 'var(--color-cyan)' : '#E0E0E0',
                border: '4px solid var(--border-primary)',
                boxShadow: '5px 5px 0px var(--border-primary)',
                opacity: canOpenChest ? 1 : 0.6
              }}
            >
              <Gift className="w-16 h-16" strokeWidth={3} aria-hidden="true" style={{ color: '#FFF', width: '48px', height: '48px' }} />
            </Button>

            <Input
              type="text"
              placeholder={t('questboard_input_placeholder')}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleTextSubmit();
                }
              }}
              disabled={isProcessing}
              className="flex-1 h-16 px-4 font-bold text-lg"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '4px solid var(--border-primary)',
                boxShadow: '5px 5px 0px var(--border-primary)',
                color: 'var(--text-primary)'
              }}
            />

            <Button
              onClick={handleTextSubmit}
              disabled={isProcessing || !textInput.trim()}
              aria-label={language === 'zh' ? '添加任务' : 'Add quest'}
              className="flex-shrink-0 w-16 h-16 flex items-center justify-center font-black"
              style={{
                backgroundColor: 'var(--color-pink)',
                border: '4px solid var(--border-primary)',
                boxShadow: '5px 5px 0px var(--border-primary)',
                opacity: (!textInput.trim() || isProcessing) ? 0.5 : 1
              }}
            >
              {isProcessing ? (
                <Loader2 className="w-12 h-12 animate-spin" aria-hidden="true" style={{ color: '#FFF' }} />
              ) : (
                <Sparkles className="w-14 h-14" strokeWidth={3} aria-hidden="true" style={{ color: '#FFF', fill: 'none' }} />
              )}
            </Button>
          </div>

          <Button
            onClick={() => navigate('/long-term-project')}
            aria-label={t('questboard_longterm_btn')}
            className="w-full py-3 font-black uppercase flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#9B59B6',
              color: 'var(--text-inverse)',
              border: '4px solid var(--border-primary)',
              boxShadow: '5px 5px 0px var(--border-primary)'
            }}
          >
            <Briefcase className="w-5 h-5" strokeWidth={3} aria-hidden="true" />
            {t('questboard_longterm_btn')}
          </Button>
          
          <p className="font-bold text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
            {t('questboard_longterm_hint')}
          </p>

          {pendingQuests.length > 0 && (
            <div 
              className="mt-4 p-3"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '3px solid var(--border-primary)'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black uppercase">
                  {t('questboard_pending_quests_title', { count: pendingQuests.length })}
                </h3>
              </div>

              <div className="space-y-2 mb-3">
                {pendingQuests.map((quest) => (
                  <div 
                    key={quest.tempId}
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '3px solid var(--border-primary)'
                    }}
                  >
                    <div 
                      className="p-3 flex items-start justify-between cursor-pointer gap-3"
                      onClick={() => setExpandedPending(expandedPending === quest.tempId ? null : quest.tempId)}
                    >
                      <div className="flex-1 min-w-0 flex items-start gap-3">
                        <span 
                          className="px-2 py-1 text-sm font-black flex-shrink-0"
                          style={{
                            backgroundColor: difficultyColors[quest.difficulty],
                            color: quest.difficulty === 'S' ? 'var(--color-yellow)' : 'var(--text-primary)',
                            border: '2px solid var(--border-primary)'
                          }}
                        >
                          {quest.difficulty}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm mb-1 break-words leading-tight">{quest.title}</p>
                          <p className="font-bold text-gray-600 break-words">
                            ({quest.actionHint})
                          </p>
                        </div>
                      </div>
                      {expandedPending === quest.tempId ? (
                        <ChevronUp className="w-5 h-5 flex-shrink-0 mt-1" strokeWidth={3} />
                      ) : (
                        <ChevronDown className="w-5 h-5 flex-shrink-0 mt-1" strokeWidth={3} />
                      )}
                    </div>

                    {expandedPending === quest.tempId && (
                    <div className="px-3 pb-3 pt-0" style={{ borderTop: '2px solid var(--border-primary)' }}>
                        <div className="mb-3 mt-3">
                          <label className="block font-bold uppercase mb-2">
                            {t('questboard_pending_quest_content_label')}
                          </label>
                          <Input
                            type="text"
                            value={quest.actionHint}
                            onChange={(e) => handleUpdatePendingQuest(quest.tempId, 'actionHint', e.target.value)}
                            className="w-full px-3 py-2 font-bold text-sm"
                            style={{ 
                              border: '2px solid var(--border-primary)',
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-primary)'
                            }}
                          />
                        </div>

                        <div className="mb-3">
                          <label className="block font-bold uppercase mb-2">
                            {t('questboard_pending_quest_difficulty_label')}
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {['C', 'B', 'A', 'S'].map(level => (
                              <Button
                                key={level}
                                onClick={() => handleUpdatePendingQuest(quest.tempId, 'difficulty', level)}
                                className="py-2 font-black"
                                style={{
                                  backgroundColor: quest.difficulty === level ? difficultyColors[level] : '#F0F0F0',
                                  color: level === 'S' && quest.difficulty === level ? 'var(--color-yellow)' : 'var(--text-primary)',
                                  border: quest.difficulty === level ? '3px solid var(--border-primary)' : '2px solid var(--border-primary)'
                                }}
                              >
                                {level}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <Button
                          onClick={() => handleDeletePendingQuest(quest.tempId)}
                          className="w-full py-2 font-bold uppercase"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--color-orange)',
                            border: '2px solid var(--color-orange)'
                          }}
                        >
                          {t('questboard_pending_quest_delete_button')}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={handleConfirmPendingQuests}
                disabled={isConfirmingPending}
                className="w-full py-3 font-black uppercase flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--color-cyan)',
                  border: '4px solid var(--border-primary)',
                  boxShadow: '4px 4px 0px var(--border-primary)',
                  opacity: isConfirmingPending ? 0.5 : 1
                }}
              >
                {isConfirmingPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                    {t('common_adding')}...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" strokeWidth={3} />
                    {t('questboard_pending_quest_confirm_button', { count: pendingQuests.length })}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {(isLoadingLongTermQuests || hasAnyLongTermQuests) && (
          <div 
            className="mb-6 p-4"
            style={{
              backgroundColor: '#9B59B6',
              border: '4px solid var(--border-primary)',
              boxShadow: '6px 6px 0px var(--border-primary)'
            }}
          >
            <Button
              onClick={() => {
                if (!user) {
                  alert(language === 'zh'
                    ? '访客模式下无法查看日程表（需要登录）'
                    : 'Cannot view calendar in guest mode (login required)');
                  return;
                }
                setShowCalendarModal(true);
              }}
              disabled={isLoadingLongTermQuests || !user}
              className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3 text-white"
              style={{ opacity: (isLoadingLongTermQuests || !user) ? 0.6 : 1 }}
            >
              {isLoadingLongTermQuests ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" strokeWidth={3} />
                  {language === 'zh' ? '检查中...' : 'Checking...'}
                </>
              ) : (
                <>
                  <CalendarIcon className="w-6 h-6" strokeWidth={3} />
                  {t('questboard_calendar_btn')}
                </>
              )}
            </Button>
            <p className="text-center font-bold mt-2 text-white">
              {t('questboard_calendar_hint')}
            </p>
          </div>
        )}

        {/* 规划明日委托按钮 */}
        {user && (nextDayPlannedCount > 0 || canShowPlanningButton) && (
          <div 
            className="mb-6 p-4"
            style={{
              backgroundColor: 'var(--color-pink)',
              border: '4px solid var(--border-primary)',
              boxShadow: '6px 6px 0px var(--border-primary)'
            }}
          >
            {nextDayPlannedCount > 0 && (
              <Button
                onClick={handleOpenPlanning}
                className="w-full py-3 font-black uppercase flex items-center justify-center gap-2 mb-3"
                style={{
                  backgroundColor: '#FFE66D',
                  border: '3px solid #000',
                  boxShadow: '4px 4px 0px #000'
                }}
              >
                <CalendarIcon className="w-5 h-5" strokeWidth={3} />
                {t('questboard_planned_quests')} {nextDayPlannedCount} {t('common_items')}{language === 'zh' ? '委托' : ' quests'}
              </Button>
            )}

            {canShowPlanningButton && (
              <Button
                onClick={handleOpenPlanning}
                className="w-full py-3 font-black uppercase flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#FFE66D',
                  border: '3px solid #000',
                  boxShadow: '4px 4px 0px #000'
                }}
              >
                <CalendarIcon className="w-5 h-5" strokeWidth={3} />
                {t('questboard_plan_tomorrow')}
              </Button>
            )}

            {!canShowPlanningButton && nextDayPlannedCount === 0 && user?.lastPlannedDate !== today && (
              <p className="text-center font-bold text-white mt-2">
                💡 {language === 'zh' 
                  ? '晚上9点后可规划明日任务（或完成今日所有任务后自动弹出）' 
                  : 'Plan tomorrow\'s quests after 9 PM (or automatically after completing all today\'s quests)'}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 mb-4">
          {['all', 'todo', 'done'].map(f => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 py-2 font-black uppercase"
              style={{
                backgroundColor: filter === f ? 'var(--color-cyan)' : 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '3px solid var(--border-primary)',
                boxShadow: filter === f ? '4px 4px 0px var(--border-primary)' : '2px 2px 0px var(--border-primary)',
                transform: filter === f ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              <Filter className="w-4 h-4 inline mr-1" strokeWidth={3} />
              {t(`questboard_filter_${f}`)}
            </Button>
          ))}
        </div>



        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin" strokeWidth={4} />
          </div>
        ) : filteredQuests.length === 0 ? (
          <div 
            className="p-8 text-center"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '4px solid var(--border-primary)',
              boxShadow: '6px 6px 0px var(--border-primary)'
            }}
          >
            <p className="text-2xl font-black uppercase mb-2" style={{ color: 'var(--text-primary)' }}>{t('questboard_no_quests')}</p>
            <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>{t('questboard_no_quests_hint')}</p>
          </div>
        ) : (
          <div>
            {filteredQuests.map(quest => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onComplete={handleComplete}
                onEdit={(q) => setEditingQuest(q)}
                onDelete={(id) => deleteQuestMutation.mutate(id)}
                onReopen={handleReopen}
              />
            ))}
          </div>
        )}



        {selectedQuest && (
          <PraiseDialog
            quest={selectedQuest}
            onClose={() => setSelectedQuest(null)}
            onAddNote={() => {
              alert(t('questboard_alert_review_notes_wip'));
            }}
          />
        )}

        {showChest && (
          <ChestOpening
            date={today}
            onClose={handleChestClose}
            onLootGenerated={() => {
              batchInvalidateQueries(['loot']);
            }}
          />
        )}

        {editingQuest && (
          <QuestEditFormModal
            quest={editingQuest}
            onSave={handleEditQuestSave}
            onClose={() => setEditingQuest(null)}
          />
        )}

        {showPlanningDialog && user && (
          <EndOfDaySummaryAndPlanning
            showCelebration={showCelebrationInPlanning}
            currentStreak={user?.streakCount || 0}
            fromChestOpen={fromChestOpen}
            onClose={() => {
              setShowPlanningDialog(false);
              setShowCelebrationInPlanning(false);
              setFromChestOpen(false);
            }}
            onPlanSaved={handlePlanSaved}
          />
        )}

        {showJointPraise && completedProject && (
          <JointPraiseDialog
            project={completedProject}
            onClose={() => {
              setShowJointPraise(false);
              setCompletedProject(null);
            }}
          />
        )}



        {/* Calendar Modal */}
        <CalendarModal
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
        />

        {milestoneReward && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
          >
            <div 
              className="relative max-w-lg w-full p-8 transform"
              style={{
                backgroundColor: '#FFE66D',
                border: '6px solid #000',
                boxShadow: '15px 15px 0px #000'
              }}
            >
              <div className="text-center">
                <div className="text-7xl mb-4 animate-bounce">{milestoneReward.icon}</div>
                
                <h2 
                  className="text-3xl font-black uppercase mb-3"
                  style={{ color: '#000' }}
                >
                  🎊 {t('milestone_reached')} 🎊
                </h2>

                <div 
                  className="mb-6 p-4"
                  style={{
                    backgroundColor: '#FFF',
                    border: '4px solid #000'
                  }}
                >
                  <p className="text-2xl font-black mb-3">{milestoneReward.days}{t('milestone_days_streak')}</p>
                  <p className="text-xl font-black uppercase mb-3" style={{ color: '#C44569' }}>
                    「{milestoneReward.title}」
                  </p>
                  <p className="font-bold text-sm leading-relaxed mb-4">
                    {t('milestone_congrats', { days: milestoneReward.days })}
                  </p>
                  
                  <div className="space-y-3">
                    <div 
                      className="p-3"
                      style={{
                        backgroundColor: '#4ECDC4',
                        border: '3px solid #000'
                      }}
                    >
                      <p className="font-black">{t('milestone_freeze_token_label')} +{milestoneReward.tokens}</p>
                    </div>
                    
                    <div 
                      className="p-3"
                      style={{
                        backgroundColor: '#FF6B35',
                        border: '3px solid #000'
                      }}
                    >
                      <p className="font-black text-white">🏅 {milestoneReward.title} {t('milestone_title_badge_label')}</p>
                    </div>

                    <div 
                      className="p-3 text-left"
                      style={{
                        backgroundColor: '#C44569',
                        border: '3px solid #000'
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{milestoneReward.loot.icon}</span>
                        <p className="font-black text-white">{milestoneReward.loot.name}</p>
                      </div>
                      <p className="font-bold text-sm text-white leading-relaxed">
                        {milestoneReward.loot.flavorText}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setMilestoneReward(null)}
                  className="w-full py-4 font-black uppercase text-xl"
                  style={{
                    backgroundColor: '#000',
                    color: '#FFE66D',
                    border: '5px solid #FFE66D',
                    boxShadow: '6px 6px 0px #FFE66D'
                  }}
                >
                  {t('milestone_claim_button')}
                </Button>
              </div>
            </div>
          </div>
        )}


      </div>

      {streakBreakInfo && (
        <StreakBreakDialog
          incompleteDays={streakBreakInfo.incompleteDays}
          currentStreak={streakBreakInfo.currentStreak}
          freezeTokenCount={streakBreakInfo.freezeTokenCount}
          onUseToken={handleUseToken}
          onBreakStreak={handleBreakStreak}
          onClose={() => setStreakBreakInfo(null)}
        />
      )}

      {/* 🔧 日更加载弹窗 - 页面加载时最先显示，日更逻辑完成后关闭 */}
      {isDayRolloverInProgress && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 9999
          }}
        >
          <div 
            className="relative max-w-md w-full p-8 transform"
            style={{
              backgroundColor: '#FFE66D',
              border: '5px solid #000',
              boxShadow: '12px 12px 0px #000'
            }}
          >
            <div className="text-center">
              <Loader2 
                className="w-16 h-16 mx-auto mb-4 animate-spin" 
                strokeWidth={4}
                style={{ color: '#000' }}
              />

              <h2 
                className="text-2xl font-black uppercase mb-2"
                style={{ color: '#000' }}
              >
                {language === 'zh' ? '⚙️ 工会同步中 ⚙️' : '⚙️ Guild Syncing ⚙️'}
              </h2>

              <p 
                className="text-base font-black mb-4"
                style={{ color: '#C44569' }}
              >
                💡 {getCurrentLoadingMessage()}
              </p>

              <div 
                className="p-4"
                style={{
                  backgroundColor: '#FFF',
                  border: '3px solid #000'
                }}
              >
                <p className="font-bold leading-relaxed">
                  {language === 'zh'
                    ? '正在加载今日委托和规划任务，请稍候片刻...'
                    : 'Loading today\'s quests and planned tasks, please wait...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div 
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 animate-fade-in-out"
          style={{
            backgroundColor: '#4ECDC4',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000',
            maxWidth: '90%'
          }}
        >
          <p className="font-black text-center">{toast}</p>
        </div>
      )}

      <style>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translate(-50%, -10px); }
          10%, 90% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -10px); }
        }
        .animate-fade-in-out {
          animation: fade-in-out 2s ease-in-out;
        }
      `}</style>
    </div>
  );
}