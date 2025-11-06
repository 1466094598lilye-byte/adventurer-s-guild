import { useState, useEffect } from 'react';
import { X, Loader2, Star, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function JointPraiseDialog({ project, onClose }) {
  const [praises, setPraises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateJointPraise();
  }, []);

  const generateJointPraise = async () => {
    setLoading(true);
    try {
      const roles = [
        { name: '大长老', icon: '👴', color: '#C44569' },
        { name: '首席史诗书记官', icon: '📜', color: '#9B59B6' },
        { name: '荣誉骑士团长', icon: '⚔️', color: '#FF6B35' },
        { name: '神秘智者', icon: '🔮', color: '#4ECDC4' },
        { name: '工会总管', icon: '📋', color: '#FFE66D' },
        { name: '战术大师', icon: '🎯', color: '#E74C3C' }
      ];

      const generatedPraises = [];

      for (const role of roles) {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `你是【星陨纪元冒险者工会】的${role.name}。一位冒险者刚刚完成了整个大项目："${project.projectName}"的所有任务！这是一项跨越多天的重大成就。

工会的所有高层正在联名为这位冒险者撰写一封表扬信，你需要以${role.name}的身份，写下你的那一段话。

【你的角色特点】：
${role.name === '大长老' ? '见证者视角，关注长期成长和坚持的价值' :
  role.name === '首席史诗书记官' ? '诗意观察者，捕捉过程中的美学和细节' :
  role.name === '荣誉骑士团长' ? '战士视角，强调勇气与突破' :
  role.name === '神秘智者' ? '哲学洞察，看透行动背后的深层智慧' :
  role.name === '工会总管' ? '务实管理者，看重效率与实际价值' :
  '策略分析师，关注执行力与精准度'}

【核心要求】：
1. **严格2句话**：40-60字
2. **聚焦大项目完成**：这不是一天的任务，而是跨越多天的持续努力
3. **体现角色视角**：必须从${role.name}的独特视角出发
4. **肯定过程**：强调坚持、规划、执行等品质
5. **语气正式但温暖**：这是一封正式的表扬信

请以${role.name}的身份，写下你对这位冒险者完成"${project.projectName}"的评价（严格2句话，40-60字）：`,
          response_json_schema: {
            type: "object",
            properties: {
              praise: { type: "string" }
            }
          }
        });

        generatedPraises.push({
          role: role.name,
          icon: role.icon,
          color: role.color,
          text: result.praise
        });
      }

      setPraises(generatedPraises);
    } catch (error) {
      console.error('生成表扬信失败:', error);
      setPraises([{
        role: '工会全体',
        icon: '🏛️',
        color: '#4ECDC4',
        text: '恭喜你完成了整个大项目！你的坚持和努力，工会的每一位成员都看在眼里。'
      }]);
    }
    setLoading(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <div 
        className="relative max-w-3xl w-full my-8 p-8"
        style={{
          backgroundColor: '#FFE66D',
          border: '6px solid #000',
          boxShadow: '15px 15px 0px #000'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-14 h-14 flex items-center justify-center"
          style={{
            backgroundColor: '#FF6B35',
            border: '5px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <X className="w-8 h-8 text-white" strokeWidth={4} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Star className="w-20 h-20 animate-pulse" fill="#FF6B35" strokeWidth={3} />
          </div>
          <h2 className="text-4xl font-black uppercase mb-3" style={{ color: '#000' }}>
            🎊 史诗级成就达成 🎊
          </h2>
          <div 
            className="inline-block px-6 py-3 mb-4"
            style={{
              backgroundColor: '#9B59B6',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            <p className="text-2xl font-black text-white">
              {project.projectName}
            </p>
          </div>
          <p className="font-black text-lg">
            工会全体高层联名表彰
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p className="font-bold text-lg">工会高层正在联名撰写表扬信...</p>
          </div>
        ) : (
          <>
            {/* Letter Content */}
            <div 
              className="mb-6 p-6 space-y-6"
              style={{
                backgroundColor: '#FFF',
                border: '5px solid #000',
                boxShadow: '8px 8px 0px #000'
              }}
            >
              {praises.map((praise, index) => (
                <div key={index} className="relative pl-12">
                  <div 
                    className="absolute left-0 top-0 w-10 h-10 flex items-center justify-center text-2xl"
                    style={{
                      backgroundColor: praise.color,
                      border: '3px solid #000',
                      boxShadow: '3px 3px 0px #000'
                    }}
                  >
                    {praise.icon}
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase mb-2" style={{ color: praise.color }}>
                      —— {praise.role}
                    </p>
                    <p className="font-bold leading-relaxed" style={{ color: '#000' }}>
                      {praise.text}
                    </p>
                  </div>
                  {index < praises.length - 1 && (
                    <div 
                      className="mt-4 border-b-2"
                      style={{ borderColor: '#E0E0E0' }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div 
              className="text-center p-4 mb-6"
              style={{
                backgroundColor: '#4ECDC4',
                border: '4px solid #000',
                boxShadow: '6px 6px 0px #000'
              }}
            >
              <p className="font-black uppercase flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" strokeWidth={3} />
                这份荣耀将永远铭记于你的冒险史诗中
                <Sparkles className="w-5 h-5" strokeWidth={3} />
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full py-5 font-black uppercase text-xl"
              style={{
                backgroundColor: '#FF6B35',
                color: '#FFF',
                border: '5px solid #000',
                boxShadow: '8px 8px 0px #000'
              }}
            >
              收下这份荣耀
            </button>
          </>
        )}
      </div>
    </div>
  );
}