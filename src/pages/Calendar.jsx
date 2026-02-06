import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar as CalendarIcon, Trash2, Plus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isSameDay, startOfDay } from 'date-fns';
import { useLanguage } from '@/components/LanguageContext';
import { getCalendarAddTaskPrompt } from '@/components/prompts';
import { playSound, stopSound } from '@/components/AudioManager';
import { getGuestData, addGuestEntity, deleteGuestEntity } from '@/components/utils/guestData';
import { useNavigate } from 'react-router-dom';

export default function Calendar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, t } = useLanguage();
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
      } catch {
        setUser(null);
      }
    };
    checkUser();
  }, []);

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ['quests'],
    queryFn: async () => {
      let user = null;
      try {
        user = await base44.auth.me();
      } catch {
        // 访客模式
      }

      if (!user) {
        const localQuests = getGuestData('quests');
        return localQuests.filter(q => q.isLongTermProject);
      } else {
        const allQuests = await base44.entities.Quest.list('-date', 1000);
        
        const decryptedQuests = await Promise.all(
          allQuests.map(async (quest) => {
            if (!quest.isLongTermProject) return null;
            
            try {
              const { data: decrypted } = await base44.functions.invoke('decryptQuestData', {
                encryptedTitle: quest.title,
                encryptedActionHint: quest.actionHint
              });
              
              return {
                ...quest,
                title: decrypted.title,
                actionHint: decrypted.actionHint
              };
            } catch (error) {
              console.error('解密失败:', error);
              return quest;
            }
          })
        );
        
        return decryptedQuests.filter(q => q !== null);
      }
    },
    staleTime: 30000,
    enabled: user !== undefined
  });

  const longTermQuests = quests.filter(q => q.isLongTermProject);

  const questsByDate = longTermQuests.reduce((acc, quest) => {
    const dateKey = quest.date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(quest);
    return acc;
  }, {});

  const sortedDates = Object.keys(questsByDate).sort((a, b) => new Date(a) - new Date(b));

  const handleAddTask = async () => {
    if (!newTaskInput.trim() || !selectedDate || isAddingTask) return;

    setIsAddingTask(true);

    try {
      const { prompt, schema } = getCalendarAddTaskPrompt(language, newTaskInput.trim());

      const { data: result } = await base44.functions.invoke('callDeepSeek', {
        prompt: prompt,
        response_json_schema: schema
      });

      console.log('生成的RPG标题:', result.title);

      let user = null;
      try {
        user = await base44.auth.me();
      } catch {
        // 访客模式
      }

      if (!user) {
        addGuestEntity('quests', {
          title: result.title,
          actionHint: newTaskInput.trim(),
          date: format(selectedDate, 'yyyy-MM-dd'),
          difficulty: 'S',
          rarity: 'Epic',
          status: 'todo',
          source: 'longterm',
          isLongTermProject: true,
          tags: []
        });
      } else {
        const { data: encryptedData } = await base44.functions.invoke('encryptQuestData', {
          title: result.title,
          actionHint: newTaskInput.trim()
        });

        await base44.entities.Quest.create({
          title: encryptedData.encryptedTitle,
          actionHint: encryptedData.encryptedActionHint,
          date: format(selectedDate, 'yyyy-MM-dd'),
          difficulty: 'S',
          rarity: 'Epic',
          status: 'todo',
          source: 'longterm',
          isLongTermProject: true,
          tags: []
        });
      }

      await playSound('projectAdded');
      queryClient.invalidateQueries(['quests']);
      setShowAddTaskModal(false);
      setNewTaskInput('');
    } catch (error) {
      console.error('添加任务失败:', error);
      alert(t('calendar_add_task_failed'));
    }

    setIsAddingTask(false);
  };

  const handleDeleteAll = async () => {
    if (isDeleting) return;

    setIsDeleting(true);

    const loadingAudio = await playSound('loadingLoop', { loop: true });

    try {
      let user = null;
      try {
        user = await base44.auth.me();
      } catch {
        // 访客模式
      }

      if (!user) {
        const localQuests = getGuestData('quests');
        const nonLongTermQuests = localQuests.filter(q => !q.isLongTermProject);
        localStorage.setItem('adventurer_guest_quests', JSON.stringify(nonLongTermQuests));
      } else {
        for (const quest of longTermQuests) {
          await base44.entities.Quest.delete(quest.id);
        }
      }

      if (loadingAudio) stopSound(loadingAudio);
      await playSound('projectDeleted');

      queryClient.invalidateQueries(['quests']);
      setShowDeleteConfirm(false);
    } catch (error) {
      if (loadingAudio) stopSound(loadingAudio);
      console.error('删除失败:', error);
      alert(language === 'zh' ? '删除失败，请重试' : 'Delete failed, please retry');
    }

    setIsDeleting(false);
  };

  const isToday = (dateStr) => {
    return isSameDay(new Date(dateStr), new Date());
  };

  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr);
    if (language === 'zh') {
      return format(date, 'M月d日');
    } else {
      return format(date, 'MMM d');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/quest-board')}
            className="mb-4 px-4 py-2 font-black uppercase flex items-center gap-2"
            style={{
              backgroundColor: 'var(--color-cyan)',
              border: '4px solid var(--border-primary)',
              boxShadow: '4px 4px 0px var(--border-primary)'
            }}
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={3} />
            {language === 'zh' ? '返回委托板' : 'Back to Quest Board'}
          </button>

          <div className="text-center">
            <h1 className="text-3xl font-black uppercase mb-2">{t('calendar_title')}</h1>
            <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>
              {t('calendar_total_quests')} {longTermQuests.length} {t('calendar_epic_quests')}
            </p>
          </div>
        </div>

        {!user && (
          <div 
            className="mb-4 p-3 animate-pulse"
            style={{
              backgroundColor: 'var(--color-yellow)',
              border: '3px solid var(--border-primary)'
            }}
          >
            <p className="font-black text-center" style={{ color: 'var(--text-primary)' }}>
              ⚠️ {language === 'zh' 
                ? '游客模式：刷新页面后数据会丢失，建议登录保存' 
                : 'Guest Mode: Data will be lost on refresh, please login to save'}
            </p>
          </div>
        )}

        {longTermQuests.length === 0 ? (
          <div
            className="p-8 text-center"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '5px solid var(--border-primary)',
              boxShadow: '8px 8px 0px var(--border-primary)'
            }}
          >
            <CalendarIcon className="w-16 h-16 mx-auto mb-4" strokeWidth={3} style={{ color: 'var(--text-secondary)' }} />
            <h3 className="text-xl font-black uppercase mb-2">{t('calendar_empty_title')}</h3>
            <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>{t('calendar_empty_hint')}</p>
          </div>
        ) : (
          <>
            {longTermQuests.length > 0 && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full mb-4 py-3 font-black uppercase flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--color-orange)',
                  color: 'var(--text-inverse)',
                  border: '4px solid var(--border-primary)',
                  boxShadow: '5px 5px 0px var(--border-primary)'
                }}
              >
                <Trash2 className="w-5 h-5" strokeWidth={3} />
                {t('calendar_delete_all')}
              </button>
            )}

            <div className="space-y-4">
              {sortedDates.map(dateStr => {
                const tasksForDate = questsByDate[dateStr];
                const completedCount = tasksForDate.filter(q => q.status === 'done').length;
                const isExpanded = selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateStr;

                return (
                  <div
                    key={dateStr}
                    style={{
                      backgroundColor: isToday(dateStr) ? 'var(--color-yellow)' : 'var(--bg-secondary)',
                      border: '5px solid var(--border-primary)',
                      boxShadow: '6px 6px 0px var(--border-primary)'
                    }}
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setSelectedDate(isExpanded ? null : new Date(dateStr))}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="w-6 h-6" strokeWidth={3} />
                          <div>
                            <p className="font-black text-lg">
                              {formatDateDisplay(dateStr)}
                              {isToday(dateStr) && (
                                <span className="ml-2 px-2 py-1 text-sm" style={{ backgroundColor: 'var(--color-orange)', color: 'var(--text-inverse)' }}>
                                  {t('calendar_today')}
                                </span>
                              )}
                            </p>
                            <p className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {t('calendar_completed')} {completedCount}/{tasksForDate.length} {t('calendar_items')}
                            </p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6" strokeWidth={3} />
                        ) : (
                          <ChevronDown className="w-6 h-6" strokeWidth={3} />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: '4px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)' }}>
                        <div className="p-4">
                          <button
                            onClick={() => setShowAddTaskModal(true)}
                            className="w-full mb-4 py-3 font-black uppercase flex items-center justify-center gap-2"
                            style={{
                              backgroundColor: 'var(--color-cyan)',
                              border: '3px solid var(--border-primary)',
                              boxShadow: '3px 3px 0px var(--border-primary)'
                            }}
                          >
                            <Plus className="w-5 h-5" strokeWidth={3} />
                            {t('calendar_add_task')}
                          </button>

                          <div className="space-y-3">
                            {tasksForDate.map(quest => (
                              <div
                                key={quest.id}
                                className="p-3"
                                style={{
                                  backgroundColor: 'var(--bg-secondary)',
                                  border: '3px solid var(--border-primary)'
                                }}
                              >
                                <p className="font-black mb-1">{quest.title}</p>
                                <p className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>
                                  {quest.actionHint}
                                </p>
                                <p className="font-bold text-sm mt-2">
                                  {quest.status === 'done' ? t('calendar_status_done') : t('calendar_status_pending')}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowAddTaskModal(false)}
        >
          <div
            className="w-full max-w-md p-6"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '5px solid var(--border-primary)',
              boxShadow: '10px 10px 0px var(--border-primary)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-2xl font-black uppercase mb-4">{t('calendar_add_task_title')}</h3>
            <p className="font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>
              {selectedDate && formatDateDisplay(format(selectedDate, 'yyyy-MM-dd'))}
            </p>

            <div className="mb-4">
              <label className="block font-bold uppercase mb-2">{t('calendar_task_content_label')}</label>
              <textarea
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                placeholder={t('calendar_task_placeholder')}
                rows={3}
                className="w-full px-3 py-2 font-bold resize-none"
                style={{
                  border: '3px solid var(--border-primary)',
                  backgroundColor: 'var(--bg-primary)'
                }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddTaskModal(false)}
                disabled={isAddingTask}
                className="flex-1 py-3 font-black uppercase"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '3px solid var(--border-primary)'
                }}
              >
                {t('common_cancel')}
              </button>
              <button
                onClick={handleAddTask}
                disabled={!newTaskInput.trim() || isAddingTask}
                className="flex-1 py-3 font-black uppercase flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--color-cyan)',
                  border: '3px solid var(--border-primary)',
                  boxShadow: '3px 3px 0px var(--border-primary)',
                  opacity: (!newTaskInput.trim() || isAddingTask) ? 0.5 : 1
                }}
              >
                {isAddingTask ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                    {t('calendar_adding')}
                  </>
                ) : (
                  t('calendar_confirm_add')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-md p-6"
            style={{
              backgroundColor: 'var(--color-orange)',
              border: '5px solid var(--border-primary)',
              boxShadow: '10px 10px 0px var(--border-primary)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-2xl font-black uppercase mb-4" style={{ color: 'var(--text-inverse)' }}>
              {t('calendar_confirm_delete_title')}
            </h3>
            <p className="font-bold mb-4" style={{ color: 'var(--text-inverse)' }}>
              {t('calendar_delete_warning')} {longTermQuests.length} {language === 'zh' ? '项史诗委托' : 'epic quests'}
            </p>
            <p className="font-black mb-6" style={{ color: 'var(--text-inverse)' }}>
              {t('calendar_delete_cannot_undo')}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-3 font-black uppercase"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '3px solid var(--border-primary)'
                }}
              >
                {t('common_cancel')}
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="flex-1 py-3 font-black uppercase flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  color: 'var(--text-inverse)',
                  border: '3px solid var(--border-primary)',
                  opacity: isDeleting ? 0.7 : 1
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                    {language === 'zh' ? '删除中...' : 'Deleting...'}
                  </>
                ) : (
                  t('common_confirm')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}