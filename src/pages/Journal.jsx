import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

  // Calculate streak data for chart
  const chartData = dates.slice(0, period).reverse().map(date => {
    const dayQuests = questsByDate[date];
    const total = dayQuests.length;
    const completed = dayQuests.filter(q => q.status === 'done').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      date: format(new Date(date), 'MM/dd'),
      rate: rate,
      label: `${rate}%`
    };
  });

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="p-2"
          style={{
            backgroundColor: '#FFE66D',
            border: '3px solid #000',
            boxShadow: '4px 4px 0px #000'
          }}
        >
          <p className="font-black text-sm">{payload[0].payload.date}</p>
          <p className="font-bold text-sm">完成率: {payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

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

        {/* Completion Rate Chart - Line Chart */}
        <div 
          className="p-4 mb-4"
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

          {chartData.length > 0 ? (
            <>
              <div className="bg-white p-3" style={{ border: '3px solid #000', height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#000" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#000"
                      style={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <YAxis 
                      stroke="#000"
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      style={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#C44569" 
                      strokeWidth={3}
                      dot={{ fill: '#C44569', strokeWidth: 2, r: 4, stroke: '#000' }}
                      activeDot={{ r: 6, strokeWidth: 3, stroke: '#000' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div 
                className="mt-3 p-3"
                style={{
                  backgroundColor: '#FFF',
                  border: '3px solid #000'
                }}
              >
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 flex-shrink-0"
                      style={{
                        backgroundColor: '#4ECDC4',
                        border: '2px solid #000'
                      }}
                    />
                    <span className="font-bold">100% 完美</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 flex-shrink-0"
                      style={{
                        backgroundColor: '#FFE66D',
                        border: '2px solid #000'
                      }}
                    />
                    <span className="font-bold">50-99% 良好</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 flex-shrink-0"
                      style={{
                        backgroundColor: '#FF6B35',
                        border: '2px solid #000'
                      }}
                    />
                    <span className="font-bold">&lt;50% 待提升</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="font-bold text-gray-600">暂无数据</p>
            </div>
          )}
        </div>

        {dates.length === 0 && (
          <div 
            className="p-8 text-center"
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