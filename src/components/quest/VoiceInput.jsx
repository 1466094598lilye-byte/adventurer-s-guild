import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function VoiceInput({ onQuestsGenerated }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    try {
      // Upload audio
      const audioFile = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });
      console.log('上传音频文件...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });
      console.log('音频上传成功:', file_url);

      // Get transcript and parse to quests
      console.log('调用AI处理语音...');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `你是冒险者工会的AI助手。用户语音输入了任务描述。请转写语音内容，然后将其解析为RPG风格的结构化任务。

命名规则（更像RPG游戏）：
1. 标题格式：【任务类型】任务名称
   - 任务类型示例：讨伐、收集、护送、调查、修炼、征服、探索
2. 标题要有场景感和戏剧性，比如：
   - 跑步 → 【修炼】晨曦长跑试炼
   - 背单词 → 【收集】古语词汇宝库
   - 发邮件 → 【护送】重要情报传递
   - 打扫房间 → 【征服】混沌领域整顿
   - 工作 → 【讨伐】代码之兽征服战
3. 括号动作保持清晰实用，不要过度修饰

示例：
输入："明早7点跑步5公里，给Daisy发邮件确认看房"
输出：
{
  "transcript": "明早7点跑步5公里，给Daisy发邮件确认看房",
  "quests": [
    {
      "title": "【修炼】晨曦长跑试炼",
      "actionHint": "跑步5km@07:00",
      "dueDate": "明日07:00",
      "tags": ["运动"],
      "difficulty": "C",
      "rarity": "Common"
    },
    {
      "title": "【护送】房产情报传递",
      "actionHint": "给Daisy发看房确认邮件",
      "dueDate": "今日",
      "tags": ["事务"],
      "difficulty": "D",
      "rarity": "Rare"
    }
  ]
}

请处理用户的语音输入。`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            transcript: { type: "string" },
            quests: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  actionHint: { type: "string" },
                  dueDate: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  difficulty: { type: "string", enum: ["F", "E", "D", "C", "B", "A", "S"] },
                  rarity: { type: "string", enum: ["Common", "Rare", "Epic", "Legendary"] }
                }
              }
            }
          }
        }
      });

      console.log('AI处理结果:', result);
      setTranscript(result.transcript || '');
      onQuestsGenerated(result.quests || []);
    } catch (error) {
      console.error('语音处理错误:', error);
      alert(`语音处理失败：${error.message || '请重试'}`);
    }
    setIsProcessing(false);
  };

  const handleTextSubmit = async (text) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `你是冒险者工会的AI助手。用户输入了任务描述："${text}"

请将其解析为RPG风格的结构化任务。

命名规则（更像RPG游戏）：
1. 标题格式：【任务类型】任务名称
   - 任务类型示例：讨伐、收集、护送、调查、修炼、征服、探索
2. 标题要有场景感和戏剧性，比如：
   - 跑步 → 【修炼】晨曦长跑试炼
   - 背单词 → 【收集】古语词汇宝库
   - 发邮件 → 【护送】重要情报传递
   - 打扫房间 → 【征服】混沌领域整顿
   - 工作 → 【讨伐】代码之兽征服战
3. 括号动作保持清晰实用，不要过度修饰

示例：
输入："写周报"
输出：
{
  "quests": [
    {
      "title": "【记录】冒险周志编撰",
      "actionHint": "完成本周工作周报",
      "tags": ["工作"],
      "difficulty": "D",
      "rarity": "Common"
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
                  difficulty: { type: "string", enum: ["F", "E", "D", "C", "B", "A", "S"] },
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
      alert(`文本处理失败：${error.message || '请重试'}`);
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
      <div className="flex gap-3 mb-3">
        {/* Voice Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className="flex-shrink-0 w-16 h-16 flex items-center justify-center font-black transition-all"
          style={{
            backgroundColor: isRecording ? '#FF6B35' : '#4ECDC4',
            border: '4px solid #000',
            boxShadow: '5px 5px 0px #000',
            transform: isRecording ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-8 h-8" strokeWidth={3} />
          ) : (
            <Mic className="w-8 h-8" strokeWidth={3} />
          )}
        </button>

        {/* Text Input */}
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

        {/* Submit Button */}
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

      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#000' }}>
        💡 说出你的任务，工会AI将为你整理！
      </p>
    </div>
  );
}