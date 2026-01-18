// 新手教程步骤配置
// 每个步骤包含：目标元素、文本内容、触发条件、预期操作

export const tutorialSteps = [
  {
    id: 'welcome',
    target: null, // 居中显示，无特定目标
    title: {
      zh: '🎊 欢迎来到星陨纪元冒险者协会 🎊',
      en: '🎊 Welcome to Starfall Era Guild 🎊'
    },
    content: {
      zh: '这是一个将日常任务变成史诗冒险的任务管理系统。让我们用1分钟快速了解如何开始你的第一次冒险！',
      en: 'This is a task management system that transforms daily tasks into epic adventures. Let\'s take 1 minute to learn how to start your first quest!'
    },
    placement: 'center',
    action: 'click_next', // 点击"开始教程"按钮
    showSkip: true
  },
  
  {
    id: 'input_task',
    target: '[data-tutorial="task-input"]', // 任务输入框
    title: {
      zh: '📝 输入你的第一个任务',
      en: '📝 Enter Your First Task'
    },
    content: {
      zh: '在这里输入任何日常任务，比如"跑步5km"或"写周报"。我们会自动将它转化为RPG风格的史诗委托！',
      en: 'Enter any daily task here, like "Run 5km" or "Write weekly report". We\'ll automatically transform it into an RPG-style epic quest!'
    },
    placement: 'bottom',
    action: 'input_text', // 等待用户输入文本
    nextTrigger: 'task_input_filled'
  },
  
  {
    id: 'confirm_task',
    target: '[data-tutorial="confirm-tasks-btn"]', // 确认任务按钮
    title: {
      zh: '✅ 确认接取任务',
      en: '✅ Confirm Quest'
    },
    content: {
      zh: '输入完成后，点击"确认接取"按钮，任务就会加入你的委托板！',
      en: 'After entering, click "Confirm" to add the quest to your board!'
    },
    placement: 'top',
    action: 'click_element',
    nextTrigger: 'task_confirmed'
  },
  
  {
    id: 'understand_quest_card',
    target: '[data-tutorial="quest-card"]', // 第一个任务卡片
    title: {
      zh: '🎴 认识你的任务卡',
      en: '🎴 Understanding Quest Cards'
    },
    content: {
      zh: '每个任务都有：\n• RPG风格的标题\n• 难度评级（C/B/A/S/R）\n• 原始任务描述（括号内）\n\n现在让我们试试"启动模式"！',
      en: 'Each quest has:\n• RPG-style title\n• Difficulty rating (C/B/A/S/R)\n• Original task description (in parentheses)\n\nNow let\'s try "Kickstart Mode"!'
    },
    placement: 'right',
    action: 'click_next'
  },
  
  {
    id: 'kickstart_intro',
    target: '[data-tutorial="kickstart-btn"]', // 启动模式按钮
    title: {
      zh: '⚡ 启动模式 - 克服拖延神器',
      en: '⚡ Kickstart Mode - Beat Procrastination'
    },
    content: {
      zh: '当任务让你感到畏惧时，点击这个按钮！它会帮你：\n• 设定一个极小的第一步\n• 用倒计时营造紧迫感\n• 让开始变得超级简单',
      en: 'When a task feels overwhelming, click this!\n• Set a tiny first step\n• Create urgency with countdown\n• Make starting super easy'
    },
    placement: 'left',
    action: 'click_element',
    nextTrigger: 'kickstart_dialog_opened'
  },
  
  {
    id: 'set_minimal_action',
    target: '[data-tutorial="minimal-action-input"]', // 最小行动输入框
    title: {
      zh: '🎯 设定最小行动',
      en: '🎯 Set Minimal Action'
    },
    content: {
      zh: '输入一个超简单的第一步，比如"打开文档"或"穿上跑鞋"。越简单越好！',
      en: 'Enter a super simple first step, like "Open document" or "Put on running shoes". The simpler, the better!'
    },
    placement: 'bottom',
    action: 'input_text',
    nextTrigger: 'minimal_action_filled'
  },
  
  {
    id: 'set_duration',
    target: '[data-tutorial="duration-slider"]', // 时长滑块
    title: {
      zh: '⏱️ 设定倒计时时长',
      en: '⏱️ Set Countdown Duration'
    },
    content: {
      zh: '拖动滑块选择倒计时时长（建议5-15分钟）。倒计时会给你紧迫感，帮助你立即行动！',
      en: 'Drag the slider to set duration (5-15 min recommended). The countdown creates urgency to start now!'
    },
    placement: 'bottom',
    action: 'interact',
    nextTrigger: 'duration_set'
  },
  
  {
    id: 'start_countdown',
    target: '[data-tutorial="kickstart-confirm-btn"]', // 立即启动按钮
    title: {
      zh: '🚀 开始倒计时',
      en: '🚀 Start Countdown'
    },
    content: {
      zh: '点击"立即启动"，倒计时就会开始！屏幕上会出现一个悬浮的倒计时器，提醒你马上行动。',
      en: 'Click "Start Now" to begin the countdown! A floating timer will appear to remind you to take action.'
    },
    placement: 'top',
    action: 'click_element',
    nextTrigger: 'countdown_started'
  },
  
  {
    id: 'complete_task',
    target: '[data-tutorial="complete-btn"]', // 完成按钮
    title: {
      zh: '✨ 完成任务',
      en: '✨ Complete Quest'
    },
    content: {
      zh: '当你完成任务后，点击这个按钮标记为完成。协会的高层会亲自为你撰写表扬信！',
      en: 'When you finish the quest, click here to mark it complete. Guild leaders will personally write commendation for you!'
    },
    placement: 'left',
    action: 'click_element',
    nextTrigger: 'task_completed'
  },
  
  {
    id: 'praise_system',
    target: null, // 表扬对话框会自动弹出
    title: {
      zh: '🎖️ 协会表彰系统',
      en: '🎖️ Guild Recognition'
    },
    content: {
      zh: '每次完成任务，协会的某位高层（骑士团长、智者、书记官等）会为你写一段专属的表扬。这不仅是奖励，更是对你努力的真诚认可！',
      en: 'After completing each quest, a guild leader (Knight Commander, Sage, Scribe, etc.) will write personalized praise for you. It\'s sincere recognition of your effort!'
    },
    placement: 'center',
    action: 'click_next'
  },
  
  {
    id: 'tutorial_complete',
    target: null,
    title: {
      zh: '🎉 教程完成！',
      en: '🎉 Tutorial Complete!'
    },
    content: {
      zh: '恭喜！你已经掌握了基本操作。\n\n还有更多功能等你探索：\n• 大项目规划 - 智能分配长期任务\n• 深度休息 - 真正的能量恢复\n• 每日宝箱 - 完成任务获得战利品\n• 连胜系统 - 保持动力的秘密武器\n\n现在，开始你的冒险吧！',
      en: 'Congratulations! You\'ve mastered the basics.\n\nMore features to explore:\n• Long-term Planning - Smart task distribution\n• Deep Rest - True energy recovery\n• Daily Chest - Earn loot from quests\n• Streak System - Secret weapon for motivation\n\nNow, start your adventure!'
    },
    placement: 'center',
    action: 'complete_tutorial',
    showSkip: false
  }
];

// 教程步骤依赖关系（用于验证流程完整性）
export const stepDependencies = {
  'confirm_task': ['input_task'],
  'understand_quest_card': ['confirm_task'],
  'kickstart_intro': ['understand_quest_card'],
  'set_minimal_action': ['kickstart_intro'],
  'set_duration': ['set_minimal_action'],
  'start_countdown': ['set_duration'],
  'complete_task': ['start_countdown'],
  'praise_system': ['complete_task'],
  'tutorial_complete': ['praise_system']
};

// 触发器类型说明
export const triggerTypes = {
  'task_input_filled': '任务输入框有内容',
  'task_confirmed': '点击确认按钮后任务创建成功',
  'kickstart_dialog_opened': '启动模式对话框打开',
  'minimal_action_filled': '最小行动输入框有内容',
  'duration_set': '时长滑块被调整',
  'countdown_started': '倒计时已启动',
  'task_completed': '任务被标记为完成',
  'praise_dialog_closed': '表扬对话框关闭'
};