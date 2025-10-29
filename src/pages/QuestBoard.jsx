
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Filter, Loader2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import VoiceInput from '../components/quest/VoiceInput';
import QuestCard from '../components/quest/QuestCard';
import PraiseDialog from '../components/quest/PraiseDialog';
import ChestOpening from '../components/treasure/ChestOpening';
import QuestEditFormModal from '../components/quest/QuestEditFormModal';
import { format } from 'date-fns';

export default function QuestBoard() {
  const [filter, setFilter] = useState('all');
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [showChest, setShowChest] = useState(false);
  const [pendingQuests, setPendingQuests] = useState([]);
  const [editingPendingIndex, setEditingPendingIndex] = useState(null);
  const [editingQuest, setEditingQuest] = useState(null);
  const [toast, setToast] = useState(null);
  const [milestoneReward, setMilestoneReward] = useState(null);
  const queryClient = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');

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

  const createQuestMutation = useMutation({
    mutationFn: (questData) => base44.entities.Quest.create(questData),
    onSuccess: () => {
      queryClient.invalidateQueries(['quests']);
      setPendingQuests([]);
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

  const handleQuestsGenerated = (generatedQuests) => {
    setPendingQuests(prev => [...prev, ...generatedQuests]);
  };

  const confirmQuests = () => {
    pendingQuests.forEach(quest => {
      createQuestMutation.mutate({
        ...quest,
        date: today,
        status: 'todo',
        source: 'ai'
      });
    });
  };

  const handleChangePendingDifficulty = (index, newDifficulty) => {
    const updatedQuests = [...pendingQuests];
    updatedQuests[index] = { ...updatedQuests[index], difficulty: newDifficulty };
    setPendingQuests(updatedQuests);
  };

  const handleChangePendingActionHint = async (index, newActionHint) => {
    setPendingQuests(prevQuests => {
      const updated = [...prevQuests];
      updated[index] = { ...updated[index], actionHint: newActionHint };
      return updated;
    });
    
    if (newActionHint.trim()) {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `你是【星陨纪元冒险者工会】的首席史诗书记官，擅长为平凡任务注入奇幻色彩。

任务：${newActionHint}

规则：
1. 标题主体：7个字
2. 格式：【2字类型】+ 7字标题
3. 类型词库：修炼/采集/探索/讨伐/试炼/谈判/淬炼/磨砺/夺回/寻回/护送/调查/狩猎/救援
4. 奇幻化词汇：
   - 超市→集市/市集
   - 跑步→疾行/晨跑
   - 读书→研读/阅卷
   - 退货→夺回/寻回
   - 开会→议事/会谈
   - 健身→修炼/锻体
   - 写作→笔录/记录
5. 禁用词：的/之/冒号
6. 风格：简洁有力、略带戏剧感，标题要有节奏感和画面感

✓ 优秀示例（7字标题）：
【修炼】破晓时分疾行
【采集】晨曦市集寻宝
【探索】古卷深夜研读
【夺回】失落宝物归还
【试炼】黎明前夕锻体
【调查】星辰运行观测
【护送】珍贵物品归途

❌ 错误示例：
【修炼】跑步（太短）
【探索】智慧圣殿的秘密探寻（太长）

只返回标题、难度、稀有度，不要生成任务内容。`,
          response_json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              difficulty: { type: "string", enum: ["C", "B", "A", "S"] },
              rarity: { type: "string", enum: ["Common", "Rare", "Epic", "Legendary"] }
            },
            required: ["title", "difficulty", "rarity"]
          }
        });

        setPendingQuests(prevQuests => {
          const updated = [...prevQuests];
          updated[index] = {
            ...updated[index],
            title: result.title,
            difficulty: result.difficulty,
            rarity: result.rarity,
            tags: []
            // actionHint 保持不变
          };
          return updated;
        });
      } catch (error) {
        console.error('生成任务标题失败:', error);
      }
    }
  };

  const handleAddManualQuest = () => {
    const newQuest = {
      title: '【新任务】待命名任务',
      actionHint: '',
      difficulty: 'C',
      rarity: 'Common',
      tags: []
    };
    setPendingQuests([...pendingQuests, newQuest]);
    setEditingPendingIndex(pendingQuests.length);
  };

  const handleDeletePendingQuest = (index) => {
    const updatedQuests = pendingQuests.filter((_, i) => i !== index);
    setPendingQuests(updatedQuests);
    if (editingPendingIndex === index) {
      setEditingPendingIndex(null);
    }
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
        // 生成特殊战利品
        const lootResult = await base44.integrations.Core.InvokeLLM({
          prompt: `你是【星陨纪元冒险者工会】的宝物铸造大师。一位冒险者达成了${milestone.days}天连胜的惊人成就，获得了「${milestone.title}」称号。请为这个里程碑铸造一件独一无二的纪念战利品。

里程碑：${milestone.days}天连胜
称号：${milestone.title}
象征图标：${milestone.icon}

要求：
1. 名称：要体现"${milestone.days}天"和"连胜"的概念，并与称号呼应
2. 简介：RPG风格，强调这是只有坚持${milestone.days}天才能获得的珍贵纪念品，暗示这份毅力的价值
3. 图标：使用 ${milestone.icon} 作为基础，可以组合其他emoji

示例风格：
- 7天："七日辉光徽章" - "初入工会的冒险者，以七日不辍的意志证明了自己。这枚徽章闪烁着新星的光芒，预示着更长的征途。"
- 21天："三周永恒印记" - "二十一个日升月落，见证了一位冒险者从稚嫩到坚韧的蜕变。佩戴此印记者，已掌握了恒心的奥义。"

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

        // 创建特殊战利品
        await base44.entities.Loot.create({
          ...lootResult,
          rarity: 'Legendary',
          obtainedAt: new Date().toISOString()
        });

        // 更新用户：冻结券、称号、已解锁里程碑
        await base44.auth.updateMe({
          freezeTokenCount: (user?.freezeTokenCount || 0) + milestone.tokens,
          title: milestone.title,
          unlockedMilestones: [...unlockedMilestones, milestone.days]
        });

        // 显示里程碑奖励提示
        setMilestoneReward({
          ...milestone,
          loot: lootResult
        });

        queryClient.invalidateQueries(['user']);
        queryClient.invalidateQueries(['loot']);
        
        break; // 只处理当前达到的里程碑
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

      // 等待查询缓存更新
      await queryClient.invalidateQueries(['quests']);
      console.log('查询缓存已刷新');
      
      // 稍微延迟后检查，确保数据已更新
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
            
            // 更新连胜
            const currentUser = await base44.auth.me();
            const newStreak = (currentUser?.streakCount || 0) + 1;
            const newLongestStreak = Math.max(newStreak, currentUser?.longestStreak || 0);
            
            await base44.auth.updateMe({
              streakCount: newStreak,
              longestStreak: newLongestStreak,
              lastClearDate: today
            });
            
            queryClient.invalidateQueries(['user']);
            
            // 检查里程碑奖励
            await checkAndAwardMilestone(newStreak);
            
            // 检查宝箱
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
      '已撤回报告，委托重新激活。',
      '记录已改写，任务重新登记于工会任务板。',
      '冒险者，请再次确认这份委托的准备情况。',
      '报告撤回完毕，任务恢复至进行中状态。'
    ];
    
    const message = messages[Math.floor(Math.random() * messages.length)];
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const handleEditQuestSave = async ({ actionHint, dueDate }) => {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `你是【星陨纪元冒险者工会】的首席史诗书记官，擅长为平凡任务注入奇幻色彩。

任务：${actionHint}

规则：
1. 标题主体：7个字
2. 格式：【2字类型】+ 7字标题
3. 类型词库：修炼/采集/探索/讨伐/试炼/谈判/淬炼/磨砺/夺回/寻回/护送/调查/狩猎/救援
4. 奇幻化词汇：
   - 超市→集市/市集
   - 跑步→疾行/晨跑
   - 读书→研读/阅卷
   - 退货→夺回/寻回
   - 开会→议事/会谈
   - 健身→修炼/锻体
   - 写作→笔录/记录
5. 禁用词：的/之/冒号
6. 风格：简洁有力、略带戏剧感，标题要有节奏感和画面感

✓ 优秀示例（7字标题）：
【修炼】破晓时分疾行
【采集】晨曦市集寻宝
【探索】古卷深夜研读
【夺回】失落宝物归还
【试炼】黎明前夕锻体
【调查】星辰运行观测
【护送】珍贵物品归途

❌ 错误示例：
【修炼】跑步（太短）
【探索】智慧圣殿的秘密探寻（太长）

只返回标题、难度、稀有度，不要生成任务内容。`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            difficulty: { type: "string", enum: ["C", "B", "A", "S"] },
            rarity: { type: "string", enum: ["Common", "Rare", "Epic", "Legendary"] }
          },
          required: ["title", "difficulty", "rarity"]
        }
      });

      const updateData = {
        title: result.title,
        actionHint: actionHint,  // 保持用户输入的原文
        difficulty: result.difficulty,
        rarity: result.rarity,
        tags: [],
        dueDate: dueDate
      };

      await updateQuestMutation.mutateAsync({
        id: editingQuest.id,
        data: updateData
      });

      setToast('委托更新成功！');
      setTimeout(() => setToast(null), 2000);

      setEditingQuest(null);

      queryClient.invalidateQueries(['quests']);
    } catch (error) {
      alert('更新失败，请重试');
    }
  };

  const filteredQuests = quests.filter(quest => {
    if (filter === 'all') return true;
    if (filter === 'done') return quest.status === 'done';
    if (filter === 'todo') return quest.status === 'todo';
    return true;
  });

  const difficultyColors = {
    C: '#FFE66D',
    B: '#FF6B35',
    A: '#C44569',
    S: '#000'
  };

  const difficultyLabels = {
    C: 'C',
    B: 'B',
    A: 'A',
    S: 'S'
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
            ⚔️ 委托板 ⚔️
          </h1>
          <p className="text-center font-bold mt-2 text-sm">
            {format(new Date(), 'yyyy年MM月dd日')}
          </p>
        </div>

        <VoiceInput onQuestsGenerated={handleQuestsGenerated} />

        {pendingQuests.length > 0 && (
          <div 
            className="mb-6 p-4"
            style={{
              backgroundColor: '#FFE66D',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black uppercase">待确认委托 ({pendingQuests.length})</h3>
              <button
                onClick={handleAddManualQuest}
                className="w-8 h-8 flex items-center justify-center font-black"
                style={{
                  backgroundColor: '#4ECDC4',
                  border: '3px solid #000',
                  boxShadow: '3px 3px 0px #000'
                }}
                title="手动添加任务"
              >
                <Plus className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>
            <div className="space-y-2 mb-4">
              {pendingQuests.map((quest, i) => (
                <div 
                  key={i}
                  className="overflow-hidden"
                  style={{
                    backgroundColor: '#FFF',
                    border: '3px solid #000'
                  }}
                >
                  <div 
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => setEditingPendingIndex(editingPendingIndex === i ? null : i)}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="font-black text-sm mb-1 truncate">{quest.title}</p>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-600 truncate">
                          ({quest.actionHint || '待填写'})
                        </span>
                        <span 
                          className="px-2 py-0.5 text-xs font-black flex-shrink-0"
                          style={{
                            backgroundColor: difficultyColors[quest.difficulty],
                            color: quest.difficulty === 'S' ? '#FFE66D' : '#000',
                            border: '2px solid #000'
                          }}
                        >
                          {difficultyLabels[quest.difficulty]}
                        </span>
                      </div>
                      
                      {quest.voiceRawText && (
                        <div className="mt-2 space-y-1">
                          <div 
                            className="text-xs font-bold px-2 py-1"
                            style={{
                              backgroundColor: '#F0F0F0',
                              border: '2px solid #000',
                              color: '#666'
                            }}
                          >
                            🎤 原始语音：{quest.voiceRawText}
                          </div>
                          {quest.voiceCorrectedText && (
                            <div 
                              className="text-xs font-bold px-2 py-1"
                              style={{
                                backgroundColor: '#E8F5E9',
                                border: '2px solid #4ECDC4',
                                color: '#2E7D32'
                              }}
                            >
                              ✓ AI理解为：{quest.voiceCorrectedText}
                            </div>
                          )}
                          {quest.voiceConfidence !== undefined && quest.voiceConfidence < 0.75 && (
                            <div className="text-xs font-bold" style={{ color: '#FF6B35' }}>
                              ⚠ 置信度 {(quest.voiceConfidence * 100).toFixed(0)}% - 请确认任务内容
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {editingPendingIndex === i ? (
                        <ChevronUp className="w-5 h-5" strokeWidth={3} />
                      ) : (
                        <ChevronDown className="w-5 h-5" strokeWidth={3} />
                      )}
                    </div>
                  </div>

                  {editingPendingIndex === i && (
                    <div 
                      className="px-3 pb-3 pt-0"
                      style={{
                        borderTop: '2px solid #000'
                      }}
                    >
                      <div className="mb-3 mt-3">
                        <label className="block text-xs font-bold uppercase mb-2" style={{ color: '#666' }}>
                          任务内容：
                        </label>
                        <input
                          type="text"
                          value={quest.actionHint}
                          onChange={(e) => handleChangePendingActionHint(i, e.target.value)}
                          placeholder="请输入任务内容..."
                          className="w-full px-3 py-2 font-bold text-sm"
                          style={{
                            border: '2px solid #000'
                          }}
                        />
                        {quest.voiceRawText && (
                          <p className="text-xs font-bold mt-2" style={{ color: '#666' }}>
                            💡 若口音导致识别错误，可手动修改委托内容
                          </p>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs font-bold uppercase mb-2" style={{ color: '#666' }}>
                          难度评级：
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {['C', 'B', 'A', 'S'].map(level => {
                            const isSelected = quest.difficulty === level;
                            return (
                              <button
                                key={level}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChangePendingDifficulty(i, level);
                                }}
                                className="py-3 font-black text-lg transition-all"
                                style={{
                                  backgroundColor: isSelected ? difficultyColors[level] : '#F0F0F0',
                                  color: level === 'S' && isSelected ? '#FFE66D' : '#000',
                                  border: isSelected ? '3px solid #000' : '2px solid #000',
                                  boxShadow: isSelected ? '3px 3px 0px #000' : 'none'
                                }}
                              >
                                {level}
                              </button>
                            );
                          })}
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          <p className="text-xs font-bold text-center" style={{ color: '#666' }}>轻松</p>
                          <p className="text-xs font-bold text-center" style={{ color: '#666' }}>中等</p>
                          <p className="text-xs font-bold text-center" style={{ color: '#666' }}>高难</p>
                          <p className="text-xs font-bold text-center" style={{ color: '#666' }}>超级</p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePendingQuest(i);
                        }}
                        className="w-full py-2 font-bold uppercase text-sm"
                        style={{
                          backgroundColor: '#FFF',
                          color: '#FF6B35',
                          border: '2px solid #FF6B35'
                        }}
                      >
                        删除此任务
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingQuests([])}
                className="flex-1 py-2 font-black uppercase"
                style={{
                  backgroundColor: '#FF6B35', 
                  color: '#FFF', 
                  border: '3px solid #000',
                  boxShadow: '4px 4px 0px #000'
                }}
              >
                取消
              </button>
              <button
                onClick={confirmQuests}
                className="flex-1 py-2 font-black uppercase"
                style={{
                  backgroundColor: '#4ECDC4',
                  border: '3px solid #000',
                  boxShadow: '4px 4px 0px #000'
                }}
              >
                确认接取
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-6">
          {['all', 'todo', 'done'].map(f => (
            <button
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
              {f === 'all' ? '全部' : f === 'todo' ? '未完成' : '已完成'}
            </button>
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
            <p className="text-2xl font-black uppercase mb-2">暂无委托</p>
            <p className="font-bold text-gray-600">使用语音或文本添加今日任务</p>
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
              alert('复盘笔记功能开发中');
            }}
          />
        )}

        {showChest && (
          <ChestOpening
            date={today}
            onClose={() => setShowChest(false)}
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

        {/* Milestone Reward Dialog */}
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
                  🎊 里程碑达成！🎊
                </h2>

                <div 
                  className="mb-6 p-4"
                  style={{
                    backgroundColor: '#FFF',
                    border: '4px solid #000'
                  }}
                >
                  <p className="text-2xl font-black mb-3">{milestoneReward.days}天连胜</p>
                  <p className="text-xl font-black uppercase mb-3" style={{ color: '#C44569' }}>
                    「{milestoneReward.title}」
                  </p>
                  <p className="font-bold text-sm leading-relaxed mb-4">
                    恭喜你达成{milestoneReward.days}天连续完成任务的非凡成就！
                  </p>
                  
                  <div className="space-y-3">
                    <div 
                      className="p-3"
                      style={{
                        backgroundColor: '#4ECDC4',
                        border: '3px solid #000'
                      }}
                    >
                      <p className="font-black">🎟️ 冻结券 +{milestoneReward.tokens}</p>
                    </div>
                    
                    <div 
                      className="p-3"
                      style={{
                        backgroundColor: '#FF6B35',
                        border: '3px solid #000'
                      }}
                    >
                      <p className="font-black text-white">🏅 {milestoneReward.title} 称号</p>
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

                <button
                  onClick={() => setMilestoneReward(null)}
                  className="w-full py-4 font-black uppercase text-xl"
                  style={{
                    backgroundColor: '#000',
                    color: '#FFE66D',
                    border: '5px solid #FFE66D',
                    boxShadow: '6px 6px 0px #FFE66D'
                  }}
                >
                  收入囊中
                </button>
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
