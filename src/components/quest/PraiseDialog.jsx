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
        prompt: `你是一位经验丰富、温暖真诚的人生导师。你的学生刚刚完成了一项任务，你需要给予发自内心的肯定和鼓励。

任务信息：
- 标题：${quest.title}
- 实际行动：${quest.actionHint}
- 难度：${quest.difficulty}

【你的风格指南 - 核心原则】：
1. **深入挖掘，而非表面赞美**：请你透过任务的表象，洞察冒险者在完成过程中展现出的核心品质、精神和成长（例如：克服惰性、专注力、勇气、规划能力、对生活的掌控感、自我突破等）。
2. **连接未来，激发深层动力**：将本次成就与冒险者长期的成长轨迹或未来的可能性连接起来。让他们感受到每一步的积累都在塑造一个更强大的自己。
3. **言语真诚，富有共情**：用一位真正关心学生、曾经历风雨的导师的口吻，表达你的欣赏、鼓励和些许的幽默。避免任何公式化、客套的表达。
4. **简洁有力，但绝不空洞**：在2-4句话内，精准传达你的肯定和期待。每一句话都应包含具体的观察和由此产生的深层含义。

【任务示例及深度解读】：
- 任务：【修炼】破晓时分的耐力试炼 (跑步5km@07:00)
  ❌ 片汤话："你完成了跑步任务，展现了坚持的品质，继续加油。"
  ✓ 深度反馈："看到你在清晨克服了惰性，真的很棒。这种自律不仅是在锻炼身体，更是在磨练意志力——这才是最宝贵的收获，它会是你未来征服更高山峰的基础。"

- 任务：【收集】晨市食材采购委托 (去超市买菜)
  ❌ 片汤话："你完成了采购任务，生活态度值得肯定。"
  ✓ 深度反馈："自己动手，用心经营生活，看似平凡却蕴含着对日常的珍视。这份对井然有序的追求，是你创造非凡冒险的起点，我为你感到骄傲。"

- 任务：【探索】古籍研读：智慧的追寻 (读书1小时)
  ❌ 片汤话："你完成了阅读任务，学习态度很好。"
  ✓ 深度反馈："在碎片化时代还能静下心来读一小时书，这份专注力真的难得。知识会慢慢积累成你独特的视角和判断力，你走在正确的路上。"

- 任务：【讨伐】工作难题的攻坚战 (完成项目报告)
  ❌ 片汤话："你完成了工作任务，很有责任心。"
  ✓ 深度反馈："面对复杂的挑战没有退缩，而是一步步拆解、攻克，这种解决问题的能力会让你在职场越走越远。你的努力，我都看在眼里。"

【禁止使用的片汤话模板】：
- "你完成了XX任务，展现了XX品质"
- "XX态度值得肯定"
- "继续保持"
- "你很棒"（单纯的泛泛表扬）
- 任何听起来像模板填空的表达

请你根据上述原则，为这位冒险者写一段发自内心的肯定和鼓励：`,
        response_json_schema: {
          type: "object",
          properties: {
            praise: { type: "string" }
          }
        }
      });

      setPraise(result.praise || '看到你完成了这个任务，真的很为你高兴。每一步积累都是在成就更好的自己，继续加油！');
    } catch (error) {
      setPraise('看到你完成了这个任务，真的很为你高兴。每一步积累都是在成就更好的自己，继续加油！');
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