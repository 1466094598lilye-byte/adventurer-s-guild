import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function VoiceInput({ onQuestsGenerated }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioLevels, setAudioLevels] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 32;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevels = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Sample 10 bars from the frequency data
        const levels = [];
        const step = Math.floor(dataArray.length / 10);
        for (let i = 0; i < 10; i++) {
          const value = dataArray[i * step] / 255;
          levels.push(Math.min(value * 1.5, 1)); // Amplify slightly
        }
        
        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };
      
      updateLevels();
    } catch (error) {
      console.error('无法访问麦克风:', error);
    }
  };

  const stopAudioVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
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
        console.log('语音识别已启动');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
      };

      recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        setIsRecording(false);
        stopAudioVisualization();
        if (event.error === 'no-speech') {
          alert('没有检测到语音，请重试');
        } else if (event.error === 'not-allowed') {
          alert('麦克风权限被拒绝，请在浏览器设置中允许使用麦克风');
        } else {
          alert(`语音识别失败：${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        stopAudioVisualization();
        console.log('语音识别已结束');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('启动语音识别失败:', error);
      alert('无法启动语音识别，请检查浏览器权限');
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
        prompt: `你是冒险者工会的AI助手。用户输入了任务描述："${text}"

请将其解析为RPG风格的结构化任务。

【重要规则】actionHint（括号内容）必须忠实原话：
- 保留所有关键词（人名、地点、具体事项、平台名称等）
- 只做必要的简化，不要改写意思
- 如果有时间信息，用@HH:MM格式标注
- 例：
  "回复群里的信息" → actionHint: "回复群消息"（保留"群"）
  "给Daisy发邮件确认看房" → actionHint: "给Daisy发看房确认邮件"（保留人名和具体事项）
  "明早7点跑步5公里" → actionHint: "跑步5km@07:00"

RPG标题命名规则：
1. 格式：【任务类型】任务名称
   - 任务类型：讨伐、收集、护送、调查、修炼、征服、探索
2. 标题要有场景感和戏剧性，但不要过度修饰

难度评级（4个等级）：
- C级：轻松任务（日常琐事、简单事项）
- B级：中等挑战（需要一些努力和时间）
- A级：高难度（突破舒适区、有挑战性）
- S级：超级挑战（人生重大任务、极具难度）

示例：
输入："写周报"
输出：
{
  "quests": [
    {
      "title": "【记录】冒险周志编撰",
      "actionHint": "写周报",
      "tags": ["工作"],
      "difficulty": "C",
      "rarity": "Common"
    }
  ]
}

输入："开始每天跑步5公里的习惯"
输出：
{
  "quests": [
    {
      "title": "【修炼】晨曦长跑试炼",
      "actionHint": "跑步5km",
      "tags": ["运动", "习惯"],
      "difficulty": "A",
      "rarity": "Rare"
    }
  ]
}

请处理用户输入。`,
        response_json_schema: {
          type: "object",
          properties: {
            quests: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  actionHint: { type: "string" },
                  dueDate: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  difficulty: { type: "string", enum: ["C", "B", "A", "S"] },
                  rarity: { type: "string", enum: ["Common", "Rare", "Epic", "Legendary"] }
                }
              }
            }
          }
        }
      });

      onQuestsGenerated(result.quests || []);
      setTranscript('');
    } catch (error) {
      console.error('文本处理错误:', error);
      alert(`任务解析失败：${error.message || '请重试'}`);
    }
    setIsProcessing(false);
  };

  return (
    <div 
      className="p-4 mb-6"
      style={{
        backgroundColor: '#FFE66D',
        border: '4px solid #000',
        boxShadow: '6px 6px 0px #000'
      }}
    >
      {!isRecording ? (
        // Default Input Mode
        <div className="flex gap-3 mb-3">
          <button
            onClick={startRecording}
            disabled={isProcessing}
            className="flex-shrink-0 w-16 h-16 flex items-center justify-center font-black transition-all"
            style={{
              backgroundColor: '#4ECDC4',
              border: '4px solid #000',
              boxShadow: '5px 5px 0px #000'
            }}
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Mic className="w-8 h-8" strokeWidth={3} />
            )}
          </button>

          <div className="flex-1">
            <input
              type="text"
              placeholder="输入任务或点击麦克风说话..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleTextSubmit(transcript);
                }
              }}
              disabled={isProcessing}
              className="w-full h-16 px-4 font-bold text-lg"
              style={{
                backgroundColor: '#FFF',
                border: '4px solid #000',
                boxShadow: '5px 5px 0px #000'
              }}
            />
          </div>

          <button
            onClick={() => handleTextSubmit(transcript)}
            disabled={isProcessing || !transcript.trim()}
            className="flex-shrink-0 w-16 h-16 flex items-center justify-center font-black"
            style={{
              backgroundColor: '#C44569',
              color: '#FFF',
              border: '4px solid #000',
              boxShadow: '5px 5px 0px #000',
              opacity: (!transcript.trim() || isProcessing) ? 0.5 : 1
            }}
          >
            <Sparkles className="w-8 h-8" strokeWidth={3} />
          </button>
        </div>
      ) : (
        // Voice Recording Mode with Waveform
        <div className="mb-3">
          <div 
            className="p-6 mb-3"
            style={{
              backgroundColor: '#FFF',
              border: '4px solid #000',
              boxShadow: '5px 5px 0px #000'
            }}
          >
            {/* Waveform Visualization */}
            <div className="flex items-end justify-center gap-1 mb-4" style={{ height: '80px' }}>
              {audioLevels.map((level, i) => (
                <div
                  key={i}
                  className="transition-all duration-100 ease-out"
                  style={{
                    width: '8%',
                    height: `${Math.max(level * 100, 10)}%`,
                    backgroundColor: '#FF6B35',
                    border: '2px solid #000',
                    boxShadow: '2px 2px 0px #000'
                  }}
                />
              ))}
            </div>

            {/* Real-time Transcript */}
            <div className="min-h-[40px] flex items-center justify-center">
              {transcript ? (
                <p className="font-bold text-lg text-center">{transcript}</p>
              ) : (
                <p className="font-bold text-gray-400 text-center">正在聆听...</p>
              )}
            </div>
          </div>

          {/* Stop Button */}
          <button
            onClick={stopRecording}
            className="w-full py-4 font-black uppercase text-lg flex items-center justify-center gap-3"
            style={{
              backgroundColor: '#FF6B35',
              color: '#FFF',
              border: '4px solid #000',
              boxShadow: '5px 5px 0px #000'
            }}
          >
            <MicOff className="w-6 h-6" strokeWidth={3} />
            完成录音
          </button>
        </div>
      )}

      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#000' }}>
        💡 说出你的任务，工会AI将为你整理！
      </p>
    </div>
  );
}