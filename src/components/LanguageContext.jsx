import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('zh');

  useEffect(() => {
    const savedLang = localStorage.getItem('adventurerLanguage');
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  const switchLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('adventurerLanguage', lang);
  };

  const translations = {
    zh: {
      nav_questboard: '委托板',
      nav_journal: '冒险日志',
      nav_treasures: '宝物库',
      nav_profile: '冒险者',
      
      praise_title: '工会表彰',
      praise_guild_reviewing: '工会正在审阅你的委托报告...',
      praise_add_review: '记入复盘',
      
      chest_title: '每日宝箱',
      chest_congrats: '恭喜完成今日所有委托！',
      chest_open_btn: '开启宝箱',
      chest_opening: '开启中...',
      chest_collect: '收入囊中',
      chest_freeze_token: '冻结券',
      chest_freeze_pity: '连续60次开箱保底触发！',
      chest_freeze_lucky: '幸运抽中！',
      
      rarity_common: '普通',
      rarity_rare: '稀有',
      rarity_epic: '史诗',
      rarity_legendary: '传说',
      
      common_confirm: '确认',
      common_cancel: '取消',
      
      profile_title: '冒险者档案',
      profile_streak: '连胜',
      profile_longest: '最长',
      profile_freeze_tokens: '冻结券',
      profile_language: '语言设置',
      profile_chinese: '中文',
      profile_english: 'English'
    },
    en: {
      nav_questboard: 'Quest Board',
      nav_journal: 'Journal',
      nav_treasures: 'Treasures',
      nav_profile: 'Profile',
      
      praise_title: 'Guild Recognition',
      praise_guild_reviewing: 'The Guild is reviewing your quest report...',
      praise_add_review: 'Add to Review',
      
      chest_title: 'Daily Chest',
      chest_congrats: 'Congratulations on completing all quests today!',
      chest_open_btn: 'Open Chest',
      chest_opening: 'Opening...',
      chest_collect: 'Collect',
      chest_freeze_token: 'Freeze Token',
      chest_freeze_pity: '60-chest pity triggered!',
      chest_freeze_lucky: 'Lucky drop!',
      
      rarity_common: 'Common',
      rarity_rare: 'Rare',
      rarity_epic: 'Epic',
      rarity_legendary: 'Legendary',
      
      common_confirm: 'Confirm',
      common_cancel: 'Cancel',
      
      profile_title: 'Adventurer Profile',
      profile_streak: 'Streak',
      profile_longest: 'Longest',
      profile_freeze_tokens: 'Freeze Tokens',
      profile_language: 'Language',
      profile_chinese: '中文',
      profile_english: 'English'
    }
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}