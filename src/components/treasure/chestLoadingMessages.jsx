// 宝箱开启缓冲期间的动态加载文案
// 每个角色有6条文案，每条持续2秒

export const chestLoadingMessages = {
  knight: {
    icon: '⚔️',
    name: {
      zh: '荣誉骑士团长',
      en: 'Honor Knight Commander'
    },
    messages: {
      zh: [
        { text: '宝箱正在共鸣你的勇气...', duration: 2000 },
        { text: '骑士团长听到了宝箱的震动', duration: 2000 },
        { text: '里面的奖励,正在觉醒...', duration: 2000 },
        { text: '还没好,再等等...', duration: 2000 },
        { text: '这个宝箱有点倔,在酝酿...', duration: 2000 },
        { text: '再等等,它快决定了!', duration: 2000 }
      ],
      en: [
        { text: 'Chest resonating with courage...', duration: 2000 },
        { text: 'Knight hears the rumbling...', duration: 2000 },
        { text: 'Reward awakening inside...', duration: 2000 },
        { text: 'Not yet, hold on...', duration: 2000 },
        { text: 'Stubborn chest, still brewing...', duration: 2000 },
        { text: 'Almost decided now!', duration: 2000 }
      ]
    }
  },
  
  manager: {
    icon: '🏛️',
    name: {
      zh: '协会总管',
      en: 'Guild Steward'
    },
    messages: {
      zh: [
        { text: '宝箱正在运转内部机关...', duration: 2000 },
        { text: '总管靠近,观察宝箱的反应', duration: 2000 },
        { text: '齿轮转动...水晶发光...', duration: 2000 },
        { text: '还在随机抽取中', duration: 2000 },
        { text: '这个宝箱的机关有点复杂...', duration: 2000 },
        { text: '概率计算中...快了!', duration: 2000 }
      ],
      en: [
        { text: "Chest's mechanism activating...", duration: 2000 },
        { text: 'Steward observing the chest...', duration: 2000 },
        { text: 'Gears turning, crystals glowing...', duration: 2000 },
        { text: 'Still randomizing...', duration: 2000 },
        { text: 'Complex mechanism inside...', duration: 2000 },
        { text: 'Calculating odds...', duration: 2000 }
      ]
    }
  },
  
  scribe: {
    icon: '📜',
    name: {
      zh: '首席史诗书记官',
      en: 'Chief Epic Chronicler'
    },
    messages: {
      zh: [
        { text: '宝箱正在书写它的故事...', duration: 2000 },
        { text: '书记官侧耳倾听箱内的低语', duration: 2000 },
        { text: '命运的笔尖,正在落下...', duration: 2000 },
        { text: '它在斟酌结局', duration: 2000 },
        { text: '这个故事还没写完...', duration: 2000 },
        { text: '最后一笔...就要落下了', duration: 2000 }
      ],
      en: [
        { text: 'Chest writing its story...', duration: 2000 },
        { text: 'Scribe listening to whispers...', duration: 2000 },
        { text: "Fate's pen is falling...", duration: 2000 },
        { text: 'Choosing the ending...', duration: 2000 },
        { text: 'Story not finished yet...', duration: 2000 },
        { text: 'Final stroke coming...', duration: 2000 }
      ]
    }
  },
  
  sage: {
    icon: '🔮',
    name: {
      zh: '神秘智者',
      en: 'Mystic Sage'
    },
    messages: {
      zh: [
        { text: '宝箱正在感应你的气场...', duration: 2000 },
        { text: '智者闭眼,它在做决定', duration: 2000 },
        { text: '命运的丝线,正在交织...', duration: 2000 },
        { text: '结果尚未明晰', duration: 2000 },
        { text: '宝箱在犹豫...或者在逗你玩?', duration: 2000 },
        { text: '预言显示...即将揭晓', duration: 2000 }
      ],
      en: [
        { text: 'Chest sensing your aura...', duration: 2000 },
        { text: 'Sage closes eyes, deciding...', duration: 2000 },
        { text: 'Threads of fate weaving...', duration: 2000 },
        { text: 'Outcome still unclear...', duration: 2000 },
        { text: 'Chest hesitating... or teasing?', duration: 2000 },
        { text: 'Vision shows... soon.', duration: 2000 }
      ]
    }
  },
  
  elder: {
    icon: '👑',
    name: {
      zh: '大长老',
      en: 'Grand Elder'
    },
    messages: {
      zh: [
        { text: '古老的宝箱,正在苏醒...', duration: 2000 },
        { text: '长老抚摸箱盖,它在思考', duration: 2000 },
        { text: '这个宝箱,见证过无数冒险者...', duration: 2000 },
        { text: '它在回忆该给你什么', duration: 2000 },
        { text: '古老的魔法,需要时间...', duration: 2000 },
        { text: '它的记忆太长了...稍等', duration: 2000 }
      ],
      en: [
        { text: 'Ancient chest awakening...', duration: 2000 },
        { text: 'Elder touches lid, thinking...', duration: 2000 },
        { text: 'Chest has seen many...', duration: 2000 },
        { text: 'Recalling your gift...', duration: 2000 },
        { text: 'Ancient magic takes time...', duration: 2000 },
        { text: 'Long memory... wait.', duration: 2000 }
      ]
    }
  },
  
  tactician: {
    icon: '🎯',
    name: {
      zh: '战术大师',
      en: 'Master Tactician'
    },
    messages: {
      zh: [
        { text: '宝箱的随机系统正在启动...', duration: 2000 },
        { text: '大师观察概率波动', duration: 2000 },
        { text: '随机算法运行中...', duration: 2000 },
        { text: '还在计算随机数', duration: 2000 },
        { text: '量子态还未坍缩...', duration: 2000 },
        { text: '概率云即将收束!', duration: 2000 }
      ],
      en: [
        { text: 'Randomizer system booting...', duration: 2000 },
        { text: 'Tactician tracking probability waves...', duration: 2000 },
        { text: 'Random algorithm running...', duration: 2000 },
        { text: 'Calculating random number...', duration: 2000 },
        { text: 'Quantum state unresolved...', duration: 2000 },
        { text: 'Probability cloud collapsing!', duration: 2000 }
      ]
    }
  }
};

// 获取随机角色的辅助函数
export function getRandomRole() {
  const roles = Object.keys(chestLoadingMessages);
  const randomIndex = Math.floor(Math.random() * roles.length);
  return roles[randomIndex];
}