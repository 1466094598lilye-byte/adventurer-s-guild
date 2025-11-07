
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
      // Navigation
      nav_questboard: '委托板',
      nav_journal: '冒险日志',
      nav_treasures: '宝物库',
      nav_profile: '冒险者',
      
      // Quest Board
      questboard_title: '委托板',
      questboard_date: '年月日',
      questboard_input_placeholder: '输入今日任务，如：跑步5km',
      questboard_longterm_btn: '大项目规划',
      questboard_longterm_hint: '用于粘贴长期计划，冒险者工会将自动分配到每日委托板',
      questboard_calendar_btn: '限时活动日程表！',
      questboard_calendar_hint: '点击查看所有大项目任务的时间安排',
      questboard_pending_title: '待确认任务',
      questboard_confirm_btn: '确认接取',
      questboard_filter_all: '全部',
      questboard_filter_todo: '未完成',
      questboard_filter_done: '已完成',
      questboard_no_quests: '暂无委托',
      questboard_no_quests_hint: '使用文本输入添加今日任务',
      questboard_rest_day: '今日为工会休息日',
      questboard_rest_day_hint: '连胜不会中断，但也不会累积',
      questboard_set_rest: '设为工会休息日',
      questboard_cancel_rest: '取消工会休息日',
      questboard_planned_quests: '工会已登记明日',
      questboard_plan_tomorrow: '规划明日委托',
      
      // Treasures
      treasures_title: '宝物收藏',
      treasures_collected: '共收集',
      treasures_items: '件战利品',
      treasures_stats: '稀有度统计',
      treasures_filter_all: '全部',
      treasures_page: '第',
      treasures_page_of: '页（共',
      treasures_page_items: '件）',
      treasures_prev: '上一页',
      treasures_next: '下一页',

      // Journal
      journal_title: '冒险日志',
      journal_current_streak: '当前连胜',
      journal_longest_streak: '最长连胜',
      journal_freeze_tokens: '冻结券',
      journal_freeze_hint: '可跳过一次不清空任务，保持连胜不中断',
      journal_milestone_7: '7天 - 奖励1张冻结券',
      journal_milestone_21: '21天 - 奖励2张冻结券',
      journal_milestone_30: '30天 - 奖励3张冻结券',
      journal_completion_trend: '完成率趋势',
      journal_legend_complete: '100% 完美',
      journal_legend_partial: '50-99% 良好',
      journal_legend_incomplete: '<50% 待提升',
      journal_days: '天',
      
      // Profile
      profile_title: '冒险者档案',
      profile_current_streak: '连胜',
      profile_longest_streak: '最长',
      profile_freeze_tokens: '冻结券',
      profile_freeze_tokens_hint: '可跳过一次不清空任务，保持连胜不中断',
      profile_guild_title: '工会称号',
      profile_no_title: '暂无称号',
      profile_title_hint: '达成连胜里程碑解锁专属称号',
      profile_settings: '⚙️ 设置',
      profile_language: '语言',
      profile_chinese: '中文',
      profile_english: 'English',
      profile_milestones: '🏆 连胜里程碑',
      profile_milestone_locked: '未解锁',
      profile_milestone_7: '7天连胜',
      profile_milestone_7_reward: '解锁「新秀冒险家」称号 + 1张冻结券',
      profile_milestone_21: '21天连胜',
      profile_milestone_21_reward: '解锁「精英挑战者」称号 + 2张冻结券',
      profile_milestone_50: '50天连胜',
      profile_milestone_50_reward: '解锁「连胜大师」称号 + 3张冻结券',
      profile_milestone_100: '100天连胜',
      profile_milestone_100_reward: '解锁「传奇不灭」称号 + 5张冻结券',
      profile_chest_pity: '宝箱保底机制',
      profile_chest_pity_desc: '连续开启60个宝箱必得1张冻结券',
      profile_chest_counter: '当前进度',
      
      // Praise Dialog
      praise_title: '工会表彰',
      praise_guild_reviewing: '工会正在审阅你的委托报告...',
      praise_add_review: '记入复盘',
      
      // Chest
      chest_title: '每日宝箱',
      chest_congrats: '恭喜完成今日所有委托！',
      chest_open_btn: '开启宝箱',
      chest_opening: '开启中...',
      chest_collect: '收入囊中',
      chest_freeze_token: '冻结券',
      chest_freeze_pity: '连续60次开箱保底触发！',
      chest_freeze_lucky: '幸运抽中！',
      
      // Rarity
      rarity_common: '普通',
      rarity_rare: '稀有',
      rarity_epic: '史诗',
      rarity_legendary: '传说',
      
      // Common
      common_confirm: '确认',
      common_cancel: '取消',
      common_items: '项'
    },
    en: {
      // Navigation
      nav_questboard: 'Quest Board',
      nav_journal: 'Journal',
      nav_treasures: 'Treasures',
      nav_profile: 'Profile',
      
      // Quest Board
      questboard_title: 'Quest Board',
      questboard_date: 'Date',
      questboard_input_placeholder: 'Enter today\'s quest, e.g.: Run 5km',
      questboard_longterm_btn: 'Long-term Project Planning',
      questboard_longterm_hint: 'Paste long-term plans, the Guild will automatically distribute them to daily quests',
      questboard_calendar_btn: 'Limited Event Schedule!',
      questboard_calendar_hint: 'Click to view all long-term project task schedules',
      questboard_pending_title: 'Pending Quests',
      questboard_confirm_btn: 'Confirm & Accept',
      questboard_filter_all: 'All',
      questboard_filter_todo: 'Todo',
      questboard_filter_done: 'Done',
      questboard_no_quests: 'No Quests',
      questboard_no_quests_hint: 'Use text input to add today\'s quests',
      questboard_rest_day: 'Today is Guild Rest Day',
      questboard_rest_day_hint: 'Streak won\'t break, but won\'t accumulate either',
      questboard_set_rest: 'Set as Guild Rest Day',
      questboard_cancel_rest: 'Cancel Guild Rest Day',
      questboard_planned_quests: 'Guild has registered',
      questboard_plan_tomorrow: 'Plan Tomorrow\'s Quests',
      
      // Treasures
      treasures_title: 'Treasure Collection',
      treasures_collected: 'Collected',
      treasures_items: 'items',
      treasures_stats: 'Rarity Statistics',
      treasures_filter_all: 'All',
      treasures_page: 'Page',
      treasures_page_of: 'of',
      treasures_page_items: 'items',
      treasures_prev: 'Previous',
      treasures_next: 'Next',
      
      // Journal
      journal_title: 'Adventure Journal',
      journal_current_streak: 'Current Streak',
      journal_longest_streak: 'Longest Streak',
      journal_freeze_tokens: 'Freeze Tokens',
      journal_freeze_hint: 'Skip once without breaking streak',
      journal_milestone_7: '7 Days - Reward: 1 Freeze Token',
      journal_milestone_21: '21 Days - Reward: 2 Freeze Tokens',
      journal_milestone_30: '30 Days - Reward: 3 Freeze Tokens',
      journal_completion_trend: 'Completion Trend',
      journal_legend_complete: '100% Perfect',
      journal_legend_partial: '50-99% Good',
      journal_legend_incomplete: '<50% Needs Work',
      journal_days: 'Days',
      
      // Profile
      profile_title: 'Adventurer Profile',
      profile_current_streak: 'Streak',
      profile_longest_streak: 'Longest',
      profile_freeze_tokens: 'Freeze Tokens',
      profile_freeze_tokens_hint: 'Skip once without breaking streak',
      profile_guild_title: 'Guild Title',
      profile_no_title: 'No Title Yet',
      profile_title_hint: 'Unlock exclusive titles by reaching streak milestones',
      profile_settings: '⚙️ Settings',
      profile_language: 'Language',
      profile_chinese: '中文',
      profile_english: 'English',
      profile_milestones: '🏆 Streak Milestones',
      profile_milestone_locked: 'Locked',
      profile_milestone_7: '7-Day Streak',
      profile_milestone_7_reward: 'Unlock "Rising Adventurer" + 1 Freeze Token',
      profile_milestone_21: '21-Day Streak',
      profile_milestone_21_reward: 'Unlock "Elite Challenger" + 2 Freeze Tokens',
      profile_milestone_50: '50-Day Streak',
      profile_milestone_50_reward: 'Unlock "Streak Master" + 3 Freeze Tokens',
      profile_milestone_100: '100-Day Streak',
      profile_milestone_100_reward: 'Unlock "Eternal Legend" + 5 Freeze Tokens',
      profile_chest_pity: 'Chest Pity System',
      profile_chest_pity_desc: 'Guaranteed 1 Freeze Token every 60 chests',
      profile_chest_counter: 'Current Progress',
      
      // Praise Dialog
      praise_title: 'Guild Recognition',
      praise_guild_reviewing: 'The Guild is reviewing your quest report...',
      praise_add_review: 'Add to Review',
      
      // Chest
      chest_title: 'Daily Chest',
      chest_congrats: 'Congratulations on completing all quests today!',
      chest_open_btn: 'Open Chest',
      chest_opening: 'Opening...',
      chest_collect: 'Collect',
      chest_freeze_token: 'Freeze Token',
      chest_freeze_pity: '60-chest pity triggered!',
      chest_freeze_lucky: 'Lucky drop!',
      
      // Rarity
      rarity_common: 'Common',
      rarity_rare: 'Rare',
      rarity_epic: 'Epic',
      rarity_legendary: 'Legendary',
      
      // Common
      common_confirm: 'Confirm',
      common_cancel: 'Cancel',
      common_items: 'items'
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
