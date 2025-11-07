
import { useState } from 'react';
import { X, Loader2, Sparkles, Calendar, Edit2, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format, addDays, parse } from 'date-fns';
import { useLanguage } from '@/components/LanguageContext';
import { getLongTermParsingPrompt } from '@/components/prompts';

export default function LongTermProjectDialog({ onClose, onQuestsCreated }) {
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedQuests, setParsedQuests] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isCreating, setIsCreating] = useState(false); // 新增：创建任务的 loading 状态
  const { language, t } = useLanguage();

  const handleParse = async () => {
    if (!textInput.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const { prompt, schema } = getLongTermParsingPrompt(language, textInput);
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: schema
      });

      // 处理返回的任务，补充年份
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1; // 1-indexed
      const currentDay = today.getDate();
      
      const tasksWithFullDate = (result.tasks || []).map(task => {
        const [month, day] = task.date.split('-').map(Number);
        
        let year = currentYear;
        // If the parsed month is earlier than the current month, or
        // if the parsed month is the same as current month but the day is earlier,
        // assume it's for the next year to avoid assigning to a past date.
        if (month < currentMonth || (month === currentMonth && day < currentDay)) {
          year = currentYear + 1;
        }
        
        return {
          ...task,
          date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        };
      });

      setParsedQuests(tasksWithFullDate);
      setShowPreview(true);
    } catch (error) {
      console.error('解析失败:', error);
      alert(language === 'zh' ? '解析失败，请重试' : 'Parsing failed, please retry');
    }
    setIsProcessing(false);
  };

  const handleEditQuest = (index, field, value) => {
    const updated = [...parsedQuests];
    updated[index] = { ...updated[index], [field]: value };
    setParsedQuests(updated);
  };

  const handleDeleteQuest = (index) => {
    setParsedQuests(parsedQuests.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (parsedQuests.length === 0 || isCreating) return;

    setIsCreating(true);
    try {
      // 先创建大项目实体
      const projectName = `${language === 'zh' ? '大项目 - ' : 'Project - '}${format(new Date(), language === 'zh' ? 'yyyy年MM月dd日' : 'MMM dd, yyyy')}`;
      const project = await base44.entities.LongTermProject.create({
        projectName: projectName,
        description: `${language === 'zh' ? '包含' : 'Contains'} ${parsedQuests.length} ${language === 'zh' ? '项任务' : 'tasks'}`,
        status: 'active'
      });

      // 然后创建所有任务，并关联到这个项目
      for (const quest of parsedQuests) {
        await base44.entities.Quest.create({
          title: quest.title,
          actionHint: quest.actionHint,
          date: quest.date,
          difficulty: 'S',
          rarity: 'Epic',
          status: 'todo',
          source: 'longterm',
          isLongTermProject: true,
          longTermProjectId: project.id, // Link to the newly created project
          tags: []
        });
      }

      onQuestsCreated(parsedQuests.length);
      onClose();
    } catch (error) {
      console.error('创建任务失败:', error);
      alert(language === 'zh' ? '创建任务失败，请重试' : 'Failed to create tasks, please retry');
      setIsCreating(false); // Ensure state is reset on error
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <div 
        className="relative max-w-3xl w-full my-8 p-6"
        style={{
          backgroundColor: '#9B59B6',
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
          <X className="w-7 h-7 text-white" strokeWidth={4} />
        </button>

        <h2 className="text-3xl font-black uppercase text-center mb-2 text-white">
          {t('longterm_title')}
        </h2>
        <p className="text-center font-bold text-white mb-6 text-sm">
          {t('longterm_subtitle')}
        </p>

        {!showPreview ? (
          <>
            <div 
              className="mb-4 p-4"
              style={{
                backgroundColor: '#FFE66D',
                border: '4px solid #000'
              }}
            >
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={t('longterm_placeholder')}
                rows={12}
                className="w-full px-4 py-3 font-bold resize-none"
                style={{
                  backgroundColor: '#FFF',
                  border: '3px solid #000'
                }}
              />
            </div>

            <button
              onClick={handleParse}
              disabled={isProcessing || !textInput.trim()}
              className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3"
              style={{
                backgroundColor: '#FFE66D',
                border: '4px solid #000',
                boxShadow: '6px 6px 0px #000',
                opacity: (!textInput.trim() || isProcessing) ? 0.5 : 1
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  {t('longterm_parsing')}
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" strokeWidth={3} />
                  {t('longterm_start_parse')}
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <div 
              className="mb-4 p-4 max-h-[500px] overflow-y-auto"
              style={{
                backgroundColor: '#FFE66D',
                border: '4px solid #000'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black uppercase">
                  {t('longterm_identified')} {parsedQuests.length} {t('longterm_epic_quests')}
                </h3>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setParsedQuests([]);
                  }}
                  className="text-sm font-bold underline"
                >
                  {t('longterm_reenter')}
                </button>
              </div>

              <div className="space-y-3">
                {parsedQuests.map((quest, i) => (
                  <div 
                    key={i}
                    className="p-3"
                    style={{
                      backgroundColor: '#FFF',
                      border: '3px solid #000'
                    }}
                  >
                    {editingIndex === i ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold uppercase mb-1">
                            {t('longterm_edit_date')}
                          </label>
                          <input
                            type="date"
                            value={quest.date}
                            onChange={(e) => handleEditQuest(i, 'date', e.target.value)}
                            className="w-full px-3 py-2 font-bold"
                            style={{ border: '2px solid #000' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase mb-1">
                            {t('longterm_edit_title')}
                          </label>
                          <input
                            type="text"
                            value={quest.title}
                            onChange={(e) => handleEditQuest(i, 'title', e.target.value)}
                            placeholder={language === 'zh' ? '例如：【征讨】讨伐暗影深渊巨兽' : 'e.g.: [Conquest]: Slay Shadow Abyss Beast'}
                            className="w-full px-3 py-2 font-bold"
                            style={{ border: '2px solid #000' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase mb-1">
                            {t('longterm_edit_content')}
                          </label>
                          <input
                            type="text"
                            value={quest.actionHint}
                            onChange={(e) => handleEditQuest(i, 'actionHint', e.target.value)}
                            className="w-full px-3 py-2 font-bold"
                            style={{ border: '2px solid #000' }}
                          />
                        </div>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="w-full py-2 font-bold uppercase text-sm"
                          style={{
                            backgroundColor: '#4ECDC4',
                            border: '2px solid #000'
                          }}
                        >
                          {t('longterm_edit_done')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 flex-shrink-0" strokeWidth={3} />
                              <span className="font-black text-sm">
                                {format(new Date(quest.date), language === 'zh' ? 'MM月dd日' : 'MMM dd')}
                              </span>
                              <div 
                                className="px-2 py-0.5 text-base font-black"
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
                            <p className="font-black text-base mb-1 text-purple-800">{quest.title}</p>
                            <p className="text-sm font-bold text-gray-600">
                              {t('longterm_task_content_label')}{quest.actionHint}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => setEditingIndex(i)}
                              className="p-2"
                              style={{
                                backgroundColor: '#FFE66D',
                                border: '2px solid #000'
                              }}
                            >
                              <Edit2 className="w-4 h-4" strokeWidth={3} />
                            </button>
                            <button
                              onClick={() => handleDeleteQuest(i)}
                              className="p-2"
                              style={{
                                backgroundColor: '#FF6B35',
                                border: '2px solid #000'
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

            <button
              onClick={handleConfirm}
              disabled={parsedQuests.length === 0 || isCreating}
              className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-2"
              style={{
                backgroundColor: '#FFE66D',
                border: '4px solid #000',
                boxShadow: '6px 6px 0px #000',
                opacity: (parsedQuests.length === 0 || isCreating) ? 0.5 : 1
              }}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  {t('longterm_creating')}
                </>
              ) : (
                t('longterm_confirm_add')
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
