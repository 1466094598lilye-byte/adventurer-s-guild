
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Award, Flame, Shield, Settings } from 'lucide-react';
import StreakDisplay from '../components/profile/StreakDisplay';
import { useLanguage } from '@/components/LanguageContext';

export default function Profile() {
  const { t, language, switchLanguage } = useLanguage();
  
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  const milestones = [
    { days: 7, title: language === 'zh' ? '新秀冒险家' : 'Rising Adventurer', tokens: 1, icon: '🌟' },
    { days: 21, title: language === 'zh' ? '精英挑战者' : 'Elite Challenger', tokens: 2, icon: '⚔️' },
    { days: 50, title: language === 'zh' ? '连胜大师' : 'Streak Master', tokens: 3, icon: '🏆' },
    { days: 100, title: language === 'zh' ? '传奇不灭' : 'Eternal Legend', tokens: 5, icon: '👑' }
  ];

  const unlockedMilestones = user?.unlockedMilestones || [];

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div 
          className="mb-6 p-4 transform -rotate-1"
          style={{
            backgroundColor: '#000',
            color: '#FFE66D',
            border: '5px solid #FFE66D',
            boxShadow: '8px 8px 0px #FFE66D'
          }}
        >
          <h1 className="text-3xl font-black uppercase text-center">
            {t('profile_title')}
          </h1>
        </div>

        {/* User Info Card */}
        <div 
          className="mb-6 p-6"
          style={{
            backgroundColor: '#FFE66D',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-20 h-20 flex items-center justify-center text-4xl"
              style={{
                backgroundColor: '#4ECDC4',
                border: '4px solid #000',
                boxShadow: '4px 4px 0px #000'
              }}
            >
              👤
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black uppercase">{user?.full_name || user?.email}</h2>
              <p className="font-bold text-sm">{user?.email}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            {/* Current Streak */}
            <div 
              className="p-4 text-center"
              style={{
                backgroundColor: '#FFF',
                border: '3px solid #000'
              }}
            >
              <Flame className="w-8 h-8 mx-auto mb-2" strokeWidth={3} style={{ color: '#FF6B35' }} />
              <p className="text-2xl font-black">{user?.streakCount || 0}</p>
              <p className="text-xs font-bold uppercase">{t('profile_current_streak')}</p>
            </div>

            {/* Longest Streak */}
            <div 
              className="p-4 text-center"
              style={{
                backgroundColor: '#FFF',
                border: '3px solid #000'
              }}
            >
              <Award className="w-8 h-8 mx-auto mb-2" strokeWidth={3} style={{ color: '#C44569' }} />
              <p className="text-2xl font-black">{user?.longestStreak || 0}</p>
              <p className="text-xs font-bold uppercase">{t('profile_longest_streak')}</p>
            </div>

            {/* Freeze Tokens */}
            <div 
              className="p-4 text-center col-span-2"
              style={{
                backgroundColor: '#4ECDC4',
                border: '3px solid #000'
              }}
            >
              <Shield className="w-8 h-8 mx-auto mb-2" strokeWidth={3} />
              <p className="text-2xl font-black">{user?.freezeTokenCount || 0}</p>
              <p className="text-xs font-bold uppercase">{t('profile_freeze_tokens')}</p>
              <p className="text-xs font-bold mt-2" style={{ color: '#000' }}>
                {t('profile_freeze_tokens_hint')}
              </p>
            </div>
          </div>
        </div>

        {/* Title Badge */}
        <div 
          className="mb-6 p-6 text-center"
          style={{
            backgroundColor: user?.title ? '#C44569' : '#E0E0E0',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <Award className="w-12 h-12 mx-auto mb-3" strokeWidth={3} style={{ color: user?.title ? '#FFF' : '#999' }} />
          <p className="text-xs font-bold uppercase mb-2" style={{ color: user?.title ? '#FFF' : '#666' }}>
            {t('profile_guild_title')}
          </p>
          {user?.title ? (
            <p className="text-2xl font-black text-white">「{user.title}」</p>
          ) : (
            <>
              <p className="text-xl font-black" style={{ color: '#999' }}>{t('profile_no_title')}</p>
              <p className="text-xs font-bold mt-2" style={{ color: '#666' }}>
                {t('profile_title_hint')}
              </p>
            </>
          )}
        </div>

        {/* Milestones Section */}
        <div 
          className="mb-6 p-6"
          style={{
            backgroundColor: '#FFF',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <h3 className="text-xl font-black uppercase mb-4">
            {t('profile_milestones')}
          </h3>

          <div className="space-y-3">
            {milestones.map((milestone) => {
              const isUnlocked = unlockedMilestones.includes(milestone.days);
              return (
                <div
                  key={milestone.days}
                  className="p-4"
                  style={{
                    backgroundColor: isUnlocked ? '#FFE66D' : '#F0F0F0',
                    border: '3px solid #000',
                    opacity: isUnlocked ? 1 : 0.6
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{milestone.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-black text-lg">{milestone.days} {t('journal_days')}</p>
                        {isUnlocked && (
                          <span className="text-xs font-black px-2 py-0.5" style={{ backgroundColor: '#4ECDC4', border: '2px solid #000' }}>
                            ✓ {language === 'zh' ? '已解锁' : 'Unlocked'}
                          </span>
                        )}
                        {!isUnlocked && (
                          <span className="text-xs font-bold" style={{ color: '#999' }}>
                            🔒 {t('profile_milestone_locked')}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-sm">
                        {language === 'zh' ? `「${milestone.title}」称号 + ${milestone.tokens}张冻结券` : `"${milestone.title}" Title + ${milestone.tokens} Freeze Token${milestone.tokens > 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chest Pity System */}
        <div 
          className="mb-6 p-6"
          style={{
            backgroundColor: '#9B59B6',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <h3 className="text-xl font-black uppercase mb-4 text-white">
            {t('profile_chest_pity')}
          </h3>
          <p className="font-bold text-sm mb-4 text-white">
            {t('profile_chest_pity_desc')}
          </p>
          <div 
            className="p-4"
            style={{
              backgroundColor: '#FFF',
              border: '3px solid #000'
            }}
          >
            <p className="text-xs font-bold uppercase mb-2">{t('profile_chest_counter')}</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div 
                  className="h-6 relative"
                  style={{
                    backgroundColor: '#E0E0E0',
                    border: '3px solid #000'
                  }}
                >
                  <div 
                    className="h-full transition-all"
                    style={{
                      backgroundColor: '#4ECDC4',
                      width: `${((user?.chestOpenCounter || 0) / 60) * 100}%`
                    }}
                  />
                </div>
              </div>
              <p className="font-black text-lg">
                {user?.chestOpenCounter || 0} / 60
              </p>
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div 
          className="mb-6 p-6"
          style={{
            backgroundColor: '#FFF',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <h3 className="text-xl font-black uppercase mb-4">
            ⚙️ {t('profile_settings')}
          </h3>

          {/* Language Selector */}
          <div className="mb-4">
            <label className="block text-sm font-black uppercase mb-2">
              {t('profile_language')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => switchLanguage('zh')}
                className="py-3 font-black uppercase"
                style={{
                  backgroundColor: language === 'zh' ? '#4ECDC4' : '#FFE66D',
                  color: '#000',
                  border: '3px solid #000',
                  boxShadow: language === 'zh' ? '4px 4px 0px #000' : '2px 2px 0px #000',
                  transform: language === 'zh' ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                {t('profile_chinese')}
              </button>
              <button
                onClick={() => switchLanguage('en')}
                className="py-3 font-black uppercase"
                style={{
                  backgroundColor: language === 'en' ? '#4ECDC4' : '#FFE66D',
                  color: '#000',
                  border: '3px solid #000',
                  boxShadow: language === 'en' ? '4px 4px 0px #000' : '2px 2px 0px #000',
                  transform: language === 'en' ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                {t('profile_english')}
              </button>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3"
          style={{
            backgroundColor: '#FF6B35',
            color: '#FFF',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <LogOut className="w-6 h-6" strokeWidth={3} />
          {language === 'zh' ? '退出登录' : 'Logout'}
        </button>
      </div>
    </div>
  );
}
