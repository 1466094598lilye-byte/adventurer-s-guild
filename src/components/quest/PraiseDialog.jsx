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

【你的风格】：
- 像老友/导师般真诚，而非机械的表扬
- 能看到学生努力背后的意义（自律、坚持、成长）
- 用温暖、鼓励的语气，偶尔带点幽默
- 不堆砌华丽词汇，说人话
- 2-3句话，简洁有力但有温度

【参考例子】：
任务：跑步5km
❌ 机械："你完成了跑步任务，展现了坚持的品质。"
✓ 导师："看到你在清晨克服了惰性，真的很棒。这种自律不仅是在锻炼身体，更是在磨练意志力——这才是最宝贵的收获。"

任务：读书1小时
❌ 机械："你完成了阅读任务，学习态度值得肯定。"
✓ 导师："在碎片化时代还能静下心来读一小时书，这份专注力真的难得。知识会慢慢积累，你走在正确的路上。"

任务：买菜做饭
❌ 机械："你完成了采购和烹饪任务。"
✓ 导师："自己动手做饭，看似平凡，其实是在用心经营生活。这份对生活的认真态度，会让你的每一天都更有质感。"

请为这位冒险者写一段真诚的肯定：`,
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
            <p className="text-center font-bold text-gray-500">导师正在为你写下感想...</p>
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