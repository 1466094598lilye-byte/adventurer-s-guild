import React from 'react'; // Added React import
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Award, Flame, Shield, Settings, Trash2, Moon, Sun } from 'lucide-react';
import StreakDisplay from '../components/profile/StreakDisplay';
import { useLanguage } from '@/components/LanguageContext';
import StreakRecoveryDialog from '@/components/StreakRecoveryDialog';

export default function Profile() {
  const { t, language, switchLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const [showRecoveryDialog, setShowRecoveryDialog] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');
  const [isDarkMode, setIsDarkMode] = React.useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    return false; // 默认浅色模式
  });

  // 应用深色模式到 DOM
  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleDeleteAccount = async () => {
    const requiredText = 'DELETE MY ACCOUNT';
    
    if (deleteConfirmText !== requiredText) {
      alert(language === 'zh' 
        ? `❌ 请输入"${requiredText}"以确认删除` 
        : `❌ Please type "${requiredText}" to confirm`);
      return;
    }

    setIsDeleting(true);
    try {
      const { data } = await base44.functions.invoke('deleteUserData');
      
      if (data.success) {
        alert(language === 'zh' 
          ? `✅ 账户数据已成功删除（共删除 ${data.totalDeleted} 条记录）。即将退出登录...` 
          : `✅ Account data successfully deleted (${data.totalDeleted} records). Logging out...`);
        
        // 延迟1秒后退出登录
        setTimeout(() => {
          base44.auth.logout();
        }, 1000);
      } else {
        alert(language === 'zh' 
          ? `❌ 删除失败：${data.message}` 
          : `❌ Deletion failed: ${data.message}`);
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('Delete account error:', error);
      alert(language === 'zh' 
        ? `❌ 删除账户时发生错误：${error.message}` 
        : `❌ Error deleting account: ${error.message}`);
      setIsDeleting(false);
    }
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  };

  const handleRecoverySuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
  };

  const milestones = [
    { days: 7, title: language === 'zh' ? '新秀冒险家' : 'Rising Adventurer', tokens: 1, icon: '🌟' },
    { days: 21, title: language === 'zh' ? '精英挑战者' : 'Elite Challenger', tokens: 2, icon: '⚔️' },
    { days: 50, title: language === 'zh' ? '连胜大师' : 'Streak Master', tokens: 3, icon: '🏆' },
    { days: 100, title: language === 'zh' ? '传奇不灭' : 'Eternal Legend', tokens: 5, icon: '👑' }
  ];

  const unlockedMilestones = user?.unlockedMilestones || [];

  if (isLoading) return <div className="flex justify-center p-12"><div className="w-12 h-12 border-4 border-black border-t-yellow-400 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
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

        {/* 连胜恢复按钮 - 当最长连胜<=1时显示 */}
        {user && user.longestStreak <= 1 && (
          <div className="mb-6">
            <button
              onClick={() => setShowRecoveryDialog(true)}
              className="w-full py-4 font-black uppercase text-lg"
              style={{
                backgroundColor: '#FF6B35',
                color: '#FFF',
                border: '4px solid #000',
                boxShadow: '6px 6px 0px #000'
              }}
            >
              {t('profile_restore_streak')}
            </button>
          </div>
        )}

        {/* User Info Card */}
        <div 
          className="mb-6 p-6"
          style={{
            backgroundColor: 'var(--color-yellow)',
            border: '4px solid var(--border-primary)',
            boxShadow: '6px 6px 0px var(--border-primary)'
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
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{user?.streakCount || 0}</p>
              <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-primary)' }}>{t('profile_current_streak')}</p>
            </div>

            {/* Longest Streak */}
            <div 
              className="p-4 text-center"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '3px solid var(--border-primary)'
              }}
            >
              <Award className="w-8 h-8 mx-auto mb-2" strokeWidth={3} style={{ color: 'var(--color-pink)' }} />
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{user?.longestStreak || 0}</p>
              <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-primary)' }}>{t('profile_longest_streak')}</p>
            </div>

            {/* Freeze Tokens */}
            <div 
              className="p-4 text-center col-span-2"
              style={{
                backgroundColor: 'var(--color-cyan)',
                border: '3px solid var(--border-primary)'
              }}
            >
              <Shield className="w-8 h-8 mx-auto mb-2" strokeWidth={3} style={{ color: 'var(--text-primary)' }} />
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{user?.freezeTokenCount || 0}</p>
              <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-primary)' }}>{t('profile_freeze_tokens')}</p>
              <p className="text-xs font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                {t('profile_freeze_tokens_hint')}
              </p>
            </div>
          </div>
        </div>

        {/* Title Badge */}
        <div 
          className="mb-6 p-6 text-center"
          style={{
            backgroundColor: user?.title ? 'var(--color-pink)' : '#E0E0E0',
            border: '4px solid var(--border-primary)',
            boxShadow: '6px 6px 0px var(--border-primary)'
          }}
        >
          <Award className="w-12 h-12 mx-auto mb-3" strokeWidth={3} style={{ color: user?.title ? 'var(--text-inverse)' : '#999' }} />
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
            backgroundColor: 'var(--bg-secondary)',
            border: '4px solid var(--border-primary)',
            boxShadow: '6px 6px 0px var(--border-primary)'
          }}
        >
          <h3 className="text-xl font-black uppercase mb-4" style={{ color: 'var(--text-primary)' }}>
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
                    backgroundColor: isUnlocked ? 'var(--color-yellow)' : '#F0F0F0',
                    border: '3px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                    opacity: isUnlocked ? 1 : 0.6
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{milestone.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{milestone.days} {t('journal_days')}</p>
                        {isUnlocked && (
                          <span className="text-xs font-black px-2 py-0.5" style={{ backgroundColor: 'var(--color-cyan)', border: '2px solid var(--border-primary)', color: 'var(--text-primary)' }}>
                            ✓ {language === 'zh' ? '已解锁' : 'Unlocked'}
                          </span>
                        )}
                        {!isUnlocked && (
                          <span className="text-xs font-bold" style={{ color: '#999' }}>
                            🔒 {t('profile_milestone_locked')}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
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
            border: '4px solid var(--border-primary)',
            boxShadow: '6px 6px 0px var(--border-primary)'
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
              backgroundColor: 'var(--bg-secondary)',
              border: '3px solid var(--border-primary)'
            }}
          >
            <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-primary)' }}>{t('profile_chest_counter')}</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div 
                  className="h-6 relative"
                  style={{
                    backgroundColor: '#E0E0E0',
                    border: '3px solid var(--border-primary)'
                  }}
                >
                  <div 
                    className="h-full transition-all"
                    style={{
                      backgroundColor: 'var(--color-cyan)',
                      width: `${((user?.chestOpenCounter || 0) / 60) * 100}%`
                    }}
                  />
                </div>
              </div>
              <p className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>
                {user?.chestOpenCounter || 0} / 60
              </p>
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div 
          className="mb-6 p-6"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '4px solid var(--border-primary)',
            boxShadow: '6px 6px 0px var(--border-primary)'
          }}
        >
          <h3 className="flex items-center gap-2 text-xl font-black uppercase mb-4" style={{ color: 'var(--text-primary)' }}>
            <Settings className="w-6 h-6" strokeWidth={3} />
            {t('profile_settings')}
          </h3>

          {/* Language Selector */}
          <div className="mb-4">
            <label className="block text-sm font-black uppercase mb-2" style={{ color: 'var(--text-primary)' }}>
              {t('profile_language')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => switchLanguage('zh')}
                className="py-3 font-black uppercase"
                style={{
                  backgroundColor: language === 'zh' ? 'var(--color-cyan)' : '#F0F0F0',
                  color: 'var(--text-primary)',
                  border: '3px solid var(--border-primary)',
                  boxShadow: language === 'zh' ? '4px 4px 0px var(--border-primary)' : '2px 2px 0px var(--border-primary)',
                  transform: language === 'zh' ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                {t('profile_chinese')}
              </button>
              <button
                onClick={() => switchLanguage('en')}
                className="py-3 font-black uppercase"
                style={{
                  backgroundColor: language === 'en' ? 'var(--color-cyan)' : '#F0F0F0',
                  color: 'var(--text-primary)',
                  border: '3px solid var(--border-primary)',
                  boxShadow: language === 'en' ? '4px 4px 0px var(--border-primary)' : '2px 2px 0px var(--border-primary)',
                  transform: language === 'en' ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                {t('profile_english')}
              </button>
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <div className="mb-4">
            <label className="block text-sm font-black uppercase mb-2" style={{ color: 'var(--text-primary)' }}>
              {language === 'zh' ? '🌙 深色模式' : '🌙 Dark Mode'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsDarkMode(false)}
                className="py-3 font-black uppercase flex items-center justify-center gap-2"
                style={{
                  backgroundColor: !isDarkMode ? 'var(--color-yellow)' : '#F0F0F0',
                  color: 'var(--text-primary)',
                  border: '3px solid var(--border-primary)',
                  boxShadow: !isDarkMode ? '4px 4px 0px var(--border-primary)' : '2px 2px 0px var(--border-primary)',
                  transform: !isDarkMode ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                <Sun className="w-5 h-5" strokeWidth={3} />
                {language === 'zh' ? '浅色' : 'Light'}
              </button>
              <button
                onClick={() => setIsDarkMode(true)}
                className="py-3 font-black uppercase flex items-center justify-center gap-2"
                style={{
                  backgroundColor: isDarkMode ? 'var(--color-cyan)' : '#F0F0F0',
                  color: 'var(--text-primary)',
                  border: '3px solid var(--border-primary)',
                  boxShadow: isDarkMode ? '4px 4px 0px var(--border-primary)' : '2px 2px 0px var(--border-primary)',
                  transform: isDarkMode ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                <Moon className="w-5 h-5" strokeWidth={3} />
                {language === 'zh' ? '深色' : 'Dark'}
              </button>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3 mb-4"
          style={{
            backgroundColor: 'var(--color-orange)',
            color: 'var(--text-inverse)',
            border: '4px solid var(--border-primary)',
            boxShadow: '6px 6px 0px var(--border-primary)'
          }}
        >
          <LogOut className="w-6 h-6" strokeWidth={3} />
          {language === 'zh' ? '退出登录' : 'Logout'}
        </button>

        {/* Delete Account Button */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
          className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3"
          style={{
            backgroundColor: 'var(--color-pink)',
            color: 'var(--text-inverse)',
            border: '4px solid var(--border-primary)',
            boxShadow: '6px 6px 0px var(--border-primary)',
            opacity: isDeleting ? 0.5 : 1
          }}
        >
          <Trash2 className="w-6 h-6" strokeWidth={3} />
          {isDeleting 
            ? (language === 'zh' ? '删除中...' : 'Deleting...') 
            : (language === 'zh' ? '永久删除账户' : 'Delete Account Permanently')}
        </button>

        {/* Streak Recovery Dialog */}
        <StreakRecoveryDialog
          isOpen={showRecoveryDialog}
          onClose={() => setShowRecoveryDialog(false)}
          onSuccess={handleRecoverySuccess}
        />

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeleteConfirmText('');
            }}
          >
            <div
              className="relative max-w-lg w-full p-6"
              style={{
                backgroundColor: 'var(--color-orange)',
                border: '5px solid var(--border-primary)',
                boxShadow: '12px 12px 0px var(--border-primary)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-black uppercase text-center mb-2 text-white">
                {language === 'zh' ? '⚠️ 危险操作：删除账号 ⚠️' : '⚠️ Danger Zone: Delete Account ⚠️'}
              </h2>
              
              <p className="text-center font-bold text-sm mb-4 text-white">
                {language === 'zh' 
                  ? '此操作不可逆，请谨慎选择。' 
                  : 'This action is irreversible. Please proceed with extreme caution.'}
              </p>

              <div
                className="mb-4 p-4 max-h-80 overflow-y-auto"
                style={{
                  backgroundColor: '#FFF',
                  border: '3px solid #000'
                }}
              >
                <p className="font-bold text-sm leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>
                  {language === 'zh' 
                    ? '点击确认后，以下与您关联的个人数据将从服务器永久删除：' 
                    : 'Upon confirmation, the following personal data associated with your account will be permanently removed from our servers:'}
                </p>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-black mb-1">
                      {language === 'zh' ? '📋 任务与项目' : '📋 Tasks & Projects'}
                      </p>
                      <ul className="font-bold pl-4 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                      <li>• {language === 'zh' ? '任务记录' : 'Quest Records'}</li>
                      <li>• {language === 'zh' ? '大项目记录' : 'Long-Term Projects'}</li>
                      <li>• {language === 'zh' ? '深度休息任务' : 'Deep Rest Tasks'}</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-black mb-1">
                      {language === 'zh' ? '💎 资产与进度' : '💎 Assets & Progress'}
                      </p>
                      <ul className="font-bold pl-4 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                      <li>• {language === 'zh' ? '每日宝箱记录' : 'Daily Chest Records'}</li>
                      <li>• {language === 'zh' ? '宝物收藏' : 'Loot Collection'}</li>
                      <li>• {language === 'zh' ? '冻结券' : 'Freeze Tokens'}</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-black mb-1">
                      {language === 'zh' ? '🏆 荣誉与统计' : '🏆 Honor & Stats'}
                      </p>
                      <ul className="font-bold pl-4 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                      <li>• {language === 'zh' ? '连胜记录' : 'Streak Records'}</li>
                      <li>• {language === 'zh' ? '协会称号' : 'Guild Title'}</li>
                      <li>• {language === 'zh' ? '连胜里程碑' : 'Streak Milestones'}</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-black mb-1">
                      {language === 'zh' ? '⚙️ 系统记录' : '⚙️ System Records'}
                      </p>
                      <ul className="font-bold pl-4 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                      <li>• {language === 'zh' ? '宝箱保底进度' : 'Chest Pity System Progress'}</li>
                      <li>• {language === 'zh' ? '规划任务' : 'Planned Quests'}</li>
                      <li>• {language === 'zh' ? '休息日设置' : 'Rest Day Settings'}</li>
                    </ul>
                  </div>
                </div>

                <p className="font-black text-sm mt-4" style={{ color: 'var(--color-orange)' }}>
                  {language === 'zh' 
                    ? '⚠️ 一旦删除，我们无法恢复任何已丢失的数据。' 
                    : '⚠️ We are unable to recover any data once it has been deleted.'}
                </p>
              </div>

              <div
                className="mb-4 p-4"
                style={{
                  backgroundColor: 'var(--color-yellow)',
                  border: '3px solid var(--border-primary)'
                }}
              >
                <label className="block font-black text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
                  {language === 'zh' 
                    ? '请输入以下文字以确认：DELETE MY ACCOUNT' 
                    : 'Please type the following to confirm: DELETE MY ACCOUNT'}
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="w-full px-3 py-2 font-bold"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '3px solid var(--border-primary)'
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-3 font-black uppercase"
                  style={{
                    backgroundColor: 'var(--color-cyan)',
                    color: 'var(--text-primary)',
                    border: '4px solid var(--border-primary)',
                    boxShadow: '4px 4px 0px var(--border-primary)',
                    opacity: isDeleting ? 0.5 : 1
                  }}
                >
                  {language === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || deleteConfirmText !== 'DELETE MY ACCOUNT'}
                  className="flex-1 py-3 font-black uppercase"
                  style={{
                    backgroundColor: 'var(--bg-black)',
                    color: 'var(--text-inverse)',
                    border: '4px solid var(--text-inverse)',
                    boxShadow: '4px 4px 0px var(--text-inverse)',
                    opacity: (isDeleting || deleteConfirmText !== 'DELETE MY ACCOUNT') ? 0.5 : 1
                  }}
                >
                  {isDeleting 
                    ? (language === 'zh' ? '删除中...' : 'Deleting...') 
                    : (language === 'zh' ? '确认删除' : 'Confirm Delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.85; }
          }
        `}</style>
      </div>
    </div>
  );
}