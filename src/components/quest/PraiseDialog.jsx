import { useState, useEffect } from 'react';
import { X, BookMarked, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PraiseDialog({ quest, onClose, onAddNote }) {
  const [praise, setPraise] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generatePraise();
  }, []);

  const generatePraise = async () => {
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `你是一位真正与学生同行、见证他们成长的人生导师。学生刚完成了一项任务，你需要让他们感受到：他们的奋斗过程被真正地"看见"和"理解"了。

任务信息：
- 标题：${quest.title}
- 实际行动：${quest.actionHint}
- 难度：${quest.difficulty}

【你的使命】：
深入剖析并赞扬他们在完成任务过程中**所付出的具体努力、展现的非凡品质和所实现的自我突破**。让他们感受到那种"我靠，我被看见了！"的兴奋感。

【核心要求】：
1. **简洁有力**：2-3句话，60-80字。每一句都直击要害。
2. **看见过程**：明确指出任务背后需要克服的"不容易"或"局限"（如早起的睡意、专注的难度、行动的阻力）。
3. **具体品质**：精准识别并命名他们展现的品质：
   - 毅力/坚持（持续行动、抵御惰性）
   - 智力/思考力（解决问题、制定策略）
   - 专注力（长时间投入、抵制干扰）
   - 行动力/执行力（说干就干、立即响应）
   - 自律（按计划进行、抵制诱惑）
   - 耐心（处理繁琐、细致打磨）
4. **见证感语言**：多用"我看到了你..."、"你展现了..."、"这需要..."等句式。
5. **展望价值**：简短点出这份投入对未来成长的意义。
6. **真诚适度**：避免"人生转折"等夸张词，但要有温度和力量。

【示例】：
- 任务：跑步5km@07:00
  ✓ "我看到了你克服睡意在破晓坚持长跑，这需要非凡的毅力。这份对自我极限的挑战，会让你在未来无所畏惧。"

- 任务：去超市买菜
  ✓ "你展现了对生活的用心经营，把日常琐事也做得井井有条。这份耐心和细致，正是生活掌控力的体现。"

- 任务：读书1小时
  ✓ "在喧嚣的世界里，我看到了你选择沉浸于阅读，这展现了非凡的专注力。每一次这样的投入，都在为你的智慧添砖加瓦。"

- 任务：完成项目报告
  ✓ "面对复杂问题，我看到了你的思考力和执行力。这种拆解难题、逐一攻克的能力，会让你越来越从容。"

【禁止】：
- 空泛表扬："你很棒"、"做得好"
- 片汤话："你完成了XX，展现了XX品质"
- 夸张词："人生转折点"、"传奇"、"彻底改变"

请为这位冒险者写2-3句充满见证感的肯定（60-80字）：`,
        response_json_schema: {
          type: "object",
          properties: {
            praise: { type: "string" }
          }
        }
      });

      setPraise(result.praise || '我看到了你完成这个任务的努力。这份坚持正在让你变得更强大。');
    } catch (error) {
      setPraise('我看到了你完成这个任务的努力。这份坚持正在让你变得更强大。');
    }
    setLoading(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div 
        className="relative max-w-lg w-full p-6 transform rotate-1"
        style={{
          backgroundColor: '#FFE66D',
          border: '5px solid #000',
          boxShadow: '10px 10px 0px #000'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-10 h-10 flex items-center justify-center"
          style={{
            backgroundColor: '#FF6B35',
            border: '4px solid #000',
            boxShadow: '4px 4px 0px #000'
          }}
        >
          <X className="w-6 h-6" strokeWidth={4} />
        </button>

        {/* Star Icon */}
        <div className="flex justify-center mb-4">
          <div 
            className="w-20 h-20 flex items-center justify-center transform -rotate-12"
            style={{
              backgroundColor: '#4ECDC4',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            <Star className="w-12 h-12" fill="#FFE66D" strokeWidth={3} />
          </div>
        </div>

        {/* Title */}
        <h2 
          className="text-2xl font-black uppercase text-center mb-4"
          style={{
            color: '#000',
            textShadow: '3px 3px 0px rgba(255,255,255,0.5)'
          }}
        >
          委托完成！
        </h2>

        {/* Quest Info */}
        <div 
          className="mb-4 p-3"
          style={{
            backgroundColor: '#FFF',
            border: '3px solid #000'
          }}
        >
          <p className="font-black text-sm uppercase mb-1">{quest.title}</p>
          <p className="font-bold text-xs" style={{ color: '#666' }}>
            {quest.actionHint}
          </p>
        </div>

        {/* Praise Text */}
        <div 
          className="mb-6 p-4 min-h-[100px]"
          style={{
            backgroundColor: '#FFF',
            border: '3px solid #000'
          }}
        >
          {loading ? (
            <p className="text-center font-bold text-gray-500">工会评议官正在记录中...</p>
          ) : (
            <p className="font-bold leading-relaxed" style={{ color: '#000' }}>
              {praise}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              onAddNote();
              onClose();
            }}
            className="flex-1 py-3 px-4 font-black uppercase text-sm flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#C44569',
              color: '#FFF',
              border: '4px solid #000',
              boxShadow: '4px 4px 0px #000'
            }}
          >
            <BookMarked className="w-5 h-5" strokeWidth={3} />
            添加复盘
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 font-black uppercase text-sm"
            style={{
              backgroundColor: '#4ECDC4',
              border: '4px solid #000',
              boxShadow: '4px 4px 0px #000'
            }}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}