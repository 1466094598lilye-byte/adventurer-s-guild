import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
  zh: {
    // Navigation
    nav_questboard: '委托板',
    nav_journal: '日志',
    nav_treasures: '宝物',
    nav_profile: '我',
    
    // Quest Board
    questboard_title: '⚔️ 委托板 ⚔️',
    questboard_rest_day: '今日为工会休息日',
    questboard_rest_day_desc: '连胜不会中断，但也不会累积',
    questboard_input_placeholder: '输入今日任务，如：跑步5km',
    questboard_long_term_btn: '大项目规划',
    questboard_long_term_hint: '💡 用于粘贴长期计划，冒险者工会将自动分配到每日委托板',
    questboard_pending_tasks: '待确认任务',
    questboard_task_content: '任务内容：',
    questboard_difficulty: '难度评级：',
    questboard_delete_task: '删除此任务',
    questboard_confirm_accept: '确认接取',
    questboard_confirming: '正在添加...',
    questboard_calendar_btn: '限时活动日程表！',
    questboard_calendar_hint: '点击查看所有大项目任务的时间安排',
    questboard_planned_tomorrow: '工会已登记明日',
    questboard_plan_tomorrow_btn: '规划明日委托',
    questboard_filter_all: '全部',
    questboard_filter_todo: '未完成',
    questboard_filter_done: '已完成',
    questboard_no_quests: '暂无委托',
    questboard_no_quests_hint: '使用文本输入添加今日任务',
    questboard_rest_day_btn: '设为工会休息日',
    questboard_cancel_rest_btn: '取消工会休息日',
    questboard_rest_day_cant: '💡 今日有任务，无法设为休息日。',
    
    // Common
    common_loading: '加载中...',
    common_cancel: '取消',
    common_confirm: '确认',
    common_save: '保存',
    common_edit: '编辑',
    common_delete: '删除',
    common_close: '关闭',
    common_back: '返回',
    common_next: '下一步',
    common_prev_page: '上一页',
    common_next_page: '下一页',
    common_items: '项委托',
    
    // Difficulty
    difficulty_C: 'C',
    difficulty_B: 'B', 
    difficulty_A: 'A',
    difficulty_S: 'S',
    
    // Rarity
    rarity_common: '普通',
    rarity_rare: '稀有',
    rarity_epic: '史诗',
    rarity_legendary: '传说',
    
    // Praise Dialog
    praise_title: '委托完成！',
    praise_guild_reviewing: '工会评议官正在记录中...',
    praise_add_review: '添加复盘',
    
    // Chest Opening
    chest_title: '今日宝箱',
    chest_congrats: '恭喜！你完成了今天所有委托！',
    chest_open_btn: '打开宝箱',
    chest_opening: '开启中...',
    chest_freeze_token: '冻结券',
    chest_freeze_pity: '🎊 保底触发！你已累积开启60个宝箱，获得保底冻结券！',
    chest_freeze_lucky: '恭喜！你在宝箱中发现了稀有的冻结券！',
    chest_collect: '收入背包',
    
    // Long Term Project
    longterm_title: '🎯 大项目规划 🎯',
    longterm_subtitle: '粘贴你的长期计划，冒险者工会将自动分配到每日委托板',
    longterm_placeholder: '粘贴你的长期计划...\n\n例如：\n周一：完成项目方案设计\n周二：与团队讨论方案\n周三：修改并提交方案\n12月25日：准备年终总结',
    longterm_parse_btn: '开始解析',
    longterm_parsing: '工会管理员正在更新委托板...',
    longterm_found: '识别到',
    longterm_epic_quests: '项史诗委托',
    longterm_re_input: '重新输入',
    longterm_date: '日期：',
    longterm_title_label: 'RPG 史诗标题：',
    longterm_content_label: '原始任务内容：',
    longterm_done_edit: '完成编辑',
    longterm_confirm_btn: '确认并添加到委托板',
    longterm_adding: '正在添加到委托板...',
    
    // Treasures
    treasures_title: '💎 宝物收藏 💎',
    treasures_total: '共收集',
    treasures_pieces: '件战利品',
    treasures_empty_title: '宝库尚未开启',
    treasures_empty_welcome: '冒险者，欢迎来到工会宝库！',
    treasures_empty_desc1: '每当你完成一天的所有委托，就能开启当日的神秘宝箱，获得珍贵的战利品。这些宝物不仅是你努力的见证，更可能带来意想不到的奖励。',
    treasures_empty_desc2: '从今天开始，完成任务清单，开启你的第一个宝箱吧！✨',
    treasures_goto_board: '前往委托板',
    treasures_rarity_stats: '稀有度统计',
    treasures_no_rarity: '暂无该稀有度的宝物',
    treasures_obtained_at: '获得于',
    
    // Journal  
    journal_title: '📖 冒险日志 📖',
    journal_completion_trend: '完成率趋势',
    journal_no_data: '暂无数据',
    journal_perfect: '100% 完美',
    journal_good: '50-99% 良好',
    journal_need_improve: '<50% 待提升',
    journal_no_records: '暂无记录',
    journal_no_records_hint: '完成任务后会在此显示',
    journal_days: '天',
    
    // Profile
    profile_title: '👤 冒险者档案 👤',
    profile_current_streak: '当前连胜',
    profile_longest_streak: '最长连胜',
    profile_freeze_tokens: '冻结券',
    profile_guild_title: '工会称号',
    profile_no_title: '暂无称号',
    profile_settings: '⚙️ 设置',
    profile_language: '语言',
    profile_logout: '登出',
    
    // Milestones
    milestone_achieved: '🎊 里程碑达成！🎊',
    milestone_days_streak: '天连胜',
    milestone_congrats: '恭喜你达成',
    milestone_congrats_suffix: '天连续完成任务的非凡成就！',
    milestone_title_badge: '称号',
    milestone_collect: '收入囊中',
    
    // Planning
    planning_title_celebrate: '🎊 今日圆满 🎊',
    planning_title_plan: '📋 规划明日 📋',
    planning_tomorrow_total: '📋 明日委托总数：',
    planning_routine_count: '项每日修炼',
    planning_temp_count: '项临时任务',
    planning_routine_title: '每日修炼（自动出现）',
    planning_routine_hint: '💡 这些任务每天自动出现，无需单独规划',
    planning_plan_temp: '规划明日临时任务',
    planning_input_placeholder: '输入明天的任务...',
    planning_add_manual: '手动添加任务',
    planning_confirm_plan: '确认登记',
    planning_close: '关闭',
    
    // Quest Edit
    questedit_title: '✏️ 编辑委托 ✏️',
    questedit_current_title: '当前RPG任务名',
    questedit_current_difficulty: '当前难度评级',
    questedit_difficulty_keep: '修改任务内容时评级保持不变',
    questedit_content_label: '任务内容',
    questedit_content_placeholder: '例如：跑步5km',
    questedit_content_hint: '💡 保存后AI将重新生成RPG风格的任务名称（难度评级保持不变）',
    questedit_routine: '设为每日修炼',
    questedit_routine_desc: '勾选后，此任务将每天自动出现在任务板上',
    questedit_saving: '保存中...',
    
    // Quest Card
    questcard_reopen: '返回待办',
    questcard_reopen_confirm_title: '撤回完成报告？',
    questcard_reopen_confirm_desc: '此委托将恢复至待办状态',
    questcard_confirm_reopen: '确认撤回',
    
    // Toast messages
    toast_tasks_carried: '昨日',
    toast_tasks_carried_suffix: '项委托已顺延至今日',
    toast_loaded_planned: '已加载',
    toast_loaded_planned_suffix: '项预先规划的委托',
    toast_routine_created: '成功创建今日每日修炼任务',
    toast_task_added: '已添加任务，工会休息日已自动取消',
    toast_rest_cancelled: '工会休憩已止，委托板重现光辉，新的挑战随时恭候。',
    toast_rest_activated: '冒险者，你最近的英勇表现值得赞颂！工会为你特批今日休憩，在安宁中恢复，为下一次远征积蓄力量。',
    
    // Role names for praise
    role_elder: '大长老',
    role_chronicler: '首席史诗书记官',
    role_knight: '荣誉骑士团长',
    role_sage: '神秘智者',
    role_steward: '工会总管',
    role_tactician: '战术大师',
  },
  
  en: {
    // Navigation
    nav_questboard: 'Quests',
    nav_journal: 'Journal',
    nav_treasures: 'Treasures',
    nav_profile: 'Profile',
    
    // Quest Board
    questboard_title: '⚔️ Quest Board ⚔️',
    questboard_rest_day: "Today is Guild's Rest Day",
    questboard_rest_day_desc: 'Streak won\'t break, but won\'t accumulate either',
    questboard_input_placeholder: 'Enter today\'s task, e.g.: Run 5km',
    questboard_long_term_btn: 'Long-term Project',
    questboard_long_term_hint: '💡 Paste your long-term plan, the Guild will automatically assign to daily quests',
    questboard_pending_tasks: 'Pending Tasks',
    questboard_task_content: 'Task Content:',
    questboard_difficulty: 'Difficulty Rating:',
    questboard_delete_task: 'Delete This Task',
    questboard_confirm_accept: 'Confirm & Accept',
    questboard_confirming: 'Adding...',
    questboard_calendar_btn: 'Limited Event Schedule!',
    questboard_calendar_hint: 'Click to view all long-term project schedules',
    questboard_planned_tomorrow: 'Guild has registered',
    questboard_plan_tomorrow_btn: 'Plan Tomorrow',
    questboard_filter_all: 'All',
    questboard_filter_todo: 'Todo',
    questboard_filter_done: 'Done',
    questboard_no_quests: 'No Quests',
    questboard_no_quests_hint: 'Use text input to add today\'s tasks',
    questboard_rest_day_btn: 'Set as Rest Day',
    questboard_cancel_rest_btn: 'Cancel Rest Day',
    questboard_rest_day_cant: '💡 Cannot set as rest day with active quests.',
    
    // Common
    common_loading: 'Loading...',
    common_cancel: 'Cancel',
    common_confirm: 'Confirm',
    common_save: 'Save',
    common_edit: 'Edit',
    common_delete: 'Delete',
    common_close: 'Close',
    common_back: 'Back',
    common_next: 'Next',
    common_prev_page: 'Previous',
    common_next_page: 'Next',
    common_items: ' quests',
    
    // Difficulty
    difficulty_C: 'C',
    difficulty_B: 'B',
    difficulty_A: 'A',
    difficulty_S: 'S',
    
    // Rarity
    rarity_common: 'Common',
    rarity_rare: 'Rare',
    rarity_epic: 'Epic',
    rarity_legendary: 'Legendary',
    
    // Praise Dialog
    praise_title: 'Quest Completed!',
    praise_guild_reviewing: 'Guild council is documenting your achievement...',
    praise_add_review: 'Add Review',
    
    // Chest Opening
    chest_title: "Today's Chest",
    chest_congrats: 'Congratulations! You completed all of today\'s quests!',
    chest_open_btn: 'Open Chest',
    chest_opening: 'Opening...',
    chest_freeze_token: 'Freeze Token',
    chest_freeze_pity: '🎊 Pity Triggered! You\'ve opened 60 chests, guaranteed Freeze Token!',
    chest_freeze_lucky: 'Congratulations! You found a rare Freeze Token in the chest!',
    chest_collect: 'Collect',
    
    // Long Term Project
    longterm_title: '🎯 Long-term Project 🎯',
    longterm_subtitle: 'Paste your long-term plan, the Guild will automatically assign to daily quests',
    longterm_placeholder: 'Paste your long-term plan...\n\nExample:\nMonday: Complete project proposal\nTuesday: Team discussion\nWednesday: Revise and submit\nDec 25: Prepare annual review',
    longterm_parse_btn: 'Parse',
    longterm_parsing: 'Guild manager is updating quest board...',
    longterm_found: 'Found',
    longterm_epic_quests: ' epic quests',
    longterm_re_input: 'Re-enter',
    longterm_date: 'Date:',
    longterm_title_label: 'RPG Epic Title:',
    longterm_content_label: 'Original Task Content:',
    longterm_done_edit: 'Done Editing',
    longterm_confirm_btn: 'Confirm & Add to Quest Board',
    longterm_adding: 'Adding to quest board...',
    
    // Treasures
    treasures_title: '💎 Treasure Collection 💎',
    treasures_total: 'Total collected',
    treasures_pieces: ' treasures',
    treasures_empty_title: 'Vault Awaits',
    treasures_empty_welcome: 'Adventurer, welcome to the Guild Vault!',
    treasures_empty_desc1: 'Whenever you complete all daily quests, you can open that day\'s mysterious chest to obtain precious treasures. These items are not only proof of your efforts, but may also bring unexpected rewards.',
    treasures_empty_desc2: 'Start today, complete your quest list, and open your first chest! ✨',
    treasures_goto_board: 'Go to Quest Board',
    treasures_rarity_stats: 'Rarity Statistics',
    treasures_no_rarity: 'No treasures of this rarity',
    treasures_obtained_at: 'Obtained at',
    
    // Journal
    journal_title: '📖 Adventure Journal 📖',
    journal_completion_trend: 'Completion Rate Trend',
    journal_no_data: 'No data',
    journal_perfect: '100% Perfect',
    journal_good: '50-99% Good',
    journal_need_improve: '<50% Needs Work',
    journal_no_records: 'No Records',
    journal_no_records_hint: 'Records will appear after completing quests',
    journal_days: ' days',
    
    // Profile
    profile_title: '👤 Adventurer Profile 👤',
    profile_current_streak: 'Current Streak',
    profile_longest_streak: 'Longest Streak',
    profile_freeze_tokens: 'Freeze Tokens',
    profile_guild_title: 'Guild Title',
    profile_no_title: 'No Title',
    profile_settings: '⚙️ Settings',
    profile_language: 'Language',
    profile_logout: 'Logout',
    
    // Milestones
    milestone_achieved: '🎊 Milestone Achieved! 🎊',
    milestone_days_streak: '-Day Streak',
    milestone_congrats: 'Congratulations on achieving',
    milestone_congrats_suffix: ' consecutive days of quest completion!',
    milestone_title_badge: ' Title',
    milestone_collect: 'Collect',
    
    // Planning
    planning_title_celebrate: '🎊 Day Complete 🎊',
    planning_title_plan: '📋 Plan Tomorrow 📋',
    planning_tomorrow_total: '📋 Tomorrow\'s Quest Total:',
    planning_routine_count: ' daily routines',
    planning_temp_count: ' temp quests',
    planning_routine_title: 'Daily Routines (Auto-appear)',
    planning_routine_hint: '💡 These quests appear automatically every day, no need to plan separately',
    planning_plan_temp: 'Plan Tomorrow\'s Temporary Quests',
    planning_input_placeholder: 'Enter tomorrow\'s task...',
    planning_add_manual: 'Add Task Manually',
    planning_confirm_plan: 'Confirm & Register',
    planning_close: 'Close',
    
    // Quest Edit
    questedit_title: '✏️ Edit Quest ✏️',
    questedit_current_title: 'Current RPG Quest Name',
    questedit_current_difficulty: 'Current Difficulty Rating',
    questedit_difficulty_keep: 'Difficulty stays the same when editing content',
    questedit_content_label: 'Quest Content',
    questedit_content_placeholder: 'e.g.: Run 5km',
    questedit_content_hint: '💡 After saving, AI will regenerate RPG-style quest name (difficulty unchanged)',
    questedit_routine: 'Set as Daily Routine',
    questedit_routine_desc: 'When checked, this quest will automatically appear on the quest board daily',
    questedit_saving: 'Saving...',
    
    // Quest Card
    questcard_reopen: 'Reopen',
    questcard_reopen_confirm_title: 'Reopen Quest?',
    questcard_reopen_confirm_desc: 'This quest will return to todo status',
    questcard_confirm_reopen: 'Confirm Reopen',
    
    // Toast messages
    toast_tasks_carried: 'Yesterday\'s',
    toast_tasks_carried_suffix: ' quests have been carried over to today',
    toast_loaded_planned: 'Loaded',
    toast_loaded_planned_suffix: ' pre-planned quests',
    toast_routine_created: 'Successfully created today\'s daily routine quest',
    toast_task_added: 'Task added, rest day automatically cancelled',
    toast_rest_cancelled: 'Guild rest has ended, quest board shines anew, new challenges await.',
    toast_rest_activated: 'Adventurer, your recent heroic performance deserves praise! The Guild grants you today\'s rest, recover in peace, gather strength for your next expedition.',
    
    // Role names for praise
    role_elder: 'Grand Elder',
    role_chronicler: 'Chief Epic Chronicler',
    role_knight: 'Honor Knight Commander',
    role_sage: 'Mystic Sage',
    role_steward: 'Guild Steward',
    role_tactician: 'Master Tactician',
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('zh');

  useEffect(() => {
    const savedLang = localStorage.getItem('app_language') || 'zh';
    setLanguage(savedLang);
  }, []);

  const switchLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('app_language', lang);
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