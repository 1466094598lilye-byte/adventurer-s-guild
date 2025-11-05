
import { useState } from 'react';
import { X, Loader2, Sparkles, Calendar, Edit2, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format, addDays, parse } from 'date-fns';

export default function LongTermProjectDialog({ onClose, onQuestsCreated }) {
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedQuests, setParsedQuests] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleParse = async () => {
    if (!textInput.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `你是【星陨纪元冒险者工会】的首席史诗书记官。冒险者粘贴了一段长期计划文本，你需要智能解析并生成任务列表。

用户输入：
${textInput.trim()}

你的任务：
1. 识别文本中的所有独立任务
2. **为每个任务智能匹配日期（只需要月和日，格式：MM-DD）**
   - 不要管年份！只输出月和日，例如："12-25"、"01-05"
   - 识别相对时间（如"周一"、"明天"）并转换为月日
   - 识别绝对时间（如"12月25日"、"1月5号"）
   
3. **为每个任务生成专属的RPG史诗风格标题**：

【标题生成规则】：
- 格式：【动作类型】+ 7字幻想描述
- 动作类型必须从以下选择：征讨、探索、铸造、研习、护送、调查、收集、锻造、外交、记录、守护、净化、寻宝、祭祀、谈判
- 7字描述必须充满幻想色彩，把现实任务转化为史诗叙事
- **绝对禁止使用"任务"二字！**

【标题转化示例】：
"准备会议PPT" → "【铸造】炼制议会演说宝典"
"写周报" → "【记录】编撰冒险周志卷轴"
"联系客户" → "【外交】觐见商贸联盟使节"
"道交菜单简要介绍" → "【研习】研读御膳房秘传食谱"
"整理文档" → "【收集】汇编远古知识卷轴"
"开会讨论" → "【议会】召开圆桌战术会议"
"修改方案" → "【锻造】重铸战略蓝图石板"
"发邮件" → "【外交】传递星陨纪元密信"

4. 保留原始任务描述作为 actionHint（完全保持原样）
5. 这些是"大项目"任务，难度统一设为 S，稀有度设为 Epic

**重要**：日期只输出 MM-DD 格式，不要年份！

请返回任务数组（按日期排序）：`,
        response_json_schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { 
                    type: "string", 
                    description: "必须是RPG幻想风格！格式：【动作类型】+7字幻想描述。例如：【征讨】讨伐暗影深渊巨兽。绝对不能是【任务】开头！"
                  },
                  actionHint: { 
                    type: "string", 
                    description: "原始任务描述，保持用户输入的原样"
                  },
                  date: { 
                    type: "string", 
                    description: "Format: MM-DD (只有月和日，不要年份！)" 
                  },
                  difficulty: { type: "string", enum: ["S"] },
                  rarity: { type: "string", enum: ["Epic"] }
                },
                required: ["title", "actionHint", "date", "difficulty", "rarity"]
              }
            }
          },
          required: ["tasks"]
        }
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
      alert('解析失败，请重试');
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
    if (parsedQuests.length === 0) return;

    try {
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
          tags: []
        });
      }

      onQuestsCreated(parsedQuests.length);
      onClose();
    } catch (error) {
      console.error('创建任务失败:', error);
      alert('创建任务失败，请重试');
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
          🎯 大项目规划 🎯
        </h2>
        <p className="text-center font-bold text-white mb-6 text-sm">
          粘贴你的长期计划，冒险者工会将自动分配到每日委托板
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
                placeholder="粘贴你的长期计划...&#10;&#10;例如：&#10;周一：完成项目方案设计&#10;周二：与团队讨论方案&#10;周三：修改并提交方案&#10;12月25日：准备年终总结"
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
                  工会管理员正在更新委托板...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" strokeWidth={3} />
                  开始解析
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
                  识别到 {parsedQuests.length} 项史诗委托
                </h3>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setParsedQuests([]);
                  }}
                  className="text-sm font-bold underline"
                >
                  重新输入
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
                            日期：
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
                            RPG 史诗标题：
                          </label>
                          <input
                            type="text"
                            value={quest.title}
                            onChange={(e) => handleEditQuest(i, 'title', e.target.value)}
                            placeholder="例如：【征讨】讨伐暗影深渊巨兽"
                            className="w-full px-3 py-2 font-bold"
                            style={{ border: '2px solid #000' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase mb-1">
                            原始任务内容：
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
                          完成编辑
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 flex-shrink-0" strokeWidth={3} />
                              <span className="font-black text-sm">
                                {format(new Date(quest.date), 'MM月dd日')}
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
                              任务内容：{quest.actionHint}
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
              disabled={parsedQuests.length === 0}
              className="w-full py-4 font-black uppercase text-lg"
              style={{
                backgroundColor: '#FFE66D',
                border: '4px solid #000',
                boxShadow: '6px 6px 0px #000',
                opacity: parsedQuests.length === 0 ? 0.5 : 1
              }}
            >
              确认并添加到委托板
            </button>
          </>
        )}
      </div>
    </div>
  );
}
