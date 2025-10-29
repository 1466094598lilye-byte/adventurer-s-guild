
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, LogOut, Info, Shield, Award } from 'lucide-react';
import StreakDisplay from '../components/profile/StreakDisplay';

export default function Profile() {
  const [displayName, setDisplayName] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const me = await base44.auth.me();
      setDisplayName(me.displayName || me.full_name || '');
      return me;
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      alert('保存成功！');
    }
  });

  const handleSave = () => {
    updateUserMutation.mutate({ displayName });
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div 
          className="mb-6 p-4 transform rotate-1"
          style={{
            backgroundColor: '#FF6B35',
            color: '#FFF',
            border: '5px solid #000',
            boxShadow: '8px 8px 0px #000'
          }}
        >
          <h1 className="text-3xl font-black uppercase text-center">
            ⚔️ 冒险者档案 ⚔️
          </h1>
        </div>

        {/* User Info */}
        <div 
          className="mb-6 p-4"
          style={{
            backgroundColor: '#FFF',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-16 h-16 flex items-center justify-center"
              style={{
                backgroundColor: '#4ECDC4',
                border: '3px solid #000',
                boxShadow: '4px 4px 0px #000'
              }}
            >
              <User className="w-8 h-8" strokeWidth={3} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase mb-1" style={{ color: '#666' }}>
                冒险者名称
              </p>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 font-black text-lg"
                style={{
                  backgroundColor: '#FFE66D',
                  border: '3px solid #000'
                }}
              />
            </div>
          </div>

          {/* Title Display */}
          {user?.title && (
            <div 
              className="mb-4 p-3 text-center"
              style={{
                backgroundColor: '#C44569',
                border: '3px solid #000'
              }}
            >
              <p className="text-xs font-bold uppercase text-white mb-1">当前称号</p>
              <p className="text-xl font-black text-white">「{user.title}」</p>
            </div>
          )}

          <div className="mb-4">
            <p className="text-xs font-bold uppercase mb-1" style={{ color: '#666' }}>
              工会ID（邮箱）
            </p>
            <div 
              className="px-3 py-2"
              style={{
                backgroundColor: '#F0F0F0',
                border: '3px solid #000'
              }}
            >
              <p className="font-bold">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={updateUserMutation.isPending}
            className="w-full py-3 font-black uppercase"
            style={{
              backgroundColor: '#4ECDC4',
              border: '4px solid #000',
              boxShadow: '5px 5px 0px #000'
            }}
          >
            {updateUserMutation.isPending ? '保存中...' : '保存'}
          </button>
        </div>

        {/* Streak */}
        <div className="mb-6">
          <StreakDisplay
            currentStreak={user?.streakCount || 0}
            longestStreak={user?.longestStreak || 0}
            freezeTokens={user?.freezeTokenCount || 0}
          />
        </div>

        {/* Milestone Achievements */}
        <div 
          className="mb-6 p-4"
          style={{
            backgroundColor: '#FFE66D',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5" strokeWidth={3} />
            <h3 className="font-black uppercase">连胜里程碑</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { days: 7, title: '新秀冒险家', icon: '🌟' },
              { days: 21, title: '精英挑战者', icon: '⚔️' },
              { days: 50, title: '连胜大师', icon: '🏆' },
              { days: 100, title: '传奇不灭', icon: '👑' }
            ].map(milestone => {
              const achieved = (user?.unlockedMilestones || []).includes(milestone.days);
              return (
                <div 
                  key={milestone.days}
                  className="p-3 text-center"
                  style={{
                    backgroundColor: achieved ? '#4ECDC4' : '#FFF',
                    border: '3px solid #000',
                    opacity: achieved ? 1 : 0.5
                  }}
                >
                  <div className="text-2xl mb-1">{achieved ? milestone.icon : '○'}</div>
                  <div className="font-black text-sm mb-1">{milestone.days}天</div>
                  <div className="font-bold text-xs">{milestone.title}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rules */}
        <div 
          className="mb-6 p-4"
          style={{
            backgroundColor: '#FFF',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5" strokeWidth={3} />
            <h3 className="font-black uppercase">规则说明</h3>
          </div>
          <div className="space-y-3 font-bold text-sm" style={{ color: '#333' }}>
            <p>• 完成当天所有委托即可开启宝箱</p>
            <p>• 每日清空任务列表，连胜+1</p>
            <p>• 未清空任务则连胜归零</p>
            <p>• 使用冻结券可跳过一天保持连胜</p>
            <p>• 达到连胜里程碑获得特别表彰和奖励</p>
          </div>
        </div>

        {/* Freeze Token Info */}
        <div 
          className="mb-6 p-4"
          style={{
            backgroundColor: '#C44569',
            color: '#FFF',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5" strokeWidth={3} />
            <h3 className="font-black uppercase">关于冻结券</h3>
          </div>
          <p className="font-bold text-sm mb-3">
            冻结券是稀有战利品，可在某天无法完成任务时使用，保护连胜不中断。
          </p>
          <div 
            className="p-3"
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.3)'
            }}
          >
            <p className="font-bold text-xs">
              📦 每日宝箱有1%概率开出冻结券<br/>
              🏆 达成连胜里程碑也会奖励冻结券
            </p>
          </div>
        </div>

        {/* Privacy & Logout */}
        <div className="space-y-3">
          <button
            className="w-full py-3 font-black uppercase text-sm"
            style={{
              backgroundColor: '#FFF',
              border: '3px solid #000',
              boxShadow: '4px 4px 0px #000'
            }}
          >
            <Info className="w-4 h-4 inline mr-2" strokeWidth={3} />
            隐私政策
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-3 font-black uppercase text-sm"
            style={{
              backgroundColor: '#FF6B35',
              color: '#FFF',
              border: '3px solid #000',
              boxShadow: '4px 4px 0px #000'
            }}
          >
            <LogOut className="w-4 h-4 inline mr-2" strokeWidth={3} />
            登出
          </button>
        </div>
      </div>
    </div>
  );
}
