import { Flame, Award, Shield } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

export default function StreakDisplay({ currentStreak, longestStreak, freezeTokens }) {
  const { t, language } = useLanguage();
  
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Current Streak */}
      <div 
        className="p-4"
        style={{
          backgroundColor: 'var(--streak-current-bg)',
          border: '4px solid var(--border-primary)',
          boxShadow: '6px 6px 0px var(--border-primary)'
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-6 h-6" strokeWidth={3} style={{ color: 'var(--text-primary)' }} />
          <span className="text-sm font-bold uppercase" style={{ color: 'var(--text-primary)' }}>
            {t('journal_current_streak')}
          </span>
        </div>
        <p className="text-4xl font-black" style={{ color: 'var(--text-primary)' }}>{currentStreak}</p>
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('journal_days')}</p>
      </div>

      {/* Longest Streak */}
      <div 
        className="p-4"
        style={{
          backgroundColor: 'var(--streak-longest-bg)',
          border: '4px solid var(--border-primary)',
          boxShadow: '6px 6px 0px var(--border-primary)'
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-6 h-6" strokeWidth={3} style={{ color: 'var(--text-primary)' }} />
          <span className="text-sm font-bold uppercase" style={{ color: 'var(--text-primary)' }}>
            {t('journal_longest_streak')}
          </span>
        </div>
        <p className="text-4xl font-black" style={{ color: 'var(--text-primary)' }}>{longestStreak}</p>
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('journal_days')}</p>
      </div>

      {/* Freeze Tokens */}
      <div 
        className="col-span-2 p-4"
        style={{
          backgroundColor: 'var(--streak-freeze-bg)',
          border: '4px solid var(--border-primary)',
          boxShadow: '6px 6px 0px var(--border-primary)'
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6" strokeWidth={3} style={{ color: 'var(--text-primary)' }} />
            <span className="text-sm font-bold uppercase" style={{ color: 'var(--text-primary)' }}>
              {t('journal_freeze_tokens')}
            </span>
          </div>
          <p className="text-4xl font-black" style={{ color: 'var(--text-primary)' }}>{freezeTokens}</p>
        </div>
        <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('journal_freeze_hint')}
        </p>
      </div>
    </div>
  );
}