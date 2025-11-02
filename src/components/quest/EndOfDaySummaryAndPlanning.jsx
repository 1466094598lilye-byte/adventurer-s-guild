import { useState, useRef, useEffect } from 'react';
import { X, Mic, MicOff, Loader2, Sparkles, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function EndOfDaySummaryAndPlanning({ 
  showCelebration, 
  onClose, 
  currentStreak,
  onPlanSaved 
}) {
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [loadingCelebration, setLoadingCelebration] = useState(showCelebration);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioLevels, setAudioLevels] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [plannedQuests, setPlannedQuests] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (showCelebration) {
      generateCelebrationMessage();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const generateCelebrationMessage = async () => {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `你是【星陨纪元冒险者工会】的大长老。一位冒险者刚刚完成了今日所有委托，连胜达到${currentStreak}天。

请为这位冒险者撰写一段简洁有力的日终总结与祝贺（2-3句话，60-80字）：

要求：
1. 肯定今日的全部完成
2. 强调${currentStreak}天连胜的坚持
3. 鼓励继续保持，为明日做好准备
4. 语气：温暖而有力，略带史诗感

示例风格：
"冒险者，你今日的征途画上完美的句号！${currentStreak}天的连续完成，见证了你非凡的意志。愿这份坚毅为你的明日之路铺垫更坚实的基石。"`,
        response_json_schema: {
          type: "object",
          properties: {
            message: { type: "string" }
          }
        }
      });
      
      setCelebrationMessage(result.message || '恭喜完成今日所有委托！');
    } catch (error) {
      setCelebrationMessage('恭喜完成今日所有委托！');
    }
    setLoadingCelebration(false);
  };

  const startAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 32;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevels = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const levels = [];
        const step = Math.floor(dataArray.length / 10);
        for (let i = 0; i < 10; i++) {
          const value = dataArray[i * step] / 255;
          levels.push(Math.min(value * 1.5, 1));
        }
        
        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };
      
      updateLevels();
    } catch (error) {
      console.error('无法访问麦克风:', error);
      alert('无法访问麦克风，请使用文本输入');
    }
  };

  const stopAudioVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    analyserRef.current = null;
    setAudioLevels([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  };

  const startRecording = async () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        alert('您的浏览器不支持语音识别，请使用文本输入');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        startAudioVisualization();
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptText = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcriptText;
          } else {
            interimTranscript += transcriptText;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
      };

      recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        setIsRecording(false);
        stopAudioVisualization();
        
        if (event.error === 'network') {
          alert('网络连接失败，请使用文本输入');
        } else if (event.error === 'not-allowed') {
          alert('麦克风权限被拒绝，请使用文本输入');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        stopAudioVisualization();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('启动语音识别失败:', error);
      alert('无法启动语音识别，请使用文本输入');
    }
  };

  const stopRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      stopAudioVisualization();
      
      if (transcript.trim()) {
        await handleTextSubmit(transcript);
      }
    }
  };

  const handleTextSubmit = async (text) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `你是【星陨纪元冒险者工会】的首席史诗书记官。冒险者正在为明天规划任务。

用户输入：${text.trim()}

你的任务：
1. 识别并拆分用户输入中的所有独立任务
2. 为每个任务创作专属的RPG风格标题（【2字类型】+ 7字标题）
3. 评定难度和稀有度
4. 保留用户的原始任务描述作为 actionHint

请返回任务数组：`,
        response_json_schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  actionHint: { type: "string" },
                  difficulty: { type: "string", enum: ["C", "B", "A", "S"] },
                  rarity: { type: "string", enum: ["Common", "Rare", "Epic", "Legendary"] }
                },
                required: ["title", "actionHint", "difficulty", "rarity"]
              }
            }
          },
          required: ["tasks"]
        }
      });

      const newQuests = result.tasks.map(task => ({
        title: task.title,
        actionHint: task.actionHint,
        difficulty: task.difficulty,
        rarity: task.rarity,
        tags: []
      }));

      setPlannedQuests(prev => [...prev, ...newQuests]);
      setTranscript('');
    } catch (error) {
      console.error('任务解析失败:', error);
      alert('任务解析失败，请重试');
    }
    setIsProcessing(false);
  };

  const handleAddManualQuest = () => {
    const newQuest = {
      title: '【新任务】待命名任务',
      actionHint: '',
      difficulty: 'C',
      rarity: 'Common',
      tags: []
    };
    setPlannedQuests([...plannedQuests, newQuest]);
    setEditingIndex(plannedQuests.length);
  };

  const handleChangeActionHint = async (index, newActionHint) => {
    setPlannedQuests(prevQuests => {
      const updated = [...prevQuests];
      updated[index] = { ...updated[index], actionHint: newActionHint };
      return updated;
    });
    
    if (newActionHint.trim()) {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `为任务"${newActionHint}"生成RPG风格标题、难度和稀有度`,
          response_json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              difficulty: { type: "string", enum: ["C", "B", "A", "S"] },
              rarity: { type: "string", enum: ["Common", "Rare", "Epic", "Legendary"] }
            }
          }
        });

        setPlannedQuests(prevQuests => {
          const updated = [...prevQuests];
          updated[index] = {
            ...updated[index],
            title: result.title,
            difficulty: result.difficulty,
            rarity: result.rarity
          };
          return updated;
        });
      } catch (error) {
        console.error('生成任务标题失败:', error);
      }
    }
  };

  const handleChangeDifficulty = (index, newDifficulty) => {
    const updated = [...plannedQuests];
    updated[index] = { ...updated[index], difficulty: newDifficulty };
    setPlannedQuests(updated);
  };

  const handleDeleteQuest = (index) => {
    setPlannedQuests(plannedQuests.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleConfirm = async () => {
    if (plannedQuests.length > 0) {
      await onPlanSaved(plannedQuests);
    }
    onClose();
  };

  const difficultyColors = {
    C: '#FFE66D',
    B: '#FF6B35',
    A: '#C44569',
    S: '#000'
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <div 
        className="relative max-w-2xl w-full my-8 p-6"
        style={{
          backgroundColor: '#4ECDC4',
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
          <X className="w-7 h-7" strokeWidth={4} />
        </button>

        <h2 className="text-3xl font-black uppercase text-center mb-6">
          {showCelebration ? '🎊 今日圆满 🎊' : '📋 规划明日 📋'}
        </h2>

        {showCelebration && (
          <div 
            className="mb-6 p-4"
            style={{
              backgroundColor: '#FFE66D',
              border: '4px solid #000',
              boxShadow: '6px 6px 0px #000'
            }}
          >
            {loadingCelebration ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <p className="font-bold leading-relaxed text-center">
                {celebrationMessage}
              </p>
            )}
          </div>
        )}

        <div 
          className="mb-4 p-4"
          style={{
            backgroundColor: '#FFF',
            border: '4px solid #000'
          }}
        >
          <h3 className="font-black uppercase mb-3">为明日做好准备</h3>
          
          {!isRecording ? (
            <div className="flex gap-3 mb-4">
              <button
                onClick={startRecording}
                disabled={isProcessing}
                className="flex-shrink-0 w-14 h-14 flex items-center justify-center"
                style={{
                  backgroundColor: '#4ECDC4',
                  border: '3px solid #000',
                  boxShadow: '4px 4px 0px #000'
                }}
              >
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Mic className="w-6 h-6" strokeWidth={3} />
                )}
              </button>

              <input
                type="text"
                placeholder="输入明天的任务..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleTextSubmit(transcript);
                  }
                }}
                disabled={isProcessing}
                className="flex-1 h-14 px-4 font-bold"
                style={{
                  backgroundColor: '#F9FAFB',
                  border: '3px solid #000'
                }}
              />

              <button
                onClick={() => handleTextSubmit(transcript)}
                disabled={isProcessing || !transcript.trim()}
                className="flex-shrink-0 w-14 h-14 flex items-center justify-center"
                style={{
                  backgroundColor: '#C44569',
                  border: '3px solid #000',
                  boxShadow: '4px 4px 0px #000',
                  opacity: (!transcript.trim() || isProcessing) ? 0.5 : 1
                }}
              >
                <Sparkles className="w-6 h-6 text-white" strokeWidth={3} />
              </button>
            </div>
          ) : (
            <div className="mb-4">
              <div 
                className="p-4 mb-3"
                style={{
                  backgroundColor: '#F9FAFB',
                  border: '3px solid #000'
                }}
              >
                <div className="flex items-end justify-center gap-1 mb-3" style={{ height: '60px' }}>
                  {audioLevels.map((level, i) => (
                    <div
                      key={i}
                      className="transition-all duration-100"
                      style={{
                        width: '8%',
                        height: `${Math.max(level * 100, 8)}%`,
                        backgroundColor: '#FF6B35',
                        border: '2px solid #000'
                      }}
                    />
                  ))}
                </div>
                <p className="font-bold text-center">
                  {transcript || '正在聆听...'}
                </p>
              </div>

              <button
                onClick={stopRecording}
                className="w-full py-3 font-black uppercase flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#FF6B35',
                  color: '#FFF',
                  border: '3px solid #000',
                  boxShadow: '4px 4px 0px #000'
                }}
              >
                <MicOff className="w-5 h-5" strokeWidth={3} />
                完成录音
              </button>
            </div>
          )}

          {plannedQuests.length > 0 && (
            <div className="space-y-2 mb-3">
              {plannedQuests.map((quest, i) => (
                <div 
                  key={i}
                  style={{
                    backgroundColor: '#F9FAFB',
                    border: '3px solid #000'
                  }}
                >
                  <div 
                    className="p-3 flex items-center justify-between cursor-pointer"
                    onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm mb-1 truncate">{quest.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600 truncate">
                          ({quest.actionHint || '待填写'})
                        </span>
                        <span 
                          className="px-2 py-0.5 text-xs font-black"
                          style={{
                            backgroundColor: difficultyColors[quest.difficulty],
                            color: quest.difficulty === 'S' ? '#FFE66D' : '#000',
                            border: '2px solid #000'
                          }}
                        >
                          {quest.difficulty}
                        </span>
                      </div>
                    </div>
                    {editingIndex === i ? (
                      <ChevronUp className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
                    ) : (
                      <ChevronDown className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
                    )}
                  </div>

                  {editingIndex === i && (
                    <div className="px-3 pb-3 pt-0" style={{ borderTop: '2px solid #000' }}>
                      <div className="mb-3 mt-3">
                        <label className="block text-xs font-bold uppercase mb-2">
                          任务内容：
                        </label>
                        <input
                          type="text"
                          value={quest.actionHint}
                          onChange={(e) => handleChangeActionHint(i, e.target.value)}
                          placeholder="请输入任务内容..."
                          className="w-full px-3 py-2 font-bold text-sm"
                          style={{ border: '2px solid #000' }}
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs font-bold uppercase mb-2">
                          难度评级：
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {['C', 'B', 'A', 'S'].map(level => (
                            <button
                              key={level}
                              onClick={() => handleChangeDifficulty(i, level)}
                              className="py-2 font-black"
                              style={{
                                backgroundColor: quest.difficulty === level ? difficultyColors[level] : '#F0F0F0',
                                color: level === 'S' && quest.difficulty === level ? '#FFE66D' : '#000',
                                border: quest.difficulty === level ? '3px solid #000' : '2px solid #000'
                              }}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteQuest(i)}
                        className="w-full py-2 font-bold uppercase text-sm"
                        style={{
                          backgroundColor: '#FFF',
                          color: '#FF6B35',
                          border: '2px solid #FF6B35'
                        }}
                      >
                        删除此任务
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleAddManualQuest}
            className="w-full py-2 font-bold uppercase text-sm flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#FFE66D',
              border: '3px solid #000',
              boxShadow: '3px 3px 0px #000'
            }}
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            手动添加任务
          </button>
        </div>

        <button
          onClick={handleConfirm}
          className="w-full py-4 font-black uppercase text-lg"
          style={{
            backgroundColor: '#FFE66D',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px #000'
          }}
        >
          {plannedQuests.length > 0 
            ? `确认登记 ${plannedQuests.length} 项委托` 
            : '关闭'}
        </button>
      </div>
    </div>
  );
}