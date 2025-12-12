import { useState } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/LanguageContext';

export default function BootstrapModeDialog({ tasks, onClose, onConfirm, isAdding }) {
  const [selectedTasks, setSelectedTasks] = useState([]);
  const { language } = useLanguage();

  const toggleTask = (tempId) => {
    setSelectedTasks(prev => 
      prev.includes(tempId) 
        ? prev.filter(id => id !== tempId)
        : [...prev, tempId]
    );
  };

  const selectedCount = selectedTasks.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full p-6"
        style={{
          backgroundColor: '#FFE66D',
          border: '5px solid #000',
          boxShadow: '12px 12px 0px #000'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-12 h-12 flex items-center justify-center"
          style={{
            backgroundColor: '#FF6B35',
            border: '4px solid #000',
            boxShadow: '5px 5px 0px #000'
          }}
        >
          <X className="w-7 h-7 text-white" strokeWidth={4} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black uppercase mb-2">
            {language === 'zh' ? '🌱 启动模式 🌱' : '🌱 Bootstrap Mode 🌱'}
          </h2>
          <p className="font-bold text-sm" style={{ color: '#666' }}>
            {language === 'zh' 
              ? '选择你想要添加的小胜利任务' 
              : 'Select micro-victory tasks to add'}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {tasks.map((task) => {
            const isSelected = selectedTasks.includes(task.tempId);
            
            return (
              <button
                key={task.tempId}
                onClick={() => toggleTask(task.tempId)}
                className="w-full p-4 text-left transition-all"
                style={{
                  backgroundColor: isSelected ? '#4ECDC4' : '#FFF',
                  border: isSelected ? '4px solid #000' : '3px solid #000',
                  boxShadow: isSelected ? '4px 4px 0px #000' : '2px 2px 0px #000'
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center mt-1"
                    style={{
                      backgroundColor: isSelected ? '#000' : '#FFF',
                      border: '3px solid #000'
                    }}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 text-white" strokeWidth={4} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm mb-1">{task.title}</p>
                    <p className="text-xs font-bold" style={{ color: '#666' }}>
                      {task.actionHint}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            disabled={isAdding}
            className="flex-1 py-3 font-black uppercase"
            style={{
              backgroundColor: '#FFF',
              border: '4px solid #000',
              boxShadow: '4px 4px 0px #000',
              opacity: isAdding ? 0.5 : 1
            }}
          >
            {language === 'zh' ? '取消' : 'Cancel'}
          </Button>
          <Button
            onClick={() => onConfirm(selectedTasks)}
            disabled={selectedCount === 0 || isAdding}
            className="flex-1 py-3 font-black uppercase flex items-center justify-center gap-2"
            style={{
              backgroundColor: selectedCount > 0 ? '#4ECDC4' : '#E0E0E0',
              border: '4px solid #000',
              boxShadow: '4px 4px 0px #000',
              opacity: (selectedCount === 0 || isAdding) ? 0.5 : 1
            }}
          >
            {isAdding ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                {language === 'zh' ? '添加中...' : 'Adding...'}
              </>
            ) : (
              <>
                {language === 'zh' ? `添加 ${selectedCount} 项任务` : `Add ${selectedCount} Tasks`}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}