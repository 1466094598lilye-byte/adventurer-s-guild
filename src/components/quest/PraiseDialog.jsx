import { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { getPraisePrompt, getPraiseRoles, getDeepRestPraisePrompt } from '@/components/prompts';
import { playSound } from '@/components/AudioManager';

export default function PraiseDialog({ quest, onClose }) {
  const { language, t } = useLanguage();
  const [praise, setPraise] = useState('');
  const [loading, setLoading] = useState(true);
  const [praiser, setPraiser] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    generatePraise();
  }, []);

  const generatePraise = async () => {
    setLoading(true);
    
    // 动态文案序列
    const messages = language === 'zh' 
      ? [
          { text: '🏛️ 你太优秀了,他们抢疯了...', duration: 3000 },
          { text: '⚔️ 骑士团长:"滚开!这荣誉让我来宣布!"', duration: 2000 },
          { text: '📜 书记官不干:"你只会喊,我更会夸人!"', duration: 2000 },
          { text: '🔮 智者冷笑:"粗鄙,看我怎么升华主题..."', duration: 2000 },
          { text: '🎯 战术大师弱弱举手:"要不看数据?"被喷:"滚!"', duration: 2000 },
          { text: '👑 大长老怒了:"都给我闭嘴!抽签!"', duration: 2000 },
          { text: '🎲 抽签筒砸在桌上,所有人怂了...', duration: 2000 }
        ]
      : [
          { text: '🏛️ You\'re too good, they\'re losing it...', duration: 3000 },
          { text: '⚔️ Knight: "Move! This honor\'s mine to announce!"', duration: 2000 },
          { text: '📜 Scribe objects: "You just yell, I praise better!"', duration: 2000 },
          { text: '🔮 Sage smirks: "Crude. Watch me elevate this..."', duration: 2000 },
          { text: '🎯 Tactician timidly: "Check the data?" Others: "NO!"', duration: 2000 },
          { text: '👑 Elder snaps: "SILENCE! We draw lots!"', duration: 2000 },
          { text: '🎲 Cylinder slams down, everyone shrinks...', duration: 2000 }
        ];

    // 启动动态文案
    let currentIndex = 0;
    const showNextMessage = () => {
      if (currentIndex < messages.length) {
        setLoadingMessage(messages[currentIndex].text);
        currentIndex++;
      }
    };

    showNextMessage();
    const messageInterval = setInterval(() => {
      showNextMessage();
    }, 2000);

    try {
      const roles = getPraiseRoles(language);
      const isDeepRest = quest.source === 'deeprest';
      
      // 深度休息任务只使用疗愈师角色
      const selectedRole = isDeepRest 
        ? roles.find(r => r.isHealer) || roles[0]
        : roles.filter(r => !r.isHealer)[Math.floor(Math.random() * roles.filter(r => !r.isHealer).length)];
      
      setPraiser(language === 'zh' ? selectedRole.name : selectedRole.nameEn);

      const promptText = isDeepRest
        ? getDeepRestPraisePrompt(language, quest, selectedRole)
        : getPraisePrompt(language, quest, selectedRole);

      const { data: result } = await base44.functions.invoke('callDeepSeek', {
        prompt: promptText,
        response_json_schema: {
          type: "object",
          properties: {
            praise: { type: "string" }
          }
        }
      });

      clearInterval(messageInterval);

      setPraise(result.praise || (language === 'zh' 
        ? '我看到了你的努力。这份坚持正在让你变得更强大。'
        : 'I witnessed your effort. This persistence is making you stronger.'));
      
      // 表扬信文字生成完成后播放音效
      await playSound('praiseSound');
    } catch (error) {
      clearInterval(messageInterval);
      setPraise(language === 'zh'
        ? '我看到了你的努力。这份坚持正在让你变得更强大。'
        : 'I witnessed your effort. This persistence is making you stronger.');
      setPraiser(language === 'zh' ? '工会长老' : 'Guild Elder');
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
        className="relative max-w-lg w-full max-h-[90vh] flex flex-col p-6 transform rotate-1 overflow-hidden"
        style={{
          backgroundColor: '#FFE66D',
          border: '5px solid #000',
          boxShadow: '10px 10px 0px #000'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-10 h-10 flex items-center justify-center z-10"
          style={{
            backgroundColor: '#FF6B35',
            border: '4px solid #000',
            boxShadow: '4px 4px 0px #000'
          }}
        >
          <X className="w-6 h-6" strokeWidth={4} />
        </button>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-2" style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#000 #FFE66D'
        }}>
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
            {t('praise_title')}
          </h2>

          <div 
            className="mb-4 p-3"
            style={{
              backgroundColor: '#FFF',
              border: '3px solid #000'
            }}
          >
            <p className="font-black text-sm uppercase mb-1 break-words">{quest.title}</p>
            <p className="font-bold text-xs break-words" style={{ color: '#666' }}>
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
              <p className="text-center font-bold text-gray-500 whitespace-pre-line">{loadingMessage}</p>
            ) : (
              <>
                {praiser && (
                  <p className="text-xs font-black uppercase mb-2" style={{ color: '#C44569' }}>
                    —— {praiser}
                  </p>
                )}
                <p className="font-bold leading-relaxed break-words" style={{ color: '#000' }}>
                  {praise}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Fixed Button at Bottom */}
        <div className="pt-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 font-black uppercase text-sm"
            style={{
              backgroundColor: '#4ECDC4',
              border: '4px solid #000',
              boxShadow: '4px 4px 0px #000'
            }}
          >
            {t('common_confirm')}
          </button>
        </div>

        {/* Custom Scrollbar Styles */}
        <style>{`
          .overflow-y-auto::-webkit-scrollbar {
            width: 8px;
          }
          .overflow-y-auto::-webkit-scrollbar-track {
            background: #FFE66D;
          }
          .overflow-y-auto::-webkit-scrollbar-thumb {
            background: #000;
            border: 2px solid #FFE66D;
          }
          .overflow-y-auto::-webkit-scrollbar-thumb:hover {
            background: #333;
          }
        `}</style>
      </div>
    </div>
  );
}