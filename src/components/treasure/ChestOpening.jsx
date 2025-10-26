import { useState } from 'react';
import { Gift, Sparkles, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RarityBadge from '../quest/RarityBadge';

export default function ChestOpening({ date, onClose, onLootGenerated }) {
  const [isOpening, setIsOpening] = useState(false);
  const [loot, setLoot] = useState(null);
  const [showLoot, setShowLoot] = useState(false);

  const openChest = async () => {
    setIsOpening(true);

    // Simulate chest opening animation
    setTimeout(async () => {
      try {
        // Generate loot with AI
        const rarityRoll = Math.random() * 100;
        let rarity = 'Common';
        if (rarityRoll < 3) rarity = 'Legendary';
        else if (rarityRoll < 15) rarity = 'Epic';
        else if (rarityRoll < 40) rarity = 'Rare';

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `生成一个RPG风格的战利品道具。

稀有度：${rarity}

要求：
1. 名称要有冒险/奇幻感
2. 简介要有RPG风味，暗示实际作用但不直白
3. 选择合适的emoji作为图标

示例：
{
  "name": "时守沙漏",
  "flavorText": "传说中能让时间驻足的神器。持有者可获得一次时间保护，即使一日未行动，连胜之力仍不消散。（赠送冻结券×1）",
  "icon": "⏳"
}

请生成：`,
          response_json_schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              flavorText: { type: "string" },
              icon: { type: "string" }
            }
          }
        });

        const newLoot = {
          ...result,
          rarity,
          obtainedAt: new Date().toISOString()
        };

        // Save loot
        const savedLoot = await base44.entities.Loot.create(newLoot);

        // Mark chest as opened
        const chests = await base44.entities.DailyChest.filter({ date });
        if (chests.length > 0) {
          await base44.entities.DailyChest.update(chests[0].id, {
            opened: true,
            lootIds: [...(chests[0].lootIds || []), savedLoot.id]
          });
        }

        setLoot(savedLoot);
        setShowLoot(true);
        onLootGenerated(savedLoot);
      } catch (error) {
        alert('开箱失败，请重试');
      }
      setIsOpening(false);
    }, 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
    >
      <div 
        className="relative max-w-md w-full p-8 transform"
        style={{
          backgroundColor: '#4ECDC4',
          border: '5px solid #000',
          boxShadow: '12px 12px 0px #000',
          transform: showLoot ? 'scale(1)' : 'scale(0.9)',
          transition: 'all 0.3s'
        }}
      >
        {!showLoot ? (
          <>
            {/* Chest */}
            <div className="flex justify-center mb-6">
              <div 
                className={`w-32 h-32 flex items-center justify-center ${isOpening ? 'animate-bounce' : ''}`}
                style={{
                  backgroundColor: '#FFE66D',
                  border: '5px solid #000',
                  boxShadow: '8px 8px 0px #000',
                  transform: isOpening ? 'rotate(0deg)' : 'rotate(-5deg)'
                }}
              >
                <Gift className="w-20 h-20" strokeWidth={4} />
              </div>
            </div>

            <h2 
              className="text-3xl font-black uppercase text-center mb-4"
              style={{
                color: '#000',
                textShadow: '3px 3px 0px rgba(255,255,255,0.5)'
              }}
            >
              今日宝箱
            </h2>

            <p className="text-center font-bold mb-6">
              恭喜！你完成了今天所有委托！
            </p>

            <button
              onClick={openChest}
              disabled={isOpening}
              className="w-full py-4 font-black uppercase text-xl flex items-center justify-center gap-3"
              style={{
                backgroundColor: '#FF6B35',
                color: '#FFF',
                border: '5px solid #000',
                boxShadow: '6px 6px 0px #000',
                opacity: isOpening ? 0.7 : 1
              }}
            >
              <Sparkles className="w-6 h-6" strokeWidth={4} />
              {isOpening ? '开启中...' : '打开宝箱'}
            </button>
          </>
        ) : (
          <>
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute -top-4 -right-4 w-12 h-12 flex items-center justify-center"
              style={{
                backgroundColor: '#FF6B35',
                border: '4px solid #000',
                boxShadow: '5px 5px 0px #000'
              }}
            >
              <X className="w-7 h-7" strokeWidth={4} />
            </button>

            {/* Loot Display */}
            <div className="text-center">
              <div className="text-6xl mb-4">{loot.icon}</div>
              
              <div className="flex justify-center mb-3">
                <RarityBadge rarity={loot.rarity} />
              </div>

              <h3 
                className="text-2xl font-black uppercase mb-4"
                style={{ color: '#000' }}
              >
                {loot.name}
              </h3>

              <div 
                className="p-4 mb-6"
                style={{
                  backgroundColor: '#FFF',
                  border: '3px solid #000'
                }}
              >
                <p className="font-bold leading-relaxed text-sm">
                  {loot.flavorText}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 font-black uppercase"
                style={{
                  backgroundColor: '#FFE66D',
                  border: '4px solid #000',
                  boxShadow: '5px 5px 0px #000'
                }}
              >
                收入背包
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}