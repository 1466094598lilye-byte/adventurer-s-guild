import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Gem, Filter, ChevronLeft, ChevronRight, Hammer, ChevronDown, ChevronUp, Snowflake } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/components/LanguageContext';
import { playSound } from '@/components/AudioManager';
import { getGuestData } from '@/components/utils/guestData';
import { useNavigate } from 'react-router-dom';

export default function TreasuresPage() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [rarityFilter, setRarityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedLoot, setExpandedLoot] = useState(new Set());
  const [showExchangeDialog, setShowExchangeDialog] = useState(false);
  const [selectedLegendaries, setSelectedLegendaries] = useState([]);
  const itemsPerPage = 7;
  const queryClient = useQueryClient();

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

  const { data: allLoot = [], isLoading } = useQuery({
    queryKey: ['loot'],
    queryFn: () => {
      // 访客模式：从 localStorage 读取
      if (!user) {
        return getGuestData('loot');
      }
      
      // 登录模式：从后端读取
      return base44.entities.Loot.list('-created_date', 1000);
    },
    initialData: [],
    enabled: user !== undefined
  });

  const legendaryLoot = allLoot.filter(l => l.rarity === 'Legendary');

  const exchangeMutation = useMutation({
    mutationFn: async (lootIds) => {
      // 删除选中的3个传说宝物
      await Promise.all(lootIds.map(id => base44.entities.Loot.delete(id)));
      
      // 增加1张冻结券
      await base44.auth.updateMe({
        freezeTokenCount: (user?.freezeTokenCount || 0) + 1
      });
    },
    onSuccess: () => {
      // 播放兑换成功音效
      playSound('craftingSuccess');
      
      queryClient.invalidateQueries(['loot']);
      queryClient.invalidateQueries(['user']);
      setSelectedLegendaries([]);
      setShowExchangeDialog(false);
    }
  });

  const filteredLoot = allLoot.filter(loot => {
    if (rarityFilter === 'all') return true;
    return loot.rarity === rarityFilter;
  });

  const totalPages = Math.ceil(filteredLoot.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLoot = filteredLoot.slice(startIndex, startIndex + itemsPerPage);

  const rarityCounts = {
    Common: allLoot.filter(l => l.rarity === 'Common').length,
    Rare: allLoot.filter(l => l.rarity === 'Rare').length,
    Epic: allLoot.filter(l => l.rarity === 'Epic').length,
    Legendary: allLoot.filter(l => l.rarity === 'Legendary').length,
  };

  const rarityColors = {
    Common: { bg: '#E8E8E8', text: '#333' },
    Rare: { bg: '#4ECDC4', text: '#000' },
    Epic: { bg: '#C44569', text: '#FFF' },
    Legendary: { bg: '#FFE66D', text: '#000' }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setExpandedLoot(new Set());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFilterChange = (rarity) => {
    setRarityFilter(rarity);
    setCurrentPage(1);
    setExpandedLoot(new Set());
  };

  const toggleExpand = (lootId) => {
    const newExpanded = new Set(expandedLoot);
    if (newExpanded.has(lootId)) {
      newExpanded.delete(lootId);
    } else {
      newExpanded.add(lootId);
    }
    setExpandedLoot(newExpanded);
  };

  const toggleLegendarySelection = (lootId) => {
    setSelectedLegendaries(prev => {
      if (prev.includes(lootId)) {
        return prev.filter(id => id !== lootId);
      } else if (prev.length < 3) {
        return [...prev, lootId];
      }
      return prev;
    });
  };

  const handleExchange = () => {
    if (selectedLegendaries.length === 3) {
      exchangeMutation.mutate(selectedLegendaries);
    }
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto">
        <div 
          className="mb-6 p-4 transform -rotate-1"
          style={{
            backgroundColor: 'var(--bg-black)',
            color: 'var(--color-yellow)',
            border: '5px solid var(--color-yellow)',
            boxShadow: '8px 8px 0px var(--color-yellow)'
          }}
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Gem className="w-8 h-8" strokeWidth={3} />
            <h1 className="text-3xl font-black uppercase text-center">
              {t('treasures_title')}
            </h1>
            <Gem className="w-8 h-8" strokeWidth={3} />
          </div>
          <p className="text-center font-bold text-sm">
            {t('treasures_collected')} {allLoot.length} {t('treasures_items')}
          </p>
        </div>

        {/* 合成宝物按钮 */}
        <div className="mb-6">
          <button
            onClick={() => {
              playSound('enterWorkshop');
              navigate('/crafting');
            }}
            className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3"
            style={{
              backgroundColor: 'var(--color-orange)',
              color: 'var(--text-inverse)',
              border: '5px solid var(--border-primary)',
              boxShadow: '8px 8px 0px var(--border-primary)'
            }}
          >
            <Hammer className="w-7 h-7" strokeWidth={3} />
             {t('crafting_title')} 
          </button>
        </div>

        {/* 传说宝物兑换冻结券 */}
        {legendaryLoot.length >= 3 && user && (
          <div 
            className="mb-6 p-4"
            style={{
              backgroundColor: '#9B59B6',
              border: '5px solid var(--border-primary)',
              boxShadow: '8px 8px 0px var(--border-primary)'
            }}
          >
            <button
              onClick={() => setShowExchangeDialog(true)}
              className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3 text-white"
            >
              <Snowflake className="w-7 h-7" strokeWidth={3} />
              {language === 'zh' ? ' 传说宝物兑换冻结券 ' : ' Exchange Legendary for Freeze Token '}
            </button>
            <p className="text-center text-sm font-bold mt-3 text-white">
              {t('exchange_legendary_count')} {legendaryLoot.length}
            </p>
          </div>
        )}

        {allLoot.length === 0 ? (
          <div 
            className="p-12 text-center"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '5px solid var(--border-primary)',
              boxShadow: '8px 8px 0px var(--border-primary)'
            }}
          >
            <Gem className="w-24 h-24 mx-auto mb-6" strokeWidth={3} style={{ color: 'var(--text-secondary)' }} />
            <p className="text-2xl font-black uppercase mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('treasures_title')}
            </p>
            <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>
              {t('treasures_collected')} 0 {t('treasures_items')}
            </p>
          </div>
        ) : (
          <>
            <div 
              className="mb-6 p-4"
              style={{
                backgroundColor: 'var(--color-yellow)',
                border: '4px solid var(--border-primary)',
                boxShadow: '6px 6px 0px var(--border-primary)'
              }}
            >
              <h3 className="font-black uppercase mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>{t('treasures_stats')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(rarityCounts).map(([rarity, count]) => (
                  <div 
                    key={rarity}
                    className="p-3 text-center"
                    style={{
                      backgroundColor: rarityColors[rarity].bg,
                      color: rarityColors[rarity].text,
                      border: '3px solid var(--border-primary)'
                    }}
                  >
                    <p className="text-2xl font-black">{count}</p>
                    <p className="text-xs font-bold uppercase">{t(`rarity_${rarity.toLowerCase()}`)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              {['all', 'Common', 'Rare', 'Epic', 'Legendary'].map(rarity => (
                <button
                  key={rarity}
                  onClick={() => handleFilterChange(rarity)}
                  className="px-4 py-2 font-black uppercase text-sm"
                  style={{
                    backgroundColor: rarityFilter === rarity 
                      ? (rarity === 'all' ? 'var(--color-cyan)' : rarityColors[rarity].bg)
                      : 'var(--bg-secondary)',
                    color: rarityFilter === rarity && ['Epic', 'Legendary'].includes(rarity) 
                      ? rarityColors[rarity].text 
                      : 'var(--text-primary)',
                    border: '3px solid var(--border-primary)',
                    boxShadow: rarityFilter === rarity ? '4px 4px 0px var(--border-primary)' : '2px 2px 0px var(--border-primary)'
                  }}
                >
                  <Filter className="w-4 h-4 inline mr-1" strokeWidth={3} />
                  {rarity === 'all' ? t('treasures_filter_all') : t(`rarity_${rarity.toLowerCase()}`)}
                </button>
              ))}
            </div>

            {/* 紧凑型卡片布局 */}
            <div className="space-y-3 mb-6">
              {paginatedLoot.map((loot) => {
                const isExpanded = expandedLoot.has(loot.id);
                
                return (
                  <div
                    key={loot.id}
                    className="p-3 flex items-start gap-3"
                    style={{
                      backgroundColor: rarityColors[loot.rarity].bg,
                      color: rarityColors[loot.rarity].text,
                      border: '4px solid var(--border-primary)',
                      boxShadow: '4px 4px 0px var(--border-primary)'
                    }}
                  >
                    {/* 左侧：图标和稀有度 */}
                    <div className="flex-shrink-0 text-center">
                      <div className="text-4xl mb-2">{loot.icon}</div>
                      <div 
                        className="px-2 py-1 font-black uppercase text-xs"
                        style={{
                          backgroundColor: 'var(--bg-black)',
                          color: 'var(--color-yellow)',
                          border: '2px solid var(--color-yellow)'
                        }}
                      >
                        {t(`rarity_${loot.rarity.toLowerCase()}`)}
                      </div>
                    </div>

                    {/* 右侧：名称和描述 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black uppercase mb-2 leading-tight">
                        {loot.name}
                      </h3>

                      <div 
                        onClick={() => toggleExpand(loot.id)}
                        className="p-2 mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '2px solid var(--border-primary)'
                        }}
                      >
                        <p 
                          className={`font-bold text-xs leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}
                        >
                          {loot.flavorText}
                        </p>
                        
                        {/* 展开/收起指示器 */}
                        <div className="flex items-center justify-center mt-2 gap-1">
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3" strokeWidth={3} />
                              <span className="text-xs font-black">{language === 'zh' ? '收起' : 'Collapse'}</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" strokeWidth={3} />
                              <span className="text-xs font-black">{language === 'zh' ? '展开' : 'Expand'}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-xs font-bold opacity-70">
                        {format(new Date(loot.obtainedAt || loot.created_date), 'yyyy-MM-dd HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div 
                className="flex items-center justify-between p-4"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '4px solid var(--border-primary)',
                  boxShadow: '6px 6px 0px var(--border-primary)'
                }}
              >
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 font-black uppercase text-sm flex items-center gap-2"
                  style={{
                    backgroundColor: currentPage === 1 ? '#E0E0E0' : 'var(--color-cyan)',
                    color: 'var(--text-primary)',
                    border: '3px solid var(--border-primary)',
                    boxShadow: '3px 3px 0px var(--border-primary)',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                  {t('treasures_prev')}
                </button>

                <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                  {t('treasures_page')} {currentPage} {t('treasures_page_of')} {totalPages}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 font-black uppercase text-sm flex items-center gap-2"
                  style={{
                    backgroundColor: currentPage === totalPages ? '#E0E0E0' : 'var(--color-cyan)',
                    color: 'var(--text-primary)',
                    border: '3px solid var(--border-primary)',
                    boxShadow: '3px 3px 0px var(--border-primary)',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  {t('treasures_next')}
                  <ChevronRight className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>
            )}
          </>
        )}

        {/* 兑换冻结券对话框 */}
        {showExchangeDialog && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
            onClick={() => {
              setShowExchangeDialog(false);
              setSelectedLegendaries([]);
            }}
          >
            <div 
              className="relative max-w-2xl w-full p-6 transform rotate-1"
              style={{
                backgroundColor: '#9B59B6',
                border: '6px solid var(--border-primary)',
                boxShadow: '15px 15px 0px var(--border-primary)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 
                className="text-2xl font-black uppercase text-center mb-4 text-white"
              >
                {language === 'zh' ? '⭐ 传说宝物兑换冻结券 ⭐' : '⭐ Exchange Legendary for Freeze Token ⭐'}
              </h2>

              <div 
                className="mb-6 p-4"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '4px solid var(--border-primary)'
                }}
              >
                <p className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                  {t('exchange_ratio_hint')}
                </p>
                <p className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {t('exchange_selected')} {selectedLegendaries.length}/3
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {legendaryLoot.map(loot => {
                  const isSelected = selectedLegendaries.includes(loot.id);
                  
                  return (
                    <div
                      key={loot.id}
                      onClick={() => toggleLegendarySelection(loot.id)}
                      className="p-4 flex items-center gap-4 cursor-pointer transition-all"
                      style={{
                        backgroundColor: isSelected ? 'var(--color-yellow)' : 'var(--bg-secondary)',
                        border: isSelected ? '5px solid var(--border-primary)' : '3px solid var(--border-primary)',
                        boxShadow: isSelected ? '6px 6px 0px var(--border-primary)' : '3px 3px 0px var(--border-primary)',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                      }}
                    >
                      <div className="text-5xl">{loot.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-black uppercase text-lg mb-1" style={{ color: 'var(--text-primary)' }}>{loot.name}</h3>
                        <p className="text-xs font-bold line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                          {loot.flavorText}
                        </p>
                      </div>
                      {isSelected && (
                        <div 
                          className="flex-shrink-0 w-10 h-10 flex items-center justify-center font-black text-xl"
                          style={{
                            backgroundColor: 'var(--color-cyan)',
                            border: '3px solid var(--border-primary)',
                            borderRadius: '50%'
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowExchangeDialog(false);
                    setSelectedLegendaries([]);
                  }}
                  className="flex-1 py-3 font-black uppercase"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '4px solid var(--border-primary)',
                    boxShadow: '4px 4px 0px var(--border-primary)'
                  }}
                >
                  {t('common_cancel')}
                </button>
                <button
                  onClick={handleExchange}
                  disabled={selectedLegendaries.length !== 3 || exchangeMutation.isLoading}
                  className="flex-1 py-3 font-black uppercase flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: selectedLegendaries.length === 3 ? 'var(--color-cyan)' : '#E0E0E0',
                    color: 'var(--text-primary)',
                    border: '4px solid var(--border-primary)',
                    boxShadow: '4px 4px 0px var(--border-primary)',
                    opacity: selectedLegendaries.length === 3 ? 1 : 0.5,
                    cursor: selectedLegendaries.length === 3 ? 'pointer' : 'not-allowed'
                  }}
                >
                  <Snowflake className="w-5 h-5" strokeWidth={3} />
                  {language === 'zh' ? '确认兑换' : 'Confirm Exchange'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 文字截断样式 */}
      <style>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}