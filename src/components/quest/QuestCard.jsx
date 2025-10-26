import { useState } from 'react';
import { Check, MoreVertical, Edit, Trash2 } from 'lucide-react';
import DifficultyBadge from './DifficultyBadge';
import RarityBadge from './RarityBadge';
import { format } from 'date-fns';

export default function QuestCard({ quest, onComplete, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  
  const isDone = quest.status === 'done';

  return (
    <div 
      className="relative mb-4 p-4 transform transition-all hover:translate-x-1 hover:-translate-y-1"
      style={{
        backgroundColor: isDone ? '#F0F0F0' : '#FFF',
        border: '4px solid #000',
        boxShadow: isDone ? '3px 3px 0px #000' : '6px 6px 0px #000',
        transform: `rotate(${Math.random() * 2 - 1}deg)`
      }}
    >
      <div className="flex gap-3">
        {/* Difficulty Badge */}
        <div className="flex-shrink-0">
          <DifficultyBadge difficulty={quest.difficulty} />
        </div>

        {/* Quest Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h3 
                className="font-black text-lg uppercase leading-tight mb-1"
                style={{ 
                  textDecoration: isDone ? 'line-through' : 'none',
                  color: isDone ? '#999' : '#000'
                }}
              >
                {quest.title}
              </h3>
              <p 
                className="text-sm font-bold"
                style={{ color: isDone ? '#999' : '#333' }}
              >
                ({quest.actionHint})
              </p>
            </div>

            {/* Menu Button */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-200 relative"
              style={{ border: '3px solid #000' }}
            >
              <MoreVertical className="w-4 h-4" />
              
              {showMenu && (
                <div 
                  className="absolute right-0 top-12 w-40 bg-white z-10"
                  style={{
                    border: '3px solid #000',
                    boxShadow: '4px 4px 0px #000'
                  }}
                >
                  <button
                    onClick={() => {
                      onEdit(quest);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left font-bold hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" /> 编辑
                  </button>
                  <button
                    onClick={() => {
                      onDelete(quest.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left font-bold hover:bg-gray-100 flex items-center gap-2 border-t-3 border-black"
                  >
                    <Trash2 className="w-4 h-4" /> 删除
                  </button>
                </div>
              )}
            </button>
          </div>

          {/* Tags & Rarity */}
          <div className="flex flex-wrap gap-2 mb-2">
            <RarityBadge rarity={quest.rarity} />
            {quest.tags?.map((tag, i) => (
              <span 
                key={i}
                className="px-2 py-1 text-xs font-bold uppercase"
                style={{
                  backgroundColor: '#FF6B35',
                  color: '#FFF',
                  border: '2px solid #000'
                }}
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Due Date */}
          {quest.dueDate && (
            <p className="text-xs font-bold" style={{ color: '#666' }}>
              ⏰ {format(new Date(quest.dueDate), 'MM/dd HH:mm')}
            </p>
          )}
        </div>

        {/* Complete Button */}
        <button
          onClick={() => onComplete(quest)}
          disabled={isDone}
          className="flex-shrink-0 w-12 h-12 flex items-center justify-center font-black transition-all"
          style={{
            backgroundColor: isDone ? '#4ECDC4' : '#FFF',
            border: '4px solid #000',
            boxShadow: '4px 4px 0px #000',
            cursor: isDone ? 'not-allowed' : 'pointer'
          }}
        >
          {isDone && <Check className="w-6 h-6" strokeWidth={4} />}
        </button>
      </div>
    </div>
  );
}