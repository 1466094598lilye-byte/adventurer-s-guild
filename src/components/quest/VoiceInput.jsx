
import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function VoiceInput({ onQuestsGenerated }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(1);
  const [audioLevels, setAudioLevels] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
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
    }
  };

  const stopAudioVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
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
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsRecording(true);
        startAudioVisualization();
        console.log('语音识别已启动');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let avgConfidence = 0;
        let confidenceCount = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptText = result[0].transcript;
          
          if (result[0].confidence !== undefined) {
            avgConfidence += result[0].confidence;
            confidenceCount++;
          }
          
          if (result.isFinal) {
            finalTranscript += transcriptText;
          } else {
            interimTranscript += transcriptText;
          }
        }

        if (confidenceCount > 0) {
          setConfidence(avgConfidence / confidenceCount);
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
        await handleTextSubmit(transcript, confidence);
      }
    }
  };

  const handleTextSubmit = async (text, conf = 1) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `你是【星陨纪元冒险者工会】的首席史诗书记官。

【冒险者的委托原文】："${text}"

【你的使命】：
为这个委托生成一个**简洁有力**的RPG风格标题。

【标题格式】：【任务类型】+ 4-8字的奇幻标题

【任务类型（2字）】：
讨伐、狩猎、探索、调查、收集、采集、修炼、试炼、护送、救援、谈判、磨砺、淬炼、特训、拜访

【标题主体（4-8字）】：
- 必须简短、有力、易读
- 可以包含：奇幻地点、时间、元素等
- 禁止使用冒号、顿号等标点符号
- 总长度（含【任务类型】）不超过15字

【示例对照】：
✓ 好的标题（简洁）：
- 【修炼】破晓疾行 (8字)
- 【采集】集市寻觅 (8字)
- 【探索】古籍研读 (8字)
- 【谈判】商会议事 (8字)
- 【淬炼】力量修行 (8字)

❌ 不好的标题（太长）：
- 【修炼】破晓风语者的晨曦疾行 (14字，太长)
- 【采集】月光集市食材寻觅之旅 (14字，太长)
- 【收集】被遗忘的香气：灼热荒原 (15字，太长)

【奇幻化词汇】：
- 超市→集市
- 开会→议事
- 跑步→疾行
- 读书→研读
- 健身→修行

【难度评级】：
- C级：10分钟内完成
- B级：30分钟以上
- A级：需突破舒适区
- S级：重大挑战

请生成简洁标题（≤15字）：`,
        response_json_schema: {
          type: "object",
          properties: {
            quests: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  difficulty: { type: "string", enum: ["C", "B", "A", "S"] },
                  rarity: { type: "string", enum: ["Common", "Rare", "Epic", "Legendary"] },
                  tags: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      // 使用用户原文作为 actionHint，不使用 AI 生成的
      const questsWithOriginalText = result.quests.map(quest => ({
        ...quest,
        actionHint: text  // 直接使用用户输入的原文
      }));

      onQuestsGenerated(questsWithOriginalText);
      setTranscript('');
      setConfidence(1);
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
        <div className="flex gap-3">
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
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#000' }} />
            ) : (
              <Mic className="w-8 h-8" strokeWidth={3} style={{ color: '#000' }} />
            )}
          </button>

          <div className="flex-1">
            <input
              type="text"
              placeholder="说出你的任务，如：明天早上7点跑步5公里..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleTextSubmit(transcript, 1);
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
            onClick={() => handleTextSubmit(transcript, 1)}
            disabled={isProcessing || !transcript.trim()}
            className="flex-shrink-0 w-16 h-16 flex items-center justify-center font-black"
            style={{
              backgroundColor: '#C44569',
              border: '4px solid #000',
              boxShadow: '5px 5px 0px #000',
              opacity: (!transcript.trim() || isProcessing) ? 0.5 : 1
            }}
          >
            <Sparkles className="w-8 h-8" strokeWidth={3} style={{ color: '#FFF', fill: 'none' }} />
          </button>
        </div>
      ) : (
        <div>
          <div 
            className="p-6 mb-3"
            style={{
              backgroundColor: '#FFF',
              border: '4px solid #000',
              boxShadow: '5px 5px 0px #000'
            }}
          >
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

            <div className="min-h-[40px] flex items-center justify-center">
              {transcript ? (
                <p className="font-bold text-lg text-center">{transcript}</p>
              ) : (
                <p className="font-bold text-gray-400 text-center">正在聆听...</p>
              )}
            </div>
          </div>

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
            <MicOff className="w-6 h-6" strokeWidth={3} style={{ color: '#FFF' }} />
            完成录音
          </button>
        </div>
      )}
    </div>
  );
}
