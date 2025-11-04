import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, ChevronDown, ChevronUp, Plus } from 'lucide-react';
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
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (showCelebration) {
      generateCelebrationMessage();
    }
  }, []);

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
        prompt: `你是【星陨纪元冒险者工会】的首席史诗书记官。冒险者正在为明天规划任务。

用户输入：${textInput.trim()}

你的任务：
1. 识别并拆分用户输入中的所有独立任务
2. 为每个任务创作专属的RPG风格标题（【2字类型】+ 7字标题）
3. 评定难度和稀有度
4. 保留用户的原始任务描述作为 actionHint

请返回任务数组：`,
        response_json_schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  actionHint: { type: "string" },
                  difficulty: { type: "string", enum: ["C", "B", "A", "S"] },
                  rarity: { type: "string", enum: ["Common", "Rare", "Epic", "Legendary"] }
                },
                required: ["title", "actionHint", "difficulty", "rarity"]
              }
            }
          },
          required: ["tasks"]
        }
      });

      const newQuests = result.tasks.map(task => ({
        title: task.title,
        actionHint: task.actionHint,
        difficulty: task.difficulty,
        rarity: task.rarity,
        tags: []
      }));

      setPlannedQuests(prev => [...prev, ...newQuests]);
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

        <div 
          className="mb-4 p-4"
          style={{
            backgroundColor: '#FFF',
            border: '4px solid #000'
          }}
        >
          <h3 className="font-black uppercase mb-3">为明日做好准备</h3>
          
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
            ? `确认登记 ${plannedQuests.length} 项委托` 
            : '关闭'}
        </button>
      </div>
    </div>
  );
}