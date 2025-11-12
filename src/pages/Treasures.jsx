import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gem, Filter, ChevronLeft, ChevronRight, Hammer } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/components/LanguageContext';
import CraftingDialog from '@/components/treasure/CraftingDialog';

export default function TreasuresPage() {
  const { t } = useLanguage();
  const [rarityFilter, setRarityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCraftingDialog, setShowCraftingDialog] = useState(false);
  const itemsPerPage = 12;
  const queryClient = useQueryClient();

  const { data: allLoot = [], isLoading } = useQuery({
    queryKey: ['loot'],
    queryFn: () => base44.entities.Loot.list('-created_date', 1000),
    initialData: [],
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFilterChange = (rarity) => {
    setRarityFilter(rarity);
    setCurrentPage(1);
  };

  const handleCraftSuccess = () => {
    queryClient.invalidateQueries(['loot']);
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-6xl mx-auto">
        <div 
          className="mb-6 p-4 transform -rotate-1"
          style={{
            backgroundColor: '#000',
            color: '#FFE66D',
            border: '5px solid #FFE66D',
            boxShadow: '8px 8px 0px #FFE66D'
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
            onClick={() => setShowCraftingDialog(true)}
            className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3"
            style={{
              backgroundColor: '#FF6B35',
              color: '#FFF',
              border: '5px solid #000',
              boxShadow: '8px 8px 0px #000'
            }}
          >
            <Hammer className="w-7 h-7" strokeWidth={3} />
            🔨 {t('crafting_title')} 🔨
          </button>
        </div>

        {allLoot.length === 0 ? (
          <div 
            className="p-12 text-center"
            style={{
              backgroundColor: '#FFF',
              border: '5px solid #000',
              boxShadow: '8px 8px 0px #000'
            }}
          >
            <Gem className="w-24 h-24 mx-auto mb-6 text-gray-400" strokeWidth={3} />
            <p className="text-2xl font-black uppercase mb-3">
              {t('treasures_title')}
            </p>
            <p className="font-bold text-gray-600">
              {t('treasures_collected')} 0 {t('treasures_items')}
            </p>
          </div>
        ) : (
          <>
            <div 
              className="mb-6 p-4"
              style={{
                backgroundColor: '#FFE66D',
                border: '4px solid #000',
                boxShadow: '6px 6px 0px #000'
              }}
            >
              <h3 className="font-black uppercase mb-3 text-sm">{t('treasures_stats')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(rarityCounts).map(([rarity, count]) => (
                  <div 
                    key={rarity}
                    className="p-3 text-center"
                    style={{
                      backgroundColor: rarityColors[rarity].bg,
                      color: rarityColors[rarity].text,
                      border: '3px solid #000'
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
                      ? (rarity === 'all' ? '#4ECDC4' : rarityColors[rarity].bg)
                      : '#FFF',
                    color: rarityFilter === rarity && ['Epic', 'Legendary'].includes(rarity) 
                      ? rarityColors[rarity].text 
                      : '#000',
                    border: '3px solid #000',
                    boxShadow: rarityFilter === rarity ? '4px 4px 0px #000' : '2px 2px 0px #000'
                  }}
                >
                  <Filter className="w-4 h-4 inline mr-1" strokeWidth={3} />
                  {rarity === 'all' ? t('treasures_filter_all') : t(`rarity_${rarity.toLowerCase()}`)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {paginatedLoot.map((loot) => (
                <div
                  key={loot.id}
                  className="p-4"
                  style={{
                    backgroundColor: rarityColors[loot.rarity].bg,
                    color: rarityColors[loot.rarity].text,
                    border: '4px solid #000',
                    boxShadow: '6px 6px 0px #000'
                  }}
                >
                  <div 
                    className="px-3 py-1 mb-3 inline-block font-black uppercase text-xs"
                    style={{
                      backgroundColor: '#000',
                      color: '#FFE66D',
                      border: '2px solid #FFE66D'
                    }}
                  >
                    {t(`rarity_${loot.rarity.toLowerCase()}`)}
                  </div>

                  <div className="text-5xl mb-3 text-center">{loot.icon}</div>

                  <h3 className="text-xl font-black uppercase mb-2 text-center">
                    {loot.name}
                  </h3>

                  <div 
                    className="p-3 mb-3"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      color: '#000',
                      border: '2px solid #000'
                    }}
                  >
                    <p className="font-bold text-sm leading-relaxed">
                      {loot.flavorText}
                    </p>
                  </div>

                  <p className="text-xs font-bold text-center opacity-80">
                    {format(new Date(loot.obtainedAt || loot.created_date), 'yyyy-MM-dd HH:mm')}
                  </p>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div 
                className="flex items-center justify-between p-4"
                style={{
                  backgroundColor: '#FFF',
                  border: '4px solid #000',
                  boxShadow: '6px 6px 0px #000'
                }}
              >
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 font-black uppercase text-sm flex items-center gap-2"
                  style={{
                    backgroundColor: currentPage === 1 ? '#E0E0E0' : '#4ECDC4',
                    border: '3px solid #000',
                    boxShadow: '3px 3px 0px #000',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                  {t('treasures_prev')}
                </button>

                <div className="font-black">
                  {t('treasures_page')} {currentPage} {t('treasures_page_of')} {totalPages} {t('treasures_page_items')}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 font-black uppercase text-sm flex items-center gap-2"
                  style={{
                    backgroundColor: currentPage === totalPages ? '#E0E0E0' : '#4ECDC4',
                    border: '3px solid #000',
                    boxShadow: '3px 3px 0px #000',
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

        {/* 合成对话框 */}
        <CraftingDialog
          isOpen={showCraftingDialog}
          onClose={() => setShowCraftingDialog(false)}
          userLoot={allLoot}
          onCraftSuccess={handleCraftSuccess}
        />
      </div>
    </div>
  );
}