import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Sparkles, AlertCircle } from 'lucide-react';
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
      
      // 配置多语言支持，提升口音识别
      recognition.lang = 'zh-CN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3; // 获取多个候选结果

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
          
          // 收集置信度
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

        // 计算平均置信度
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
      // 使用LLM进行语义理解和口音纠正
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `你是冒险者工会的AI书记官，负责记录委托。用户通过语音输入任务，可能带有口音或发音不标准。

【原始语音文本】："${text}"
【识别置信度】：${(conf * 100).toFixed(0)}%

【你的任务】：
1. **语义优先**：理解用户真正想表达的任务意图，不要被发音错误干扰
2. **口音容错**：
   - 常见音变：sh/s、l/n、in/ing、f/h、z/zh、c/ch
   - 粤语用词：买嘢→买东西、做嘢→做事、睇→看
   - 台普用词：等一下下→等一下、有够→很
   - 地方口语：吃饭咯→吃饭了、搞定了噻→搞定了
3. **智能拆分**：如果提到多个任务（用"和"、"还有"、"然后"、"以及"连接），拆分成多个任务
4. **保留关键词**：人名、地点、时间、具体数字必须保留

【输出格式】：
- rawText: 原始识别文本（原封不动）
- correctedText: 纠正后的文本（如果不需要纠正则与原文相同）
- needsCorrection: 是否进行了纠正（true/false）
- quests: 任务列表

【示例1】（口音识别错误）：
输入："明早七点跑不五公里"
输出：
{
  "rawText": "明早七点跑不五公里",
  "correctedText": "明早七点跑步五公里",
  "needsCorrection": true,
  "quests": [
    {
      "title": "【修炼】晨曦长跑试炼",
      "actionHint": "跑步5km@07:00",
      "tags": ["运动"],
      "difficulty": "B",
      "rarity": "Common"
    }
  ]
}

【示例2】（粤语词汇）：
输入："今日要买嘢同做运动"
输出：
{
  "rawText": "今日要买嘢同做运动",
  "correctedText": "今天要买东西和做运动",
  "needsCorrection": true,
  "quests": [
    {
      "title": "【收集】市集采购行动",
      "actionHint": "买东西",
      "tags": ["生活"],
      "difficulty": "C",
      "rarity": "Common"
    },
    {
      "title": "【修炼】日常锻炼计划",
      "actionHint": "做运动",
      "tags": ["运动"],
      "difficulty": "C",
      "rarity": "Common"
    }
  ]
}

请处理用户输入：`,
        response_json_schema: {
          type: "object",
          properties: {
            rawText: { type: "string" },
            correctedText: { type: "string" },
            needsCorrection: { type: "boolean" },
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

      // 在任务中附加原始语音文本和纠正信息
      const questsWithMetadata = result.quests.map(q => ({
        ...q,
        voiceRawText: result.rawText,
        voiceCorrectedText: result.needsCorrection ? result.correctedText : null,
        voiceConfidence: conf
      }));

      onQuestsGenerated(questsWithMetadata);
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
        <div className="mb-3">
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
                <div>
                  <p className="font-bold text-lg text-center mb-2">{transcript}</p>
                  {confidence < 0.75 && (
                    <div className="flex items-center justify-center gap-2 text-orange-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-bold">
                        置信度较低，AI将智能理解语义
                      </span>
                    </div>
                  )}
                </div>
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
            <MicOff className="w-6 h-6" strokeWidth={3} />
            完成录音
          </button>
        </div>
      )}

      <div 
        className="flex items-start gap-2 p-3 mt-3"
        style={{
          backgroundColor: '#4ECDC4',
          border: '3px solid #000'
        }}
      >
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" strokeWidth={3} />
        <p className="text-xs font-bold leading-relaxed">
          📢 书记官提醒：即便语调各异（粤语、台普、地方口音），工会皆能听懂你的委托，请尽管开口叙述。
        </p>
      </div>
    </div>
  );
}