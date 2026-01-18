import { useState, useEffect } from 'react';
import { X, ArrowRight, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/LanguageContext';

export default function OnboardingTutorial({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const { language } = useLanguage();

  const steps = {
    zh: [
      {
        title: '欢迎来到星陨纪元冒险者工会！',
        description: '让我带你体验一下如何使用这个任务系统。首先，在下方输入框中输入你的第一个任务吧！',
        target: 'input-box',
        position: 'bottom'
      },
      {
        title: '很好！现在点击右边的 ✨ 按钮',
        description: '系统会用AI帮你生成一个RPG风格的任务标题和评级。',
        target: 'submit-button',
        position: 'bottom'
      },
      {
        title: '太棒了！任务已生成',
        description: '你可以编辑任务详情，或者直接点击"加入委托板"确认添加。',
        target: 'confirm-button',
        position: 'top'
      },
      {
        title: '任务已添加到委托板！',
        description: '现在点击任务卡片上的"⚡启动"按钮，体验一下启动模式。',
        target: 'quest-card',
        position: 'top'
      },
      {
        title: '启动模式是什么？',
        description: '当你不想做任务时，可以设定一个"最小行动"和倒计时。只需要完成这个小目标，任务就会自动完成！',
        target: 'kickstart-dialog',
        position: 'center'
      },
      {
        title: '恭喜完成任务！',
        description: '完成任务后会有角色为你点评。坚持每天完成所有任务，你就能积累连胜、开启宝箱、获得战利品！',
        target: 'none',
        position: 'center'
      }
    ],
    en: [
      {
        title: 'Welcome to Starfall Era Guild!',
        description: 'Let me show you how to use this quest system. First, enter your first task in the input box below!',
        target: 'input-box',
        position: 'bottom'
      },
      {
        title: 'Great! Now click the ✨ button',
        description: 'The AI will generate an RPG-style quest title and rating for you.',
        target: 'submit-button',
        position: 'bottom'
      },
      {
        title: 'Awesome! Quest generated',
        description: 'You can edit quest details, or click "Add to Board" to confirm.',
        target: 'confirm-button',
        position: 'top'
      },
      {
        title: 'Quest added to board!',
        description: 'Now click the "⚡Kickstart" button on the quest card to try kickstart mode.',
        target: 'quest-card',
        position: 'top'
      },
      {
        title: 'What is Kickstart Mode?',
        description: 'When you don\'t feel like doing a task, set a "minimal action" and countdown. Complete just this small goal, and the task auto-completes!',
        target: 'kickstart-dialog',
        position: 'center'
      },
      {
        title: 'Congrats on completing!',
        description: 'After completing quests, characters will praise you. Complete all daily quests to build streaks, open chests, and earn loot!',
        target: 'none',
        position: 'center'
      }
    ]
  };

  const currentStepData = steps[language][currentStep];

  const handleNext = () => {
    if (currentStep < steps[language].length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  useEffect(() => {
    // 监听特定事件来自动推进教程
    const handleTutorialProgress = (e) => {
      if (e.detail.step === currentStep + 1) {
        setCurrentStep(e.detail.step);
      }
    };

    window.addEventListener('tutorial-progress', handleTutorialProgress);
    return () => window.removeEventListener('tutorial-progress', handleTutorialProgress);
  }, [currentStep]);

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      />

      {/* 教程卡片 */}
      <div
        className="fixed z-[101] max-w-md w-full p-6 transform -rotate-1"
        style={{
          backgroundColor: '#FFE66D',
          border: '5px solid #000',
          boxShadow: '12px 12px 0px #000',
          top: currentStepData.position === 'center' ? '50%' : currentStepData.position === 'top' ? '20%' : 'auto',
          bottom: currentStepData.position === 'bottom' ? '20%' : 'auto',
          left: '50%',
          transform: currentStepData.position === 'center' ? 'translate(-50%, -50%) rotate(-1deg)' : 'translate(-50%, 0) rotate(-1deg)'
        }}
      >
        <button
          onClick={onSkip}
          className="absolute -top-3 -right-3 w-10 h-10 flex items-center justify-center"
          style={{
            backgroundColor: '#FF6B35',
            border: '4px solid #000',
            boxShadow: '4px 4px 0px #000'
          }}
        >
          <X className="w-5 h-5 text-white" strokeWidth={4} />
        </button>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-black uppercase">
              {language === 'zh' ? '新手教程' : 'Tutorial'}
            </h3>
            <div className="flex gap-1">
              {steps[language].map((_, idx) => (
                <div
                  key={idx}
                  className="w-2 h-2"
                  style={{
                    backgroundColor: idx === currentStep ? '#000' : '#CCC',
                    border: '2px solid #000'
                  }}
                />
              ))}
            </div>
          </div>

          <h2 className="text-lg font-black mb-2" style={{ color: '#C44569' }}>
            {currentStepData.title}
          </h2>

          <p className="font-bold leading-relaxed">
            {currentStepData.description}
          </p>
        </div>

        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              onClick={handlePrev}
              className="px-4 py-2 font-black uppercase text-sm"
              style={{
                backgroundColor: '#FFF',
                border: '3px solid #000',
                boxShadow: '3px 3px 0px #000'
              }}
            >
              {language === 'zh' ? '上一步' : 'Back'}
            </Button>
          )}

          <Button
            onClick={handleNext}
            className="flex-1 py-3 font-black uppercase flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#4ECDC4',
              border: '4px solid #000',
              boxShadow: '4px 4px 0px #000'
            }}
          >
            {currentStep === steps[language].length - 1 ? (
              <>
                <Check className="w-5 h-5" strokeWidth={3} />
                {language === 'zh' ? '完成教程' : 'Finish'}
              </>
            ) : (
              <>
                {language === 'zh' ? '下一步' : 'Next'}
                <ArrowRight className="w-5 h-5" strokeWidth={3} />
              </>
            )}
          </Button>
        </div>

        <button
          onClick={onSkip}
          className="w-full mt-3 py-2 font-bold text-sm"
          style={{ color: '#666' }}
        >
          {language === 'zh' ? '跳过教程' : 'Skip Tutorial'}
        </button>
      </div>

      {/* 高亮指示器 - 根据 target 显示箭头或高亮 */}
      {currentStepData.target !== 'none' && (
        <div
          className="fixed z-[99] pointer-events-none"
          style={{
            top: currentStepData.position === 'bottom' ? '40%' : currentStepData.position === 'top' ? '60%' : '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div
            className="animate-bounce text-6xl"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(255,230,109,0.8))'
            }}
          >
            {currentStepData.position === 'bottom' ? '⬇️' : currentStepData.position === 'top' ? '⬆️' : '👇'}
          </div>
        </div>
      )}
    </>
  );
}