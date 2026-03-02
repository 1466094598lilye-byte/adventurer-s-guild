import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, ChevronDown, ChevronUp, Plus, Repeat } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { getCelebrationMessagePrompt, getTaskNamingPrompt } from '@/components/prompts';
import { format } from 'date-fns';

export default function EndOfDaySummaryAndPlanning({ 
  showCelebration, 
  onClose, 
  currentStreak,
  onPlanSaved,
  fromChestOpen = false
}) {
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [loadingCelebration, setLoadingCelebration] = useState(showCelebration);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [plannedQuests, setPlannedQuests] = useState([]);
  const [routineQuests, setRoutineQuests] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isReviewMode, setIsReviewMode] = useState(false);

  const { language, t } = useLanguage();
  const today = format(new Date(), 'yyyy-MM-dd');

  // 辅助函数：解密任务
  const decryptQuest = async (quest) => {
    try {
      const { data } = await base44.functions.invoke('decryptQuestData', {
        encryptedTitle: quest.title,
        encryptedActionHint: quest.actionHint
      });
      return {
        ...quest,
        title: data.title,
        actionHint: data.actionHint
      };
    } catch (error) {
      console.error('解密任务失败:', error);
      return quest;
    }
  };

  // 辅助函数：批量解密任务
  const decryptQuests = async (quests) => {
    return await Promise.all(quests.map(quest => decryptQuest(quest)));
  };

  useEffect(() => {
    if (showCelebration) {
      generateCelebrationMessage();
    }
    loadRoutineQuests();
    // 无论从哪里打开，都检查今天是否已经规划过
    checkExistingPlan();
  }, []);

  const checkExistingPlan = async () => {
    try {
      const user = await base44.auth.me();
      const lastPlannedDate = user?.lastPlannedDate;
      
      // 如果今天已经规划过，进入回顾/修改模式
      if (lastPlannedDate === today) {
        setIsReviewMode(true);
        
        // 加载已规划的任务
        const existingPlan = user?.nextDayPlannedQuests || [];
        if (existingPlan.length > 0) {
          setPlannedQuests(existingPlan);
        }
      }
    } catch (error) {
      console.error('检查规划失败:', error);
    }
  };

  const loadRoutineQuests = async () => {
    try {
      // 只获取今天已经生成的例行任务（routine任务以明文存储，无需解密）
      const todayRoutineQuests = await base44.entities.Quest.filter({ 
        isRoutine: true,
        date: today
      }, '-created_date', 100);
      
      setRoutineQuests(todayRoutineQuests);
    } catch (error) {
      console.error('加载每日修炼任务失败:', error);
    }
  };

  const generateCelebrationMessage = async () => {
    try {
      const promptText = getCelebrationMessagePrompt(language, currentStreak);
      
      const { data: result } = await base44.functions.invoke('callDeepSeek', {
        prompt: promptText,
        response_json_schema: {
          type: "object",
          properties: {
            message: { type: "string" }
          }
        }
      });
      
      setCelebrationMessage(result.message || (language === 'zh' 
        ? '恭喜完成今日所有委托！' 
        : 'Congratulations on completing all quests today!'));
    } catch (error) {
      setCelebrationMessage(language === 'zh' 
        ? '恭喜完成今日所有委托！' 
        : 'Congratulations on completing all quests today!');
    }
    setLoadingCelebration(false);
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const promptText = getTaskNamingPrompt(language, textInput.trim(), false);
      
      const { data: result } = await base44.functions.invoke('callDeepSeek', {
        prompt: promptText,
        response_json_schema: {
          type: "object",
          properties: {
            title: { 
              type: "string",
              description: language === 'zh' 
                ? "必须严格是【XX】+YYYYYYY格式！XX是2字动作类型，YYYYYYY是正好7个汉字的描述！"
                : "Must strictly follow [Category]: <5-8 Word Epic Phrase> format!"
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
      alert(t('questboard_alert_task_parse_failed', { message: error.message || t('common_try_again') }));
    }
    setIsProcessing(false);
  };

  const handleAddManualQuest = () => {
    const newQuest = {
      title: language === 'zh' ? '【新任务】待命名任务' : '[New Quest]: Unnamed Task',
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
        const promptText = getTaskNamingPrompt(language, newActionHint.trim(), false);
        
        const { data: result } = await base44.functions.invoke('callDeepSeek', {
          prompt: promptText,
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
    // 趁用户有网，预生成明日 routine 任务（后台静默执行，不阻塞关闭）
    const tomorrow = format(new Date(new Date().getTime() + 86400000), 'yyyy-MM-dd');
    base44.functions.invoke('runDailyRollover', { clientToday: today, targetDate: tomorrow }).catch(() => {});
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
      className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto"
      style={{ 
        backgroundColor: 'rgba(0,0,0,0.9)',
        zIndex: 55
      }}
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
          {showCelebration ? t('planning_celebration_title') : 
           isReviewMode ? (language === 'zh' ? '📋 回顾明日委托 📋' : '📋 Review Tomorrow\'s Quests 📋') :
           t('planning_planning_title')}
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
              📋 {t('planning_tomorrow_summary')}：{totalTomorrowQuests} {t('common_items')}
              {routineQuests.length > 0 && (
                <span className="font-bold ml-2" style={{ color: '#666' }}>
                  （{routineQuests.length}{language === 'zh' ? '项每日修炼' : ' daily routines'} + {plannedQuests.length}{language === 'zh' ? '项临时任务' : ' temporary quests'}）
                </span>
              )}
            </p>
          </div>
        )}

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
              <h3 className="font-black uppercase">{t('planning_routine_quests')}</h3>
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
                      className="px-2 py-1 font-black"
                      style={{
                        backgroundColor: difficultyColors[quest.difficulty],
                        color: quest.difficulty === 'S' ? '#FFE66D' : '#000',
                        border: '2px solid #000'
                      }}
                    >
                      {quest.difficulty}
                    </span>
                    <div className="flex-1">
                      <p className="font-black">{quest.title}</p>
                      <p className="font-bold text-gray-600">
                        ({quest.actionHint})
                      </p>
                    </div>
                    <Repeat className="w-4 h-4 text-gray-500" strokeWidth={3} />
                  </div>
                </div>
              ))}
            </div>
            <p className="font-bold mt-2 text-center" style={{ color: '#666' }}>
              💡 {t('planning_routine_hint')}
            </p>
          </div>
        )}

        <div 
          className="mb-4 p-4"
          style={{
            backgroundColor: '#FFF',
            border: '4px solid #000'
          }}
        >
          <h3 className="font-black uppercase mb-3">
            {isReviewMode 
              ? (language === 'zh' ? '已规划的临时任务' : 'Planned Temporary Quests')
              : t('planning_add_temp_quests')}
          </h3>
          
          {isReviewMode && plannedQuests.length === 0 && (
            <p className="text-center font-bold mb-3" style={{ color: '#666' }}>
              {language === 'zh' ? '暂无临时任务规划' : 'No temporary quests planned'}
            </p>
          )}
          
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder={t('planning_input_placeholder')}
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
                      <p className="font-black mb-1 truncate">{quest.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-600 truncate">
                          ({quest.actionHint || (language === 'zh' ? '待填写' : 'To be filled')})
                        </span>
                        <span 
                          className="px-2 py-0.5 font-black"
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
                      <label className="block font-bold uppercase mb-2">
                        {t('planning_edit_content')}
                      </label>
                        <input
                          type="text"
                          value={quest.actionHint}
                          onChange={(e) => handleChangeActionHint(i, e.target.value)}
                          placeholder={language === 'zh' ? '请输入任务内容...' : 'Enter quest content...'}
                          className="w-full px-3 py-2 font-bold"
                          style={{ border: '2px solid #000' }}
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block font-bold uppercase mb-2">
                          {t('planning_edit_difficulty')}
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
                        className="w-full py-2 font-bold uppercase"
                        style={{
                          backgroundColor: '#FFF',
                          color: '#FF6B35',
                          border: '2px solid #FF6B35'
                        }}
                      >
                        {t('planning_delete_task')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleAddManualQuest}
            className="w-full py-2 font-bold uppercase flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#FFE66D',
              border: '3px solid #000',
              boxShadow: '3px 3px 0px #000'
            }}
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            {t('planning_manual_add')}
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
          {isReviewMode && plannedQuests.length > 0
            ? (language === 'zh' ? `✓ 确认修改 ${plannedQuests.length} 项任务` : `✓ Confirm ${plannedQuests.length} Quests`)
            : plannedQuests.length > 0 
            ? `${t('planning_confirm_register')} ${plannedQuests.length} ${t('planning_temp_tasks')}` 
            : t('planning_close')}
        </button>
      </div>
    </div>
  );
}