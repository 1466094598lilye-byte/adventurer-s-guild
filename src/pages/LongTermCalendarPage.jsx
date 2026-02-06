import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar as CalendarIcon, Trash2, Edit2, AlertTriangle, ChevronRight, ChevronDown, Plus, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, isSameDay, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useLanguage } from '@/components/LanguageContext';
import { getCalendarAddTaskPrompt } from '@/components/prompts';
import { getGuestData, setGuestData, addGuestEntity, updateGuestEntity, deleteGuestEntity } from '@/components/utils/guestData';
import { playSound, stopSound } from '@/components/AudioManager';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

export default function LongTermCalendarPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [longTermQuests, setLongTermQuests] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateQuests, setSelectedDateQuests] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDateDetail, setShowDateDetail] = useState(false);
  const [editingQuest, setEditingQuest] = useState(null);
  const [expandedDates, setExpandedDates] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingToDate, setAddingToDate] = useState(null);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddLaterForm, setShowAddLaterForm] = useState(false);
  const [laterTaskInput, setLaterTaskInput] = useState('');
  const [selectedLaterDate, setSelectedLaterDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    loadLongTermQuests();
  }, []);

  const loadLongTermQuests = async () => {
    console.log('=== 开始加载限时活动日程 ===');
    setIsLoading(true);
    setLoadError(null);
    
    const loadingAudio = await playSound('loadingLoop', { loop: true });
    
    try {
      let user = null;
      try {
        user = await base44.auth.me();
      } catch {
        // 访客模式
      }

      let quests;
      
      if (!user) {
        console.log('访客模式：从 localStorage 读取');
        const allQuests = getGuestData('quests');
        quests = allQuests.filter(q => q.isLongTermProject === true);
      } else {
        console.log('正在查询 isLongTermProject=true 的任务...');
        quests = await base44.entities.Quest.filter({ isLongTermProject: true }, '-date', 500);
      }
      console.log('查询到原始任务数量:', quests.length);
      
      const decryptedAndValidQuests = await Promise.all(quests.map(async q => {
        if (!q.date) return null;
        const parsed = parseISO(q.date);
        if (!isValid(parsed)) return null;

        let decryptedTitle = q.title;
        let decryptedActionHint = q.actionHint;

        if (user && (q.title || q.actionHint)) {
          try {
            const { data: decrypted } = await base44.functions.invoke('decryptQuestData', {
              encryptedTitle: q.title,
              encryptedActionHint: q.actionHint
            });
            decryptedTitle = decrypted.title;
            decryptedActionHint = decrypted.actionHint;
          } catch (decryptError) {
            console.warn('Failed to decrypt quest data for ID:', q.id, decryptError);
          }
        }

        return {
          ...q,
          title: decryptedTitle,
          actionHint: decryptedActionHint
        };
      }));

      const finalQuests = decryptedAndValidQuests.filter(Boolean);
      console.log('解密和过滤后的任务数量:', finalQuests.length);
      
      if (loadingAudio) stopSound(loadingAudio);
      
      setLongTermQuests(finalQuests);
      setIsLoading(false);
      console.log('=== 限时活动日程加载完成 ===');
      
      if (finalQuests.length > 0) {
        await playSound('projectAdded');
      }
      
      return finalQuests;
    } catch (error) {
      if (loadingAudio) stopSound(loadingAudio);
      console.error('❌ 加载大项目任务失败:', error);
      setLoadError(error.message || '加载失败');
      setIsLoading(false);
      return [];
    }
  };

  const groupedByDate = longTermQuests.reduce((acc, quest) => {
    if (!quest.date) return acc;
    if (!acc[quest.date]) {
      acc[quest.date] = [];
    }
    acc[quest.date].push(quest);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort();
  const latestDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

  const handleDateClick = (date, quests) => {
    try {
      const parsedDate = parseISO(date);
      if (isValid(parsedDate)) {
        setSelectedDate(parsedDate);
        setSelectedDateQuests(quests);
        setShowDateDetail(true);
      }
    } catch (error) {
      console.error('解析日期失败:', date, error);
    }
  };

  const toggleDateExpansion = (date) => {
    setExpandedDates(prev =>
      prev.includes(date)
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  const handleDeleteAllProjects = async () => {
    setIsDeleting(true);
    try {
      console.log('=== 开始删除所有大项目 ===');
      
      let user = null;
      try {
        user = await base44.auth.me();
      } catch {
        // 访客模式
      }

      const projectIds = new Set();
      longTermQuests.forEach(quest => {
        if (quest.longTermProjectId) {
          projectIds.add(quest.longTermProjectId);
        }
      });
      
      console.log('找到的大项目ID:', Array.from(projectIds));
      console.log('需要删除的Quest数量:', longTermQuests.length);
      
      if (!user) {
        const allQuests = getGuestData('quests');
        const allProjects = getGuestData('longTermProjects');
        
        const remainingQuests = allQuests.filter(q => !q.isLongTermProject);
        setGuestData('quests', remainingQuests);
        
        const remainingProjects = allProjects.filter(p => !projectIds.has(p.id));
        setGuestData('longTermProjects', remainingProjects);
        
        console.log('✅ 访客模式：所有任务和项目已从 localStorage 删除');
      } else {
        for (const quest of longTermQuests) {
          await base44.entities.Quest.delete(quest.id);
        }
        console.log('✅ 所有Quest任务已删除');
        
        for (const projectId of projectIds) {
          try {
            await base44.entities.LongTermProject.delete(projectId);
            console.log('✅ 删除大项目:', projectId);
          } catch (error) {
            console.warn('删除大项目失败:', projectId, error);
          }
        }
        console.log('✅ 所有LongTermProject记录已删除');
      }
      
      // 刷新委托板数据
      queryClient.invalidateQueries(['quests']);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('=== 删除完成 ===');
      
      await playSound('projectDeleted');
      
      // 返回委托板
      navigate('/questboard');
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteQuest = async (questId) => {
    try {
      let user = null;
      try {
        user = await base44.auth.me();
      } catch {
        // 访客模式
      }

      if (!user) {
        deleteGuestEntity('quests', questId);
      } else {
        await base44.entities.Quest.delete(questId);
      }
      
      await playSound('projectDeleted');
      await new Promise(resolve => setTimeout(resolve, 300));
      const updatedLongTermQuests = await loadLongTermQuests();
      
      if (selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const updatedQuestsForDate = updatedLongTermQuests.filter(q => q.date === dateStr);
        
        setSelectedDateQuests(updatedQuestsForDate);
        
        if (updatedQuestsForDate.length === 0) {
          setShowDateDetail(false);
          setExpandedDates(prev => prev.filter(d => d !== dateStr));
        }
      }
      
      queryClient.invalidateQueries(['quests']);
    } catch (error) {
      console.error('删除任务时出错:', error);
      await loadLongTermQuests();
      queryClient.invalidateQueries(['quests']);
    }
  };

  const handleEditQuest = async (quest, newActionHint) => {
    try {
      let user = null;
      try {
        user = await base44.auth.me();
      } catch {
        // 访客模式
      }

      const { prompt, schema } = getCalendarAddTaskPrompt(language, newActionHint);
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: schema
      });
      
      if (!user) {
        updateGuestEntity('quests', quest.id, {
          title: result.title,
          actionHint: newActionHint
        });
      } else {
        const { data: encrypted } = await base44.functions.invoke('encryptQuestData', {
          title: result.title,
          actionHint: newActionHint
        });
        
        await base44.entities.Quest.update(quest.id, {
          title: encrypted.encryptedTitle,
          actionHint: encrypted.encryptedActionHint
        });
      }

      const updatedLongTermQuests = await loadLongTermQuests();
      
      if (selectedDate && isValid(selectedDate)) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const updatedGroupedByDate = updatedLongTermQuests.reduce((acc, questItem) => {
          if (!questItem.date) return acc;
          if (!acc[questItem.date]) {
            acc[questItem.date] = [];
          }
          acc[questItem.date].push(questItem);
          return acc;
        }, {});
        const questsForSelectedDate = updatedGroupedByDate[dateStr] || [];
        setSelectedDateQuests(questsForSelectedDate);
      }

      setEditingQuest(null);
      queryClient.invalidateQueries(['quests']);
    } catch (error) {
      console.error('更新任务失败:', error);
      alert(t('questboard_alert_update_failed'));
    }
  };

  const getDateStatus = (quests) => {
    const total = quests.length;
    const done = quests.filter(q => q.status === 'done').length;
    return { total, done, allDone: done === total };
  };

  const handleAddTask = (date) => {
    setAddingToDate(date);
    setShowAddForm(true);
  };

  const handleSaveNewTask = async () => {
    if (!newTaskInput.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      let user = null;
      try {
        user = await base44.auth.me();
      } catch {
        // 访客模式
      }

      const { prompt, schema } = getCalendarAddTaskPrompt(language, newTaskInput.trim());
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: schema
      });

      if (!user) {
        addGuestEntity('quests', {
          title: result.title,
          actionHint: newTaskInput.trim(),
          date: addingToDate,
          difficulty: 'S',
          rarity: 'Epic',
          status: 'todo',
          source: 'longterm',
          isLongTermProject: true,
          tags: []
        });
      } else {
        const { data: encrypted } = await base44.functions.invoke('encryptQuestData', {
          title: result.title,
          actionHint: newTaskInput.trim()
        });

        await base44.entities.Quest.create({
          title: encrypted.encryptedTitle,
          actionHint: encrypted.encryptedActionHint,
          date: addingToDate,
          difficulty: 'S',
          rarity: 'Epic',
          status: 'todo',
          source: 'longterm',
          isLongTermProject: true,
          tags: []
        });
      }

      const updatedLongTermQuests = await loadLongTermQuests();

      if (!expandedDates.includes(addingToDate)) {
        setExpandedDates(prev => [...prev, addingToDate]);
      }

      if (selectedDate && isValid(selectedDate) && isSameDay(parseISO(addingToDate), selectedDate)) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const updatedGroupedByDate = updatedLongTermQuests.reduce((acc, questItem) => {
          if (!questItem.date) return acc;
          if (!acc[questItem.date]) {
            acc[questItem.date] = [];
          }
          acc[questItem.date].push(questItem);
          return acc;
        }, {});
        const questsForSelectedDate = updatedGroupedByDate[dateStr] || [];
        setSelectedDateQuests(questsForSelectedDate);
      }

      setShowAddForm(false);
      setNewTaskInput('');
      setAddingToDate(null);

      queryClient.invalidateQueries(['quests']);
    } catch (error) {
      console.error('添加任务失败:', error);
      alert(t('calendar_add_task_failed'));
    }
    setIsProcessing(false);
  };

  const handleAddLaterTask = async () => {
    if (!laterTaskInput.trim() || !selectedLaterDate || isProcessing) return;

    setIsProcessing(true);
    try {
      let user = null;
      try {
        user = await base44.auth.me();
      } catch {
        // 访客模式
      }

      const { prompt, schema } = getCalendarAddTaskPrompt(language, laterTaskInput.trim());
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: schema
      });

      if (!user) {
        addGuestEntity('quests', {
          title: result.title,
          actionHint: laterTaskInput.trim(),
          date: selectedLaterDate,
          difficulty: 'S',
          rarity: 'Epic',
          status: 'todo',
          source: 'longterm',
          isLongTermProject: true,
          tags: []
        });
      } else {
        const { data: encrypted } = await base44.functions.invoke('encryptQuestData', {
          title: result.title,
          actionHint: laterTaskInput.trim()
        });

        await base44.entities.Quest.create({
          title: encrypted.encryptedTitle,
          actionHint: encrypted.encryptedActionHint,
          date: selectedLaterDate,
          difficulty: 'S',
          rarity: 'Epic',
          status: 'todo',
          source: 'longterm',
          isLongTermProject: true,
          tags: []
        });
      }

      await loadLongTermQuests();

      setShowAddLaterForm(false);
      setLaterTaskInput('');
      setSelectedLaterDate('');

      queryClient.invalidateQueries(['quests']);
    } catch (error) {
      console.error('添加任务失败:', error);
      alert(t('calendar_add_task_failed'));
    }
    setIsProcessing(false);
  };

  const safeFormatDate = (dateStr, formatStr) => {
    try {
      if (!dateStr) return '';
      const parsed = parseISO(dateStr);
      if (!isValid(parsed)) return dateStr;
      return format(parsed, formatStr, { locale: language === 'zh' ? zhCN : undefined });
    } catch (error) {
      console.error('格式化日期失败:', dateStr, error);
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--bg-primary)', paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header with back button */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 px-4 py-2 font-black uppercase flex items-center gap-2"
            style={{
              backgroundColor: 'var(--color-cyan)',
              border: '4px solid var(--border-primary)',
              boxShadow: '4px 4px 0px var(--border-primary)'
            }}
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={3} />
            {language === 'zh' ? '返回' : 'Back'}
          </button>

          <div className="text-center">
            <h1 className="text-3xl font-black uppercase mb-2" style={{ color: 'var(--text-primary)' }}>
              📅 {t('calendar_title')} 📅
            </h1>
            <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>
              {t('calendar_total_quests')} {longTermQuests.length} {t('calendar_epic_quests')}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div
            className="p-8 text-center"
            style={{
              backgroundColor: 'var(--color-yellow)',
              border: '4px solid var(--border-primary)'
            }}
          >
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" strokeWidth={3} />
            <p className="font-black text-xl">
              {language === 'zh' ? '加载中...' : 'Loading...'}
            </p>
          </div>
        ) : loadError ? (
          <div
            className="p-8 text-center"
            style={{
              backgroundColor: 'var(--color-orange)',
              border: '4px solid var(--border-primary)'
            }}
          >
            <p className="font-black text-xl mb-2 text-white">
              {language === 'zh' ? '加载失败' : 'Loading Failed'}
            </p>
            <p className="font-bold text-sm text-white mb-4">
              {loadError}
            </p>
            <button
              onClick={loadLongTermQuests}
              className="px-4 py-2 font-black uppercase"
              style={{
                backgroundColor: '#FFF',
                border: '3px solid var(--border-primary)',
                boxShadow: '3px 3px 0px var(--border-primary)'
              }}
            >
              {language === 'zh' ? '重试' : 'Retry'}
            </button>
          </div>
        ) : longTermQuests.length === 0 ? (
          <div
            className="p-8 text-center"
            style={{
              backgroundColor: 'var(--color-yellow)',
              border: '4px solid var(--border-primary)'
            }}
          >
            <CalendarIcon className="w-16 h-16 mx-auto mb-4" strokeWidth={3} />
            <p className="font-black text-xl mb-2">{t('calendar_empty_title')}</p>
            <p className="font-bold">
              {t('calendar_empty_hint')}
            </p>
          </div>
        ) : (
          <>
            <div
              className="mb-4 max-h-[500px] overflow-y-auto"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '4px solid var(--border-primary)'
              }}
            >
              {sortedDates.map((date, index) => {
                const quests = groupedByDate[date];
                const status = getDateStatus(quests);
                const parsedDate = parseISO(date);
                const isToday = isValid(parsedDate) && isSameDay(parsedDate, new Date());
                const isExpanded = expandedDates.includes(date);

                return (
                  <div
                    key={date}
                    style={{
                      borderBottom: index < sortedDates.length - 1 ? '3px solid var(--border-primary)' : 'none'
                    }}
                  >
                    <button
                      onClick={() => toggleDateExpansion(date)}
                      className="w-full p-4 text-left transition-all"
                      style={{
                        backgroundColor: isExpanded ? 'var(--bg-primary)' : 'transparent'
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <CalendarIcon className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
                            <span className="font-black text-lg">
                              {language === 'zh' 
                                ? safeFormatDate(date, 'MM月dd日')
                                : safeFormatDate(date, 'MMM dd')}
                            </span>
                            {isToday && (
                              <span
                                className="px-2 py-0.5 font-black"
                                style={{
                                  backgroundColor: 'var(--color-cyan)',
                                  border: '2px solid var(--border-primary)',
                                  borderRadius: '4px'
                                }}
                              >
                                {t('calendar_today')}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div
                              className="px-3 py-1 font-black"
                              style={{
                                backgroundColor: status.allDone ? 'var(--color-cyan)' : 'var(--color-yellow)',
                                border: '2px solid var(--border-primary)',
                                borderRadius: '4px'
                              }}
                            >
                              {status.done}/{status.total} {t('calendar_items')}
                            </div>

                            {status.allDone && (
                              <span className="font-bold" style={{ color: 'var(--color-cyan)' }}>
                                ✓ {t('calendar_completed')}
                              </span>
                            )}
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronDown className="w-6 h-6 flex-shrink-0" strokeWidth={3} />
                        ) : (
                          <ChevronRight className="w-6 h-6 flex-shrink-0" strokeWidth={3} />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-2" style={{ backgroundColor: 'var(--bg-primary)' }}>
                        {quests.map((quest, i) => (
                          <div
                            key={quest.id || i}
                            className="p-3"
                            style={{
                              backgroundColor: 'var(--bg-secondary)',
                              border: '3px solid var(--border-primary)'
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div
                                    className="px-2 py-0.5 font-black"
                                    style={{
                                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
                                      color: '#FFF',
                                      border: '2px solid var(--border-primary)',
                                      textShadow: '1px 1px 0px var(--border-primary)'
                                    }}
                                  >
                                    S
                                  </div>
                                  {quest.status === 'done' && (
                                    <span className="font-bold" style={{ color: 'var(--color-cyan)' }}>
                                      ✓ {t('calendar_completed')}
                                    </span>
                                  )}
                                </div>
                                <p
                                  className="font-black mb-1"
                                  style={{
                                    color: quest.status === 'done' ? '#999' : '#9B59B6',
                                    textDecoration: quest.status === 'done' ? 'line-through' : 'none'
                                  }}
                                >
                                  {quest.title}
                                </p>
                                <p
                                  className="font-bold"
                                  style={{ color: quest.status === 'done' ? '#999' : 'var(--text-secondary)' }}
                                >
                                  {quest.actionHint}
                                </p>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingQuest(quest.id);
                                    handleDateClick(date, quests);
                                  }}
                                  className="p-1.5"
                                  style={{
                                    backgroundColor: 'var(--color-yellow)',
                                    border: '2px solid var(--border-primary)'
                                  }}
                                >
                                  <Edit2 className="w-3 h-3" strokeWidth={3} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteQuest(quest.id);
                                  }}
                                  className="p-1.5"
                                  style={{
                                    backgroundColor: 'var(--color-orange)',
                                    border: '2px solid var(--border-primary)'
                                  }}
                                >
                                  <Trash2 className="w-3 h-3 text-white" strokeWidth={3} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddTask(date);
                          }}
                          className="w-full py-2 font-bold uppercase flex items-center justify-center gap-2"
                          style={{
                            backgroundColor: 'var(--color-cyan)',
                            border: '3px solid var(--border-primary)',
                            boxShadow: '3px 3px 0px var(--border-primary)'
                          }}
                        >
                          <Plus className="w-4 h-4" strokeWidth={3} />
                          {t('calendar_add_task')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowAddLaterForm(true)}
              className="w-full py-3 mb-3 font-black uppercase flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--color-cyan)',
                color: 'var(--text-primary)',
                border: '4px solid var(--border-primary)',
                boxShadow: '6px 6px 0px var(--border-primary)'
              }}
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
              {language === 'zh' ? '添加更晚日期任务' : 'Add Task to Later Date'}
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="w-full py-3 font-black uppercase flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--color-orange)',
                color: '#FFF',
                border: '4px solid var(--border-primary)',
                boxShadow: '6px 6px 0px var(--border-primary)',
                opacity: isDeleting ? 0.5 : 1
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                  {language === 'zh' ? '工会成员正在擦除委托板...' : 'Guild members erasing quest board...'}
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" strokeWidth={3} />
                  {t('calendar_delete_all')}
                </>
              )}
            </button>
          </>
        )}

        {/* Date Detail Dialog */}
        {showDateDetail && selectedDate && isValid(selectedDate) && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
            onClick={() => {
              setShowDateDetail(false);
              setEditingQuest(null);
            }}
          >
            <div
              className="relative max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
              style={{
                backgroundColor: 'var(--color-cyan)',
                border: '5px solid var(--border-primary)',
                boxShadow: '12px 12px 0px var(--border-primary)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowDateDetail(false);
                  setEditingQuest(null);
                }}
                className="absolute -top-4 -right-4 w-12 h-12 flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--color-orange)',
                  border: '4px solid var(--border-primary)',
                  boxShadow: '5px 5px 0px var(--border-primary)'
                }}
              >
                <X className="w-7 h-7" strokeWidth={4} />
              </button>

              <h3 className="text-2xl font-black uppercase text-center mb-4">
                📅 {language === 'zh' 
                  ? format(selectedDate, 'MM月dd日') 
                  : format(selectedDate, 'MMM dd')} {t('calendar_date_tasks')}
              </h3>

              <div className="space-y-3">
                {selectedDateQuests.map((quest) => (
                  <div
                    key={quest.id}
                    className="p-4"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '4px solid var(--border-primary)'
                    }}
                  >
                    {editingQuest === quest.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          defaultValue={quest.actionHint}
                          onBlur={(e) => {
                            if (e.target.value.trim()) {
                              handleEditQuest(quest, e.target.value.trim());
                            } else {
                              setEditingQuest(null);
                            }
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          autoFocus
                          className="w-full px-3 py-2 font-bold"
                          style={{ border: '3px solid var(--border-primary)' }}
                        />
                        <button
                          onClick={() => setEditingQuest(null)}
                          className="text-sm font-bold underline"
                        >
                          {t('common_cancel')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className="px-2 py-1 text-base font-black"
                                style={{
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
                                  color: '#FFF',
                                  border: '2px solid var(--border-primary)',
                                  textShadow: '1px 1px 0px var(--border-primary)'
                                }}
                              >
                                S
                              </div>
                            </div>
                            <p className="font-black mb-1 text-purple-800">
                              {quest.title}
                            </p>
                            <p className="font-bold text-gray-600">
                              {quest.actionHint}
                            </p>
                            <p className="font-bold mt-2" style={{ color: '#999' }}>
                              {t('calendar_status')}：{quest.status === 'done' ? t('calendar_status_done') : t('calendar_status_pending')}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingQuest(quest.id)}
                              className="p-2"
                              style={{
                                backgroundColor: 'var(--color-yellow)',
                                border: '3px solid var(--border-primary)'
                              }}
                            >
                              <Edit2 className="w-4 h-4" strokeWidth={3} />
                            </button>
                            <button
                              onClick={() => handleDeleteQuest(quest.id)}
                              className="p-2"
                              style={{
                                backgroundColor: 'var(--color-orange)',
                                border: '3px solid var(--border-primary)'
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-white" strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add Task Form Dialog */}
        {showAddForm && addingToDate && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
            onClick={() => {
              setShowAddForm(false);
              setNewTaskInput('');
              setAddingToDate(null);
            }}
          >
            <div
              className="relative max-w-md w-full p-6"
              style={{
                backgroundColor: 'var(--color-cyan)',
                border: '5px solid var(--border-primary)',
                boxShadow: '12px 12px 0px var(--border-primary)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewTaskInput('');
                  setAddingToDate(null);
                }}
                className="absolute -top-4 -right-4 w-12 h-12 flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--color-orange)',
                  border: '4px solid var(--border-primary)',
                  boxShadow: '5px 5px 0px var(--border-primary)'
                }}
              >
                <X className="w-7 h-7" strokeWidth={4} />
              </button>

              <h3 className="text-2xl font-black uppercase text-center mb-4">
                {t('calendar_add_task_title')}
              </h3>

              <div
                className="mb-4 p-3"
                style={{
                  backgroundColor: 'var(--color-yellow)',
                  border: '3px solid var(--border-primary)'
                }}
              >
                <p className="font-bold">
                  📅 {t('common_date')}：{language === 'zh' 
                    ? safeFormatDate(addingToDate, 'yyyy年MM月dd日')
                    : safeFormatDate(addingToDate, 'MMMM dd, yyyy')}
                </p>
              </div>

              <div className="mb-4">
                <label className="block font-black uppercase mb-2">
                  {t('calendar_task_content_label')}
                </label>
                <textarea
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  placeholder={t('calendar_task_placeholder')}
                  rows={3}
                  className="w-full px-3 py-2 font-bold resize-none"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '3px solid var(--border-primary)'
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewTaskInput('');
                    setAddingToDate(null);
                  }}
                  disabled={isProcessing}
                  className="flex-1 py-3 font-black uppercase"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '4px solid var(--border-primary)',
                    boxShadow: '4px 4px 0px var(--border-primary)',
                    opacity: isProcessing ? 0.5 : 1
                  }}
                >
                  {t('common_cancel')}
                </button>
                <button
                  onClick={handleSaveNewTask}
                  disabled={!newTaskInput.trim() || isProcessing}
                  className="flex-1 py-3 font-black uppercase"
                  style={{
                    backgroundColor: 'var(--color-yellow)',
                    border: '4px solid var(--border-primary)',
                    boxShadow: '4px 4px 0px var(--border-primary)',
                    opacity: (!newTaskInput.trim() || isProcessing) ? 0.5 : 1
                  }}
                >
                  {isProcessing ? t('calendar_adding') : t('calendar_confirm_add')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Later Task Form Dialog */}
        {showAddLaterForm && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
            onClick={() => {
              setShowAddLaterForm(false);
              setLaterTaskInput('');
              setSelectedLaterDate('');
            }}
          >
            <div
              className="relative max-w-md w-full p-6"
              style={{
                backgroundColor: 'var(--color-cyan)',
                border: '5px solid var(--border-primary)',
                boxShadow: '12px 12px 0px var(--border-primary)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowAddLaterForm(false);
                  setLaterTaskInput('');
                  setSelectedLaterDate('');
                }}
                className="absolute -top-4 -right-4 w-12 h-12 flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--color-orange)',
                  border: '4px solid var(--border-primary)',
                  boxShadow: '5px 5px 0px var(--border-primary)'
                }}
              >
                <X className="w-7 h-7" strokeWidth={4} />
              </button>

              <h3 className="text-2xl font-black uppercase text-center mb-4">
                {language === 'zh' ? '📅 添加更晚日期任务 📅' : '📅 Add Task to Later Date 📅'}
              </h3>

              <div
                className="mb-4 p-3"
                style={{
                  backgroundColor: 'var(--color-yellow)',
                  border: '3px solid var(--border-primary)'
                }}
              >
                <p className="font-bold mb-2">
                  💡 {language === 'zh' 
                    ? `当前最晚日期：${latestDate ? safeFormatDate(latestDate, 'yyyy年MM月dd日') : '无'}`
                    : `Current latest date: ${latestDate ? safeFormatDate(latestDate, 'MMMM dd, yyyy') : 'None'}`}
                </p>
                <p className="font-bold" style={{ color: '#666' }}>
                  {language === 'zh' 
                    ? '适用于项目延期等场景，可添加到更远的日期'
                    : 'Suitable for project delays, add tasks to later dates'}
                </p>
              </div>

              <div className="mb-4">
                <label className="block font-black uppercase mb-2">
                  {t('common_date')}
                </label>
                <input
                  type="date"
                  value={selectedLaterDate}
                  onChange={(e) => setSelectedLaterDate(e.target.value)}
                  className="w-full px-3 py-2 font-bold"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '3px solid var(--border-primary)'
                  }}
                />
              </div>

              <div className="mb-4">
                <label className="block font-black uppercase mb-2">
                  {t('calendar_task_content_label')}
                </label>
                <textarea
                  value={laterTaskInput}
                  onChange={(e) => setLaterTaskInput(e.target.value)}
                  placeholder={t('calendar_task_placeholder')}
                  rows={3}
                  className="w-full px-3 py-2 font-bold resize-none"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '3px solid var(--border-primary)'
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddLaterForm(false);
                    setLaterTaskInput('');
                    setSelectedLaterDate('');
                  }}
                  disabled={isProcessing}
                  className="flex-1 py-3 font-black uppercase"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '4px solid var(--border-primary)',
                    boxShadow: '4px 4px 0px var(--border-primary)',
                    opacity: isProcessing ? 0.5 : 1
                  }}
                >
                  {t('common_cancel')}
                </button>
                <button
                  onClick={handleAddLaterTask}
                  disabled={!laterTaskInput.trim() || !selectedLaterDate || isProcessing}
                  className="flex-1 py-3 font-black uppercase"
                  style={{
                    backgroundColor: 'var(--color-yellow)',
                    border: '4px solid var(--border-primary)',
                    boxShadow: '4px 4px 0px var(--border-primary)',
                    opacity: (!laterTaskInput.trim() || !selectedLaterDate || isProcessing) ? 0.5 : 1
                  }}
                >
                  {isProcessing ? t('calendar_adding') : t('calendar_confirm_add')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          >
            <div
              className="relative max-w-md w-full p-6"
              style={{
                backgroundColor: 'var(--color-orange)',
                border: '5px solid var(--border-primary)',
                boxShadow: '12px 12px 0px var(--border-primary)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-white" strokeWidth={3} />

                <h3 className="text-2xl font-black uppercase text-white mb-4">
                  {t('calendar_confirm_delete_title')}
                </h3>

                <div
                  className="mb-6 p-4 text-left"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '3px solid var(--border-primary)'
                  }}
                >
                  <p className="font-bold mb-2">
                    {t('calendar_delete_warning')} {longTermQuests.length} {language === 'zh' ? '项大项目任务' : 'long-term project tasks'}
                  </p>
                  <p className="font-bold" style={{ color: '#C44569' }}>
                    {t('calendar_delete_cannot_undo')}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 py-3 font-black uppercase"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '4px solid var(--border-primary)',
                      boxShadow: '4px 4px 0px var(--border-primary)',
                      opacity: isDeleting ? 0.5 : 1
                    }}
                  >
                    {t('common_cancel')}
                  </button>
                  <button
                    onClick={handleDeleteAllProjects}
                    disabled={isDeleting}
                    className="flex-1 py-3 font-black uppercase text-white flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: '#000',
                      border: '4px solid #FFF',
                      boxShadow: '4px 4px 0px #FFF',
                      opacity: isDeleting ? 0.5 : 1
                    }}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                        {language === 'zh' ? '擦除中...' : 'Erasing...'}
                      </>
                    ) : (
                      t('common_confirm')
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}