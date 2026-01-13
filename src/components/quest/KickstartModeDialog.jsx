import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Zap } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

export default function KickstartModeDialog({ quest, onConfirm, onClose }) {
  const { language, t } = useLanguage();
  const [minimalAction, setMinimalAction] = useState('');
  const [duration, setDuration] = useState(3); // 默认3分钟
  const [isCreating, setIsCreating] = useState(false);

  const handleConfirm = async () => {
    if (!minimalAction.trim()) {
      alert(language === 'zh' ? '请输入最小行动' : 'Please enter minimal action');
      return;
    }

    setIsCreating(true);
    try {
      await onConfirm({
        minimalAction: minimalAction.trim(),
        duration: duration * 60 // 转换为秒
      });
      onClose();
    } catch (error) {
      console.error('创建启动任务失败:', error);
      alert(language === 'zh' ? '创建失败，请重试' : 'Failed to create, please retry');
    }
    setIsCreating(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div 
        className="relative max-w-md w-full p-6 transform rotate-1"
        style={{
          backgroundColor: '#FFE66D',
          border: '5px solid #000',
          boxShadow: '12px 12px 0px #000'
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
          <X className="w-6 h-6" strokeWidth={3} style={{ color: '#FFF' }} />
        </button>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-8 h-8" strokeWidth={3} />
            <h2 className="text-2xl font-black uppercase">
              {language === 'zh' ? '⚡ 启动模式 ⚡' : '⚡ Kickstart Mode ⚡'}
            </h2>
          </div>
          <p className="text-sm font-bold" style={{ color: '#666' }}>
            {language === 'zh' ? '为此任务设置最小行动' : 'Set minimal action for this quest'}
          </p>
        </div>

        <div 
          className="mb-4 p-3"
          style={{
            backgroundColor: '#FFF',
            border: '3px solid #000'
          }}
        >
          <p className="font-black text-sm mb-1">{quest.title}</p>
          <p className="text-xs font-bold" style={{ color: '#666' }}>
            ({quest.actionHint})
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-black uppercase mb-2">
            {language === 'zh' ? '最小行动' : 'Minimal Action'}
          </label>
          <Input
            type="text"
            placeholder={language === 'zh' ? '例如：铺好瑜伽垫、打开书...' : 'e.g., Roll out yoga mat, Open book...'}
            value={minimalAction}
            onChange={(e) => setMinimalAction(e.target.value)}
            className="w-full px-4 py-3 font-bold"
            style={{
              backgroundColor: '#FFF',
              border: '3px solid #000',
              boxShadow: '4px 4px 0px #000'
            }}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-black uppercase mb-2">
            {language === 'zh' ? '倒计时时长' : 'Countdown Duration'}
          </label>
          <div 
            className="p-4"
            style={{
              backgroundColor: '#FFF',
              border: '3px solid #000'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl font-black">{duration}</span>
              <span className="text-xl font-black">{language === 'zh' ? '分钟' : 'min'}</span>
            </div>
            <input
              type="range"
              min="1"
              max="7"
              step="1"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full h-3"
              style={{
                background: `linear-gradient(to right, #4ECDC4 0%, #4ECDC4 ${((duration - 1) / 6) * 100}%, #E0E0E0 ${((duration - 1) / 6) * 100}%, #E0E0E0 100%)`,
                border: '2px solid #000',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <div className="flex justify-between mt-2">
              {[1, 2, 3, 4, 5, 6, 7].map(min => (
                <span key={min} className="text-xs font-bold" style={{ color: '#666' }}>
                  {min}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            className="flex-1 py-3 font-black uppercase"
            style={{
              backgroundColor: '#FFF',
              border: '4px solid #000',
              boxShadow: '4px 4px 0px #000'
            }}
          >
            {language === 'zh' ? '取消' : 'Cancel'}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isCreating || !minimalAction.trim()}
            className="flex-1 py-3 font-black uppercase flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#4ECDC4',
              border: '4px solid #000',
              boxShadow: '4px 4px 0px #000',
              opacity: (isCreating || !minimalAction.trim()) ? 0.6 : 1
            }}
          >
            <Zap className="w-5 h-5" strokeWidth={3} />
            {isCreating 
              ? (language === 'zh' ? '创建中...' : 'Creating...') 
              : (language === 'zh' ? '立即启动' : 'Start Now')
            }
          </Button>
        </div>

        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 24px;
            height: 24px;
            background: #000;
            cursor: pointer;
            border: 3px solid #FFE66D;
            box-shadow: 2px 2px 0px #000;
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 24px;
            height: 24px;
            background: #000;
            cursor: pointer;
            border: 3px solid #FFE66D;
            box-shadow: 2px 2px 0px #000;
          }
        `}</style>
      </div>
    </div>
  );
}