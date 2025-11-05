import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Plus, Trash2, Edit2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function LongTermCalendar({ onClose, onQuestsUpdated }) {
  const [longTermQuests, setLongTermQuests] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateQuests, setSelectedDateQuests] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDateDetail, setShowDateDetail] = useState(false);
  const [editingQuest, setEditingQuest] = useState(null);

  useEffect(() => {
    loadLongTermQuests();
  }, []);

  const loadLongTermQuests = async () => {
    try {
      const quests = await base44.entities.Quest.filter({ isLongTermProject: true }, '-date', 500);
      setLongTermQuests(quests);
    } catch (error) {
      console.error('加载大项目任务失败:', error);
    }
  };

  // 计算日历覆盖的日期范围
  const getCalendarRange = () => {
    if (longTermQuests.length === 0) {
      const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
      return { start, end, minDate: null, maxDate: null };
    }

    const dates = longTermQuests.map(q => parseISO(q.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });

    return { start, end, minDate, maxDate };
  };

  const { start, end, minDate, maxDate } = getCalendarRange();
  const days = eachDayOfInterval({ start, end });

  // 获取特定日期的任务
  const getQuestsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return longTermQuests.filter(q => q.date === dateStr);
  };

  const handleDateClick = (date) => {
    const quests = getQuestsForDate(date);
    if (quests.length > 0) {
      setSelectedDate(date);
      setSelectedDateQuests(quests);
      setShowDateDetail(true);
    }
  };

  const handleDeleteAllProjects = async () => {
    try {
      for (const quest of longTermQuests) {
        await base44.entities.Quest.delete(quest.id);
      }
      onQuestsUpdated();
      onClose();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleDeleteQuest = async (questId) => {
    try {
      await base44.entities.Quest.delete(questId);
      await loadLongTermQuests();
      
      // 更新选中日期的任务列表
      if (selectedDate) {
        const updatedQuests = getQuestsForDate(selectedDate);
        setSelectedDateQuests(updatedQuests);
        if (updatedQuests.length === 0) {
          setShowDateDetail(false);
        }
      }
      
      onQuestsUpdated();
    } catch (error) {
      console.error('删除任务失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleEditQuest = async (quest, newActionHint) => {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `为任务"${newActionHint}"生成RPG风格标题（【2字类型】+ 7字标题）`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" }
          }
        }
      });

      await base44.entities.Quest.update(quest.id, {
        title: result.title,
        actionHint: newActionHint
      });

      await loadLongTermQuests();
      
      // 更新选中日期的任务列表
      if (selectedDate) {
        const updatedQuests = getQuestsForDate(selectedDate);
        setSelectedDateQuests(updatedQuests);
      }
      
      setEditingQuest(null);
      onQuestsUpdated();
    } catch (error) {
      console.error('更新任务失败:', error);
      alert('更新失败，请重试');
    }
  };

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl w-full my-8 p-6"
        style={{
          backgroundColor: '#9B59B6',
          border: '5px solid #000',
          boxShadow: '12px 12px 0px #000'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-12 h-12 flex items-center justify-center"
          style={{
            backgroundColor: '#FF6B35',
            border: '4px solid #000',
            boxShadow: '5px 5px 0px #000'
          }}
        >
          <X className="w-7 h-7 text-white" strokeWidth={4} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black uppercase text-white mb-2">
            📅 限时活动日程表 📅
          </h2>
          {longTermQuests.length > 0 && (
            <p className="font-bold text-white text-sm">
              共 {longTermQuests.length} 项史诗委托
              {minDate && maxDate && ` · ${format(minDate, 'MM月dd日')} - ${format(maxDate, 'MM月dd日')}`}
            </p>
          )}
        </div>

        {longTermQuests.length === 0 ? (
          /* Empty State */
          <div 
            className="p-8 text-center"
            style={{
              backgroundColor: '#FFE66D',
              border: '4px solid #000'
            }}
          >
            <CalendarIcon className="w-16 h-16 mx-auto mb-4" strokeWidth={3} />
            <p className="font-black text-xl mb-2">暂无限时活动</p>
            <p className="font-bold text-sm">
              使用"大项目规划"添加长期计划后，这里会显示日程表
            </p>
          </div>
        ) : (
          <>
            {/* Month Navigation */}
            <div 
              className="mb-4 p-3 flex items-center justify-between"
              style={{
                backgroundColor: '#FFE66D',
                border: '4px solid #000'
              }}
            >
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="px-4 py-2 font-black"
                style={{
                  backgroundColor: '#FFF',
                  border: '3px solid #000',
                  boxShadow: '3px 3px 0px #000'
                }}
              >
                ◀
              </button>
              
              <h3 className="font-black text-xl">
                {format(currentMonth, 'yyyy年MM月')}
              </h3>

              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="px-4 py-2 font-black"
                style={{
                  backgroundColor: '#FFF',
                  border: '3px solid #000',
                  boxShadow: '3px 3px 0px #000'
                }}
              >
                ▶
              </button>
            </div>

            {/* Calendar Grid */}
            <div 
              className="mb-4 p-4"
              style={{
                backgroundColor: '#FFF',
                border: '4px solid #000'
              }}
            >
              {/* Week Days Header */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center font-black text-sm py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => {
                  const quests = getQuestsForDate(day);
                  const hasQuests = quests.length > 0;
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isToday = isSameDay(day, new Date());

                  return (
                    <button
                      key={index}
                      onClick={() => hasQuests && handleDateClick(day)}
                      disabled={!hasQuests}
                      className="aspect-square flex flex-col items-center justify-center p-2 relative"
                      style={{
                        backgroundColor: isToday ? '#4ECDC4' : hasQuests ? '#FFE66D' : '#F0F0F0',
                        border: hasQuests ? '3px solid #000' : '2px solid #CCC',
                        boxShadow: hasQuests ? '3px 3px 0px #000' : 'none',
                        opacity: isCurrentMonth ? 1 : 0.3,
                        cursor: hasQuests ? 'pointer' : 'default'
                      }}
                    >
                      <span className="font-black text-sm">
                        {format(day, 'd')}
                      </span>
                      {hasQuests && (
                        <div className="flex gap-1 mt-1">
                          {quests.slice(0, 3).map((_, i) => (
                            <div 
                              key={i}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: '#9B59B6' }}
                            />
                          ))}
                          {quests.length > 3 && (
                            <span className="text-xs font-bold">+{quests.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delete All Button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 font-black uppercase flex items-center justify-center gap-2"
              style={{
                backgroundColor: '#FF6B35',
                color: '#FFF',
                border: '4px solid #000',
                boxShadow: '6px 6px 0px #000'
              }}
            >
              <Trash2 className="w-5 h-5" strokeWidth={3} />
              删除所有大项目任务
            </button>
          </>
        )}

        {/* Date Detail Modal */}
        {showDateDetail && selectedDate && (
          <div 
            className="fixed inset-0 z-60 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
            onClick={() => {
              setShowDateDetail(false);
              setEditingQuest(null);
            }}
          >
            <div 
              className="relative max-w-2xl w-full p-6"
              style={{
                backgroundColor: '#4ECDC4',
                border: '5px solid #000',
                boxShadow: '12px 12px 0px #000'
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
                  backgroundColor: '#FF6B35',
                  border: '4px solid #000',
                  boxShadow: '5px 5px 0px #000'
                }}
              >
                <X className="w-7 h-7" strokeWidth={4} />
              </button>

              <h3 className="text-2xl font-black uppercase text-center mb-4">
                📅 {format(selectedDate, 'MM月dd日')} 的任务
              </h3>

              <div className="space-y-3">
                {selectedDateQuests.map((quest) => (
                  <div 
                    key={quest.id}
                    className="p-4"
                    style={{
                      backgroundColor: '#FFF',
                      border: '4px solid #000'
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
                          style={{ border: '3px solid #000' }}
                        />
                        <button
                          onClick={() => setEditingQuest(null)}
                          className="text-sm font-bold underline"
                        >
                          取消
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
                                  border: '2px solid #000',
                                  textShadow: '1px 1px 0px #000'
                                }}
                              >
                                S
                              </div>
                            </div>
                            <p className="font-black text-lg mb-1 text-purple-800">
                              {quest.title}
                            </p>
                            <p className="text-sm font-bold text-gray-600">
                              {quest.actionHint}
                            </p>
                            <p className="text-xs font-bold mt-2" style={{ color: '#999' }}>
                              状态：{quest.status === 'done' ? '✅ 已完成' : '⏳ 待完成'}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingQuest(quest.id)}
                              className="p-2"
                              style={{
                                backgroundColor: '#FFE66D',
                                border: '3px solid #000'
                              }}
                            >
                              <Edit2 className="w-4 h-4" strokeWidth={3} />
                            </button>
                            <button
                              onClick={() => handleDeleteQuest(quest.id)}
                              className="p-2"
                              style={{
                                backgroundColor: '#FF6B35',
                                border: '3px solid #000'
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

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div 
            className="fixed inset-0 z-60 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div 
              className="relative max-w-md w-full p-6"
              style={{
                backgroundColor: '#FF6B35',
                border: '5px solid #000',
                boxShadow: '12px 12px 0px #000'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-white" strokeWidth={3} />
                
                <h3 className="text-2xl font-black uppercase text-white mb-4">
                  确认删除？
                </h3>

                <div 
                  className="mb-6 p-4 text-left"
                  style={{
                    backgroundColor: '#FFF',
                    border: '3px solid #000'
                  }}
                >
                  <p className="font-bold mb-2">
                    此操作将删除所有 {longTermQuests.length} 项大项目任务
                  </p>
                  <p className="text-sm font-bold" style={{ color: '#C44569' }}>
                    ⚠️ 此操作不可恢复！
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 font-black uppercase"
                    style={{
                      backgroundColor: '#FFF',
                      border: '4px solid #000',
                      boxShadow: '4px 4px 0px #000'
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDeleteAllProjects}
                    className="flex-1 py-3 font-black uppercase text-white"
                    style={{
                      backgroundColor: '#000',
                      border: '4px solid #FFF',
                      boxShadow: '4px 4px 0px #FFF'
                    }}
                  >
                    确认删除
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