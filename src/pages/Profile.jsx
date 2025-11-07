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
            </div>
          </div>
        </div>

        {/* Title Badge */}
        {user?.title && (
          <div 
            className="mb-6 p-6 text-center"
            style={{
              backgroundColor: '#C44569',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            <Award className="w-12 h-12 mx-auto mb-3 text-white" strokeWidth={3} />
            <p className="text-xs font-bold uppercase text-white mb-2">
              {t('profile_guild_title')}
            </p>
            <p className="text-2xl font-black text-white">「{user.title}」</p>
          </div>
        )}

        {/* Settings Section */}
        <div 
          className="mb-6 p-6"
          style={{
            backgroundColor: '#FFF',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <h3 className="flex items-center gap-2 text-xl font-black uppercase mb-4">
            <Settings className="w-6 h-6" strokeWidth={3} />
            {t('profile_settings')}
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
                  backgroundColor: language === 'zh' ? '#4ECDC4' : '#F0F0F0',
                  border: '3px solid #000',
                  boxShadow: language === 'zh' ? '4px 4px 0px #000' : '2px 2px 0px #000'
                }}
              >
                中文
              </button>
              <button
                onClick={() => switchLanguage('en')}
                className="py-3 font-black uppercase"
                style={{
                  backgroundColor: language === 'en' ? '#4ECDC4' : '#F0F0F0',
                  border: '3px solid #000',
                  boxShadow: language === 'en' ? '4px 4px 0px #000' : '2px 2px 0px #000'
                }}
              >
                English
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
          {t('profile_logout')}
        </button>
      </div>
    </div>
  );
}