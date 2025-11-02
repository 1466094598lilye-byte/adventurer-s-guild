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
      // 角色池：每个角色有独特的视角、关键词和示例
      const roles = [
        { 
          name: '大长老', 
          perspective: '见证者视角，关注长期成长轨迹',
          keywords: ['沉淀', '积累', '基石', '征途', '远见', '韧性', '长远', '磨砺'],
          tone: '威严温和，从长远角度看待成长',
          exampleC: '我看到了你在日常琐事中的用心积累。这份规律性正在为你的征途打下坚实基石。',
          exampleB: '你在忙碌中仍坚持投入，这展现了难得的韧性。每一次专注都是对未来的长远投资。',
          exampleA: '你克服重重阻力完成了高难挑战，这需要深厚的意志沉淀。这份磨砺将成为你征途中的宝贵财富。'
        },
        { 
          name: '首席史诗书记官', 
          perspective: '诗意观察者，捕捉细节中的美学',
          keywords: ['微光', '诗篇', '笔触', '韵律', '匠心', '心流', '华章', '雕琢'],
          tone: '细腻诗意，善于发现平凡中的不凡',
          exampleC: '在你的行动中，我捕捉到了生活的细腻韵律。这份匠心让平凡的一天也闪耀着微光。',
          exampleB: '你用心为这份任务增添了独特的笔触，仿佛在书写自己的史诗。这份专注本身就是一种艺术。',
          exampleA: '我见证了你在困难中依然保持的那份优雅与执着。你正在用意志雕琢出生命中最华丽的诗篇。'
        },
        { 
          name: '荣誉骑士团长', 
          perspective: '战士视角，强调勇气与突破',
          keywords: ['突破', '勇气', '意志', '果决', '征服', '锋芒', '力量', '无畏'],
          tone: '直率有力，像鼓舞士气的战场指挥官',
          exampleC: '我看到了你果决地完成任务，这展现了冒险者应有的执行力。持续的行动会铸就你的力量！',
          exampleB: '你在挑战面前没有退缩，而是选择了迎难而上。这份勇气正在让你变得更加强大！',
          exampleA: '你以无畏的意志征服了这项艰巨任务！这份突破精神将成为你最锋利的武器，助你所向披靡！'
        },
        { 
          name: '神秘智者', 
          perspective: '哲学洞察，看透行动背后的智慧',
          keywords: ['洞察', '思辨', '根源', '规律', '明晰', '启发', '透彻', '本质'],
          tone: '深邃哲理，点出行动深层的意义',
          exampleC: '简单的行动背后，我看到了你对规律的洞察。理解事物的本质，才能真正掌握命运。',
          exampleB: '你的坚持不仅是执行，更是对自我的深刻思辨。这份明晰会为你的前路指引方向。',
          exampleA: '我看透了你在挑战中展现的智慧——那不是蛮力，而是对困难根源的透彻理解。这份启发将照亮你的未来。'
        },
        { 
          name: '工会总管', 
          perspective: '务实管理者，看重效率与价值',
          keywords: ['高效', '价值', '贡献', '资源', '妥善', '保障', '实干', '可靠'],
          tone: '务实真诚，肯定具体的努力和成果',
          exampleC: '你高效地完成了这项任务，体现了可靠的执行力。这份实干精神是工会运作的重要保障。',
          exampleB: '我看到了你在任务中投入的时间和精力，这是对自身价值的妥善投资。每一份努力都有其意义。',
          exampleA: '你克服困难完成了这项重要任务，为自己创造了真实的价值。这份务实的贡献值得我们的尊重！'
        },
        { 
          name: '战术大师', 
          perspective: '策略分析师，关注执行与精准',
          keywords: ['布局', '精准', '执行', '应变', '掌控', '节奏', '战略', '效能'],
          tone: '锐利精准，像分析战局的军师',
          exampleC: '你精准地完成了任务的每个步骤，这展现了良好的执行能力。掌控好节奏，才能赢得长期战役。',
          exampleB: '我看到了你在任务中的战略布局和坚定执行。这份效能会让你在未来的挑战中占据优势。',
          exampleA: '你在高难任务中展现了卓越的应变能力和精准掌控！这份战术素养将助你在任何战场上立于不败！'
        }
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
        prompt: `你是【星陨纪元冒险者工会】的${selectedRole.name}。一位冒险者刚完成了一项任务，你需要让他们感受到：他们的奋斗过程被你这个角色真正地"看见"和"理解"了。

【你的角色身份】：
角色名：${selectedRole.name}
视角特点：${selectedRole.perspective}
语气风格：${selectedRole.tone}
专属关键词：${selectedRole.keywords.join('、')}（请尽量在表扬中自然融入这些词汇）

【任务信息】：
- 标题：${quest.title}
- 实际行动：${quest.actionHint}
- 难度：${quest.difficulty}级（${context.level}）

【难度对应的夸奖要求】：
${context.tone}
夸奖力度：${context.intensity}

【核心要求】：
1. **严格两句话**：必须是且只能是两句话，40-60字。第一句"看见"过程，第二句点出价值或品质。
2. **角色化表达**：必须体现${selectedRole.name}的独特视角和语气，不能写成通用表扬。
3. **融入关键词**：自然地使用至少1-2个该角色的专属关键词（${selectedRole.keywords.slice(0, 4).join('、')}等）。
4. **看见过程**：第一句从${selectedRole.name}的视角，明确指出任务背后需要克服的"不容易"。
5. **具体品质**：第二句从${selectedRole.name}的价值观出发，精准识别并命名展现的品质。
6. **见证感语言**：使用"我看到了..."、"我见证了..."、"这展现了..."、"这需要..."等句式。

【该角色的分级示例（严格遵循这种风格）】：

C级示例：
"${selectedRole.exampleC}"

B级示例：
"${selectedRole.exampleB}"

A级示例：
"${selectedRole.exampleA}"

【禁止】：
- 超过两句话（绝对禁止第三句）
- 写成其他角色的风格（必须体现${selectedRole.name}的独特性）
- 空泛表扬："你很棒"、"做得好"
- 超过60字

请**完全以${selectedRole.name}的身份和视角**，为这位冒险者写**严格两句话**的肯定（40-60字）：`,
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

        <h2 
          className="text-2xl font-black uppercase text-center mb-4"
          style={{
            color: '#000',
            textShadow: '3px 3px 0px rgba(255,255,255,0.5)'
          }}
        >
          委托完成！
        </h2>

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