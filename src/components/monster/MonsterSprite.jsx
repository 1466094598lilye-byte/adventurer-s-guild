import { generateMonster } from './generateMonster';

/**
 * 把每日像素怪兽渲染成纯色方块网格（纯方块、单色、无细节）。
 * @param {string} dateString 'yyyy-MM-dd'
 * @param {number} cell 每个像素方块边长(px)
 */
export default function MonsterSprite({ dateString, cell = 8 }) {
  const m = generateMonster(dateString);
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${m.width}, ${cell}px)`,
        gridTemplateRows: `repeat(${m.height}, ${cell}px)`,
      }}
    >
      {m.grid.flatMap((row, r) =>
        row.map((c, ci) => (
          <div
            key={`${r}-${ci}`}
            style={{ width: cell, height: cell, backgroundColor: c === 2 ? '#1a1a22' : c ? m.color : 'transparent' }}
          />
        ))
      )}
    </div>
  );
}
