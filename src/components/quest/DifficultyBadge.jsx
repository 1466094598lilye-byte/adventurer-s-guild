export default function DifficultyBadge({ difficulty }) {
  const colors = {
    F: { bg: '#D4F1F4', text: '#05668D', border: '#05668D' },
    E: '#A7E9AF',
    D: { bg: '#FFE66D', text: '#000', border: '#000' },
    C: { bg: '#FF6B35', text: '#FFF', border: '#000' },
    B: { bg: '#C44569', text: '#FFF', border: '#000' },
    A: { bg: '#9B59B6', text: '#FFF', border: '#000' },
    S: { bg: '#000', text: '#FFE66D', border: '#FFE66D' }
  };

  const colorConfig = colors[difficulty] || colors.D;
  const bgColor = typeof colorConfig === 'string' ? colorConfig : colorConfig.bg;
  const textColor = typeof colorConfig === 'string' ? '#000' : colorConfig.text;
  const borderColor = typeof colorConfig === 'string' ? '#000' : colorConfig.border;

  return (
    <div 
      className="flex items-center justify-center w-12 h-12 font-black text-xl transform -rotate-3"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        border: `4px solid ${borderColor}`,
        boxShadow: '4px 4px 0px rgba(0,0,0,1)'
      }}
    >
      {difficulty}
    </div>
  );
}