import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Package, Filter, Sparkles } from 'lucide-react';
import RarityBadge from '../components/quest/RarityBadge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Treasures() {
  const [rarityFilter, setRarityFilter] = useState('all');

  const { data: loot = [] } = useQuery({
    queryKey: ['loot'],
    queryFn: () => base44.entities.Loot.list('-obtainedAt')
  });

  const filteredLoot = rarityFilter === 'all' 
    ? loot 
    : loot.filter(item => item.rarity === rarityFilter);

  const rarityCount = {
    Common: loot.filter(l => l.rarity === 'Common').length,
    Rare: loot.filter(l => l.rarity === 'Rare').length,
    Epic: loot.filter(l => l.rarity === 'Epic').length,
    Legendary: loot.filter(l => l.rarity === 'Legendary').length
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div 
          className="mb-6 p-4 transform -rotate-1"
          style={{
            backgroundColor: '#9B59B6',
            color: '#FFF',
            border: '5px solid #000',
            boxShadow: '8px 8px 0px #000'
          }}
        >
          <h1 className="text-3xl font-black uppercase text-center">
            💎 宝物收藏 💎
          </h1>
          <p className="text-center font-bold mt-2 text-sm">
            共收集 {loot.length} 件战利品
          </p>
        </div>

        {loot.length === 0 ? (
          /* Empty State */
          <div 
            className="p-8 text-center mb-6"
            style={{
              backgroundColor: '#FFF',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            <div className="mb-6">
              <div 
                className="w-32 h-32 mx-auto flex items-center justify-center mb-4 animate-bounce"
                style={{
                  backgroundColor: '#FFE66D',
                  border: '5px solid #000',
                  boxShadow: '8px 8px 0px #000'
                }}
              >
                <Package className="w-20 h-20" strokeWidth={4} />
              </div>
            </div>

            <h2 className="text-2xl font-black uppercase mb-4">
              宝库尚未开启
            </h2>

            <div 
              className="mb-6 p-4 text-left"
              style={{
                backgroundColor: '#FFE66D',
                border: '3px solid #000'
              }}
            >
              <p className="font-bold leading-relaxed mb-3">
                冒险者，欢迎来到工会宝库！
              </p>
              <p className="font-bold leading-relaxed mb-3">
                每当你完成一天的所有委托，就能开启当日的神秘宝箱，获得珍贵的战利品。这些宝物不仅是你努力的见证，更可能带来意想不到的奖励。
              </p>
              <p className="font-bold leading-relaxed">
                从今天开始，完成任务清单，开启你的第一个宝箱吧！✨
              </p>
            </div>

            <Link
              to={createPageUrl('QuestBoard')}
              className="inline-flex items-center gap-3 px-8 py-4 font-black uppercase text-lg"
              style={{
                backgroundColor: '#4ECDC4',
                border: '4px solid #000',
                boxShadow: '6px 6px 0px #000'
              }}
            >
              <Sparkles className="w-6 h-6" strokeWidth={3} />
              前往委托板
            </Link>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {Object.entries(rarityCount).map(([rarity, count]) => (
                <div 
                  key={rarity}
                  className="p-3 text-center"
                  style={{
                    backgroundColor: '#FFF',
                    border: '3px solid #000',
                    boxShadow: '4px 4px 0px #000'
                  }}
                >
                  <div className="text-2xl font-black mb-1">{count}</div>
                  <div className="text-xs font-bold uppercase">{rarity}</div>
                </div>
              ))}
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
              {['all', 'Common', 'Rare', 'Epic', 'Legendary'].map(r => (
                <button
                  key={r}
                  onClick={() => setRarityFilter(r)}
                  className="px-4 py-2 font-black uppercase text-sm whitespace-nowrap"
                  style={{
                    backgroundColor: rarityFilter === r ? '#FF6B35' : '#FFF',
                    color: rarityFilter === r ? '#FFF' : '#000',
                    border: '3px solid #000',
                    boxShadow: rarityFilter === r ? '3px 3px 0px #000' : '2px 2px 0px #000'
                  }}
                >
                  <Filter className="w-3 h-3 inline mr-1" strokeWidth={3} />
                  {r === 'all' ? '全部' : r}
                </button>
              ))}
            </div>

            {/* Loot Grid */}
            {filteredLoot.length === 0 ? (
              <div 
                className="p-8 text-center"
                style={{
                  backgroundColor: '#FFF',
                  border: '4px solid #000',
                  boxShadow: '6px 6px 0px #000'
                }}
              >
                <p className="text-xl font-black uppercase mb-2">该稀有度暂无宝物</p>
                <p className="font-bold text-gray-600">尝试其他筛选条件</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredLoot.map(item => (
                  <div 
                    key={item.id}
                    className="p-4 transform hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: '#FFF',
                      border: '4px solid #000',
                      boxShadow: '6px 6px 0px #000'
                    }}
                  >
                    <div className="flex gap-4">
                      <div 
                        className="w-20 h-20 flex items-center justify-center text-4xl flex-shrink-0"
                        style={{
                          backgroundColor: '#FFE66D',
                          border: '3px solid #000'
                        }}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-black uppercase text-lg">{item.name}</h3>
                          <RarityBadge rarity={item.rarity} />
                        </div>
                        <p className="font-bold text-sm mb-2" style={{ color: '#666' }}>
                          {item.flavorText}
                        </p>
                        <p className="text-xs font-bold" style={{ color: '#999' }}>
                          获得于 {format(new Date(item.obtainedAt), 'yyyy/MM/dd HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}