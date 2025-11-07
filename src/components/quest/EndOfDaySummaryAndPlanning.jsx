
import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, ChevronDown, ChevronUp, Plus, Repeat } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function EndOfDaySummaryAndPlanning({ 
  showCelebration, 
  onClose, 
  currentStreak,
  onPlanSaved 
}) {
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [loadingCelebration, setLoadingCelebration] = useState(showCelebration);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [plannedQuests, setPlannedQuests] = useState([]);
  const [routineQuests, setRoutineQuests] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (showCelebration) {
      generateCelebrationMessage();
    }
    loadRoutineQuests();
  }, []);

  const loadRoutineQuests = async () => {
    try {
      // 查询所有每日修炼任务
      const allRoutineQuests = await base44.entities.Quest.filter({ isRoutine: true }, '-created_date', 100);
      
      // 去重：按 originalActionHint 去重
      const uniqueRoutinesMap = new Map();
      allRoutineQuests.forEach(quest => {
        const key = quest.originalActionHint;
        if (key && !uniqueRoutinesMap.has(key)) {
          uniqueRoutinesMap.set(key, {
            title: quest.title,
            actionHint: quest.actionHint, // Use actionHint for value
            difficulty: quest.difficulty,
            rarity: quest.rarity
          });
        }
      });
      
      setRoutineQuests(Array.from(uniqueRoutinesMap.values()));
    } catch (error) {
      console.error('加载每日修炼任务失败:', error);
    }
  };

  const generateCelebrationMessage = async () => {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `你是【星陨纪元冒险者工会】的大长老。一位冒险者刚刚完成了今日所有委托，连胜达到${currentStreak}天。

请为这位冒险者撰写一段简洁有力的日终总结与祝贺（2-3句话，60-80字）：

要求：
1. 肯定今日的全部完成
2. 强调${currentStreak}天连胜的坚持
3. 鼓励继续保持，为明日做好准备
4. 语气：温暖而有力，略带史诗感`,
        response_json_schema: {
          type: "object",
          properties: {
            message: { type: "string" }
          }
        }
      });
      
      setCelebrationMessage(result.message || '恭喜完成今日所有委托！');
    } catch (error) {
      setCelebrationMessage('恭喜完成今日所有委托！');
    }
    setLoadingCelebration(false);
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `你是【星陨纪元冒险者工会】的首席史诗书记官。

用户输入：${textInput.trim()}

你的任务：
1. 把整个输入作为**单个任务**处理（不要拆分！）
2. **为这个任务生成专属的RPG史诗风格标题**：

【标题生成规则】（必须100%严格遵守）：
- 格式：【X X】+ Y Y Y Y Y Y Y （X=动作类型2个字，Y=描述正好7个字）
- 动作类型：征讨、探索、铸造、研习、护送、调查、收集、锻造、外交、记录、守护、净化、寻宝、祭祀、谈判、议会
- **7字描述是硬性限制！必须正好7个汉字，不能多也不能少！**
- 描述要充满幻想色彩，把现实任务转化为史诗叙事
- **绝对禁止使用"任务"二字！**

【标题示例】（注意每个描述都正好7个字）：
"跑步5km" → "【征讨】踏破晨曦五里征途"（7字：踏破晨曦五里征途）
"写周报" → "【记录】编撰冒险周志卷轴"（7字：编撰冒险周志卷轴）
"开会" → "【议会】召开圆桌战术会议"（7字：召开圆桌战术会议）

**重要提醒**：描述部分必须正好7个汉字！

3. 评定难度和稀有度
4. 保留用户的完整输入作为 actionHint

**再次强调**：无论输入多长或多复杂，都只返回1个任务！标题的描述部分必须正好7个汉字！

请返回任务：`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { 
              type: "string",
              description: "必须严格是【XX】+YYYYYYY格式！XX是2字动作类型，YYYYYYY是正好7个汉字的描述！"
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

      // 直接添加单个任务
      setPlannedQuests(prev => [...prev, {
        title: result.title,
        actionHint: result.actionHint,
        difficulty: result.difficulty,
        rarity: result.rarity,
        tags: []
      }]);
      
      setTextInput('');
    } catch (error) {
      console.error('任务解析失败:', error);
      alert('任务解析失败，请重试');
    }
    setIsProcessing(false);
  };

  const handleAddManualQuest = () => {
    const newQuest = {
      title: '【新任务】待命名任务',
      actionHint: '',
      difficulty: 'C',
      rarity: 'Common',
      tags: []
    };
    setPlannedQuests([...plannedQuests, newQuest]);
    setEditingIndex(plannedQuests.length);
  };

  const handleChangeActionHint = async (index, newActionHint) => {
    setPlannedQuests(prevQuests => {
      const updated = [...prevQuests];
      updated[index] = { ...updated[index], actionHint: newActionHint };
      return updated;
    });
    
    if (newActionHint.trim()) {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `为任务"${newActionHint}"生成RPG风格标题、难度和稀有度`,
          response_json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              difficulty: { type: "string", enum: ["C", "B", "A", "S"] },
              rarity: { type: "string", enum: ["Common", "Rare", "Epic", "Legendary"] }
            }
          }
        });

        setPlannedQuests(prevQuests => {
          const updated = [...prevQuests];
          updated[index] = {
            ...updated[index],
            title: result.title,
            difficulty: result.difficulty,
            rarity: result.rarity
          };
          return updated;
        });
      } catch (error) {
        console.error('生成任务标题失败:', error);
      }
    }
  };

  const handleChangeDifficulty = (index, newDifficulty) => {
    const updated = [...plannedQuests];
    updated[index] = { ...updated[index], difficulty: newDifficulty };
    setPlannedQuests(updated);
  };

  const handleDeleteQuest = (index) => {
    setPlannedQuests(plannedQuests.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleConfirm = async () => {
    if (plannedQuests.length > 0) {
      await onPlanSaved(plannedQuests);
    }
    onClose();
  };

  const difficultyColors = {
    C: '#FFE66D',
    B: '#FF6B35',
    A: '#C44569',
    S: '#000'
  };

  const totalTomorrowQuests = routineQuests.length + plannedQuests.length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <div 
        className="relative max-w-2xl w-full my-8 p-6"
        style={{
          backgroundColor: '#4ECDC4',
          border: '5px solid #000',
          boxShadow: '12px 12px 0px #000'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-12 h-12 flex items-center justify-center"
          style={{
            backgroundColor: '#FF6B35',
            border: '4px solid #000',
            boxShadow: '5px 5px 0px #000'
          }}
        >
          <X className="w-7 h-7" strokeWidth={4} />
        </button>

        <h2 className="text-3xl font-black uppercase text-center mb-6">
          {showCelebration ? '🎊 今日圆满 🎊' : '📋 规划明日 📋'}
        </h2>

        {showCelebration && (
          <div 
            className="mb-6 p-4"
            style={{
              backgroundColor: '#FFE66D',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            {loadingCelebration ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <p className="font-bold leading-relaxed text-center">
                {celebrationMessage}
              </p>
            )}
          </div>
        )}

        {/* Tomorrow's Task Count Summary */}
        {totalTomorrowQuests > 0 && (
          <div 
            className="mb-4 p-3"
            style={{
              backgroundColor: '#FFE66D',
              border: '4px solid #000',
              boxShadow: '4px 4px 0px #000'
            }}
          >
            <p className="font-black text-center">
              📋 明日委托总数：{totalTomorrowQuests} 项
              {routineQuests.length > 0 && (
                <span className="text-sm font-bold ml-2" style={{ color: '#666' }}>
                  （{routineQuests.length}项每日修炼 + {plannedQuests.length}项临时任务）
                </span>
              )}
            </p>
          </div>
        )}

        {/* Routine Quests Display (Read-only) */}
        {routineQuests.length > 0 && (
          <div 
            className="mb-4 p-4"
            style={{
              backgroundColor: '#FFF',
              border: '4px solid #000'
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Repeat className="w-5 h-5" strokeWidth={3} />
              <h3 className="font-black uppercase text-sm">每日修炼（自动出现）</h3>
            </div>
            
            <div className="space-y-2">
              {routineQuests.map((quest, i) => (
                <div 
                  key={i}
                  className="p-3 opacity-80"
                  style={{
                    backgroundColor: '#F0F0F0',
                    border: '3px solid #999'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-2 py-1 text-xs font-black"
                      style={{
                        backgroundColor: difficultyColors[quest.difficulty],
                        color: quest.difficulty === 'S' ? '#FFE66D' : '#000',
                        border: '2px solid #000'
                      }}
                    >
                      {quest.difficulty}
                    </span>
                    <div className="flex-1">
                      <p className="font-black text-sm">{quest.title}</p>
                      <p className="text-xs font-bold text-gray-600">
                        ({quest.actionHint})
                      </p>
                    </div>
                    <Repeat className="w-4 h-4 text-gray-500" strokeWidth={3} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs font-bold mt-2 text-center" style={{ color: '#666' }}>
              💡 这些任务每天自动出现，无需单独规划
            </p>
          </div>
        )}

        {/* Plan New Quests */}
        <div 
          className="mb-4 p-4"
          style={{
            backgroundColor: '#FFF',
            border: '4px solid #000'
          }}
        >
          <h3 className="font-black uppercase mb-3">规划明日临时任务</h3>
          
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="输入明天的任务..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleTextSubmit();
                }
              }}
              disabled={isProcessing}
              className="flex-1 h-14 px-4 font-bold"
              style={{
                backgroundColor: '#F9FAFB',
                border: '3px solid #000'
              }}
            />

            <button
              onClick={handleTextSubmit}
              disabled={isProcessing || !textInput.trim()}
              className="flex-shrink-0 w-14 h-14 flex items-center justify-center"
              style={{
                backgroundColor: '#C44569',
                border: '3px solid #000',
                boxShadow: '4px 4px 0px #000',
                opacity: (!textInput.trim() || isProcessing) ? 0.5 : 1
              }}
            >
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              ) : (
                <Sparkles className="w-6 h-6 text-white" strokeWidth={3} />
              )}
            </button>
          </div>

          {plannedQuests.length > 0 && (
            <div className="space-y-2 mb-3">
              {plannedQuests.map((quest, i) => (
                <div 
                  key={i}
                  style={{
                    backgroundColor: '#F9FAFB',
                    border: '3px solid #000'
                  }}
                >
                  <div 
                    className="p-3 flex items-center justify-between cursor-pointer"
                    onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm mb-1 truncate">{quest.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600 truncate">
                          ({quest.actionHint || '待填写'})
                        </span>
                        <span 
                          className="px-2 py-0.5 text-xs font-black"
                          style={{
                            backgroundColor: difficultyColors[quest.difficulty],
                            color: quest.difficulty === 'S' ? '#FFE66D' : '#000',
                            border: '2px solid #000'
                          }}
                        >
                          {quest.difficulty}
                        </span>
                      </div>
                    </div>
                    {editingIndex === i ? (
                      <ChevronUp className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
                    ) : (
                      <ChevronDown className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
                    )}
                  </div>

                  {editingIndex === i && (
                    <div className="px-3 pb-3 pt-0" style={{ borderTop: '2px solid #000' }}>
                      <div className="mb-3 mt-3">
                        <label className="block text-xs font-bold uppercase mb-2">
                          任务内容：
                        </label>
                        <input
                          type="text"
                          value={quest.actionHint}
                          onChange={(e) => handleChangeActionHint(i, e.target.value)}
                          placeholder="请输入任务内容..."
                          className="w-full px-3 py-2 font-bold text-sm"
                          style={{ border: '2px solid #000' }}
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs font-bold uppercase mb-2">
                          难度评级：
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {['C', 'B', 'A', 'S'].map(level => (
                            <button
                              key={level}
                              onClick={() => handleChangeDifficulty(i, level)}
                              className="py-2 font-black"
                              style={{
                                backgroundColor: quest.difficulty === level ? difficultyColors[level] : '#F0F0F0',
                                color: level === 'S' && quest.difficulty === level ? '#FFE66D' : '#000',
                                border: quest.difficulty === level ? '3px solid #000' : '2px solid #000'
                              }}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteQuest(i)}
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
          )}

          <button
            onClick={handleAddManualQuest}
            className="w-full py-2 font-bold uppercase text-sm flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#FFE66D',
              border: '3px solid #000',
              boxShadow: '3px 3px 0px #000'
            }}
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            手动添加任务
          </button>
        </div>

        <button
          onClick={handleConfirm}
          className="w-full py-4 font-black uppercase text-lg"
          style={{
            backgroundColor: '#FFE66D',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          {plannedQuests.length > 0 
            ? `确认登记 ${plannedQuests.length} 项临时委托` 
            : '关闭'}
        </button>
      </div>
    </div>
  );
}
