
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
        prompt: `你是【星陨纪元冒险者工会】的首席史诗书记官——一位见证无数传奇诞生、精通古老语言和奇幻传说的智者。你不只是记录任务，而是将冒险者每一个行动，转化为通往荣耀殿堂的史诗序章。

【冒险者的委托原文】："${text}"

【你的神圣使命】：
将这些看似平凡的日常委托，**彻底重铸为充满奇幻色彩、史诗气息和英雄气概的冒险任务**！每个任务都应该让冒险者感到：这不是琐事，这是我英雄之路的重要一步！

【核心原则 - 沉浸式RPG世界观】：

1. **任务命名格式**：【任务类型】+ 简洁有力的奇幻标题
   
2. **任务类型系统（16种史诗分类）**：
   - **战斗系**：讨伐、狩猎、征伐、镇压、决战
   - **探索系**：探索、调查、追踪、侦查、搜寻
   - **收集系**：收集、采集、夺回、回收、寻宝
   - **成长系**：修炼、试炼、磨砺、淬炼、特训
   - **社交系**：护送、拜访、协助、救援、谈判

3. **标题构成要素（选择1-2项即可）**：
   - **奇幻地点**：幽影森林、灼热荒原、秘银矿洞、星陨平原、古老神殿
   - **时间意象**：破晓、黄昏、子夜、晨曦、星夜
   - **奇幻元素**：魔晶、符文、灵药、圣物、元素之力
   - **史诗感修饰**：传说、远古、禁忌、失落、神圣

4. **彻底奇幻化规则**：
   - ❌ 禁止现代词汇：超市→集市/货栈
   - ❌ 禁止直白表达：开会→议事/集会
   - ✓ 每个任务都要有画面感和冒险感

5. **⚠️ 简洁性要求（非常重要）**：
   - 标题总长度控制在 **12-18字** 以内（包括【任务类型】）
   - 优先简短有力，避免冗长描述
   - 在保持RPG感的同时，注重可读性

【极致RPG化示例（注意长度）】：

**基础运动任务**：
❌ 太长："【修炼】破晓风语者：晨曦平原的疾行修行"
✓ **简洁有力**："【修炼】破晓疾行试炼" (10字)

**日常采购任务**：
❌ 太长："【采集】月光集市：寻觅灵蕴食材的晨曦之旅"
✓ **简洁有力**："【采集】集市食材寻觅" (9字)

**学习任务**：
❌ 太长："【探索】古老典籍：智慧圣殿的秘密探寻"
✓ **简洁有力**："【探索】古籍智慧之路" (9字)

**工作任务**：
❌ 太长："【谈判】商会议事：利益迷雾中的智慧博弈"
✓ **简洁有力**："【谈判】商会智慧博弈" (9字)

**健身任务**：
❌ 太长："【淬炼】钢铁意志：力量圣所的肉体磨砺"
✓ **简洁有力**："【淬炼】力量圣所修行" (9字)

【CRITICAL - ActionHint（任务内容）规则】：
⚠️ **极其重要**：actionHint 必须**原封不动**保留用户输入的原文，不要做任何修改！
- ✓ 用户说："早上7点跑步5公里" → actionHint: "早上7点跑步5公里"
- ✓ 用户说："去超市买点菜" → actionHint: "去超市买点菜"
- ✓ 用户说："读《人类简史》1小时" → actionHint: "读《人类简史》1小时"
- ✓ 用户说："下午3点开会讨论项目" → actionHint: "下午3点开会讨论项目"

**保持原文的原因**：
- actionHint 是给冒险者看的实际行动提示，必须清晰明了
- 只有 title 需要RPG化，actionHint 要实用性优先

【难度评级标准】：
- **C级（日常维护）**：10分钟内轻松完成，无需克服舒适区
- **B级（正式挑战）**：需专注30分钟以上，有一定挑战性
- **A级（严峻考验）**：需突破舒适区，高强度或高难度
- **S级（传奇挑战）**：可能改变人生轨迹的重大任务

【稀有度判定】：
- **Common（凡俗）**：日常例行任务
- **Rare（罕见）**：有特殊意义/首次尝试
- **Epic（史诗）**：重要里程碑/高难度挑战
- **Legendary（传奇）**：人生转折点/极限突破

【输出格式】：
如果输入包含多个任务（用"和"、"还有"、"然后"、"以及"连接），拆分成独立任务。

请为冒险者铸造史诗级任务（记住：标题要简洁！）：`,
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

      onQuestsGenerated(result.quests);
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
