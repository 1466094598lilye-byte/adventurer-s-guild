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

1. **任务命名格式**：【任务类型】+ 充满奇幻画面感的标题
   
2. **任务类型系统（16种史诗分类）**：
   - **战斗系**：讨伐（消灭强大敌人）、狩猎（追踪猎杀目标）、征伐（大规模战役）、镇压（平定叛乱）、决战（关键对决）
   - **探索系**：探索（发现未知领域）、调查（解开谜团）、追踪（寻找线索）、侦查（刺探情报）、搜寻（寻找失物）
   - **收集系**：收集（汇聚资源）、采集（获取材料）、夺回（取回失物）、回收（收复遗失）、寻宝（发现宝藏）
   - **成长系**：修炼（提升能力）、试炼（接受考验）、磨砺（锤炼技艺）、淬炼（精进修为）、特训（强化训练）
   - **社交系**：护送（保护目标）、拜访（会见重要人物）、协助（支援盟友）、救援（拯救危难）、谈判（外交斡旋）

3. **标题构成要素（必须包含以下至少2项）**：
   - **奇幻地点**：幽影森林、灼热荒原、寒霜之巅、秘银矿洞、水晶溶洞、迷雾峡谷、星陨平原、古老神殿
   - **时间意象**：破晓时分、黄昏之际、子夜钟声、晨曦初现、星月交辉
   - **奇幻元素**：魔晶、符文、灵药、圣物、魔力潮汐、元素之力、古老诅咒
   - **生物/敌人**：魔物、暗影生物、古龙、亡灵、元素精灵、堕落者
   - **挑战/危机**：被遗忘的威胁、蠢蠢欲动的黑暗、徘徊的亡魂、即将苏醒的邪恶
   - **史诗感修饰**：传说中的、远古的、禁忌的、失落的、神圣的、被诅咒的

4. **彻底奇幻化规则**：
   - ❌ 禁止任何现代词汇：超市→月光集市/商会货栈
   - ❌ 禁止直白表达：开会→商会议事/智者集会
   - ❌ 禁止平淡标题：买菜→采集食材→收集魔晶香料
   - ✓ 每个任务都要有画面感、故事感、冒险感

【极致RPG化示例对照】：

**基础运动任务**：
❌ 普通："跑步5公里"
❌ 初级RPG："【修炼】晨跑试炼"
✓ **史诗级RPG**："【修炼】破晓风语者：晨曦平原的疾行修行" 
   → 画面：在黎明微光中，穿越广袤平原，感受风之精灵的低语，磨砺体魄与意志

**日常采购任务**：
❌ 普通："去超市买菜"
❌ 初级RPG："【收集】食材采购"
✓ **史诗级RPG**："【采集】月光集市：寻觅灵蕴食材的晨曦之旅"
   → 画面：在晨光熹微的神秘集市，搜寻蕴含自然之力的珍贵食材

**学习任务**：
❌ 普通："读书1小时"
❌ 初级RPG："【学习】古籍研读"
✓ **史诗级RPG**："【探索】古老典籍：智慧圣殿的秘密探寻"
   → 画面：在寂静的藏书阁，翻阅古老羊皮卷，追寻前贤留下的智慧印记

**工作任务**：
❌ 普通："完成项目报告"
❌ 初级RPG："【工作】完成报告"
✓ **史诗级RPG**："【谈判】商会议事：利益迷雾中的智慧博弈"
   → 画面：在商会大厅，与各方势力斡旋，用智慧和策略达成联盟

**健身任务**：
❌ 普通："去健身房锻炼"
❌ 初级RPG："【修炼】体能训练"
✓ **史诗级RPG**："【淬炼】钢铁意志：力量圣所的肉体磨砺"
   → 画面：在充满力量气息的修炼场，挥洒汗水，锻造如钢铁般的体魄

【ActionHint 简洁规则】：
- 保留关键信息：时间、地点、数字、具体内容
- 去除冗余词汇
- 格式：核心行动@时间/地点
- 示例："跑步5km@07:00" "买生鲜食材@晨市" "阅读《人类简史》1h"

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

请为冒险者铸造史诗级任务：`,
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