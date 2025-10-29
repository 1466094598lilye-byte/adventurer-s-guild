import { useState } from 'react';
import { Gift, Sparkles, X, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function ChestOpening({ date, onClose, onLootGenerated }) {
  const [isOpening, setIsOpening] = useState(false);
  const [loot, setLoot] = useState(null);
  const [gotFreezeToken, setGotFreezeToken] = useState(false);
  const [isPity, setIsPity] = useState(false);
  const [showLoot, setShowLoot] = useState(false);
  const queryClient = useQueryClient();

  const openChest = async () => {
    setIsOpening(true);

    // Simulate chest opening animation
    setTimeout(async () => {
      try {
        // Get current user
        const currentUser = await base44.auth.me();
        const currentCounter = currentUser?.chestOpenCounter || 0;
        const newCounter = currentCounter + 1;

        // Check pity system (60 chests = guaranteed freeze token)
        let wonFreezeToken = false;
        let hitPity = false;
        
        if (newCounter >= 60) {
          // Pity triggered - guaranteed freeze token
          wonFreezeToken = true;
          hitPity = true;
        } else {
          // Normal 1% chance
          const freezeTokenRoll = Math.random() * 100;
          wonFreezeToken = freezeTokenRoll < 1;
        }

        // Determine rarity (70% Common, 20% Rare, 8% Epic, 2% Legendary)
        const rarityRoll = Math.random() * 100;
        let rarity;
        if (rarityRoll < 70) rarity = 'Common';
        else if (rarityRoll < 90) rarity = 'Rare';
        else if (rarityRoll < 98) rarity = 'Epic';
        else rarity = 'Legendary';

        // Generate loot with AI
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `生成一个RPG风格的战利品道具。

稀有度：${rarity}（${rarity === 'Common' ? '普通' : rarity === 'Rare' ? '稀有' : rarity === 'Epic' ? '史诗' : '传说'}）

要求：
1. 名称要符合该稀有度，${rarity === 'Common' ? '简单朴素' : rarity === 'Rare' ? '有些特别' : rarity === 'Epic' ? '强大华丽' : '传奇神话'}
2. 简介要有RPG风味，体现该稀有度的价值和来历
3. 选择合适的emoji作为图标

示例：
- Common: "风化的石板" / "记录着冒险者日常足迹的普通石板。"
- Rare: "月光水晶" / "在月圆之夜才会发光的神秘水晶。"
- Epic: "不灭之炎" / "传说中永不熄灭的圣火碎片，象征着永恒的意志。"
- Legendary: "时空之钥" / "据说能开启任意时空之门的神器，只有真正的英雄才配拥有。"

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
          rarity: rarity,
          obtainedAt: new Date().toISOString()
        };

        // Save loot
        const savedLoot = await base44.entities.Loot.create(newLoot);

        // Update user: freeze token count and counter
        const updateData = {
          chestOpenCounter: wonFreezeToken ? 0 : newCounter
        };

        if (wonFreezeToken) {
          updateData.freezeTokenCount = (currentUser?.freezeTokenCount || 0) + 1;
        }

        await base44.auth.updateMe(updateData);
        queryClient.invalidateQueries(['user']);

        // Mark chest as opened
        const chests = await base44.entities.DailyChest.filter({ date });
        if (chests.length > 0) {
          await base44.entities.DailyChest.update(chests[0].id, {
            opened: true,
            lootIds: [...(chests[0].lootIds || []), savedLoot.id]
          });
        }

        setLoot(savedLoot);
        setGotFreezeToken(wonFreezeToken);
        setIsPity(hitPity);
        setShowLoot(true);
        onLootGenerated(savedLoot);
      } catch (error) {
        alert('开箱失败，请重试');
      }
      setIsOpening(false);
    }, 2000);
  };

  const rarityColors = {
    Common: { bg: '#E8E8E8', text: '#333' },
    Rare: { bg: '#4ECDC4', text: '#000' },
    Epic: { bg: '#C44569', text: '#FFF' },
    Legendary: { bg: '#FFE66D', text: '#000' }
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
              {gotFreezeToken && (
                <div 
                  className="mb-4 p-4 animate-pulse"
                  style={{
                    backgroundColor: isPity ? '#FF6B35' : '#FFE66D',
                    border: '4px solid #000',
                    boxShadow: '6px 6px 0px #000'
                  }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Shield className="w-8 h-8" strokeWidth={3} />
                    <span className="text-2xl font-black">冻结券 +1</span>
                  </div>
                  <p className="text-sm font-bold">
                    {isPity 
                      ? '🎊 保底触发！你已累积开启60个宝箱，获得保底冻结券！'
                      : '恭喜！你在宝箱中发现了稀有的冻结券！'}
                  </p>
                </div>
              )}

              {/* Rarity Badge */}
              <div className="flex justify-center mb-4">
                <div 
                  className="px-4 py-2 font-black uppercase"
                  style={{
                    backgroundColor: rarityColors[loot.rarity].bg,
                    color: rarityColors[loot.rarity].text,
                    border: '4px solid #000',
                    boxShadow: '4px 4px 0px #000'
                  }}
                >
                  {loot.rarity === 'Common' ? '普通' : 
                   loot.rarity === 'Rare' ? '稀有' : 
                   loot.rarity === 'Epic' ? '史诗' : '传说'}
                </div>
              </div>

              <div className="text-6xl mb-4">{loot.icon}</div>

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