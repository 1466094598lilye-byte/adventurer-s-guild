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
    <div style={{ position: 'relative', height: 80, marginBottom: 24 }}>
      {hasMonster ? (
        /* 怪兽 + 头顶血条：一起水平走 */
        <div className="monster-walk" style={{ position: 'absolute', bottom: 4 }}>
          <div style={{ marginBottom: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--color-yellow)', lineHeight: 1 }}>
              {current}/{max}
            </div>
            <div style={{ width: 54, height: 5, border: '1.5px solid var(--border-primary)', backgroundColor: '#2a2a2a' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: pct > 40 ? 'var(--color-cyan)' : '#FF6B35',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
          <div className="monster-sway" style={{ display: 'flex', justifyContent: 'center' }}>
            <MonsterSprite dateString={dateString} cell={7} />
          </div>
        </div>
      ) : (
        /* 没有任务：王国无事发生 */
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

      {/* 地平线 */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderBottom: '3px solid var(--border-primary)' }} />

      <style>{`
        @keyframes monster-walk {
          0%   { left: 4%; }
          50%  { left: calc(96% - 63px); }
          100% { left: 4%; }
        }
        @keyframes monster-sway {
          0%, 100% { transform: rotate(-2.5deg); }
          50%      { transform: rotate(2.5deg); }
        }
        .monster-walk { animation: monster-walk 10s steps(20) infinite; }
        .monster-sway { animation: monster-sway 0.5s ease-in-out infinite; transform-origin: bottom center; }
      `}</style>
    </div>
  );
}
