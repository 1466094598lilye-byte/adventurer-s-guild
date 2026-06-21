import MonsterSprite from './MonsterSprite';
import { computeMonsterHp } from './computeMonsterHp';

/**
 * 顶部怪兽 banner：Google 小恐龙风——地平线 + 怪兽在上面走来走去，头顶小血条。
 *  - 没有任务 → 不显示怪兽，地平线上写"王国无事发生……"
 *  - 有任务 → 怪兽出现；血量 = 未完成任务难度和；走路 = 水平步进 + 左右摇摆
 * 后续攻击 / 暴击 / 碎裂动画都收进这个组件。
 */
export default function MonsterBanner({ dateString, quests = [] }) {
  const { current, max } = computeMonsterHp(quests);
  const hasMonster = quests.length > 0;
  const pct = max > 0 ? (current / max) * 100 : 0;

  return (
    <div style={{ position: 'relative', height: 130, marginBottom: 24 }}>
      {hasMonster ? (
        <div className="monster-walk" style={{ position: 'absolute', bottom: 34 }}>
          <div className="monster-sway" style={{ display: 'flex', justifyContent: 'center' }}>
            <MonsterSprite dateString={dateString} cell={7} />
          </div>
          {/* 血条——地平线以下 */}
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--color-yellow)', letterSpacing: 0.5 }}>
              {current}/{max}
            </div>
            <div style={{ width: 140, height: 12, border: '3px solid var(--border-primary)', backgroundColor: '#1a1a1a', borderRadius: 3 }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: pct > 40 ? 'var(--color-cyan)' : '#FF6B35',
                  transition: 'width 0.3s ease',
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: 1,
          }}
        >
          王国无事发生……
        </div>
      )}

      {/* 完整地平线——始终横跨整个 banner */}
      <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, borderTop: '3px solid var(--border-primary)' }} />

      <style>{`
        @keyframes monster-walk {
          0%   { left: 4%; }
          50%  { left: calc(96% - 140px); }
          100% { left: 4%; }
        }
        @keyframes monster-sway {
          0%, 100% { transform: rotate(-2.5deg); }
          50%      { transform: rotate(2.5deg); }
        }
        .monster-walk { animation: monster-walk 30s steps(30) infinite; }
        .monster-sway { animation: monster-sway 0.5s ease-in-out infinite; transform-origin: bottom center; }
      `}</style>
    </div>
  );
}