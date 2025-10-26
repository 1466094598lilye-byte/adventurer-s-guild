import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { format, parse } from 'date-fns';

export default function QuestEditFormModal({ quest, onSave, onClose }) {
  const [actionHint, setActionHint] = useState(quest.actionHint || '');
  
  // Parse initial date and time
  const initialDate = quest.dueDate ? format(new Date(quest.dueDate), 'yyyy-MM-dd') : '';
  const initialHour = quest.dueDate ? format(new Date(quest.dueDate), 'HH') : '';
  const initialMinute = quest.dueDate ? format(new Date(quest.dueDate), 'mm') : '';
  
  const [date, setDate] = useState(initialDate);
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!actionHint.trim()) {
      alert('请输入任务内容！');
      return;
    }

    // Combine date and time
    let dueDate = null;
    if (date && hour && minute) {
      dueDate = new Date(`${date}T${hour}:${minute}`).toISOString();
    }

    setIsSaving(true);
    await onSave({
      actionHint: actionHint.trim(),
      dueDate: dueDate
    });
    setIsSaving(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div 
        className="relative max-w-lg w-full p-6 transform rotate-1"
        style={{
          backgroundColor: '#FFE66D',
          border: '5px solid #000',
          boxShadow: '12px 12px 0px #000'
        }}
        onClick={(e) => e.stopPropagation()}
      >
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

        {/* Title */}
        <h2 
          className="text-2xl font-black uppercase text-center mb-6"
          style={{ color: '#000' }}
        >
          ✏️ 编辑委托 ✏️
        </h2>

        {/* Current RPG Title (Read-only Display) */}
        <div 
          className="mb-4 p-3"
          style={{
            backgroundColor: '#FFF',
            border: '3px solid #000'
          }}
        >
          <p className="text-xs font-bold uppercase mb-1" style={{ color: '#666' }}>
            当前RPG任务名
          </p>
          <p className="font-black text-sm">{quest.title}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Hint Input */}
          <div>
            <label 
              className="block text-sm font-black uppercase mb-2"
              style={{ color: '#000' }}
            >
              任务内容 <span style={{ color: '#FF6B35' }}>*</span>
            </label>
            <textarea
              value={actionHint}
              onChange={(e) => setActionHint(e.target.value)}
              placeholder="例如：跑步5km@07:00"
              rows={3}
              className="w-full px-4 py-3 font-bold text-base resize-none"
              style={{
                backgroundColor: '#FFF',
                border: '3px solid #000',
                boxShadow: '4px 4px 0px #000'
              }}
            />
            <p className="text-xs font-bold mt-2" style={{ color: '#666' }}>
              💡 保存后AI将重新生成RPG风格的任务名称和评级
            </p>
          </div>

          {/* Due Date Input */}
          <div>
            <label 
              className="block text-sm font-black uppercase mb-2"
              style={{ color: '#000' }}
            >
              截止日期
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 font-bold text-base mb-3"
              style={{
                backgroundColor: '#FFF',
                border: '3px solid #000',
                boxShadow: '4px 4px 0px #000'
              }}
            />
            
            {/* Time Inputs */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label 
                  className="block text-xs font-bold uppercase mb-2"
                  style={{ color: '#000' }}
                >
                  小时
                </label>
                <select
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  className="w-full px-4 py-3 font-bold text-base"
                  style={{
                    backgroundColor: '#FFF',
                    border: '3px solid #000',
                    boxShadow: '4px 4px 0px #000'
                  }}
                >
                  <option value="">--</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>
                      {String(i).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1">
                <label 
                  className="block text-xs font-bold uppercase mb-2"
                  style={{ color: '#000' }}
                >
                  分钟
                </label>
                <select
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  className="w-full px-4 py-3 font-bold text-base"
                  style={{
                    backgroundColor: '#FFF',
                    border: '3px solid #000',
                    boxShadow: '4px 4px 0px #000'
                  }}
                >
                  <option value="">--</option>
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>
                      {String(i).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 font-black uppercase"
              style={{
                backgroundColor: '#FFF',
                border: '4px solid #000',
                boxShadow: '5px 5px 0px #000',
                opacity: isSaving ? 0.5 : 1
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 font-black uppercase flex items-center justify-center gap-2"
              style={{
                backgroundColor: '#4ECDC4',
                border: '4px solid #000',
                boxShadow: '5px 5px 0px #000',
                opacity: isSaving ? 0.7 : 1
              }}
            >
              <Save className="w-5 h-5" strokeWidth={4} />
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}