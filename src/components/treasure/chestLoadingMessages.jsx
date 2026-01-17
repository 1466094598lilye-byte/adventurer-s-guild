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
        { text: '骑士团长亲自为你挑选战利品', duration: 2000 },
        { text: '在荣誉殿堂中搜寻...', duration: 2000 },
        { text: '这份奖励,必须配得上你的勇气', duration: 2000 },
        { text: '即将为你授勋', duration: 2000 },
        { text: '这枚勋章有点沉,但你扛得住', duration: 2000 },
        { text: '骑士团长坚持要给你最好的...再等1秒!', duration: 2000 }
      ],
      en: [
        { text: 'Selecting your trophy...', duration: 2000 },
        { text: 'Searching the hall...', duration: 2000 },
        { text: 'Must match your courage...', duration: 2000 },
        { text: 'Your medal awaits...', duration: 2000 },
        { text: "Heavy medal, you'll carry it!", duration: 2000 },
        { text: 'Finding the best one...', duration: 2000 }
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
        { text: '协会总管正在为你调配资源', duration: 2000 },
        { text: '清点库存...核对品质...', duration: 2000 },
        { text: '你的努力值得实打实的回报', duration: 2000 },
        { text: '正在打包,保证完好送达', duration: 2000 },
        { text: '总管在做最后检查...不能有瑕疵', duration: 2000 },
        { text: '协会总管翻遍了仓库...马上找到!', duration: 2000 }
      ],
      en: [
        { text: 'Steward checking the vault...', duration: 2000 },
        { text: 'Inspecting quality...', duration: 2000 },
        { text: 'You earned real value...', duration: 2000 },
        { text: 'Wrapping it up...', duration: 2000 },
        { text: 'Final inspection...', duration: 2000 },
        { text: 'Almost found it!', duration: 2000 }
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
        { text: '书记官正在奖品库为你挑选', duration: 2000 },
        { text: '这个包装不够精致...那个呢...', duration: 2000 },
        { text: '找到几个不错的,让我再看看细节...', duration: 2000 },
        { text: '这份奖励的质感正好', duration: 2000 },
        { text: '书记官在检查每个角落...不能有瑕疵', duration: 2000 },
        { text: '等等,刚才那个好像更有韵味...', duration: 2000 }
      ],
      en: [
        { text: 'Scribe browsing the vault...', duration: 2000 },
        { text: 'Checking each detail...', duration: 2000 },
        { text: 'Found some, examining closer...', duration: 2000 },
        { text: 'Perfect texture found...', duration: 2000 },
        { text: 'Inspecting every corner...', duration: 2000 },
        { text: 'Wait, the other one...', duration: 2000 }
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
        { text: '智者正在奖品库为你寻找', duration: 2000 },
        { text: '拿起这个...感知一下...不是它...', duration: 2000 },
        { text: '这个气场更适合你...让我确认一下...', duration: 2000 },
        { text: '找到了一个很有深意的', duration: 2000 },
        { text: '智者闭眼感应...想确定是不是最合适的', duration: 2000 },
        { text: '直觉告诉我...还有更好的在某个角落!', duration: 2000 }
      ],
      en: [
        { text: 'Sage searching the vault...', duration: 2000 },
        { text: 'Sensing... not this one...', duration: 2000 },
        { text: 'This aura fits you...', duration: 2000 },
        { text: 'Found something meaningful...', duration: 2000 },
        { text: 'Confirming through intuition...', duration: 2000 },
        { text: 'Intuition says keep looking...', duration: 2000 }
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
        { text: '大长老正在奖品库为你挑选', duration: 2000 },
        { text: '从这排货架看起...一个个检查...', duration: 2000 },
        { text: '这个分量不错...那个也可以...再看看...', duration: 2000 },
        { text: '长老拿起一份,掂了掂,又放回去...', duration: 2000 },
        { text: '长老动作慢,但坚持要亲手过目每一个', duration: 2000 },
        { text: '大长老说:急不得,值得的东西在深处!', duration: 2000 }
      ],
      en: [
        { text: 'Elder browsing the vault...', duration: 2000 },
        { text: 'Checking shelf by shelf...', duration: 2000 },
        { text: 'Weighing each option carefully...', duration: 2000 },
        { text: 'Considering the weight...', duration: 2000 },
        { text: 'Elder inspects each one...', duration: 2000 },
        { text: 'Best things take time...', duration: 2000 }
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
        { text: '战术大师正在装备库为你调取奖励', duration: 2000 },
        { text: '扫描A区...B区...看看C区有什么...', duration: 2000 },
        { text: '找到三个候选,正在对比数据...', duration: 2000 },
        { text: '这个效能值最高,就它了', duration: 2000 },
        { text: '大师在做最后的精度校准...', duration: 2000 },
        { text: '系统显示还有更优解...重新检索!', duration: 2000 }
      ],
      en: [
        { text: 'Tactician scanning inventory...', duration: 2000 },
        { text: 'Scanning sectors A, B...', duration: 2000 },
        { text: 'Comparing three candidates...', duration: 2000 },
        { text: 'Highest efficiency found...', duration: 2000 },
        { text: 'Calibrating precision...', duration: 2000 },
        { text: 'Recalculating optimal choice...', duration: 2000 }
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