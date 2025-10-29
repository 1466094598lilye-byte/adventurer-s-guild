import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';
import StreakDisplay from '../components/profile/StreakDisplay';

export default function Journal() {
  const [period, setPeriod] = useState(7);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: recentQuests = [] } = useQuery({
    queryKey: ['recentQuests', period],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), period), 'yyyy-MM-dd');
      const allQuests = await base44.entities.Quest.list('-date', 500);
      return allQuests.filter(q => q.date >= startDate);
    }
  });

  // Group quests by date
  const questsByDate = recentQuests.reduce((acc, quest) => {
    if (!acc[quest.date]) acc[quest.date] = [];
    acc[quest.date].push(quest);
    return acc;
  }, {});

  const dates = Object.keys(questsByDate).sort().reverse();

  // Calculate streak data
  const streakData = dates.map(date => {
    const dayQuests = questsByDate[date];
    const total = dayQuests.length;
    const completed = dayQuests.filter(q => q.status === 'done').length;
    return {
      date,
      total,
      completed,
      rate: total > 0 ? (completed / total * 100).toFixed(0) : 0
    };
  });

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div 
          className="mb-6 p-4 transform rotate-1"
          style={{
            backgroundColor: '#C44569',
            color: '#FFF',
            border: '5px solid #000',
            boxShadow: '8px 8px 0px #000'
          }}
        >
          <h1 className="text-3xl font-black uppercase text-center">
            📖 冒险日志 📖
          </h1>
        </div>

        {/* Streak Display */}
        <div className="mb-6">
          <StreakDisplay
            currentStreak={user?.streakCount || 0}
            longestStreak={user?.longestStreak || 0}
            freezeTokens={user?.freezeTokenCount || 0}
          />
        </div>

        {/* Period Selector */}
        <div className="flex gap-3 mb-6">
          {[7, 30].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="flex-1 py-2 font-black uppercase text-sm"
              style={{
                backgroundColor: period === p ? '#FF6B35' : '#FFF',
                color: period === p ? '#FFF' : '#000',
                border: '3px solid #000',
                boxShadow: period === p ? '4px 4px 0px #000' : '2px 2px 0px #000'
              }}
            >
              {p}天
            </button>
          ))}
        </div>

        {/* Completion Rate Chart */}
        <div 
          className="p-4"
          style={{
            backgroundColor: '#FFE66D',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5" strokeWidth={3} />
            <h3 className="font-black uppercase">完成率趋势</h3>
          </div>
          <div className="flex items-end gap-2 h-40">
            {streakData.slice(0, period === 7 ? 7 : 30).reverse().map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full"
                  style={{
                    height: `${day.rate}%`,
                    backgroundColor: day.rate === 100 ? '#4ECDC4' : day.rate >= 50 ? '#FFE66D' : '#FF6B35',
                    border: '2px solid #000',
                    minHeight: '8px'
                  }}
                />
                <span className="text-xs font-bold">{day.rate}%</span>
              </div>
            ))}
          </div>
        </div>

        {dates.length === 0 && (
          <div 
            className="p-8 text-center mt-6"
            style={{
              backgroundColor: '#FFF',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            <p className="text-2xl font-black uppercase mb-2">暂无记录</p>
            <p className="font-bold text-gray-600">完成任务后会在此显示</p>
          </div>
        )}
      </div>
    </div>
  );
}