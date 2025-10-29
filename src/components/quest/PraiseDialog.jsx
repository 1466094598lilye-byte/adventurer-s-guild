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
        prompt: `你是一位经验丰富、温暖真诚的人生导师。学生刚完成了一项任务，你需要给予简短但有力的肯定。

任务信息：
- 标题：${quest.title}
- 实际行动：${quest.actionHint}
- 难度：${quest.difficulty}

【核心要求】：
1. **简洁有力**：严格控制在2-3句话，总字数60-80字左右。一针见血，直击核心。
2. **洞察品质**：透过任务看到背后的品质（自律、专注、勇气、坚持等），而非只说"你完成了"。
3. **真诚适度**：避免片汤话和过度夸张。不说"人生转折点"、"改变命运"等脱离实际的话。
4. **连接价值**：简短地点出这次行动对持续成长的实际意义。

【示例】：
- 任务：跑步5km@07:00
  ✓ "清晨的自律很难得。这种意志力会成为你面对挑战的底气。"

- 任务：去超市买菜
  ✓ "用心经营日常，看似平凡却很重要。把小事做好本身就是能力。"

- 任务：读书1小时
  ✓ "碎片化时代还能专注阅读，这份定力会慢慢积累成你的优势。"

- 任务：完成项目报告
  ✓ "面对复杂问题没有退缩，这种解决能力会让你越来越从容。"

【禁止】：
- 片汤话："你完成了XX，展现了XX品质"
- 夸张词："人生转折点"、"传奇"、"彻底改变"、"新境界"
- 过长解释和铺垫

请为这位冒险者写2-3句简短有力的肯定（60-80字）：`,
        response_json_schema: {
          type: "object",
          properties: {
            praise: { type: "string" }
          }
        }
      });

      setPraise(result.praise || '看到你完成了这个任务，真的很棒。每一步积累都在让你变得更强。');
    } catch (error) {
      setPraise('看到你完成了这个任务，真的很棒。每一步积累都在让你变得更强。');
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