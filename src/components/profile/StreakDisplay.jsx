import { Flame, Shield } from 'lucide-react';

export default function StreakDisplay({ currentStreak, longestStreak, freezeTokens }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Current Streak */}
      <div 
        className="p-4 transform -rotate-1"
        style={{
          backgroundColor: '#FF6B35',
          border: '4px solid #000',
          boxShadow: '6px 6px 0px #000'
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-6 h-6 text-white" strokeWidth={3} />
          <span className="font-black uppercase text-white text-sm">当前连胜</span>
        </div>
        <div className="text-4xl font-black text-white">
          {currentStreak}
          <span className="text-lg ml-1">天</span>
        </div>
      </div>

      {/* Longest Streak */}
      <div 
        className="p-4 transform rotate-1"
        style={{
          backgroundColor: '#C44569',
          border: '4px solid #000',
          boxShadow: '6px 6px 0px #000'
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-6 h-6 text-white" strokeWidth={3} />
          <span className="font-black uppercase text-white text-sm">最长连胜</span>
        </div>
        <div className="text-4xl font-black text-white">
          {longestStreak}
          <span className="text-lg ml-1">天</span>
        </div>
      </div>

      {/* Freeze Tokens */}
      <div 
        className="col-span-2 p-4"
        style={{
          backgroundColor: '#4ECDC4',
          border: '4px solid #000',
          boxShadow: '6px 6px 0px #000'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6" strokeWidth={3} />
            <span className="font-black uppercase text-sm">冻结券</span>
          </div>
          <div className="text-3xl font-black">
            {freezeTokens}
            <span className="text-base ml-1">张</span>
          </div>
        </div>
        <p className="text-xs font-bold mt-2" style={{ color: '#000' }}>
          可跳过一次不清空任务，保持连胜不中断
        </p>
      </div>
    </div>
  );
}