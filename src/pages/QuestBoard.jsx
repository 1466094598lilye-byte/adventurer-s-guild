import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Filter, Loader2 } from 'lucide-react';
import VoiceInput from '../components/quest/VoiceInput';
import QuestCard from '../components/quest/QuestCard';
import PraiseDialog from '../components/quest/PraiseDialog';
import ChestOpening from '../components/treasure/ChestOpening';
import { format } from 'date-fns';

export default function QuestBoard() {
  const [filter, setFilter] = useState('all');
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [showChest, setShowChest] = useState(false);
  const [pendingQuests, setPendingQuests] = useState([]);
  const queryClient = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ['quests', today],
    queryFn: async () => {
      const allQuests = await base44.entities.Quest.filter({ date: today }, '-created_date');
      return allQuests;
    }
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const createQuestMutation = useMutation({
    mutationFn: (questData) => base44.entities.Quest.create(questData),
    onSuccess: () => {
      queryClient.invalidateQueries(['quests']);
      setPendingQuests([]);
    }
  });

  const updateQuestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['quests']);
    }
  });

  const deleteQuestMutation = useMutation({
    mutationFn: (id) => base44.entities.Quest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['quests']);
    }
  });

  const handleQuestsGenerated = (generatedQuests) => {
    setPendingQuests(generatedQuests);
  };

  const confirmQuests = () => {
    pendingQuests.forEach(quest => {
      createQuestMutation.mutate({
        ...quest,
        date: today,
        status: 'todo',
        source: 'ai'
      });
    });
  };

  const handleComplete = async (quest) => {
    await updateQuestMutation.mutateAsync({
      id: quest.id,
      data: { status: 'done' }
    });
    setSelectedQuest(quest);

    // Check if all quests are done
    const updatedQuests = await base44.entities.Quest.filter({ date: today });
    const allDone = updatedQuests.every(q => q.status === 'done');
    
    if (allDone) {
      // Check if chest already opened
      const chests = await base44.entities.DailyChest.filter({ date: today });
      if (chests.length === 0) {
        await base44.entities.DailyChest.create({ date: today, opened: false });
        setTimeout(() => setShowChest(true), 1000);
      }
    }
  };

  const filteredQuests = quests.filter(quest => {
    if (filter === 'all') return true;
    if (filter === 'done') return quest.status === 'done';
    if (filter === 'todo') return quest.status === 'todo';
    return true;
  });

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div 
          className="mb-6 p-4 transform -rotate-1"
          style={{
            backgroundColor: '#000',
            color: '#FFE66D',
            border: '5px solid #FFE66D',
            boxShadow: '8px 8px 0px #FFE66D'
          }}
        >
          <h1 className="text-3xl font-black uppercase text-center">
            ⚔️ 委托板 ⚔️
          </h1>
          <p className="text-center font-bold mt-2 text-sm">
            {format(new Date(), 'yyyy年MM月dd日')}
          </p>
        </div>

        {/* Voice Input */}
        <VoiceInput onQuestsGenerated={handleQuestsGenerated} />

        {/* Pending Quests Preview */}
        {pendingQuests.length > 0 && (
          <div 
            className="mb-6 p-4"
            style={{
              backgroundColor: '#FFE66D',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            <h3 className="font-black uppercase mb-3">待确认委托 ({pendingQuests.length})</h3>
            <div className="space-y-2 mb-4">
              {pendingQuests.map((quest, i) => (
                <div 
                  key={i}
                  className="p-2"
                  style={{
                    backgroundColor: '#FFF',
                    border: '3px solid #000'
                  }}
                >
                  <p className="font-black text-sm">{quest.title}</p>
                  <p className="text-xs font-bold text-gray-600">({quest.actionHint})</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmQuests}
                className="flex-1 py-2 font-black uppercase"
                style={{
                  backgroundColor: '#4ECDC4',
                  border: '3px solid #000',
                  boxShadow: '4px 4px 0px #000'
                }}
              >
                确认接取
              </button>
              <button
                onClick={() => setPendingQuests([])}
                className="flex-1 py-2 font-black uppercase"
                style={{
                  backgroundColor: '#FF6B35',
                  color: '#FFF',
                  border: '3px solid #000',
                  boxShadow: '4px 4px 0px #000'
                }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-3 mb-6">
          {['all', 'todo', 'done'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 py-2 font-black uppercase text-sm"
              style={{
                backgroundColor: filter === f ? '#4ECDC4' : '#FFF',
                border: '3px solid #000',
                boxShadow: filter === f ? '4px 4px 0px #000' : '2px 2px 0px #000'
              }}
            >
              <Filter className="w-4 h-4 inline mr-1" strokeWidth={3} />
              {f === 'all' ? '全部' : f === 'todo' ? '未完成' : '已完成'}
            </button>
          ))}
        </div>

        {/* Quests List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin" strokeWidth={4} />
          </div>
        ) : filteredQuests.length === 0 ? (
          <div 
            className="p-8 text-center"
            style={{
              backgroundColor: '#FFF',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            <p className="text-2xl font-black uppercase mb-2">暂无委托</p>
            <p className="font-bold text-gray-600">使用语音或文本添加今日任务</p>
          </div>
        ) : (
          <div>
            {filteredQuests.map(quest => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onComplete={handleComplete}
                onEdit={(q) => {
                  // Edit functionality placeholder
                  alert('编辑功能开发中');
                }}
                onDelete={(id) => deleteQuestMutation.mutate(id)}
              />
            ))}
          </div>
        )}

        {/* Praise Dialog */}
        {selectedQuest && (
          <PraiseDialog
            quest={selectedQuest}
            onClose={() => setSelectedQuest(null)}
            onAddNote={() => {
              alert('复盘笔记功能开发中');
            }}
          />
        )}

        {/* Chest Opening */}
        {showChest && (
          <ChestOpening
            date={today}
            onClose={() => setShowChest(false)}
            onLootGenerated={(loot) => {
              queryClient.invalidateQueries(['loot']);
            }}
          />
        )}
      </div>
    </div>
  );
}