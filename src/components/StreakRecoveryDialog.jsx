import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function StreakRecoveryDialog({ isOpen, onClose, onSuccess }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [currentStreak, setCurrentStreak] = useState('');
  const [longestStreak, setLongestStreak] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    // 验证输入
    const current = parseInt(currentStreak);
    const longest = parseInt(longestStreak);

    if (!currentStreak || !longestStreak) {
      toast({ description: t('streak_recovery_empty_error'), variant: 'destructive' });
      return;
    }

    if (isNaN(current) || isNaN(longest) || current < 0 || longest < 0) {
      toast({ description: t('streak_recovery_invalid_error'), variant: 'destructive' });
      return;
    }

    if (current > longest) {
      toast({ description: t('streak_recovery_logic_error'), variant: 'destructive' });
      return;
    }

    try {
      setIsRestoring(true);
      
      const response = await base44.functions.invoke('restoreUserStreak', {
        targetStreakCount: current,
        targetLongestStreak: longest
      });

      if (response.data.success) {
        // Toast 会自动关闭，然后关闭对话框
        toast({ 
          description: t('streak_recovery_success'),
          duration: 2000
        });
        
        // 延迟关闭对话框，让用户看到成功提示
        setTimeout(() => {
          setCurrentStreak('');
          setLongestStreak('');
          onSuccess();
          onClose();
        }, 2000);
      } else {
        toast({ description: response.data.error || t('streak_recovery_failed'), variant: 'destructive' });
      }
    } catch (error) {
      console.error('恢复连胜失败:', error);
      toast({ description: t('streak_recovery_failed'), variant: 'destructive' });
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md p-6"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '5px solid var(--border-primary)',
          boxShadow: '10px 10px 0px var(--border-primary)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2"
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '3px solid var(--border-primary)'
          }}
        >
          <X className="w-5 h-5" strokeWidth={3} />
        </button>

        {/* Title */}
        <h2 
          className="text-2xl font-black uppercase mb-6 pr-12"
          style={{ color: 'var(--text-primary)' }}
        >
          {t('streak_recovery_title')}
        </h2>

        {/* Form */}
        <div className="space-y-4">
          {/* Current Streak Input */}
          <div>
            <label 
              className="block font-bold mb-2 text-sm uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('streak_recovery_current_label')}
            </label>
            <input
              type="number"
              value={currentStreak}
              onChange={(e) => setCurrentStreak(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 font-bold text-lg"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '3px solid var(--border-primary)',
                color: 'var(--text-primary)'
              }}
              disabled={isRestoring}
            />
          </div>

          {/* Longest Streak Input */}
          <div>
            <label 
              className="block font-bold mb-2 text-sm uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('streak_recovery_longest_label')}
            </label>
            <input
              type="number"
              value={longestStreak}
              onChange={(e) => setLongestStreak(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 font-bold text-lg"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '3px solid var(--border-primary)',
                color: 'var(--text-primary)'
              }}
              disabled={isRestoring}
            />
          </div>

          {/* Freeze Tokens (Fixed) */}
          <div>
            <label 
              className="block font-bold mb-2 text-sm uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('streak_recovery_tokens_label')}
            </label>
            <div
              className="w-full px-4 py-3 font-black text-lg"
              style={{
                backgroundColor: 'var(--color-cyan)',
                border: '3px solid var(--border-primary)',
                color: 'var(--text-primary)'
              }}
            >
              3 {t('profile_freeze_tokens')}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isRestoring}
            className="flex-1 py-3 px-4 font-black uppercase"
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '3px solid var(--border-primary)',
              boxShadow: '5px 5px 0px var(--border-primary)',
              color: 'var(--text-secondary)'
            }}
          >
            {t('common_cancel')}
          </button>
          <button
            onClick={handleRestore}
            disabled={isRestoring}
            className="flex-1 py-3 px-4 font-black uppercase"
            style={{
              backgroundColor: 'var(--color-orange)',
              border: '3px solid var(--border-primary)',
              boxShadow: '5px 5px 0px var(--border-primary)',
              color: 'var(--text-inverse)',
              opacity: isRestoring ? 0.5 : 1
            }}
          >
            {isRestoring ? t('streak_recovery_restoring') : t('streak_recovery_confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}