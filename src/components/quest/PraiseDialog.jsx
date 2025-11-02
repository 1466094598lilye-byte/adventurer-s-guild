
import { useState, useEffect } from 'react';
import { X, BookMarked, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PraiseDialog({ quest, onClose, onAddNote }) {
  const [praise, setPraise] = useState('');
  const [loading, setLoading] = useState(true);
  const [praiser, setPraiser] = useState('');

  useEffect(() => {
    generatePraise();
  }, []);

  const generatePraise = async () => {
    setLoading(true);
    try {
      // 角色池：随机选择一个工会角色来撰写表扬
      const roles = [
        { name: '大长老', tone: '威严温和，见证者视角，强调成长轨迹' },
        { name: '首席史诗书记官', tone: '细腻诗意，善于捕捉细节中的闪光点' },
        { name: '荣誉骑士团长', tone: '直率有力，强调勇气和突破' },
        { name: '神秘智者', tone: '深邃哲理，点出行动背后的智慧' },
        { name: '工会总管', tone: '务实真诚，看见努力的价值' },
        { name: '战术大师', tone: '锐利精准，肯定执行力和策略性' }
      ];

      const selectedRole = roles[Math.floor(Math.random() * roles.length)];
      setPraiser(selectedRole.name);

      const difficultyContext = {
        'C': {
          level: '轻松任务',
          tone: '温和肯定，点出小事背后的习惯养成价值',
          intensity: '轻描淡写但真诚'
        },
        'B': {
          level: '中等任务',
          tone: '适度赞赏，强调持续投入的意义',
          intensity: '中等力度，温暖有力'
        },
        'A': {
          level: '高难任务',
          tone: '深度认可，突出克服的阻力和展现的品质',
          intensity: '强烈但不夸张，有分量'
        },
        'S': {
          level: '超级任务',
          tone: '热烈赞扬，强调自我突破和非凡品质',
          intensity: '充满敬意，振奋人心'
        }
      };

      const context = difficultyContext[quest.difficulty] || difficultyContext['C'];

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `你是【星陨纪元冒险者工会】的${selectedRole.name}。学生刚完成了一项任务，你需要让他们感受到：他们的奋斗过程被真正地"看见"和"理解"了。

角色特点：${selectedRole.tone}

任务信息：
- 标题：${quest.title}
- 实际行动：${quest.actionHint}
- 难度：${quest.difficulty}级（${context.level}）

【难度对应的夸奖要求】：
${context.tone}
夸奖力度：${context.intensity}

【核心要求】：
1. **严格两句话**：必须是且只能是两句话，40-60字。第一句"看见"过程，第二句点出价值或品质。
2. **看见过程**：第一句明确指出任务背后需要克服的"不容易"或"局限"。
3. **具体品质**：第二句精准识别并命名展现的品质（C级：执行力、规律性；B级：坚持、专注；A级：毅力、突破；S级：非凡意志、自我超越）。
4. **见证感语言**：用"我看到了..."、"这展现了..."、"这需要..."等句式。
5. **真诚适度**：避免过度夸张，但要有温度和力量。

【分级示例（严格两句）】：

C级：
"我看到了你把生活的琐事也打理得井井有条。这份用心正在让日常变得更从容。"

B级：
"在喧嚣的世界里，我看到了你选择沉浸于阅读。这展现了难得的专注力，每一次投入都在为智慧添砖加瓦。"

A级：
"我看到了你克服睡意在破晓坚持长跑，这需要非凡的毅力。这份对自我极限的挑战，会让你在未来更加无所畏惧。"

S级：
"我见证了你面对极高难度依然全力以赴，这展现了卓越的意志品质。你正在突破自己的边界，这份自我超越将成就非凡人生。"

【禁止】：
- 超过两句话（绝对禁止第三句）
- 空泛表扬："你很棒"、"做得好"
- 超过60字

请以${selectedRole.name}的身份，为这位冒险者写**严格两句话**的肯定（40-60字）：`,
        response_json_schema: {
          type: "object",
          properties: {
            praise: { type: "string" }
          }
        }
      });

      setPraise(result.praise || '我看到了你的努力。这份坚持正在让你变得更强大。');
    } catch (error) {
      setPraise('我看到了你的努力。这份坚持正在让你变得更强大。');
      setPraiser('工会长老');
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
          className="mb-6 p-4 min-h-[80px]"
          style={{
            backgroundColor: '#FFF',
            border: '3px solid #000'
          }}
        >
          {loading ? (
            <p className="text-center font-bold text-gray-500">工会评议官正在记录中...</p>
          ) : (
            <>
              {praiser && (
                <p className="text-xs font-black uppercase mb-2" style={{ color: '#C44569' }}>
                  —— {praiser}
                </p>
              )}
              <p className="font-bold leading-relaxed" style={{ color: '#000' }}>
                {praise}
              </p>
            </>
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
