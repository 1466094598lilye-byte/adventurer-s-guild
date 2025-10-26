export default function DifficultyBadge({ difficulty }) {
  const colors = {
    C: { bg: '#FFE66D', text: '#000', border: '#000' },
    B: { bg: '#FF6B35', text: '#FFF', border: '#000' },
    A: { bg: '#C44569', text: '#FFF', border: '#000' },
    S: { bg: '#000', text: '#FFE66D', border: '#FFE66D' }
  };

  const colorConfig = colors[difficulty] || colors.C;

  return (
    <div 
      className="flex items-center justify-center w-12 h-12 font-black text-xl transform -rotate-3"
      style={{
        backgroundColor: colorConfig.bg,
        color: colorConfig.text,
        border: `4px solid ${colorConfig.border}`,
        boxShadow: '4px 4px 0px rgba(0,0,0,1)'
      }}
    >
      {difficulty}
    </div>
  );
}