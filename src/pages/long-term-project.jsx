import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, ChevronDown, ChevronUp, Calendar as CalendarIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { useLanguage } from '@/components/LanguageContext';
import { getLongTermParsingPrompt } from '@/components/prompts';
import { playSound, stopSound } from '@/components/AudioManager';
import { addGuestEntity } from '@/components/utils/guestData';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function LongTermProject() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedQuests, setParsedQuests] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [user, setUser] = useState(undefined);
  const { language, t } = useLanguage();

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

  const handleParse = async () => {
    if (!textInput.trim() || isProcessing) return;
    
    setIsProcessing(true);

    const loadingAudio = await playSound('loadingLoop', { loop: true });
    
    try {
      const { prompt, schema } = getLongTermParsingPrompt(language, textInput.trim());
      
      const { data: result } = await base44.functions.invoke('callDeepSeek', {
        prompt: prompt,
        response_json_schema: schema
      });

      console.log('=== AI 解析结果 ===');
      console.log('任务数量:', result.tasks?.length || 0);
      console.log('任务详情:', result.tasks);

      setParsedQuests(result.tasks || []);
      
      if (loadingAudio) stopSound(loadingAudio);
      
      if (result.tasks && result.tasks.length > 0) {
        await playSound('projectParsed');
      }
    } catch (error) {
      if (loadingAudio) stopSound(loadingAudio);
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

    const loadingAudio = await playSound('loadingLoop', { loop: true });
    
    try {
      console.log('=== 开始创建大项目任务 ===');
      console.log('待创建任务数量:', parsedQuests.length);
      
      const projectName = language === 'zh' 
        ? `${format(new Date(), 'yyyy年MM月')}大项目计划`
        : `${format(new Date(), 'MMMM yyyy')} Long-term Project`;
      
      const projectDescription = `${parsedQuests.length} ${language === 'zh' ? '项史诗委托' : 'epic quests'}`;
      
      let user = null;
      try {
        user = await base44.auth.me();
      } catch {
        // 访客模式
      }

      let project;
      const currentYear = new Date().getFullYear();
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      if (!user) {
        console.log('访客模式：保存到 localStorage');
        
        project = addGuestEntity('longTermProjects', {
          projectName: projectName,
          description: projectDescription,
          status: 'active'
        });

        console.log('✅ 访客大项目创建成功:', project);

        for (const quest of parsedQuests) {
          console.log('\n--- 处理任务 ---');
          console.log('原始 quest.date:', quest.date);
          
          if (!quest.date) {
            console.error('❌ 任务缺少 date 字段！', quest);
            alert(`任务 "${quest.title}" 缺少日期字段，跳过创建`);
            continue;
          }

          let fullDate = quest.date;
          
          if (quest.date.length === 5 && quest.date.includes('-')) {
            console.log('检测到 MM-DD 格式，开始转换...');
            fullDate = `${currentYear}-${quest.date}`;
            
            const questDateObj = new Date(fullDate + 'T00:00:00');
            const todayDateObj = new Date(todayStr + 'T00:00:00');
            
            if (questDateObj < todayDateObj) {
              fullDate = `${currentYear + 1}-${quest.date}`;
              console.log('⚠️ 日期已过，使用明年:', fullDate);
            } else {
              console.log('✅ 日期是今天或未来，使用今年:', fullDate);
            }
          }
          
          console.log('✅ 最终日期:', fullDate);
          
          addGuestEntity('quests', {
            title: quest.title,
            actionHint: quest.actionHint,
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
        }
      } else {
        const { data: encryptedProject } = await base44.functions.invoke('encryptProjectData', {
          projectName: projectName,
          description: projectDescription
        });
        
        project = await base44.entities.LongTermProject.create({
          projectName: encryptedProject.encryptedProjectName,
          description: encryptedProject.encryptedDescription,
          status: 'active'
        });

        console.log('项目创建成功，ID:', project.id);

        for (const quest of parsedQuests) {
          console.log('\n--- 处理任务 ---');
          console.log('原始 quest.date:', quest.date);
          
          if (!quest.date) {
            console.error('❌ 任务缺少 date 字段！', quest);
            alert(`任务 "${quest.title}" 缺少日期字段，跳过创建`);
            continue;
          }

          let fullDate = quest.date;
          
          if (quest.date.length === 5 && quest.date.includes('-')) {
            console.log('检测到 MM-DD 格式，开始转换...');
            fullDate = `${currentYear}-${quest.date}`;
            
            const questDateObj = new Date(fullDate + 'T00:00:00');
            const todayDateObj = new Date(todayStr + 'T00:00:00');
            
            if (questDateObj < todayDateObj) {
              fullDate = `${currentYear + 1}-${quest.date}`;
              console.log('⚠️ 日期已过，使用明年:', fullDate);
            } else {
              console.log('✅ 日期是今天或未来，使用今年:', fullDate);
            }
          }
          
          console.log('✅ 最终日期:', fullDate);
          
          const { data: encryptedQuest } = await base44.functions.invoke('encryptQuestData', {
            title: quest.title,
            actionHint: quest.actionHint
          });
          
          await base44.entities.Quest.create({
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
        }
      }

      console.log('=== 所有任务创建完成 ===');

      if (loadingAudio) stopSound(loadingAudio);

      await playSound('projectAdded');

      // 刷新委托板数据
      queryClient.invalidateQueries(['quests']);
      
      // 显示成功提示
      toast.success(t('questboard_toast_longterm_quests_added_success', { count: parsedQuests.length }));
      
      // 导航到日历页面
      navigate('/calendar');
    } catch (error) {
      if (loadingAudio) stopSound(loadingAudio);
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
              {t('longterm_title')}
            </h1>
            <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>
              {t('longterm_subtitle')}
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

        {parsedQuests.length === 0 ? (
          <div
            className="p-6"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '5px solid var(--border-primary)',
              boxShadow: '8px 8px 0px var(--border-primary)'
            }}
          >
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t('longterm_placeholder')}
              rows={12}
              className="w-full px-4 py-3 font-bold resize-none mb-4"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '4px solid var(--border-primary)',
                boxShadow: '4px 4px 0px var(--border-primary)'
              }}
            />

            <button
              onClick={handleParse}
              disabled={isProcessing || !textInput.trim()}
              className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3"
              style={{
                backgroundColor: 'var(--color-yellow)',
                border: '4px solid var(--border-primary)',
                boxShadow: '6px 6px 0px var(--border-primary)',
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
                backgroundColor: 'var(--color-yellow)',
                border: '4px solid var(--border-primary)',
                boxShadow: '5px 5px 0px var(--border-primary)'
              }}
            >
              <p className="font-black text-center text-lg">
                {t('longterm_identified')} {parsedQuests.length} {t('longterm_epic_quests')}
              </p>
            </div>

            <div
              className="mb-4 max-h-[400px] overflow-y-auto"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '4px solid var(--border-primary)'
              }}
            >
              {parsedQuests.map((quest, index) => (
                <div
                  key={index}
                  style={{
                    borderBottom: index < parsedQuests.length - 1 ? '3px solid var(--border-primary)' : 'none'
                  }}
                >
                  <div
                    className="p-4 cursor-pointer"
                    style={{
                      backgroundColor: expandedIndex === index ? 'var(--bg-primary)' : 'transparent'
                    }}
                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarIcon className="w-4 h-4 flex-shrink-0" strokeWidth={3} />
                          <span className="font-black">
                            {formatDateDisplay(quest.date)}
                          </span>
                          <span
                            className="px-2 py-0.5 font-black"
                            style={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
                              color: '#FFF',
                              border: '2px solid var(--border-primary)',
                              textShadow: '1px 1px 0px var(--border-primary)'
                            }}
                          >
                            S
                          </span>
                        </div>
                        <p className="font-black mb-1 text-purple-800 truncate">
                          {quest.title}
                        </p>
                        <p className="font-bold text-gray-600 truncate">
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
                    <div className="px-4 pb-4 bg-gray-50" style={{ borderTop: '2px solid var(--border-primary)' }}>
                      <div className="mb-3 mt-3">
                        <label className="block font-bold uppercase mb-2">
                          {t('longterm_edit_date')}
                        </label>
                        <input
                          type="text"
                          value={quest.date || ''}
                          onChange={(e) => handleUpdateQuest(index, 'date', e.target.value)}
                          className="w-full px-3 py-2 font-bold"
                          style={{ border: '2px solid var(--border-primary)' }}
                          placeholder="MM-DD"
                        />
                        <p className="font-bold mt-1" style={{ color: 'var(--text-secondary)' }}>
                          💡 {language === 'zh' ? '系统会自动补全年份' : 'System will auto-complete the year'}
                        </p>
                      </div>

                      <div className="mb-3">
                        <label className="block font-bold uppercase mb-2">
                          {t('longterm_edit_title')}
                        </label>
                        <input
                          type="text"
                          value={quest.title}
                          onChange={(e) => handleUpdateQuest(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 font-bold"
                          style={{ border: '2px solid var(--border-primary)' }}
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block font-bold uppercase mb-2">
                          {t('longterm_edit_content')}
                        </label>
                        <textarea
                          value={quest.actionHint}
                          onChange={(e) => handleUpdateQuest(index, 'actionHint', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 font-bold resize-none"
                          style={{ border: '2px solid var(--border-primary)' }}
                        />
                      </div>

                      <button
                        onClick={() => handleDeleteQuest(index)}
                        className="w-full py-2 font-bold uppercase"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--color-orange)',
                          border: '2px solid var(--color-orange)'
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
                  backgroundColor: 'var(--bg-secondary)',
                  border: '4px solid var(--border-primary)',
                  boxShadow: '5px 5px 0px var(--border-primary)',
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
                  backgroundColor: 'var(--color-yellow)',
                  border: '4px solid var(--border-primary)',
                  boxShadow: '5px 5px 0px var(--border-primary)',
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
