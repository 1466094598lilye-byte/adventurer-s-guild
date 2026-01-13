import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Filter, Loader2, Sparkles, Coffee, Briefcase, ChevronDown, ChevronUp, Check, Plus, Calendar as CalendarIcon, Gift } from 'lucide-react';
import QuestCard from '../components/quest/QuestCard';
import PraiseDialog from '../components/quest/PraiseDialog';
import ChestOpening from '../components/treasure/ChestOpening';
import QuestEditFormModal from '../components/quest/QuestEditFormModal';
import EndOfDaySummaryAndPlanning from '../components/quest/EndOfDaySummaryAndPlanning';
import LongTermProjectDialog from '../components/quest/LongTermProjectDialog';
import LongTermCalendar from '../components/quest/LongTermCalendar';
import JointPraiseDialog from '../components/quest/JointPraiseDialog';
import StreakBreakDialog from '../components/streak/StreakBreakDialog';
import BootstrapModeDialog from '../components/quest/BootstrapModeDialog';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/components/LanguageContext';
import { getTaskNamingPrompt, getBootstrapModePrompt } from '@/components/prompts';
import { getGuestData, setGuestData, addGuestEntity, updateGuestEntity, deleteGuestEntity } from '@/components/utils/guestData';

export default function QuestBoard() {
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
  const [showRestDayDialog, setShowRestDayDialog] = useState(false);
  const [showPlanningDialog, setShowPlanningDialog] = useState(false);
  const [showCelebrationInPlanning, setShowCelebrationInPlanning] = useState(false);
  const [showLongTermDialog, setShowLongTermDialog] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isConfirmingPending, setIsConfirmingPending] = useState(false);
  const [showJointPraise, setShowJointPraise] = useState(false);
  const [completedProject, setCompletedProject] = useState(null);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [streakBreakInfo, setStreakBreakInfo] = useState(null);
  const [isDayRolloverInProgress, setIsDayRolloverInProgress] = useState(false);
  const [isGeneratingDeepRest, setIsGeneratingDeepRest] = useState(false);
  const [showDeepRestDialog, setShowDeepRestDialog] = useState(false);
  const [deepRestTasks, setDeepRestTasks] = useState([]);
  const [isAddingDeepRest, setIsAddingDeepRest] = useState(false);
  const [fromChestOpen, setFromChestOpen] = useState(false);
  const queryClient = useQueryClient();
  const { language, t } = useLanguage();

  // 🔧 防止并发执行的 ref
  const isRolloverRunningRef = useRef(false);
  
  // 检查 localStorage 是否今天已完成日更
  const getRolloverKey = (userId) => `dayRollover_${userId}_${today}`;
  const hasCompletedRolloverToday = (userId) => {
    try {
      return localStorage.getItem(getRolloverKey(userId)) === 'done';
    } catch {
      return false;
    }
  };
  const markRolloverComplete = (userId) => {
    try {
      localStorage.setItem(getRolloverKey(userId), 'done');
    } catch {}
  };
  const invalidationTimeoutRef = useRef(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

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
    staleTime: 0,
    cacheTime: 0,
    queryFn: async () => {
      // 访客模式：从 localStorage 读取
      if (!user) {
        const guestQuests = getGuestData('quests');
        const todayQuests = guestQuests.filter(q => q.date === today);
        
        // 删除过期的启动模式任务
        const now = new Date().getTime();
        const validQuests = todayQuests.filter(q => {
          if (q.source === 'bootstrap' && q.expiresAt && q.status === 'todo') {
            return new Date(q.expiresAt).getTime() > now;
          }
          return true;
        });
        
        // 如果有任务被删除，更新localStorage
        if (validQuests.length < todayQuests.length) {
          const allQuests = guestQuests.filter(q => q.date !== today).concat(validQuests);
          setGuestData('quests', allQuests);
        }
        
        return validQuests;
      }

      // 登录模式：从后端读取并解密
      try {
        const allQuests = await base44.entities.Quest.filter({ date: today }, '-created_date');

        // 删除过期的启动模式任务
        const now = new Date().getTime();
        const expiredQuests = allQuests.filter(q => 
          q.source === 'bootstrap' && q.expiresAt && q.status === 'todo' && new Date(q.expiresAt).getTime() <= now
        );

        if (expiredQuests.length > 0) {
          await Promise.all(expiredQuests.map(q => base44.entities.Quest.delete(q.id)));
        }

        const validQuests = allQuests.filter(q => !expiredQuests.find(eq => eq.id === q.id));

        // 🔥 分离 routine（明文）和非 routine（需解密）任务
        const routineQuests = validQuests.filter(q => q.isRoutine);
        const nonRoutineQuests = validQuests.filter(q => !q.isRoutine);

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
     * @param {string} params.yesterday - 昨天的日期 (YYYY-MM-DD)
     * @param {Function} params.batchInvalidateQueries - 批量刷新查询的函数
     * @param {Array} params.todayQuests - 今日已有的任务列表
     * @param {Function} params.setToast - 设置 Toast 提示的函数
     * @param {Function} params.t - 翻译函数
     * @returns {Promise<Object>} 返回操作统计 { updated: number, deleted: number, created: number }
     */
    const runRoutineQuestsGeneration = async ({ today, yesterday, batchInvalidateQueries, todayQuests, setToast, t }) => {
      console.log('=== 步骤5: 开始处理每日修炼任务 ===');

      // 初始化操作计数器
      let updatedCount = 0;
      let deletedCount = 0;
      let createdCount = 0;

      try {
        // ========================================
        // 步骤 5.1: 获取昨天的例行任务模板
        // ========================================
        console.log('步骤 5.1: 获取昨天的例行任务模板（已明文存储）...');

        // 只获取昨天标记为 isRoutine: true 的任务作为模板（避免历史乱码任务加载）
        const allRoutineTemplates = await base44.entities.Quest.filter({ 
          isRoutine: true,
          date: yesterday
        }, '-created_date', 100);
        console.log(`从昨天找到 ${allRoutineTemplates.length} 个例行任务模板`);

        // Routine 任务现在以明文存储，不需要解密
        // 直接构建活跃模板 Map: originalActionHint -> 最新的模板
        const activeTemplatesMap = new Map();
        for (const template of allRoutineTemplates) {
          // 使用 originalActionHint 作为唯一标识（如果没有则用 actionHint）
          const templateKey = template.originalActionHint || template.actionHint;

          // 跳过空的模板
          if (!templateKey) {
            console.warn(`跳过无效模板 (ID: ${template.id})`);
            continue;
          }

          // 如果该键已存在，比较创建时间，保留最新的
          if (!activeTemplatesMap.has(templateKey) || 
              new Date(template.created_date) > new Date(activeTemplatesMap.get(templateKey).created_date)) {
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
          const alreadyExists = refreshedTodayQuests.some(
            q => q.isRoutine && (q.originalActionHint === actionHintPlain || q.actionHint === actionHintPlain)
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

            // 🔥 并行创建任务（Routine 任务不加密）
            await Promise.all(
              toCreate.map(async ({ actionHintPlain, templateQuest }, index) => {
                const result = llmResults[index];
                if (!result) return;

                try {
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
              })
            );

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
          yesterday,
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

        // 🔧 标记日更完成（服务端 + 本地）
        await base44.auth.updateMe({
          lastRolloverCompletedDate: today
        });
        markRolloverComplete(currentUser.id);
        console.log('✅ 日更完成标记已保存（服务端 + 本地）');

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

      // 🔥 【跨设备防重复】检查服务端标记，如果今天已完成就跳过
      if (currentUser.lastRolloverCompletedDate === today) {
        console.log('✅ 服务端标记显示今日日更已完成（可能在其他设备），跳过');
        return;
      }

      // 🔥 【本地防重复】检查 localStorage，如果今天已完成就跳过
      if (hasCompletedRolloverToday(currentUser.id)) {
        console.log('✅ 本地标记显示今日日更已完成，跳过');
        return;
      }

      // 🔧 标记开始执行
      isRolloverRunningRef.current = true;

      console.log('=== 开始执行日更逻辑 (Initial Check) ===');

      // 步骤 0：检查昨天是否有未完成任务，处理连胜中断
      console.log('=== 步骤 0: 检查连胜中断 ===');
      const restDays = currentUser?.restDays || [];
      const lastClearDate = currentUser?.lastClearDate;

      console.log('今天日期:', today);
      console.log('昨天日期:', yesterday);
      console.log('上次完成日期:', lastClearDate);
      console.log('昨天是否为休息日:', restDays.includes(yesterday));

      // 只有在昨天不是休息日 AND 上次完成日期不是昨天 AND 今天也没完成时才检查
      const shouldCheckForStreakBreak = !restDays.includes(yesterday) && lastClearDate !== yesterday && lastClearDate !== today;

      if (shouldCheckForStreakBreak) {
        console.log('昨天不是休息日，且上次完成日期不是昨天或今天');

        const yesterdayQuests = await base44.entities.Quest.filter({ date: yesterday });
        console.log('昨天的任务数量:', yesterdayQuests.length);

        if (yesterdayQuests.length > 0) {
          const allDoneYesterday = yesterdayQuests.every(q => q.status === 'done');
          console.log('昨天任务是否全部完成:', allDoneYesterday);

          if (!allDoneYesterday) {
            console.log('昨天有未完成任务，需要处理连胜中断');
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
              console.log('当前没有连胜（为0），无需触发连胜中断对话框');
            }
          } else {
            console.log('昨天所有任务都完成了，更新连胜数据');

            // 🔥 昨天任务全部完成，更新连胜
            let newStreak = 1;
            const lastClearDate = currentUser?.lastClearDate;
            const restDays = currentUser?.restDays || [];

            if (lastClearDate) {
              // 从前天开始往回找第一个工作日
              let checkDate = new Date();
              checkDate.setDate(checkDate.getDate() - 2); // 前天

              let daysBack = 0;
              let foundLastWorkDay = false;

              while (daysBack < 365 && !foundLastWorkDay) {
                const checkDateStr = format(checkDate, 'yyyy-MM-dd');

                if (!restDays.includes(checkDateStr)) {
                  if (checkDateStr === lastClearDate) {
                    newStreak = (currentUser?.streakCount || 0) + 1;
                    console.log('连续完成（跳过了休息日），连胜 +1，新连胜:', newStreak);
                  } else {
                    console.log('之前有中断，连胜重置为1');
                    newStreak = 1;
                  }
                  foundLastWorkDay = true;
                }

                daysBack++;
                checkDate.setDate(checkDate.getDate() - 1);
              }

              if (!foundLastWorkDay) {
                console.log('未找到上一个工作日，连胜设为1');
                newStreak = 1;
              }
            } else {
              console.log('第一次完成所有任务，连胜设为1');
              newStreak = 1;
            }

            const newLongestStreak = Math.max(newStreak, currentUser?.longestStreak || 0);
            console.log('新的最长连胜:', newLongestStreak);

            await base44.auth.updateMe({
              streakCount: newStreak,
              longestStreak: newLongestStreak,
              lastClearDate: yesterday
            });
            console.log('用户连胜数据已更新');

            batchInvalidateQueries(['user']);
            await checkAndAwardMilestone(newStreak);
          }
        } else {
          console.log('昨天没有任务');
        }
      } else {
        console.log('昨天是休息日或已完成所有任务，无需检查连胜中断');
      }

      // 立即显示加载弹窗
      setIsDayRolloverInProgress(true);
      await executeDayRolloverLogic(currentUser, currentTodayQuests);

      // 🔧 执行完成后释放并发锁
      isRolloverRunningRef.current = false;
      };

      // 🔧 无论是否有用户都执行（游客模式下会快速返回并关闭加载状态）
      if (user && quests) {
      handleDayRollover(user, quests);
      }
      }, [user]); // Only depend on user to prevent double execution

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
    onSuccess: async () => {
      batchInvalidateQueries(['quests', 'user']);

      // 只有登录用户才处理休息日取消逻辑
      if (user) {
        const currentUser = await base44.auth.me();
        const restDays = currentUser?.restDays || [];
        if (restDays.includes(today)) {
          await base44.auth.updateMe({
            restDays: restDays.filter(d => d !== today)
          });
          setToast(t('questboard_toast_quest_added_rest_canceled'));
          setTimeout(() => setToast(null), 2000);
        }
      }
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
    const loadingAudio = playLoadingSound();
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
    loadingAudio.pause();
    loadingAudio.currentTime = 0;
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

  const playQuestAddedSound = () => {
    const audio = new Audio('https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%8A%A0%E5%85%A5%E5%A7%94%E6%89%98%E6%9D%BF.mp3');
    audio.play().catch(() => {});
  };

  const playLoadingSound = () => {
    const audio = new Audio('https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%8A%A0%E8%BD%BD%E6%97%B6%E6%92%AD%E6%94%BE.mp3');
    audio.loop = true;
    audio.play().catch(() => {});
    return audio;
  };

  const handleConfirmPendingQuests = async () => {
    if (pendingQuests.length === 0 || isConfirmingPending) return;
    
    setIsConfirmingPending(true);
    const loadingAudio = playLoadingSound();
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
      playQuestAddedSound();
      setToast(t('questboard_toast_quests_added_to_board', { count: pendingQuests.length }));
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error('创建任务失败:', error);
      alert(t('questboard_alert_create_quest_failed'));
    }
    loadingAudio.pause();
    loadingAudio.currentTime = 0;
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
      
      setSelectedQuest(quest);

      batchInvalidateQueries(['quests']);
      console.log('查询缓存已刷新');

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

  const handleToggleRestDay = async () => {
    // 游客模式下不允许设置休息日（因为需要保存到 user 数据）
    if (!user) {
      alert(language === 'zh' 
        ? '游客模式下无法设置休息日（需要登录保存数据）' 
        : 'Cannot set rest day in guest mode (login required to save data)');
      return;
    }

    if (quests.length > 0 && !isRestDay) {
      alert(t('questboard_alert_cannot_set_rest_day_with_quests'));
      return;
    }
    
    try {
      const restDays = user?.restDays || [];
      const isRestDayCurrently = restDays.includes(today);
      
      if (isRestDayCurrently) {
        await base44.auth.updateMe({
          restDays: restDays.filter(d => d !== today)
        });
        setToast(t('questboard_toast_rest_canceled_success'));
      } else {
        await base44.auth.updateMe({
          restDays: [...restDays, today]
        });
        setToast(t('questboard_toast_rest_set_success'));
      }
      
      batchInvalidateQueries(['user']);
      setShowRestDayDialog(false);
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error('设置休息日失败:', error);
      alert(language === 'zh'
        ? '操作失败，请重试'
        : 'Operation failed, please try again');
      setShowRestDayDialog(false);
    }
  };

  const handleChestClose = async () => {
    console.log('=== 宝箱关闭 ===');
    setShowChest(false);
    batchInvalidateQueries(['chest', 'quests']);
    
    // 宝箱关闭后，总是弹出规划弹窗（带表扬信）
    if (user) {
      console.log('=== 触发规划明日委托弹窗（带表扬信）===');
      setFromChestOpen(true);
      setShowCelebrationInPlanning(true);
      setShowPlanningDialog(true);
    }
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

  const handleLongTermQuestsCreated = (count) => {
    batchInvalidateQueries(['quests', 'hasLongTermQuests']);
    setToast(t('questboard_toast_longterm_quests_added_success', { count: count }));
    setTimeout(() => setToast(null), 3000);
  };

  const handleCalendarUpdate = () => {
    batchInvalidateQueries(['quests', 'hasLongTermQuests']);
    queryClient.refetchQueries({ queryKey: ['hasLongTermQuests'] });
  };

  const handleDeepRestChallenge = async () => {
    if (isGeneratingDeepRest) return;
    
    setIsGeneratingDeepRest(true);
    const loadingAudio = playLoadingSound();
    
    try {
      const { data: result } = await base44.functions.invoke('callDeepSeek', {
        prompt: getBootstrapModePrompt(language),
        response_json_schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: language === 'zh'
                      ? "必须是【休息】+正好7个汉字！例如：【休息】慢慢伸展放松身心"
                      : "Must be [Rest]: <5-8 Word Simple Phrase>! Example: [Rest]: Slowly Stretch And Relax Body"
                  },
                  actionHint: {
                    type: "string",
                    description: language === 'zh'
                      ? "用简单的语言描述这个蓄力动作"
                      : "Describe this recharge action in simple language"
                  }
                },
                required: ["title", "actionHint"]
              },
              minItems: 3,
              maxItems: 3
            }
          },
          required: ["tasks"]
        }
      });

      // 添加临时ID并显示弹窗
      const tasksWithIds = result.tasks.map((task, index) => ({
        ...task,
        tempId: `deeprest_${Date.now()}_${index}`
      }));
      
      setDeepRestTasks(tasksWithIds);
      setShowDeepRestDialog(true);
    } catch (error) {
      console.error('生成深度休息任务失败:', error);
      alert(language === 'zh'
        ? '生成失败，请重试'
        : 'Generation failed, please try again');
    }
    
    loadingAudio.pause();
    loadingAudio.currentTime = 0;
    setIsGeneratingDeepRest(false);
  };

  const handleConfirmDeepRestTasks = async (selectedTaskIds) => {
    setIsAddingDeepRest(true);
    const loadingAudio = playLoadingSound();
    
    try {
      const selectedTasks = deepRestTasks.filter(t => selectedTaskIds.includes(t.tempId));
      
      for (const task of selectedTasks) {
        await createQuestMutation.mutateAsync({
          title: task.title,
          actionHint: task.actionHint,
          difficulty: 'R',
          rarity: 'Common',
          date: today,
          status: 'todo',
          source: 'deeprest',
          tags: ['深度休息']
        });
      }

      playQuestAddedSound();
      setToast(language === 'zh' 
        ? `✨ 已添加 ${selectedTasks.length} 个深度休息任务！` 
        : `✨ Added ${selectedTasks.length} deep rest tasks!`);
      setTimeout(() => setToast(null), 2000);
      
      setShowDeepRestDialog(false);
      setDeepRestTasks([]);
    } catch (error) {
      console.error('添加深度休息任务失败:', error);
      alert(language === 'zh'
        ? '添加失败，请重试'
        : 'Failed to add tasks, please try again');
    }
    
    loadingAudio.pause();
    loadingAudio.currentTime = 0;
    setIsAddingDeepRest(false);
  };

  const filteredQuests = quests.filter(quest => {
    if (filter === 'all') return true;
    if (filter === 'done') return quest.status === 'done';
    if (filter === 'todo') return quest.status === 'todo';
    return true;
  });

  const isRestDay = user ? (user?.restDays || []).includes(today) : false;
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

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-2xl mx-auto">
        <div 
          className="mb-6 p-4 transform -rotate-1"
          style={{
            backgroundColor: '#000',
            color: '#FFE66D',
            border: '5px solid #FFE66D',
            boxShadow: '8px 8px 0px #FFE66D'
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

        {isRestDay && (
          <div 
            className="mb-6 p-4"
            style={{
              backgroundColor: '#4ECDC4',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <Coffee className="w-6 h-6" strokeWidth={3} />
              <p className="font-black uppercase">{t('questboard_rest_day')}</p>
            </div>
            <p className="text-center text-sm font-bold mt-2">
              {t('questboard_rest_day_hint')}
            </p>
          </div>
        )}

        <div 
          className="p-4 mb-6"
          style={{
            backgroundColor: '#FFE66D',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
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
              className="flex-shrink-0 w-16 h-16 flex items-center justify-center font-black"
              style={{
                backgroundColor: canOpenChest ? '#4ECDC4' : '#E0E0E0',
                border: '4px solid #000',
                boxShadow: '5px 5px 0px #000',
                opacity: canOpenChest ? 1 : 0.6
              }}
            >
              <Gift className="w-14 h-14" strokeWidth={3} style={{ color: '#FFF' }} />
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
                backgroundColor: '#FFF',
                border: '4px solid #000',
                boxShadow: '5px 5px 0px #000'
              }}
            />

            <Button
              onClick={handleTextSubmit}
              disabled={isProcessing || !textInput.trim()}
              className="flex-shrink-0 w-16 h-16 flex items-center justify-center font-black"
              style={{
                backgroundColor: '#C44569',
                border: '4px solid #000',
                boxShadow: '5px 5px 0px #000',
                opacity: (!textInput.trim() || isProcessing) ? 0.5 : 1
              }}
            >
              {isProcessing ? (
                <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#FFF' }} />
              ) : (
                <Sparkles className="w-14 h-14" strokeWidth={3} style={{ color: '#FFF', fill: 'none' }} />
              )}
            </Button>
          </div>

          <Button
            onClick={() => {
              setShowLongTermDialog(true);
            }}
            className="w-full py-3 font-black uppercase text-sm flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#9B59B6',
              color: '#FFF',
              border: '4px solid #000',
              boxShadow: '5px 5px 0px #000'
            }}
          >
            <Briefcase className="w-5 h-5" strokeWidth={3} />
            {t('questboard_longterm_btn')}
          </Button>
          
          <p className="text-xs font-bold text-center mt-2" style={{ color: '#666' }}>
            {t('questboard_longterm_hint')}
          </p>

          {pendingQuests.length > 0 && (
            <div 
              className="mt-4 p-3"
              style={{
                backgroundColor: '#FFF',
                border: '3px solid #000'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black uppercase text-sm">
                  {t('questboard_pending_quests_title', { count: pendingQuests.length })}
                </h3>
              </div>

              <div className="space-y-2 mb-3">
                {pendingQuests.map((quest) => (
                  <div 
                    key={quest.tempId}
                    style={{
                      backgroundColor: '#F9FAFB',
                      border: '3px solid #000'
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
                            color: quest.difficulty === 'S' ? '#FFE66D' : '#000',
                            border: '2px solid #000'
                          }}
                        >
                          {quest.difficulty}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm mb-1 break-words leading-tight">{quest.title}</p>
                          <p className="text-xs font-bold text-gray-600 break-words">
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
                      <div className="px-3 pb-3 pt-0" style={{ borderTop: '2px solid #000' }}>
                        <div className="mb-3 mt-3">
                          <label className="block text-xs font-bold uppercase mb-2">
                            {t('questboard_pending_quest_content_label')}
                          </label>
                          <Input
                            type="text"
                            value={quest.actionHint}
                            onChange={(e) => handleUpdatePendingQuest(quest.tempId, 'actionHint', e.target.value)}
                            className="w-full px-3 py-2 font-bold text-sm"
                            style={{ border: '2px solid #000' }}
                          />
                        </div>

                        <div className="mb-3">
                          <label className="block text-xs font-bold uppercase mb-2">
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
                                  color: level === 'S' && quest.difficulty === level ? '#FFE66D' : '#000',
                                  border: quest.difficulty === level ? '3px solid #000' : '2px solid #000'
                                }}
                              >
                                {level}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <Button
                          onClick={() => handleDeletePendingQuest(quest.tempId)}
                          className="w-full py-2 font-bold uppercase text-sm"
                          style={{
                            backgroundColor: '#FFF',
                            color: '#FF6B35',
                            border: '2px solid #FF6B35'
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
                className="w-full py-3 font-black uppercase text-sm flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#4ECDC4',
                  border: '4px solid #000',
                  boxShadow: '4px 4px 0px #000',
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
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
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
                setShowCalendar(true);
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
            <p className="text-center text-xs font-bold mt-2 text-white">
              {t('questboard_calendar_hint')}
            </p>
          </div>
        )}

        {/* 规划明日委托按钮 */}
        {user && (nextDayPlannedCount > 0 || canShowPlanningButton) && (
          <div 
            className="mb-6 p-4"
            style={{
              backgroundColor: '#C44569',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
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
              <p className="text-center text-xs font-bold text-white mt-2">
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
              className="flex-1 py-2 font-black uppercase text-sm"
              style={{
                backgroundColor: filter === f ? '#4ECDC4' : '#FFF',
                color: '#000',
                border: '3px solid #000',
                boxShadow: filter === f ? '4px 4px 0px #000' : '2px 2px 0px #000',
                transform: filter === f ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              <Filter className="w-4 h-4 inline mr-1" strokeWidth={3} />
              {t(`questboard_filter_${f}`)}
            </Button>
          ))}
        </div>

        <div className="mb-6">
          <Button
            onClick={handleDeepRestChallenge}
            disabled={isGeneratingDeepRest}
            className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3"
            style={{
              backgroundColor: '#FFE66D',
              color: '#000',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000',
              background: isGeneratingDeepRest 
                ? '#E0E0E0' 
                : 'linear-gradient(135deg, #FFE66D 0%, #FFA94D 100%)',
              opacity: isGeneratingDeepRest ? 0.7 : 1
            }}
          >
            {isGeneratingDeepRest ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" strokeWidth={3} />
                {language === 'zh' ? '正在生成深度休息任务...' : 'Generating deep rest tasks...'}
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" strokeWidth={3} />
                {language === 'zh' ? '🧘 深度休息挑战' : '🧘 Deep Rest Challenge'}
              </>
            )}
          </Button>
          <p className="text-xs font-bold text-center mt-2" style={{ color: '#666' }}>
            {language === 'zh' 
              ? '💡 生成低刺激任务，回收精神能量，真正有效的休息' 
              : '💡 Generate low-stimulation tasks to recharge mental energy'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin" strokeWidth={4} />
          </div>
        ) : filteredQuests.length === 0 ? (
          <div 
            className="p-8 text-center"
            style={{
              backgroundColor: '#FFF',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            <p className="text-2xl font-black uppercase mb-2">{t('questboard_no_quests')}</p>
            <p className="font-bold text-gray-600">{t('questboard_no_quests_hint')}</p>
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

        <div className="mt-6">
          <Button
            onClick={() => setShowRestDayDialog(true)}
            disabled={!user || (quests.length > 0 && !isRestDay)}
            className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3"
            style={{
              backgroundColor: isRestDay ? '#FF6B35' : '#4ECDC4',
              color: isRestDay ? '#FFF' : '#000',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000',
              opacity: (!user || (quests.length > 0 && !isRestDay)) ? 0.5 : 1
            }}
          >
            <Coffee className="w-6 h-6" strokeWidth={3} />
            {isRestDay ? t('questboard_cancel_rest') : t('questboard_set_rest')}
          </Button>
          {!user && (
            <p className="text-xs font-bold text-center mt-2" style={{ color: '#666' }}>
              {language === 'zh' ? '游客模式下无法设置休息日' : 'Cannot set rest day in guest mode'}
            </p>
          )}
          {user && quests.length > 0 && !isRestDay && (
            <p className="text-xs font-bold text-center mt-2" style={{ color: '#666' }}>
              {t('questboard_cannot_set_rest_day_hint')}
            </p>
          )}
        </div>

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

        {showLongTermDialog && (
          <LongTermProjectDialog
            onClose={() => setShowLongTermDialog(false)}
            onQuestsCreated={handleLongTermQuestsCreated}
          />
        )}

        {showCalendar && (
          <LongTermCalendar
            onClose={() => setShowCalendar(false)}
            onQuestsUpdated={handleCalendarUpdate}
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

        {showDeepRestDialog && (
          <BootstrapModeDialog
            tasks={deepRestTasks}
            onClose={() => {
              setShowDeepRestDialog(false);
              setDeepRestTasks([]);
            }}
            onConfirm={handleConfirmDeepRestTasks}
            isAdding={isAddingDeepRest}
          />
        )}

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

        {showRestDayDialog && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
            onClick={() => setShowRestDayDialog(false)}
          >
            <div 
              className="relative max-w-lg w-full p-6 transform rotate-1"
              style={{
                backgroundColor: '#4ECDC4',
                border: '5px solid #000',
                boxShadow: '12px 12px 0px #000'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 
                className="text-2xl font-black uppercase text-center mb-4"
                style={{ color: '#000' }}
              >
                {isRestDay ? t('rest_day_dialog_cancel_title') : t('rest_day_dialog_set_title')}
              </h2>

              <div 
                className="mb-6 p-4"
                style={{
                  backgroundColor: '#FFF',
                  border: '3px solid #000'
                }}
              >
                {isRestDay ? (
                  <div className="space-y-3 font-bold text-sm">
                    <p>✓ {t('rest_day_dialog_cancel_hint_1')}</p>
                    <p>✓ {t('rest_day_dialog_cancel_hint_2')}</p>
                  </div>
                ) : (
                  <div className="space-y-3 font-bold text-sm">
                    <p>✓ {t('rest_day_dialog_set_hint_1')}</p>
                    <p>✓ {t('rest_day_dialog_set_hint_2')}</p>
                    <p>✓ {t('rest_day_dialog_set_hint_3')}</p>
                    <p className="text-xs" style={{ color: '#666' }}>
                      💡 {t('rest_day_dialog_set_hint_4')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowRestDayDialog(false)}
                  className="flex-1 py-3 font-black uppercase"
                  style={{
                    backgroundColor: '#FFF',
                    border: '4px solid #000',
                    boxShadow: '4px 4px 0px #000'
                  }}
                >
                  {t('common_cancel')}
                </Button>
                <Button
                  onClick={handleToggleRestDay}
                  className="flex-1 py-3 font-black uppercase"
                  style={{
                    backgroundColor: isRestDay ? '#FF6B35' : '#FFE66D',
                    color: isRestDay ? '#FFF' : '#000',
                    border: '4px solid #000',
                    boxShadow: '4px 4px 0px #000'
                  }}
                >
                  {t('common_confirm')}
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
                className="text-2xl font-black uppercase mb-3"
                style={{ color: '#000' }}
              >
                {language === 'zh' ? '⚙️ 工会同步中 ⚙️' : '⚙️ Guild Syncing ⚙️'}
              </h2>

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

              <p 
                className="text-xs font-bold mt-4"
                style={{ color: '#666' }}
              >
                {language === 'zh'
                  ? '💡 通常只需要几秒钟'
                  : '💡 This usually takes just a few seconds'}
              </p>
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