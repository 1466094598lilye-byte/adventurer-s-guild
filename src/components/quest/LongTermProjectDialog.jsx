import { useState } from 'react';
import { X, Loader2, ChevronDown, ChevronUp, Edit2, Calendar as CalendarIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { useLanguage } from '@/components/LanguageContext';
import { getLongTermParsingPrompt } from '@/components/prompts';

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

      console.log('=== AI 解析结果 ===');
      console.log('任务数量:', result.tasks?.length || 0);
      console.log('任务详情:', result.tasks);

      setParsedQuests(result.tasks || []);
      
      // 解析完成后播放音效
      if (result.tasks && result.tasks.length > 0) {
        const parseCompleteAudio = new Audio('https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%A4%A7%E9%A1%B9%E7%9B%AE%E5%BC%B9%E5%87%BA%E9%9F%B3%E6%95%88.mp3');
        parseCompleteAudio.play().catch(() => {});
      }
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
      console.log('=== 开始创建大项目任务 ===');
      console.log('待创建任务数量:', parsedQuests.length);
      console.log('当前日期（完整）:', new Date());
      console.log('当前日期（格式化）:', format(new Date(), 'yyyy-MM-dd'));
      
      const projectName = language === 'zh' 
        ? `${format(new Date(), 'yyyy年MM月')}大项目计划`
        : `${format(new Date(), 'MMMM yyyy')} Long-term Project`;
      
      const projectDescription = `${parsedQuests.length} ${language === 'zh' ? '项史诗委托' : 'epic quests'}`;
      
      // 加密项目名称和描述
      const { data: encryptedProject } = await base44.functions.invoke('encryptProjectData', {
        projectName: projectName,
        description: projectDescription
      });
      
      const project = await base44.entities.LongTermProject.create({
        projectName: encryptedProject.encryptedProjectName,
        description: encryptedProject.encryptedDescription,
        status: 'active'
      });

      console.log('项目创建成功，ID:', project.id);

      const currentYear = new Date().getFullYear();
      const todayStr = format(new Date(), 'yyyy-MM-dd'); // 使用格式化的今天日期字符串

      for (const quest of parsedQuests) {
        console.log('\n--- 处理任务 ---');
        console.log('原始 quest.date:', quest.date);
        console.log('任务标题:', quest.title);
        
        if (!quest.date) {
          console.error('❌ 任务缺少 date 字段！', quest);
          alert(`任务 "${quest.title}" 缺少日期字段，跳过创建`);
          continue;
        }

        let fullDate = quest.date;
        
        if (quest.date.length === 5 && quest.date.includes('-')) {
          console.log('检测到 MM-DD 格式，开始转换...');
          fullDate = `${currentYear}-${quest.date}`;
          console.log('添加当前年份后:', fullDate);
          
          // 将字符串日期转为Date对象，然后再转回字符串，确保格式一致
          const questDateObj = new Date(fullDate + 'T00:00:00');
          const todayDateObj = new Date(todayStr + 'T00:00:00');
          
          console.log('任务日期对象:', questDateObj);
          console.log('今天日期对象:', todayDateObj);
          console.log('任务日期 < 今天？', questDateObj < todayDateObj);
          
          if (questDateObj < todayDateObj) {
            fullDate = `${currentYear + 1}-${quest.date}`;
            console.log('⚠️ 日期已过，使用明年:', fullDate);
          } else {
            console.log('✅ 日期是今天或未来，使用今年:', fullDate);
          }
        } else {
          console.log('非标准 MM-DD 格式，直接使用:', fullDate);
        }
        
        console.log('✅ 最终日期:', fullDate);
        console.log('今天日期:', todayStr);
        console.log('是否是今天？', fullDate === todayStr);
        
        // 加密任务标题和内容
        const { data: encryptedQuest } = await base44.functions.invoke('encryptQuestData', {
          title: quest.title,
          actionHint: quest.actionHint
        });
        
        const createdQuest = await base44.entities.Quest.create({
          title: encryptedQuest.encryptedTitle,
          actionHint: encryptedQuest.encryptedActionHint,
          date: fullDate,
          difficulty: quest.difficulty,
          rarity: quest.rarity,
          status: 'todo',
          source: 'longterm',
          isLongTermProject: true,
          longTermProjectId: project.id,
          tags: []
        });
        
        console.log('✅ 任务创建成功！');
        console.log('  - ID:', createdQuest.id);
        console.log('  - date:', createdQuest.date);
        console.log('  - 是否是今天的任务？', createdQuest.date === todayStr);
      }

      console.log('=== 所有任务创建完成 ===');
      console.log('今天的日期是:', todayStr);

      // 播放加入委托板音效
      const addToBoardAudio = new Audio('https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%A4%A7%E9%A1%B9%E7%9B%AE%E5%8A%A0%E5%85%A5%E5%A7%94%E6%89%98%E6%9D%BF.mp3');
      addToBoardAudio.play().catch(() => {});

      if (onQuestsCreated) {
        onQuestsCreated(parsedQuests.length);
      }
      
      onClose();
    } catch (error) {
      console.error('❌ 创建任务失败:', error);
      alert(t('questboard_alert_create_quest_failed'));
    }
    setIsCreating(false);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return language === 'zh' ? '无日期' : 'No date';
    
    if (dateStr.length === 5 && dateStr.includes('-')) {
      if (language === 'zh') {
        return dateStr.replace('-', '月') + '日';
      } else {
        const [month, day] = dateStr.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${day}`;
      }
    }
    
    return dateStr;
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
                            {formatDateDisplay(quest.date)}
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
                          value={quest.date || ''}
                          onChange={(e) => handleUpdateQuest(index, 'date', e.target.value)}
                          className="w-full px-3 py-2 font-bold text-sm"
                          style={{ border: '2px solid #000' }}
                          placeholder="MM-DD"
                        />
                        <p className="text-xs font-bold mt-1" style={{ color: '#666' }}>
                          💡 {language === 'zh' ? '系统会自动补全年份' : 'System will auto-complete the year'}
                        </p>
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