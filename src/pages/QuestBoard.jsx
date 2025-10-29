
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
  const queryClient = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ['quests', today],
    queryFn: async () => {
      const allQuests = await base44.entities.Quest.filter({ date: today }, '-created_date');
      return allQuests;
    }
  });

  useQuery({
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
    setPendingQuests(generatedQuests);
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

  const handleComplete = async (quest) => {
    await updateQuestMutation.mutateAsync({
      id: quest.id,
      data: { status: 'done' }
    });
    setSelectedQuest(quest);

    const updatedQuests = await base44.entities.Quest.filter({ date: today });
    const allDone = updatedQuests.every(q => q.status === 'done');
    
    if (allDone) {
      const chests = await base44.entities.DailyChest.filter({ date: today });
      if (chests.length === 0) {
        await base44.entities.DailyChest.create({ date: today, opened: false });
        setTimeout(() => setShowChest(true), 1000);
      }
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
