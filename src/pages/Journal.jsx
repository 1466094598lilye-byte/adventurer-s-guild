import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import StreakDisplay from '../components/profile/StreakDisplay';
import { useLanguage } from '@/components/LanguageContext';
import { LogIn } from 'lucide-react';

export default function JournalPage() {
  const { language, t } = useLanguage();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        return null;
      }
    },
    retry: false,
    staleTime: 10000
  });

  // 固定获取最近7天的任务数据
  const { data: recentQuests = [] } = useQuery({
    queryKey: ['recentQuests'],
    queryFn: async () => {
      if (!user) return [];
      
      // 计算7天前的日期
      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      
      // 只获取最近7天的任务（无需解密，只需统计完成率）
      const quests = await base44.entities.Quest.filter(
        { date: { $gte: sevenDaysAgo } },
        '-date',
        200
      );
      
      return quests;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000
  });

  // 生成最近7天的完成率数据
  const getLast7DaysData = () => {
    const data = [];
    const today = new Date();
    const restDays = user?.restDays || [];

    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      // 🔥 修复：包含每日修炼任务！它们是最重要的习惯追踪
      const dayQuests = recentQuests.filter(q => q.date === dateStr);
      
      const isRestDay = restDays.includes(dateStr);
      
      let completionRate = 0;
      if (!isRestDay && dayQuests.length > 0) {
        const doneCount = dayQuests.filter(q => q.status === 'done').length;
        completionRate = Math.round((doneCount / dayQuests.length) * 100);
      }

      data.push({
        date: format(date, language === 'zh' ? 'MM/dd' : 'MM/dd'),
        completionRate: isRestDay ? null : completionRate,
        isRestDay: isRestDay,
        totalQuests: dayQuests.length
      });
    }

    return data;
  };

  const chartData = getLast7DaysData();

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      if (data.isRestDay) {
        return (
          <div 
            className="p-3"
            style={{
              backgroundColor: 'var(--color-cyan)',
              border: '3px solid var(--border-primary)',
              boxShadow: '4px 4px 0px var(--border-primary)'
            }}
          >
            <p className="font-black">{data.date}</p>
            <p className="font-bold text-sm">{language === 'zh' ? '🏖️ 休息日' : '🏖️ Rest Day'}</p>
          </div>
        );
      }

      return (
        <div 
          className="p-3"
          style={{
            backgroundColor: 'var(--color-yellow)',
            border: '3px solid var(--border-primary)',
            boxShadow: '4px 4px 0px var(--border-primary)'
          }}
        >
          <p className="font-black">{data.date}</p>
          <p className="font-bold">{language === 'zh' ? '完成率' : 'Completion'}: {data.completionRate}%</p>
          <p className="text-sm font-bold">{language === 'zh' ? '任务数' : 'Quests'}: {data.totalQuests}</p>
        </div>
      );
    }
    return null;
  };

  const getBarColor = (value) => {
    if (value === null) return 'var(--color-cyan)';
    if (value === 100) return 'var(--color-cyan)';
    if (value >= 50) return 'var(--color-yellow)';
    return 'var(--color-orange)';
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <div 
          className="mb-6 p-4 transform -rotate-1"
          style={{
            backgroundColor: 'var(--bg-black)',
            color: 'var(--color-yellow)',
            border: '5px solid var(--color-yellow)',
            boxShadow: '8px 8px 0px var(--color-yellow)'
          }}
        >
          <h1 className="text-3xl font-black uppercase text-center">
            📖 {t('journal_title')} 📖
          </h1>
        </div>

        {!user ? (
          <div 
            className="p-12 text-center"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '5px solid var(--border-primary)',
              boxShadow: '8px 8px 0px var(--border-primary)'
            }}
          >
            <LogIn className="w-24 h-24 mx-auto mb-6" strokeWidth={3} style={{ color: 'var(--color-yellow)' }} />
            <h2 className="text-2xl font-black uppercase mb-3" style={{ color: 'var(--text-primary)' }}>
              {language === 'zh' ? '请登录查看冒险日志' : 'Login to View Adventure Journal'}
            </h2>
            <p className="font-bold mb-6" style={{ color: 'var(--text-secondary)' }}>
              {language === 'zh' 
                ? '登录后可查看您的连胜记录、完成率趋势等数据'
                : 'Login to view your streak record, completion trend, and other data'}
            </p>
            <button
              onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
              className="px-8 py-3 font-black uppercase text-lg"
              style={{
                backgroundColor: 'var(--color-cyan)',
                border: '4px solid var(--border-primary)',
                boxShadow: '6px 6px 0px var(--border-primary)',
                color: 'var(--text-primary)'
              }}
            >
              <LogIn className="w-5 h-5 inline mr-2" strokeWidth={3} />
              {language === 'zh' ? '立即登录' : 'Login Now'}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <StreakDisplay 
                currentStreak={user.streakCount || 0}
                longestStreak={user.longestStreak || 0}
                freezeTokens={user.freezeTokenCount || 0}
              />
            </div>

            <div 
              className="p-6"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '5px solid var(--border-primary)',
                boxShadow: '8px 8px 0px var(--border-primary)'
              }}
            >
              <h2 className="text-2xl font-black uppercase mb-4" style={{ color: 'var(--text-primary)' }}>
                {t('journal_completion_trend')} (7{t('journal_days')})
              </h2>

              {chartData.every(d => d.totalQuests === 0 && !d.isRestDay) ? (
                <div className="text-center py-12">
                  <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>
                    {language === 'zh' ? '暂无数据' : 'No data available'}
                  </p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#999" />
                      <XAxis 
                        dataKey="date" 
                        style={{ 
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        style={{ 
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="completionRate" 
                        fill="var(--color-cyan)"
                        stroke="var(--border-primary)"
                        strokeWidth={2}
                        radius={[8, 8, 0, 0]}
                        shape={(props) => {
                          const { x, y, width, height, payload } = props;
                          const color = getBarColor(payload.completionRate);
                          return (
                            <rect
                              x={x}
                              y={y}
                              width={width}
                              height={height}
                              fill={color}
                              stroke="var(--border-primary)"
                              strokeWidth={2}
                              rx={8}
                              ry={8}
                            />
                          );
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  <div 
                    className="mt-6 p-4"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '3px solid var(--border-primary)'
                    }}
                  >
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div 
                          className="w-6 h-6 mx-auto mb-2"
                          style={{
                            backgroundColor: 'var(--color-cyan)',
                            border: '2px solid var(--border-primary)'
                          }}
                        />
                        <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{t('journal_legend_complete')}</p>
                      </div>
                      <div>
                        <div 
                          className="w-6 h-6 mx-auto mb-2"
                          style={{
                            backgroundColor: 'var(--color-yellow)',
                            border: '2px solid var(--border-primary)'
                          }}
                        />
                        <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{t('journal_legend_partial')}</p>
                      </div>
                      <div>
                        <div 
                          className="w-6 h-6 mx-auto mb-2"
                          style={{
                            backgroundColor: 'var(--color-orange)',
                            border: '2px solid var(--border-primary)'
                          }}
                        />
                        <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{t('journal_legend_incomplete')}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}