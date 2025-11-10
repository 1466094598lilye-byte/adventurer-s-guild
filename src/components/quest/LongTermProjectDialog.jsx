import { useState } from 'react';
import { X, Loader2, ChevronDown, ChevronUp, Edit2, Calendar as CalendarIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { useLanguage } from '@/components/LanguageContext';
import { getLongTermParsingPrompt } from '@/components/prompts';
import { obfuscateQuest } from '@/utils';

export default function LongTermProjectDialog({ onClose, onQuestsCreated }) {
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedQuests, setParsedQuests] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const { language, t } = useLanguage();

  const handleParse = async () => {
    if (!textInput.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const { prompt, schema } = getLongTermParsingPrompt(language, textInput.trim());
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: schema
      });

      setParsedQuests(result.tasks || []);
    } catch (error) {
      console.error('解析失败:', error);
      alert(t('questboard_alert_task_parse_failed', { message: error.message || t('common_try_again') }));
    }
    setIsProcessing(false);
  };

  const handleUpdateQuest = (index, field, value) => {
    const updated = [...parsedQuests];
    updated[index] = { ...updated[index], [field]: value };
    setParsedQuests(updated);
  };

  const handleDeleteQuest = (index) => {
    setParsedQuests(parsedQuests.filter((_, i) => i !== index));
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  const handleConfirm = async () => {
    if (parsedQuests.length === 0 || isCreating) return;
    
    setIsCreating(true);
    try {
      const projectName = language === 'zh' 
        ? `${format(new Date(), 'yyyy年MM月')}大项目计划`
        : `${format(new Date(), 'MMMM yyyy')} Long-term Project`;
      
      const project = await base44.entities.LongTermProject.create({
        projectName: projectName,
        description: `${parsedQuests.length} ${language === 'zh' ? '项史诗委托' : 'epic quests'}`,
        status: 'active'
      });

      for (const quest of parsedQuests) {
        // 混淆后再创建
        const obfuscatedQuest = obfuscateQuest({
          title: quest.title,
          actionHint: quest.actionHint,
          date: quest.date,
          difficulty: quest.difficulty,
          rarity: quest.rarity,
          status: 'todo',
          source: 'longterm',
          isLongTermProject: true,
          longTermProjectId: project.id,
          tags: []
        });
        
        await base44.entities.Quest.create(obfuscatedQuest);
      }

      if (onQuestsCreated) {
        onQuestsCreated(parsedQuests.length);
      }
      
      onClose();
    } catch (error) {
      console.error('创建任务失败:', error);
      alert(t('questboard_alert_create_quest_failed'));
    }
    setIsCreating(false);
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

        <h2 className="text-3xl font-black uppercase text-center text-white mb-2">
          {t('longterm_title')}
        </h2>
        <p className="text-center font-bold text-white text-sm mb-6">
          {t('longterm_subtitle')}
        </p>

        {parsedQuests.length === 0 ? (
          <div>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t('longterm_placeholder')}
              rows={12}
              className="w-full px-4 py-3 font-bold resize-none mb-4"
              style={{
                backgroundColor: '#FFF',
                border: '4px solid #000',
                boxShadow: '5px 5px 0px #000'
              }}
            />

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
                  <Loader2 className="w-6 h-6 animate-spin" strokeWidth={3} />
                  {t('longterm_parsing')}
                </>
              ) : (
                t('longterm_start_parse')
              )}
            </button>
          </div>
        ) : (
          <div>
            <div
              className="mb-4 p-4"
              style={{
                backgroundColor: '#FFE66D',
                border: '4px solid #000',
                boxShadow: '5px 5px 0px #000'
              }}
            >
              <p className="font-black text-center text-lg">
                {t('longterm_identified')} {parsedQuests.length} {t('longterm_epic_quests')}
              </p>
            </div>

            <div
              className="mb-4 max-h-[400px] overflow-y-auto"
              style={{
                backgroundColor: '#FFF',
                border: '4px solid #000'
              }}
            >
              {parsedQuests.map((quest, index) => (
                <div
                  key={index}
                  style={{
                    borderBottom: index < parsedQuests.length - 1 ? '3px solid #000' : 'none'
                  }}
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarIcon className="w-4 h-4 flex-shrink-0" strokeWidth={3} />
                          <span className="font-black text-sm">
                            {language === 'zh' ? quest.date.slice(5).replace('-', '月') + '日' : quest.date}
                          </span>
                          <span
                            className="px-2 py-0.5 text-xs font-black"
                            style={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
                              color: '#FFF',
                              border: '2px solid #000',
                              textShadow: '1px 1px 0px #000'
                            }}
                          >
                            S
                          </span>
                        </div>
                        <p className="font-black text-sm mb-1 text-purple-800 truncate">
                          {quest.title}
                        </p>
                        <p className="text-xs font-bold text-gray-600 truncate">
                          {quest.actionHint}
                        </p>
                      </div>
                      {expandedIndex === index ? (
                        <ChevronUp className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
                      ) : (
                        <ChevronDown className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
                      )}
                    </div>
                  </div>

                  {expandedIndex === index && (
                    <div className="px-4 pb-4 bg-gray-50" style={{ borderTop: '2px solid #000' }}>
                      <div className="mb-3 mt-3">
                        <label className="block text-xs font-bold uppercase mb-2">
                          {t('longterm_edit_date')}
                        </label>
                        <input
                          type="text"
                          value={quest.date}
                          onChange={(e) => handleUpdateQuest(index, 'date', e.target.value)}
                          className="w-full px-3 py-2 font-bold text-sm"
                          style={{ border: '2px solid #000' }}
                          placeholder="YYYY-MM-DD"
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs font-bold uppercase mb-2">
                          {t('longterm_edit_title')}
                        </label>
                        <input
                          type="text"
                          value={quest.title}
                          onChange={(e) => handleUpdateQuest(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 font-bold text-sm"
                          style={{ border: '2px solid #000' }}
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs font-bold uppercase mb-2">
                          {t('longterm_edit_content')}
                        </label>
                        <textarea
                          value={quest.actionHint}
                          onChange={(e) => handleUpdateQuest(index, 'actionHint', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 font-bold text-sm resize-none"
                          style={{ border: '2px solid #000' }}
                        />
                      </div>

                      <button
                        onClick={() => handleDeleteQuest(index)}
                        className="w-full py-2 font-bold uppercase text-sm"
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

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setParsedQuests([]);
                  setExpandedIndex(null);
                }}
                disabled={isCreating}
                className="flex-1 py-3 font-black uppercase"
                style={{
                  backgroundColor: '#FFF',
                  border: '4px solid #000',
                  boxShadow: '5px 5px 0px #000',
                  opacity: isCreating ? 0.5 : 1
                }}
              >
                {t('longterm_reenter')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isCreating}
                className="flex-1 py-3 font-black uppercase flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#FFE66D',
                  border: '4px solid #000',
                  boxShadow: '5px 5px 0px #000',
                  opacity: isCreating ? 0.7 : 1
                }}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                    {t('longterm_creating')}
                  </>
                ) : (
                  t('longterm_confirm_add')
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}