
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Package, Sparkles, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useLanguage } from '@/components/LanguageContext';

export default function Treasures() {
  const [rarityFilter, setRarityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const { t, language } = useLanguage();

  // 获取总数（用于计算总页数）
  const { data: allLoot = [] } = useQuery({
    queryKey: ['loot-all'],
    queryFn: () => base44.entities.Loot.list('-obtainedAt')
  });

  // 筛选后的总数
  const filteredAllLoot = rarityFilter === 'all' 
    ? allLoot 
    : allLoot.filter(item => item.rarity === rarityFilter);

  const totalPages = Math.ceil(filteredAllLoot.length / itemsPerPage);

  // 获取当前页的数据
  const { data: loot = [], isLoading } = useQuery({
    queryKey: ['loot-page', rarityFilter, currentPage],
    queryFn: async () => {
      const skip = (currentPage - 1) * itemsPerPage;
      
      if (rarityFilter === 'all') {
        return base44.entities.Loot.list('-obtainedAt', itemsPerPage, skip);
      } else {
        // 对于筛选的情况，我们需要获取更多数据然后手动分页
        // 因为 SDK 的 filter 可能不支持 skip/limit
        const filtered = filteredAllLoot.slice(skip, skip + itemsPerPage);
        return filtered;
      }
    },
    enabled: filteredAllLoot.length > 0 || rarityFilter === 'all'
  });

  const rarityCounts = {
    Common: allLoot.filter(item => item.rarity === 'Common').length,
    Rare: allLoot.filter(item => item.rarity === 'Rare').length,
    Epic: allLoot.filter(item => item.rarity === 'Epic').length,
    Legendary: allLoot.filter(item => item.rarity === 'Legendary').length
  };

  const rarityColors = {
    Common: { bg: '#E8E8E8', text: '#333' },
    Rare: { bg: '#4ECDC4', text: '#000' },
    Epic: { bg: '#C44569', text: '#FFF' },
    Legendary: { bg: '#FFE66D', text: '#000' }
  };

  const handleFilterChange = (newFilter) => {
    setRarityFilter(newFilter);
    setCurrentPage(1); // 切换筛选时重置到第一页
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
            💎 {t('treasures_title')} 💎
          </h1>
          <p className="text-center font-bold mt-2 text-sm">
            {t('treasures_collected')} {allLoot.length} {t('treasures_items')}
          </p>
        </div>

        {allLoot.length === 0 ? (
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
              {language === 'zh' ? '宝库尚未开启' : 'Treasury Not Yet Opened'}
            </h2>

            <div 
              className="mb-6 p-4 text-left"
              style={{
                backgroundColor: '#FFE66D',
                border: '3px solid #000'
              }}
            >
              <p className="font-bold leading-relaxed mb-3">
                {language === 'zh' 
                  ? '冒险者，欢迎来到工会宝库！'
                  : 'Welcome to the Guild Treasury, Adventurer!'}
              </p>
              <p className="font-bold leading-relaxed mb-3">
                {language === 'zh'
                  ? '每当你完成一天的所有委托，就能开启当日的神秘宝箱，获得珍贵的战利品。这些宝物不仅是你努力的见证，更可能带来意想不到的奖励。'
                  : 'Complete all daily quests to unlock mysterious treasure chests and earn valuable loot. These treasures are not only proof of your efforts but may also bring unexpected rewards.'}
              </p>
              <p className="font-bold leading-relaxed">
                {language === 'zh'
                  ? '从今天开始，完成任务清单，开启你的第一个宝箱吧！✨'
                  : 'Start today, complete your quest list, and unlock your first chest! ✨'}
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
              {language === 'zh' ? '前往委托板' : 'Go to Quest Board'}
            </Link>
          </div>
        ) : (
          <>
            {/* Rarity Stats */}
            <div 
              className="mb-4 p-4"
              style={{
                backgroundColor: '#FFE66D',
                border: '4px solid #000',
                boxShadow: '6px 6px 0px #000'
              }}
            >
              <h3 className="font-black uppercase mb-3 text-sm">{t('treasures_stats')}</h3>
              <div className="grid grid-cols-4 gap-2">
                {['Common', 'Rare', 'Epic', 'Legendary'].map(r => (
                  <div 
                    key={r}
                    className="text-center p-2"
                    style={{
                      backgroundColor: rarityColors[r].bg,
                      color: rarityColors[r].text,
                      border: '3px solid #000'
                    }}
                  >
                    <div className="text-2xl font-black">{rarityCounts[r]}</div>
                    <div className="text-xs font-bold">
                      {t(`rarity_${r.toLowerCase()}`)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rarity Filter */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              <button
                onClick={() => handleFilterChange('all')}
                className="px-4 py-2 font-black uppercase text-sm whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: rarityFilter === 'all' ? '#FF6B35' : '#FFF',
                  color: rarityFilter === 'all' ? '#FFF' : '#000',
                  border: '3px solid #000',
                  boxShadow: rarityFilter === 'all' ? '4px 4px 0px #000' : '2px 2px 0px #000'
                }}
              >
                <Filter className="w-4 h-4 inline mr-1" strokeWidth={3} />
                {t('treasures_filter_all')}
              </button>
              {['Common', 'Rare', 'Epic', 'Legendary'].map(r => (
                <button
                  key={r}
                  onClick={() => handleFilterChange(r)}
                  className="px-4 py-2 font-black uppercase text-sm whitespace-nowrap flex-shrink-0"
                  style={{
                    backgroundColor: rarityFilter === r ? rarityColors[r].bg : '#FFF',
                    color: rarityFilter === r ? rarityColors[r].text : '#000',
                    border: '3px solid #000',
                    boxShadow: rarityFilter === r ? '4px 4px 0px #000' : '2px 2px 0px #000'
                  }}
                >
                  {t(`rarity_${r.toLowerCase()}`)}
                </button>
              ))}
            </div>

            {/* Page Info */}
            {totalPages > 0 && (
              <div 
                className="mb-4 p-3"
                style={{
                  backgroundColor: '#4ECDC4',
                  border: '3px solid #000'
                }}
              >
                <p className="text-center font-black text-sm">
                  {t('treasures_page')} {currentPage} / {totalPages} 
                  <span className="ml-2 font-bold">
                    ({filteredAllLoot.length} {t('treasures_items')})
                  </span>
                </p>
              </div>
            )}

            {/* Loot List */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-current border-r-transparent" />
              </div>
            ) : loot.length === 0 ? (
              <div 
                className="p-8 text-center"
                style={{
                  backgroundColor: '#FFF',
                  border: '4px solid #000',
                  boxShadow: '6px 6px 0px #000'
                }}
              >
                <p className="font-black text-xl">
                  {language === 'zh' ? '暂无该稀有度的宝物' : 'No items of this rarity'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 mb-6">
                {loot.map(item => (
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
                          backgroundColor: rarityColors[item.rarity].bg,
                          border: '3px solid #000'
                        }}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-black uppercase text-lg">{item.name}</h3>
                          <span 
                            className="px-2 py-1 text-xs font-bold"
                            style={{
                              backgroundColor: rarityColors[item.rarity].bg,
                              color: rarityColors[item.rarity].text,
                              border: '2px solid #000'
                            }}
                          >
                            {t(`rarity_${item.rarity.toLowerCase()}`)}
                          </span>
                        </div>
                        <p className="font-bold text-sm mb-2" style={{ color: '#666' }}>
                          {item.flavorText}
                        </p>
                        <p className="text-xs font-bold" style={{ color: '#999' }}>
                          {language === 'zh' ? '获得于' : 'Obtained on'} {format(new Date(item.obtainedAt), language === 'zh' ? 'yyyy/MM/dd HH:mm' : 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex gap-3 justify-center items-center">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-3 font-black uppercase flex items-center gap-2"
                  style={{
                    backgroundColor: currentPage === 1 ? '#E8E8E8' : '#FFE66D',
                    border: '4px solid #000',
                    boxShadow: '4px 4px 0px #000',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft className="w-5 h-5" strokeWidth={3} />
                  {t('treasures_prev')}
                </button>

                <div 
                  className="px-6 py-3 font-black text-lg"
                  style={{
                    backgroundColor: '#FFF',
                    border: '4px solid #000'
                  }}
                >
                  {currentPage}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-3 font-black uppercase flex items-center gap-2"
                  style={{
                    backgroundColor: currentPage === totalPages ? '#E8E8E8' : '#FFE66D',
                    border: '4px solid #000',
                    boxShadow: '4px 4px 0px #000',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  {t('treasures_next')}
                  <ChevronRight className="w-5 h-5" strokeWidth={3} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
