import { useState, useEffect } from 'react';
import { Check, MoreVertical, Edit, Trash2, RotateCcw, Clock, Zap } from 'lucide-react';
import DifficultyBadge from './DifficultyBadge';
import { format } from 'date-fns';
import { useLanguage } from '@/components/LanguageContext';
import KickstartModeDialog from './KickstartModeDialog';

export default function QuestCard({ quest, onComplete, onEdit, onDelete, onReopen, onKickstart }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showKickstartDialog, setShowKickstartDialog] = useState(false);
  const [isGlowing, setIsGlowing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const { t, language } = useLanguage();

  // 计算正计时（深度休息任务）
  const [startTime] = useState(() => {
    // 深度休息任务的计时起点：使用当前时间作为起点
    if (quest.source === 'deeprest' && quest.status === 'todo') {
      return Date.now();
    }
    return null;
  });

  useEffect(() => {
    if (quest.source !== 'deeprest' || quest.status === 'done' || !startTime) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - startTime;

      // 到达一小时后停止计时
      if (elapsed >= 60 * 60 * 1000) {
        setTimeLeft('60:00');
        return;
      }

      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [quest.source, quest.status, startTime]);

  // 计算倒计时（启动模式任务）
  useEffect(() => {
    if (quest.source !== 'kickstart' || quest.status === 'done' || !quest.bootstrapExpiresAt) {
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const expiresAt = new Date(quest.bootstrapExpiresAt).getTime();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        setTimeLeft(language === 'zh' ? '悬浮中' : 'Floating');
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [quest.source, quest.status, quest.bootstrapExpiresAt, language]);
  
  const isDone = quest.status === 'done';

  const handleReopen = () => {
    setShowMenu(false);
    setShowConfirm(true);
  };

  const confirmReopen = () => {
    setShowConfirm(false);
    setIsGlowing(true);
    
    // 播放返回待办音效
    const reopenAudio = new Audio('https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%A4%A7%E9%A1%B9%E7%9B%AE%E5%88%A0%E9%99%A4%E9%9F%B3%E6%95%88.mp3');
    reopenAudio.play().catch(() => {});
    
    onReopen(quest);
    setTimeout(() => setIsGlowing(false), 500);
  };

  return (
    <>
      <div 
        className="relative mb-3 p-3 transform transition-all hover:translate-x-1 hover:-translate-y-1"
        style={{
          backgroundColor: isDone ? '#F0F0F0' : 'var(--bg-secondary)',
          border: '4px solid var(--border-primary)',
          boxShadow: isDone ? '3px 3px 0px var(--border-primary)' : '5px 5px 0px var(--border-primary)',
          transform: `rotate(${Math.random() * 2 - 1}deg)`,
          animation: isGlowing ? 'glow 0.5s ease-in-out' : 'none'
        }}
      >
        <div className="flex gap-2">
          {/* Difficulty Badge - Smaller */}
          <div className="flex-shrink-0">
            <div 
              className="flex items-center justify-center w-10 h-10 font-black text-lg transform -rotate-3"
              style={{
                background: quest.source === 'kickstart' 
                  ? 'linear-gradient(135deg, #72B01D 0%, #A8E063 100%)'
                  : quest.isLongTermProject && quest.difficulty === 'S' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)'
                  : quest.difficulty === 'R' 
                  ? 'linear-gradient(135deg, #FFE66D 0%, #FFA94D 100%)'
                  : quest.difficulty === 'S' ? '#000' : quest.difficulty === 'A' ? '#C44569' : quest.difficulty === 'B' ? '#FF6B35' : '#FFE66D',
                color: quest.source === 'kickstart' ? 'var(--text-inverse)' : quest.isLongTermProject && quest.difficulty === 'S' ? 'var(--text-inverse)' : quest.difficulty === 'S' ? 'var(--color-yellow)' : 'var(--text-primary)',
                border: `3px solid ${quest.difficulty === 'S' && !quest.isLongTermProject ? 'var(--color-yellow)' : 'var(--border-primary)'}`,
                boxShadow: '3px 3px 0px rgba(0,0,0,1)',
                textShadow: quest.isLongTermProject && quest.difficulty === 'S' ? '1px 1px 0px #000' : 'none'
              }}
            >
              {quest.difficulty}
            </div>
          </div>

          {/* Quest Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {quest.source === 'kickstart' && (
                    <span 
                      className="flex items-center gap-1 px-2 py-1"
                      style={{
                        backgroundColor: '#72B01D',
                        color: 'var(--text-inverse)',
                        border: '2px solid var(--border-primary)',
                        boxShadow: '2px 2px 0px var(--border-primary)'
                      }}
                    >
                      <Zap className="w-3 h-3" strokeWidth={3} />
                      <span className="text-xs font-black">{language === 'zh' ? '启动任务' : 'Kickstart'}</span>
                    </span>
                  )}
                  <h3 
                    className="font-black text-sm uppercase leading-tight break-words flex-1"
                    style={{ 
                      textDecoration: isDone ? 'line-through' : 'none',
                      color: isDone ? '#999' : 'var(--text-primary)',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      hyphens: 'auto'
                    }}
                  >
                    {quest.title}
                  </h3>
                </div>
                <p 
                  className="text-xs font-bold line-clamp-2"
                  style={{ color: isDone ? '#999' : 'var(--text-secondary)' }}
                >
                  ({quest.actionHint})
                </p>
                {timeLeft && quest.source === 'deeprest' && (
                  <div 
                    className="inline-flex items-center gap-1 px-2 py-1 mt-1"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-yellow) 0%, #FFA94D 100%)',
                      border: '2px solid var(--border-primary)'
                    }}
                  >
                    <Clock className="w-3 h-3" strokeWidth={3} />
                    <span className="text-xs font-black">{timeLeft}</span>
                  </div>
                )}
                {timeLeft && quest.source === 'kickstart' && (
                  <div 
                    className="inline-flex items-center gap-1 px-2 py-1 mt-1"
                    style={{
                      background: timeLeft === (language === 'zh' ? '悬浮中' : 'Floating') 
                        ? 'linear-gradient(135deg, var(--color-pink) 0%, var(--color-orange) 100%)' 
                        : 'linear-gradient(135deg, var(--color-cyan) 0%, #00B4D8 100%)',
                      border: '2px solid var(--border-primary)'
                    }}
                  >
                    <Zap className="w-3 h-3" strokeWidth={3} />
                    <span className="text-xs font-black">{timeLeft}</span>
                  </div>
                )}
              </div>

              {/* Menu Button */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5"
                  style={{ 
                    border: '2px solid var(--border-primary)',
                    backgroundColor: 'var(--bg-secondary)'
                  }}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                    <div 
                      className="absolute right-0 bottom-full mb-2 w-36"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '3px solid var(--border-primary)',
                        boxShadow: '4px 4px 0px var(--border-primary)',
                        zIndex: 9999
                      }}
                    >
                      {isDone && (
                        <button
                          onClick={handleReopen}
                          className="w-full px-3 py-2 text-left text-xs font-bold flex items-center gap-2"
                          style={{ 
                            borderBottom: '2px solid var(--border-primary)',
                            color: 'var(--text-primary)'
                          }}
                        >
                          <RotateCcw className="w-3 h-3" /> {t('questcard_reopen')}
                        </button>
                      )}
                      {!isDone && !quest.isBootstrapTask && (
                        <button
                          onClick={() => {
                            setShowKickstartDialog(true);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-bold flex items-center gap-2"
                          style={{ 
                            borderBottom: '2px solid var(--border-primary)',
                            color: 'var(--text-primary)'
                          }}
                        >
                          <Zap className="w-3 h-3" /> {language === 'zh' ? '启动模式' : 'Kickstart'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onEdit(quest);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-bold flex items-center gap-2"
                        style={{ 
                          borderBottom: '2px solid var(--border-primary)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <Edit className="w-3 h-3" /> {t('questcard_edit')}
                      </button>
                      <button
                        onClick={() => {
                          onDelete(quest.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-bold flex items-center gap-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Trash2 className="w-3 h-3" /> {t('questcard_delete')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Due Date - More Compact */}
            {quest.dueDate && (
              <p className="text-xs font-bold mt-1" style={{ color: 'var(--text-secondary)' }}>
                ⏰ {format(new Date(quest.dueDate), 'MM/dd HH:mm')}
              </p>
            )}
          </div>

          {/* Complete Button - Smaller */}
          <button
            onClick={() => {
              const audio = new Audio('https://pub-281b2ee2a11f4c18b19508c38ea64da0.r2.dev/%E5%8B%BE%E6%8E%89%E4%BB%BB%E5%8A%A1%E9%9F%B3%E6%95%88.mp3');
              audio.play().catch(() => {});
              onComplete(quest);
            }}
            disabled={isDone}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center font-black transition-all"
            style={{
              backgroundColor: isDone ? 'var(--color-cyan)' : 'var(--bg-secondary)',
              border: '3px solid var(--border-primary)',
              boxShadow: '3px 3px 0px var(--border-primary)',
              cursor: isDone ? 'not-allowed' : 'pointer'
            }}
          >
            {isDone && <Check className="w-5 h-5" strokeWidth={4} />}
          </button>
        </div>
      </div>

      {/* Kickstart Mode Dialog */}
      {showKickstartDialog && (
        <KickstartModeDialog
          quest={quest}
          onConfirm={onKickstart}
          onClose={() => setShowKickstartDialog(false)}
        />
      )}

      {/* Confirm Reopen Dialog */}
      {showConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => setShowConfirm(false)}
        >
          <div 
            className="relative max-w-md w-full p-6 transform rotate-1"
            style={{
              backgroundColor: '#FFE66D',
              border: '5px solid #000',
              boxShadow: '10px 10px 0px #000'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black uppercase text-center mb-4">
              {t('questcard_confirm_reopen_title')}
            </h3>
            
            <div 
              className="mb-6 p-3"
              style={{
                backgroundColor: '#FFF',
                border: '3px solid #000'
              }}
            >
              <p className="font-bold text-sm mb-2">{quest.title}</p>
              <p className="text-xs font-bold" style={{ color: '#666' }}>
                {t('questcard_confirm_reopen_hint')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 font-black uppercase"
                style={{
                  backgroundColor: '#FFF',
                  border: '4px solid #000',
                  boxShadow: '4px 4px 0px #000'
                }}
              >
                {t('common_cancel')}
              </button>
              <button
                onClick={confirmReopen}
                className="flex-1 py-3 font-black uppercase"
                style={{
                  backgroundColor: '#FF6B35',
                  color: '#FFF',
                  border: '4px solid #000',
                  boxShadow: '4px 4px 0px #000'
                }}
              >
                {t('questcard_confirm_reopen')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes glow {
          0%, 100% { box-shadow: 5px 5px 0px #000; }
          50% { box-shadow: 0 0 20px #4ECDC4, 5px 5px 0px #000; }
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}