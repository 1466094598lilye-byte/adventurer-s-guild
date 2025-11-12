import { useState } from 'react';
import { X, Sparkles, Loader2, ChevronRight, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';

export default function CraftingDialog({ isOpen, onClose, userLoot, onCraftSuccess }) {
  const { language, t } = useLanguage();
  const [selectedLootIds, setSelectedLootIds] = useState([]);
  const [targetRarity, setTargetRarity] = useState('Rare'); // 'Rare' or 'Epic'
  const [isCrafting, setIsCrafting] = useState(false);
  const [craftedLoot, setCraftedLoot] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // 合成配方
  const recipes = {
    'Rare': { from: 'Common', count: 5 },
    'Epic': { from: 'Rare', count: 7 }
  };

  const currentRecipe = recipes[targetRarity];

  // 筛选可用的 Loot
  const availableLoot = userLoot.filter(loot => loot.rarity === currentRecipe.from);

  // 检查是否可以合成
  const canCraft = selectedLootIds.length === currentRecipe.count;

  // 切换选择
  const toggleSelection = (lootId) => {
    if (selectedLootIds.includes(lootId)) {
      setSelectedLootIds(selectedLootIds.filter(id => id !== lootId));
    } else {
      if (selectedLootIds.length < currentRecipe.count) {
        setSelectedLootIds([...selectedLootIds, lootId]);
      }
    }
  };

  // 切换目标稀有度
  const handleRarityChange = (newRarity) => {
    setTargetRarity(newRarity);
    setSelectedLootIds([]); // 清空选择
    setError(null);
  };

  // 执行合成
  const handleCraft = async () => {
    if (!canCraft) return;

    setIsCrafting(true);
    setError(null);

    try {
      const { data } = await base44.functions.invoke('craftLoot', {
        lootIds: selectedLootIds,
        targetRarity: targetRarity,
        language: language
      });

      if (data.success) {
        setCraftedLoot(data.newLoot);
        setSelectedLootIds([]);
        
        // 通知父组件刷新数据
        if (onCraftSuccess) {
          onCraftSuccess();
        }
      }
    } catch (err) {
      console.error('合成失败:', err);
      setError(err.response?.data?.error || (language === 'zh' ? '合成失败，请重试' : 'Crafting failed, please retry'));
    }

    setIsCrafting(false);
  };

  // 关闭对话框
  const handleClose = () => {
    if (!isCrafting) {
      setSelectedLootIds([]);
      setCraftedLoot(null);
      setError(null);
      onClose();
    }
  };

  // 稀有度颜色配置
  const rarityColors = {
    Common: { bg: '#E8E8E8', text: '#333', border: '#999' },
    Rare: { bg: '#4ECDC4', text: '#000', border: '#000' },
    Epic: { bg: '#C44569', text: '#FFF', border: '#000' }
  };

  // 如果已经合成成功，显示结果
  if (craftedLoot) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
        onClick={handleClose}
      >
        <div
          className="relative max-w-md w-full p-8"
          style={{
            backgroundColor: rarityColors[craftedLoot.rarity].bg,
            border: '5px solid #000',
            boxShadow: '12px 12px 0px #000'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            className="absolute -top-4 -right-4 w-12 h-12 flex items-center justify-center"
            style={{
              backgroundColor: '#FF6B35',
              border: '4px solid #000',
              boxShadow: '5px 5px 0px #000'
            }}
          >
            <X className="w-7 h-7 text-white" strokeWidth={4} />
          </button>

          <div className="text-center">
            <div className="mb-4">
              <Sparkles className="w-16 h-16 mx-auto animate-pulse" strokeWidth={3} />
            </div>

            <h2 className="text-3xl font-black uppercase mb-4" style={{ color: rarityColors[craftedLoot.rarity].text }}>
              {t('crafting_success_title')}
            </h2>

            <div
              className="px-4 py-2 font-black uppercase mb-4 inline-block"
              style={{
                backgroundColor: '#FFE66D',
                border: '3px solid #000',
                boxShadow: '4px 4px 0px #000'
              }}
            >
              {t(`rarity_${craftedLoot.rarity.toLowerCase()}`)}
            </div>

            <div className="text-6xl mb-4">{craftedLoot.icon}</div>

            <h3 className="text-2xl font-black uppercase mb-4" style={{ color: rarityColors[craftedLoot.rarity].text }}>
              {craftedLoot.name}
            </h3>

            <div
              className="p-4 mb-6"
              style={{
                backgroundColor: '#FFF',
                border: '3px solid #000'
              }}
            >
              <p className="font-bold leading-relaxed text-sm">
                {craftedLoot.flavorText}
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 font-black uppercase"
              style={{
                backgroundColor: '#FFE66D',
                border: '4px solid #000',
                boxShadow: '5px 5px 0px #000'
              }}
            >
              {t('crafting_collect')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 正常的合成界面
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
      onClick={handleClose}
    >
      <div
        className="relative max-w-2xl w-full my-8 p-6"
        style={{
          backgroundColor: '#FFE66D',
          border: '5px solid #000',
          boxShadow: '12px 12px 0px #000'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          disabled={isCrafting}
          className="absolute -top-4 -right-4 w-12 h-12 flex items-center justify-center"
          style={{
            backgroundColor: '#FF6B35',
            border: '4px solid #000',
            boxShadow: '5px 5px 0px #000',
            opacity: isCrafting ? 0.5 : 1
          }}
        >
          <X className="w-7 h-7 text-white" strokeWidth={4} />
        </button>

        <h2 className="text-3xl font-black uppercase text-center mb-2">
          🔨 {t('crafting_title')} 🔨
        </h2>
        <p className="text-center font-bold mb-6 text-sm">
          {t('crafting_subtitle')}
        </p>

        {/* 目标稀有度选择 */}
        <div className="mb-6">
          <h3 className="font-black uppercase mb-3 text-sm">{t('crafting_target_rarity')}</h3>
          <div className="flex gap-3">
            <button
              onClick={() => handleRarityChange('Rare')}
              disabled={isCrafting}
              className="flex-1 py-3 font-black uppercase"
              style={{
                backgroundColor: targetRarity === 'Rare' ? '#4ECDC4' : '#FFF',
                border: targetRarity === 'Rare' ? '4px solid #000' : '3px solid #999',
                boxShadow: targetRarity === 'Rare' ? '5px 5px 0px #000' : '2px 2px 0px #999',
                opacity: isCrafting ? 0.5 : 1
              }}
            >
              {t('rarity_rare')}
            </button>
            <button
              onClick={() => handleRarityChange('Epic')}
              disabled={isCrafting}
              className="flex-1 py-3 font-black uppercase"
              style={{
                backgroundColor: targetRarity === 'Epic' ? '#C44569' : '#FFF',
                color: targetRarity === 'Epic' ? '#FFF' : '#000',
                border: targetRarity === 'Epic' ? '4px solid #000' : '3px solid #999',
                boxShadow: targetRarity === 'Epic' ? '5px 5px 0px #000' : '2px 2px 0px #999',
                opacity: isCrafting ? 0.5 : 1
              }}
            >
              {t('rarity_epic')}
            </button>
          </div>
        </div>

        {/* 合成配方说明 */}
        <div
          className="mb-6 p-4"
          style={{
            backgroundColor: '#FFF',
            border: '3px solid #000'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5" strokeWidth={3} />
            <h3 className="font-black uppercase text-sm">{t('crafting_recipe')}</h3>
          </div>
          <div className="flex items-center justify-center gap-3 py-2">
            <div
              className="px-3 py-1 font-black text-sm"
              style={{
                backgroundColor: rarityColors[currentRecipe.from].bg,
                border: '2px solid #000'
              }}
            >
              {currentRecipe.count} × {t(`rarity_${currentRecipe.from.toLowerCase()}`)}
            </div>
            <ChevronRight className="w-6 h-6" strokeWidth={3} />
            <div
              className="px-3 py-1 font-black text-sm"
              style={{
                backgroundColor: rarityColors[targetRarity].bg,
                color: rarityColors[targetRarity].text,
                border: '2px solid #000'
              }}
            >
              1 × {t(`rarity_${targetRarity.toLowerCase()}`)}
            </div>
          </div>
          <p className="text-xs font-bold text-center mt-2" style={{ color: '#666' }}>
            {t('crafting_recipe_hint', { 
              count: currentRecipe.count, 
              from: t(`rarity_${currentRecipe.from.toLowerCase()}`),
              to: t(`rarity_${targetRarity.toLowerCase()}`)
            })}
          </p>
        </div>

        {/* 选择状态 */}
        <div
          className="mb-4 p-3"
          style={{
            backgroundColor: selectedLootIds.length === currentRecipe.count ? '#4ECDC4' : '#FFF',
            border: '3px solid #000'
          }}
        >
          <p className="font-black text-center">
            {t('crafting_selected')}: {selectedLootIds.length} / {currentRecipe.count}
          </p>
        </div>

        {/* 可用 Loot 列表 */}
        <div
          className="mb-6 max-h-80 overflow-y-auto"
          style={{
            backgroundColor: '#FFF',
            border: '4px solid #000'
          }}
        >
          <div className="p-4">
            <h3 className="font-black uppercase mb-3 text-sm">
              {t('crafting_available_loot')} ({availableLoot.length})
            </h3>
            
            {availableLoot.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-bold text-gray-600">
                  {t('crafting_no_materials')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {availableLoot.map((loot) => {
                  const isSelected = selectedLootIds.includes(loot.id);
                  return (
                    <button
                      key={loot.id}
                      onClick={() => toggleSelection(loot.id)}
                      disabled={isCrafting || (!isSelected && selectedLootIds.length >= currentRecipe.count)}
                      className="p-3 text-left transition-all"
                      style={{
                        backgroundColor: isSelected ? '#4ECDC4' : '#F9FAFB',
                        border: isSelected ? '3px solid #000' : '2px solid #999',
                        boxShadow: isSelected ? '4px 4px 0px #000' : 'none',
                        opacity: (isCrafting || (!isSelected && selectedLootIds.length >= currentRecipe.count)) ? 0.5 : 1,
                        cursor: (isCrafting || (!isSelected && selectedLootIds.length >= currentRecipe.count)) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{loot.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm truncate">{loot.name}</p>
                          <p className="text-xs font-bold text-gray-600 truncate">{loot.flavorText}</p>
                        </div>
                        {isSelected && (
                          <div
                            className="px-2 py-1 text-xs font-black"
                            style={{
                              backgroundColor: '#FFE66D',
                              border: '2px solid #000'
                            }}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 错误信息 */}
        {error && (
          <div
            className="mb-4 p-3"
            style={{
              backgroundColor: '#FF6B35',
              border: '3px solid #000',
              color: '#FFF'
            }}
          >
            <p className="font-bold text-center">{error}</p>
          </div>
        )}

        {/* 合成按钮 */}
        <button
          onClick={handleCraft}
          disabled={!canCraft || isCrafting || availableLoot.length < currentRecipe.count}
          className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3"
          style={{
            backgroundColor: canCraft && !isCrafting ? '#FF6B35' : '#999',
            color: '#FFF',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000',
            opacity: (!canCraft || isCrafting) ? 0.7 : 1,
            cursor: (!canCraft || isCrafting) ? 'not-allowed' : 'pointer'
          }}
        >
          {isCrafting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" strokeWidth={3} />
              {t('crafting_in_progress')}
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" strokeWidth={3} />
              {t('crafting_button')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}