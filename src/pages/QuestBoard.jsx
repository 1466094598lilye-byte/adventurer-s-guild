
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Filter, Loader2, Sparkles, Coffee, Briefcase, ChevronDown, ChevronUp, Check, Plus, Timer, Calendar as CalendarIcon } from 'lucide-react';
import QuestCard from '../components/quest/QuestCard';
import PraiseDialog from '../components/quest/PraiseDialog';
import ChestOpening from '../components/treasure/ChestOpening';
import QuestEditFormModal from '../components/quest/QuestEditFormModal';
import EndOfDaySummaryAndPlanning from '../components/quest/EndOfDaySummaryAndPlanning';
import LongTermProjectDialog from '../components/quest/LongTermProjectDialog';
import LongTermCalendar from '../components/quest/LongTermCalendar';
import JointPraiseDialog from '../components/quest/JointPraiseDialog';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/components/LanguageContext';
import { getTaskNamingPrompt } from '@/components/prompts';

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
  const queryClient = useQueryClient();
  const { language, t } = useLanguage();

  const hasProcessedDayRollover = useRef(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const currentHour = new Date().getHours();

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ['quests', today],
    queryFn: async () => {
      const allQuests = await base44.entities.Quest.filter({ date: today }, '-created_date');
      return allQuests;
    }
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: hasAnyLongTermQuests = false } = useQuery({
    queryKey: ['hasLongTermQuests'],
    queryFn: async () => {
      const longTermQuests = await base44.entities.Quest.filter({ isLongTermProject: true }, '-date', 1);
      return longTermQuests.length > 0;
    },
    initialData: false,
  });

  // 日更逻辑：未完成任务顺延 + 明日规划任务创建 + 每日修炼任务生成
  useEffect(() => {
    const handleDayRollover = async () => {
      if (!user) return;
      
      const rolloverKey = `${today}-${user.id}`;
      if (hasProcessedDayRollover.current === rolloverKey) {
        console.log('日更逻辑已执行过，跳过');
        return;
      }
      
      console.log('=== 开始执行日更逻辑 ===');
      hasProcessedDayRollover.current = rolloverKey;

      try {
        // 1. 处理昨天未完成的任务（顺延到今天）
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        const oldQuests = await base44.entities.Quest.filter({ date: yesterday, status: 'todo' });
        
        if (oldQuests.length > 0) {
          console.log(`发现 ${oldQuests.length} 项昨日未完成任务，开始顺延...`);
          
          for (const quest of oldQuests) {
            if (!quest.isRoutine) {
              await base44.entities.Quest.update(quest.id, { date: today });
            }
          }
          
          queryClient.invalidateQueries(['quests']);
          const nonRoutineCount = oldQuests.filter(q => !q.isRoutine).length;
          if (nonRoutineCount > 0) {
            setToast(t('questboard_toast_yesterday_quests_delayed', { count: nonRoutineCount }));
            setTimeout(() => setToast(null), 3000);
          }
        }

        // 2. 处理明日规划任务（创建为今日任务）
        const nextDayPlanned = user.nextDayPlannedQuests || [];
        const lastPlanned = user.lastPlannedDate;

        if (nextDayPlanned.length > 0 && lastPlanned && lastPlanned < today) {
          console.log(`发现 ${nextDayPlanned.length} 项已规划任务，开始创建...`);
          
          await base44.auth.updateMe({
            nextDayPlannedQuests: [],
            lastPlannedDate: today
          });
          
          for (const plannedQuest of nextDayPlanned) {
            await base44.entities.Quest.create({
              ...plannedQuest,
              date: today,
              status: 'todo',
              source: 'ai'
            });
          }

          queryClient.invalidateQueries(['quests']);
          queryClient.invalidateQueries(['user']);
          setToast(t('questboard_toast_planned_quests_loaded', { count: nextDayPlanned.length }));
          setTimeout(() => setToast(null), 3000);
        }

        // 3. 处理每日修炼任务（自动生成今日任务，保持原有评级）
        console.log('=== 开始处理每日修炼任务 ===');
        
        const todayQuests = await base44.entities.Quest.filter({ date: today });
        console.log(`今天已有 ${todayQuests.length} 个任务`);
        
        const allRoutineQuests = await base44.entities.Quest.filter({ isRoutine: true }, '-created_date', 100);
        console.log(`数据库中找到 ${allRoutineQuests.length} 个标记为每日修炼的任务记录`);
        
        if (allRoutineQuests.length > 0) {
          // 去重：按 originalActionHint 去重，只保留每个独特任务的最新一条记录
          const uniqueRoutinesMap = new Map();
          allRoutineQuests.forEach(quest => {
            const key = quest.originalActionHint;
            if (key) {
              if (!uniqueRoutinesMap.has(key) || 
                  new Date(quest.created_date) > new Date(uniqueRoutinesMap.get(key).created_date)) {
                uniqueRoutinesMap.set(key, quest);
              }
            }
          });
          
          console.log(`去重后识别出 ${uniqueRoutinesMap.size} 个不同的每日修炼任务`);
          
          for (const [actionHint, templateQuest] of uniqueRoutinesMap) {
            console.log(`检查每日修炼任务: ${actionHint}`);
            
            const alreadyExists = todayQuests.some(
              q => q.isRoutine && q.originalActionHint === actionHint
            );
            
            if (alreadyExists) {
              console.log(`今天已存在，跳过: ${actionHint}`);
              continue;
            }
            
            console.log(`今天还没有，开始生成: ${actionHint}`);
            
            try {
              // 只重新生成 RPG 标题，保持原有的难度和稀有度
              const result = await base44.integrations.Core.InvokeLLM({
                prompt: `你是【星陨纪元冒险者工会】的首席史诗书记官。

**当前冒险者每日修炼内容：** ${actionHint}

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

              // 创建今日的每日修炼任务，保持原有的难度和稀有度
              await base44.entities.Quest.create({
                title: result.title,
                actionHint: actionHint,
                difficulty: templateQuest.difficulty, // 保持原有难度
                rarity: templateQuest.rarity, // 保持原有稀有度
                date: today,
                status: 'todo',
                source: 'routine',
                isRoutine: true,
                originalActionHint: actionHint,
                tags: []
              });
              
              console.log(`成功创建今日每日修炼任务: ${actionHint}，保持评级 ${templateQuest.difficulty}`);
            } catch (error) {
              console.error(`生成每日修炼任务失败: ${actionHint}`, error);
            }
          }
          
          queryClient.invalidateQueries(['quests']);
        }
        
        console.log('=== 日更逻辑执行完成 ===');
      } catch (error) {
        console.error('日更处理失败:', error);
      }
    };

    if (user) {
      handleDayRollover();
    }
  }, [user, today, queryClient, t]);

  const createQuestMutation = useMutation({
    mutationFn: (questData) => base44.entities.Quest.create(questData),
    onSuccess: async () => {
      queryClient.invalidateQueries(['quests']);
      
      const currentUser = await base44.auth.me();
      const restDays = currentUser?.restDays || [];
      if (restDays.includes(today)) {
        await base44.auth.updateMe({
          restDays: restDays.filter(d => d !== today)
        });
        queryClient.invalidateQueries(['user']);
        setToast(t('questboard_toast_quest_added_rest_canceled'));
        setTimeout(() => setToast(null), 2000);
      }
    }
  });

  const updateQuestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['quests']);
    }
  });

  const deleteQuestMutation = useMutation({
    mutationFn: (id) => base44.entities.Quest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['quests']);
    }
  });

  const handleTextSubmit = async () => {
    if (!textInput.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: getTaskNamingPrompt(language, textInput.trim(), false),
        response_json_schema: {
          type: "object",
          properties: {
            title: { 
              type: "string",
              description: "必须严格是【XX】+YYYYYYY格式！XX是2字动作类型，YYYYYYY是正好7个汉字的描述！例如：【征讨】踏破晨曦五里征途。描述必须正好7个字，不能多也不能少！绝对不能包含'任务'二字！"
            },
            actionHint: { 
              type: "string",
              description: "用户的原始输入，完全保持原样"
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

  const handleConfirmPendingQuests = async () => {
    if (pendingQuests.length === 0 || isConfirmingPending) return;
    
    setIsConfirmingPending(true);
    try {
      for (const quest of pendingQuests) {
        await createQuestMutation.mutateAsync({
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
      
      setPendingQuests([]);
      setExpandedPending(null);
      setToast(t('questboard_toast_quests_added_to_board', { count: pendingQuests.length }));
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error('创建任务失败:', error);
      alert(t('questboard_alert_create_quest_failed'));
    }
    setIsConfirmingPending(false);
  };

  const checkAndAwardMilestone = async (newStreak) => {
    const milestones = [
      { days: 7, title: '新秀冒险家', tokens: 1, icon: '🌟' },
      { days: 21, title: '精英挑战者', tokens: 2, icon: '⚔️' },
      { days: 50, title: '连胜大师', tokens: 3, icon: '🏆' },
      { days: 100, title: '传奇不灭', tokens: 5, icon: '👑' }
    ];

    const unlockedMilestones = user?.unlockedMilestones || [];
    
    for (const milestone of milestones) {
      if (newStreak === milestone.days && !unlockedMilestones.includes(milestone.days)) {
        const lootResult = await base44.integrations.Core.InvokeLLM({
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

        queryClient.invalidateQueries(['user']);
        queryClient.invalidateQueries(['loot']);
        
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

      await queryClient.invalidateQueries(['quests']);
      console.log('查询缓存已刷新');

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
      
      setTimeout(async () => {
        console.log('=== 开始检查是否全部完成 ===');
        console.log('今日日期:', today);
        
        try {
          const updatedQuests = await base44.entities.Quest.filter({ date: today });
          console.log('找到的任务数量:', updatedQuests.length);
          console.log('任务列表:', updatedQuests.map(q => ({ 
            title: q.title, 
            status: q.status,
            date: q.date 
          })));
          
          const allDone = updatedQuests.every(q => q.status === 'done');
          console.log('是否全部完成:', allDone);
          
          if (allDone && updatedQuests.length > 0) {
            console.log('=== 所有任务已完成 ===');
            
            const currentUser = await base44.auth.me();
            console.log('当前用户数据:', currentUser);
            console.log('lastClearDate:', currentUser?.lastClearDate);
            console.log('今日日期:', today);
            
            if (currentUser?.lastClearDate === today) {
              console.log('今天已经完成过所有任务，不重复增加连胜');
              
              const chests = await base44.entities.DailyChest.filter({ date: today });
              if (chests.length === 0) {
                await base44.entities.DailyChest.create({ 
                  date: today, 
                  opened: false 
                });
                setTimeout(() => setShowChest(true), 500);
              } else if (!chests[0].opened) {
                setTimeout(() => setShowChest(true), 500);
              }
              
              return;
            }
            
            let newStreak = 1;
            const lastClearDate = currentUser?.lastClearDate;
            const restDays = currentUser?.restDays || [];
            
            if (lastClearDate) {
              let checkDate = new Date();
              checkDate.setDate(checkDate.getDate() - 1);
              
              let daysBack = 0;
              let foundLastWorkDay = false;
              
              while (daysBack < 365 && !foundLastWorkDay) {
                const checkDateStr = format(checkDate, 'yyyy-MM-dd');
                
                if (!restDays.includes(checkDateStr)) {
                  if (checkDateStr === lastClearDate) {
                    newStreak = (currentUser?.streakCount || 0) + 1;
                    console.log('连续完成（跳过了休息日），连胜 +1，新连胜:', newStreak);
                  } else {
                    console.log('中断了，连胜重置为1');
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
              lastClearDate: today
            });
            console.log('用户连胜数据已更新');
            
            await queryClient.invalidateQueries(['user']);
            
            await checkAndAwardMilestone(newStreak);
            
            const chests = await base44.entities.DailyChest.filter({ date: today });
            console.log('现有宝箱数量:', chests.length);
            console.log('宝箱详情:', chests);
            
            if (chests.length === 0) {
              console.log('创建新宝箱...');
              const newChest = await base44.entities.DailyChest.create({ 
                date: today, 
                opened: false 
              });
              console.log('宝箱创建成功:', newChest);
              
              setTimeout(() => {
                console.log('显示宝箱界面');
                setShowChest(true);
              }, 500);
            } else {
              const chest = chests[0];
              console.log('今日宝箱已存在');
              console.log('宝箱ID:', chest.id);
              console.log('宝箱opened状态:', chest.opened);
              console.log('宝箱opened类型:', typeof chest.opened);
              
              if (!chest.opened) {
                console.log('宝箱未开启，显示开箱界面');
                setTimeout(() => {
                  console.log('执行 setShowChest(true)');
                  setShowChest(true);
                }, 500);
              } else {
                console.log('宝箱已开启过，不显示');
              }
            }
          } else {
            console.log('还有任务未完成或任务列表为空');
          }
        } catch (error) {
          console.error('检查任务时出错:', error);
        }
      }, 500);
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
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: getTaskNamingPrompt(language, actionHint, true),
          response_json_schema: {
            type: "object",
            properties: {
              title: { 
                type: "string",
                description: "必须严格是【XX】+YYYYYYY格式！XX是2字动作类型，YYYYYYY是正好7个汉字的描述！"
              }
            },
            required: ["title"]
          }
        });
        
        newTitle = result.title;
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

      queryClient.invalidateQueries(['quests']);
      queryClient.invalidateQueries(['user']);
    } catch (error) {
      console.error("更新失败", error);
      alert(t('questboard_alert_update_failed'));
    }
  };

  const handleToggleRestDay = async () => {
    if (quests.length > 0 && !isRestDay) {
      alert(t('questboard_alert_cannot_set_rest_day_with_quests'));
      return;
    }
    
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
    
    queryClient.invalidateQueries(['user']);
    setShowRestDayDialog(false);
    setTimeout(() => setToast(null), 2000);
  };

  const handleChestClose = () => {
    setShowChest(false);
    
    const lastPlanned = user?.lastPlannedDate;
    if (lastPlanned !== today) {
      setShowCelebrationInPlanning(true);
      setShowPlanningDialog(true);
    }
  };

  const handlePlanSaved = async (plannedQuests) => {
    try {
      await base44.auth.updateMe({
        nextDayPlannedQuests: plannedQuests,
        lastPlannedDate: today
      });
      
      queryClient.invalidateQueries(['user']);
      setToast(t('questboard_toast_plan_saved_success', { count: plannedQuests.length }));
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('保存规划失败:', error);
      alert(t('questboard_alert_save_plan_failed'));
    }
  };

  const handleOpenPlanning = () => {
    setShowCelebrationInPlanning(false);
    setShowPlanningDialog(true);
  };

  const handleLongTermQuestsCreated = (count) => {
    queryClient.invalidateQueries(['quests']);
    queryClient.invalidateQueries(['hasLongTermQuests']);
    setToast(t('questboard_toast_longterm_quests_added_success', { count: count }));
    setTimeout(() => setToast(null), 3000);
  };

  const handleCalendarUpdate = () => {
    queryClient.invalidateQueries(['quests']);
    queryClient.invalidateQueries(['hasLongTermQuests']);
  };

  const filteredQuests = quests.filter(quest => {
    if (filter === 'all') return true;
    if (filter === 'done') return quest.status === 'done';
    if (filter === 'todo') return quest.status === 'todo';
    return true;
  });

  const isRestDay = (user?.restDays || []).includes(today);
  const nextDayPlannedCount = (user?.nextDayPlannedQuests || []).length;
  const canShowPlanningButton = currentHour >= 21 && user?.lastPlannedDate !== today;

  const difficultyColors = {
    C: '#FFE66D',
    B: '#FF6B35',
    A: '#C44569',
    S: '#000'
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
            <Input // Using shadcn Input component
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

            <Button // Using shadcn Button component
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
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FFF' }} />
              ) : (
                <Sparkles className="w-8 h-8" strokeWidth={3} style={{ color: '#FFF', fill: 'none' }} />
              )}
            </Button>
          </div>

          <Button // Using shadcn Button component
            onClick={() => setShowLongTermDialog(true)}
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
            💡 {t('questboard_longterm_hint')}
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
                      className="p-3 flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedPending(expandedPending === quest.tempId ? null : quest.tempId)}
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-3">
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
                          <p className="font-black text-sm mb-1 truncate">{quest.title}</p>
                          <p className="text-xs font-bold text-gray-600 truncate">
                            ({quest.actionHint})
                          </p>
                        </div>
                      </div>
                      {expandedPending === quest.tempId ? (
                        <ChevronUp className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
                      ) : (
                        <ChevronDown className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
                      )}
                    </div>

                    {expandedPending === quest.tempId && (
                      <div className="px-3 pb-3 pt-0" style={{ borderTop: '2px solid #000' }}>
                        <div className="mb-3 mt-3">
                          <label className="block text-xs font-bold uppercase mb-2">
                            {t('questboard_pending_quest_content_label')}
                          </label>
                          <Input // Using shadcn Input component
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
                              <Button // Using shadcn Button component
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

                        <Button // Using shadcn Button component
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

              <Button // Using shadcn Button component
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

        {hasAnyLongTermQuests && (
          <div 
            className="mb-6 p-4"
            style={{
              backgroundColor: '#9B59B6',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            <Button // Using shadcn Button component
              onClick={() => setShowCalendar(true)}
              className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3 text-white"
            >
              <CalendarIcon className="w-6 h-6" strokeWidth={3} />
              {t('questboard_calendar_btn')}
            </Button>
            <p className="text-center text-xs font-bold mt-2 text-white">
              {t('questboard_calendar_hint')}
            </p>
          </div>
        )}

        {(nextDayPlannedCount > 0 || canShowPlanningButton) && (
          <div 
            className="mb-6 p-4"
            style={{
              backgroundColor: '#C44569',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            {nextDayPlannedCount > 0 && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <CalendarIcon className="w-5 h-5 text-white" strokeWidth={3} />
                <p className="font-black uppercase text-white">
                  {t('questboard_planned_quests')} {nextDayPlannedCount} {t('common_items')}{language === 'zh' ? '委托' : ' quests'}
                </p>
              </div>
            )}
            
            {canShowPlanningButton && (
              <Button // Using shadcn Button component
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
          </div>
        )}

        <div className="flex gap-3 mb-6">
          {['all', 'todo', 'done'].map(f => (
            <Button // Using shadcn Button component
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 py-2 font-black uppercase text-sm"
              style={{
                backgroundColor: filter === f ? '#4ECDC4' : '#FFF',
                border: '3px solid #000',
                boxShadow: filter === f ? '4px 4px 0px #000' : '2px 2px 0px #000'
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
          <Button // Using shadcn Button component
            onClick={() => setShowRestDayDialog(true)}
            disabled={quests.length > 0 && !isRestDay}
            className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3"
            style={{
              backgroundColor: isRestDay ? '#FF6B35' : '#4ECDC4',
              color: isRestDay ? '#FFF' : '#000',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000',
              opacity: (quests.length > 0 && !isRestDay) ? 0.5 : 1
            }}
          >
            <Coffee className="w-6 h-6" strokeWidth={3} />
            {isRestDay ? t('questboard_cancel_rest') : t('questboard_set_rest')}
          </Button>
          {quests.length > 0 && !isRestDay && (
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
              queryClient.invalidateQueries(['loot']);
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

        {showPlanningDialog && (
          <EndOfDaySummaryAndPlanning
            showCelebration={showCelebrationInPlanning}
            currentStreak={user?.streakCount || 0}
            onClose={() => {
              setShowPlanningDialog(false);
              setShowCelebrationInPlanning(false);
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

                <Button // Using shadcn Button component
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
                <Button // Using shadcn Button component
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
                <Button // Using shadcn Button component
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
