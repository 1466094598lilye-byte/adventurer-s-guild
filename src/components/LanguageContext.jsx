
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
      questboard_pending_quests_title: '待确认 {count} 项任务',
      questboard_pending_quest_content_label: '任务内容',
      questboard_pending_quest_difficulty_label: '难度评级',
      questboard_pending_quest_delete_button: '删除此任务',
      questboard_pending_quest_confirm_button: '✓ 确认接取 {count} 项委托',
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
      questboard_cannot_set_rest_day_hint: '今日有任务时无法设为休息日',
      questboard_toast_yesterday_quests_delayed: '昨日 {count} 项未完成任务已顺延至今日',
      questboard_toast_planned_quests_loaded: '明日规划的 {count} 项任务已加载',
      questboard_toast_quest_added_rest_canceled: '已添加任务，休息日已自动取消',
      questboard_toast_quests_added_to_board: '{count} 项任务已添加到委托板！',
      questboard_toast_set_as_routine: '已设为每日修炼任务！',
      questboard_toast_quest_updated: '任务已更新！',
      questboard_toast_changes_saved: '修改已保存！',
      questboard_toast_rest_canceled_success: '休息日已取消',
      questboard_toast_rest_set_success: '已设为工会休息日',
      questboard_toast_plan_saved_success: '明日 {count} 项任务已登记成功',
      questboard_toast_longterm_quests_added_success: '{count} 项史诗委托已添加到委托板',
      questboard_alert_cannot_set_rest_day_with_quests: '今日有任务时无法设为休息日',
      questboard_alert_task_parse_failed: '任务解析失败：{message}',
      questboard_alert_create_quest_failed: '创建任务失败',
      questboard_alert_update_failed: '更新失败',
      questboard_alert_save_plan_failed: '保存规划失败',
      questboard_reopen_toast_1: '好的，让我们重新审视这个委托',
      questboard_reopen_toast_2: '撤回完成报告，任务重新开放',
      questboard_reopen_toast_3: '没关系，我们再来一次',
      questboard_reopen_toast_4: '返回任务板，准备再次挑战',
      questboard_alert_review_notes_wip: '复盘笔记功能开发中',
      
      // Long-term Calendar
      calendar_title: '限时活动日程',
      calendar_total_quests: '共',
      calendar_epic_quests: '项史诗委托',
      calendar_empty_title: '暂无限时活动',
      calendar_empty_hint: '使用"大项目规划"添加长期计划后，这里会显示日程表',
      calendar_today: '今天',
      calendar_completed: '已完成',
      calendar_items: '项',
      calendar_add_task: '添加任务到此日期',
      calendar_delete_all: '删除所有大项目任务',
      calendar_date_tasks: '的任务',
      calendar_task_content: '任务内容',
      calendar_status: '状态',
      calendar_status_done: '✅ 已完成',
      calendar_status_pending: '⏳ 待完成',
      calendar_confirm_delete_title: '确认删除？',
      calendar_delete_warning: '此操作将删除所有',
      calendar_delete_cannot_undo: '⚠️ 此操作不可恢复！',
      calendar_add_task_title: '添加任务',
      calendar_task_content_label: '任务内容',
      calendar_task_placeholder: '例如：完成项目方案设计',
      calendar_adding: '添加中...',
      calendar_confirm_add: '确认添加',
      calendar_reenter: '重新输入',
      calendar_identified: '识别到',
      
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
      profile_logout: '退出登录',
      
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

      // Milestones
      milestone_reached: '里程碑达成',
      milestone_days_streak: '天连胜',
      milestone_congrats: '恭喜达成 {days} 天连胜里程碑！',
      milestone_freeze_token_label: '冻结券',
      milestone_title_badge_label: '称号徽章',
      milestone_claim_button: '领取奖励',
      
      // Rest Day Dialog
      rest_day_dialog_set_title: '设为工会休息日',
      rest_day_dialog_cancel_title: '取消工会休息日',
      rest_day_dialog_set_hint_1: '今日不会影响连胜计数',
      rest_day_dialog_set_hint_2: '连胜不会中断，但也不会累积',
      rest_day_dialog_set_hint_3: '适合临时有事无法完成任务的日子',
      rest_day_dialog_set_hint_4: '只能在当天没有任务时设为休息日',
      rest_day_dialog_cancel_hint_1: '今日将恢复为正常工作日',
      rest_day_dialog_cancel_hint_2: '可以开始添加任务',
      
      // Rarity
      rarity_common: '普通',
      rarity_rare: '稀有',
      rarity_epic: '史诗',
      rarity_legendary: '传说',
      
      // Common
      common_confirm: '确认',
      common_cancel: '取消',
      common_items: '项',
      common_date: '日期',
      common_adding: '添加中',
      common_try_again: '未知错误',

      // Quest Card
      questcard_reopen: '返回待办',
      questcard_edit: '编辑',
      questcard_delete: '删除',
      questcard_confirm_reopen_title: '撤回完成报告？',
      questcard_confirm_reopen_hint: '此委托将恢复至待办状态',
      questcard_confirm_reopen: '确认撤回',
      
      // Quest Edit Form
      questedit_title: '✏️ 编辑委托 ✏️',
      questedit_current_title: '当前RPG任务名',
      questedit_current_difficulty: '当前难度评级',
      questedit_difficulty_hint: '修改任务内容时评级保持不变',
      questedit_content_label: '任务内容',
      questedit_content_placeholder: '例如：跑步5km',
      questedit_content_hint: '💡 保存后AI将重新生成RPG风格的任务名称（难度评级保持不变）',
      questedit_routine: '设为每日修炼',
      questedit_routine_hint: '勾选后，此任务将每天自动出现在任务板上',
      questedit_saving: '保存中...',
      questedit_save: '保存',
      
      // End of Day Planning
      planning_celebration_title: '🎊 今日圆满 🎊',
      planning_planning_title: '📋 规划明日 📋',
      planning_loading: '工会高层正在联名撰写表扬信...',
      planning_tomorrow_summary: '明日委托总数',
      planning_routine_quests: '每日修炼（自动出现）',
      planning_routine_hint: '💡 这些任务每天自动出现，无需单独规划',
      planning_add_temp_quests: '规划明日临时任务',
      planning_input_placeholder: '输入明天的任务...',
      planning_manual_add: '手动添加任务',
      planning_edit_content: '任务内容：',
      planning_edit_difficulty: '难度评级：',
      planning_delete_task: '删除此任务',
      planning_confirm_register: '确认登记',
      planning_temp_tasks: '项临时委托',
      planning_close: '关闭',
      
      // Long-term Project
      longterm_title: '🎯 大项目规划 🎯',
      longterm_subtitle: '粘贴你的长期计划，冒险者工会将自动分配到每日委托板',
      longterm_placeholder: '粘贴你的长期计划...\n\n例如：\n周一：完成项目方案设计\n周二：与团队讨论方案\n周三：修改并提交方案\n12月25日：准备年终总结',
      longterm_parsing: '工会管理员正在更新委托板...',
      longterm_start_parse: '开始解析',
      longterm_identified: '识别到',
      longterm_epic_quests: '项史诗委托',
      longterm_reenter: '重新输入',
      longterm_edit_date: '日期：',
      longterm_edit_title: 'RPG 史诗标题：',
      longterm_edit_content: '原始任务内容：',
      longterm_edit_done: '完成编辑',
      longterm_task_content_label: '任务内容：',
      longterm_creating: '正在添加到委托板...',
      longterm_confirm_add: '确认并添加到委托板'
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
      questboard_pending_quests_title: '{count} Pending Quests',
      questboard_pending_quest_content_label: 'Quest Content',
      questboard_pending_quest_difficulty_label: 'Difficulty Rating',
      questboard_pending_quest_delete_button: 'Delete This Quest',
      questboard_pending_quest_confirm_button: '✓ Confirm & Accept {count} Quests',
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
      questboard_cannot_set_rest_day_hint: 'Cannot set as rest day when there are quests today',
      questboard_toast_yesterday_quests_delayed: '{count} unfinished quests from yesterday have been delayed to today',
      questboard_toast_planned_quests_loaded: '{count} planned quests have been loaded',
      questboard_toast_quest_added_rest_canceled: 'Quest added, rest day automatically cancelled',
      questboard_toast_quests_added_to_board: '{count} quests added to the board!',
      questboard_toast_set_as_routine: 'Set as daily routine quest!',
      questboard_toast_quest_updated: 'Quest updated!',
      questboard_toast_changes_saved: 'Changes saved!',
      questboard_toast_rest_canceled_success: 'Rest day cancelled',
      questboard_toast_rest_set_success: 'Set as guild rest day',
      questboard_toast_plan_saved_success: '{count} quests registered for tomorrow',
      questboard_toast_longterm_quests_added_success: '{count} epic quests added to quest board',
      questboard_alert_cannot_set_rest_day_with_quests: 'Cannot set as rest day when there are quests today',
      questboard_alert_task_parse_failed: 'Task parsing failed: {message}',
      questboard_alert_create_quest_failed: 'Failed to create quest',
      questboard_alert_update_failed: 'Update failed',
      questboard_alert_save_plan_failed: 'Failed to save plan',
      questboard_reopen_toast_1: 'Okay, let\'s review this quest again',
      questboard_reopen_toast_2: 'Completion report withdrawn, quest reopened',
      questboard_reopen_toast_3: 'No problem, let\'s try again',
      questboard_reopen_toast_4: 'Returning to quest board, ready to challenge again',
      questboard_alert_review_notes_wip: 'Review notes feature under development',
      
      // Long-term Calendar
      calendar_title: 'Event Schedule',
      calendar_total_quests: 'Total',
      calendar_epic_quests: 'epic quests',
      calendar_empty_title: 'No Scheduled Events',
      calendar_empty_hint: 'Use "Long-term Project Planning" to add plans, and they will appear here',
      calendar_today: 'Today',
      calendar_completed: 'Completed',
      calendar_items: 'items',
      calendar_add_task: 'Add Task to This Date',
      calendar_delete_all: 'Delete All Long-term Projects',
      calendar_date_tasks: 'Tasks',
      calendar_task_content: 'Task Content',
      calendar_status: 'Status',
      calendar_status_done: '✅ Completed',
      calendar_status_pending: '⏳ Pending',
      calendar_confirm_delete_title: 'Confirm Deletion?',
      calendar_delete_warning: 'This will delete all',
      calendar_delete_cannot_undo: '⚠️ This action cannot be undone!',
      calendar_add_task_title: 'Add Task',
      calendar_task_content_label: 'Task Content',
      calendar_task_placeholder: 'e.g.: Complete project proposal design',
      calendar_adding: 'Adding...',
      calendar_confirm_add: 'Confirm Add',
      calendar_reenter: 'Re-enter',
      calendar_identified: 'Identified',
      
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
      profile_logout: 'Logout',
      
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
      
      // Milestones
      milestone_reached: 'Milestone Reached',
      milestone_days_streak: '-Day Streak',
      milestone_congrats: 'Congratulations on achieving a {days}-day streak milestone!',
      milestone_freeze_token_label: 'Freeze Token',
      milestone_title_badge_label: 'Title Badge',
      milestone_claim_button: 'Claim Rewards',
      
      // Rest Day Dialog
      rest_day_dialog_set_title: 'Set as Guild Rest Day',
      rest_day_dialog_cancel_title: 'Cancel Guild Rest Day',
      rest_day_dialog_set_hint_1: 'Today won\'t affect streak count',
      rest_day_dialog_set_hint_2: 'Streak won\'t break, but won\'t accumulate either',
      rest_day_dialog_set_hint_3: 'Suitable for days when you can\'t complete quests',
      rest_day_dialog_set_hint_4: 'Can only be set as rest day when there are no quests today',
      rest_day_dialog_cancel_hint_1: 'Today will return to normal working day',
      rest_day_dialog_cancel_hint_2: 'You can start adding quests',
      
      // Rarity
      rarity_common: 'Common',
      rarity_rare: 'Rare',
      rarity_epic: 'Epic',
      rarity_legendary: 'Legendary',
      
      // Common
      common_confirm: 'Confirm',
      common_cancel: 'Cancel',
      common_items: 'items',
      common_date: 'Date',
      common_adding: 'Adding',
      common_try_again: 'Unknown error',

      // Quest Card
      questcard_reopen: 'Reopen',
      questcard_edit: 'Edit',
      questcard_delete: 'Delete',
      questcard_confirm_reopen_title: 'Withdraw Completion Report?',
      questcard_confirm_reopen_hint: 'This quest will return to pending status',
      questcard_confirm_reopen: 'Confirm Withdraw',
      
      // Quest Edit Form
      questedit_title: '✏️ Edit Quest ✏️',
      questedit_current_title: 'Current RPG Quest Name',
      questedit_current_difficulty: 'Current Difficulty Rating',
      questedit_difficulty_hint: 'Rating remains unchanged when editing content',
      questedit_content_label: 'Quest Content',
      questedit_content_placeholder: 'e.g.: Run 5km',
      questedit_content_hint: '💡 AI will regenerate RPG-style title after saving (difficulty rating unchanged)',
      questedit_routine: 'Set as Daily Routine',
      questedit_routine_hint: 'When checked, this quest will automatically appear on the board daily',
      questedit_saving: 'Saving...',
      questedit_save: 'Save',
      
      // End of Day Planning
      planning_celebration_title: '🎊 Day Complete 🎊',
      planning_planning_title: '📋 Plan Tomorrow 📋',
      planning_loading: 'Guild leaders are writing commendation letter...',
      planning_tomorrow_summary: 'Tomorrow\'s Total Quests',
      planning_routine_quests: 'Daily Routines (Auto-appear)',
      planning_routine_hint: '💡 These quests appear automatically daily, no separate planning needed',
      planning_add_temp_quests: 'Plan Tomorrow\'s Temporary Quests',
      planning_input_placeholder: 'Enter tomorrow\'s quest...',
      planning_manual_add: 'Add Quest Manually',
      planning_edit_content: 'Quest Content:',
      planning_edit_difficulty: 'Difficulty Rating:',
      planning_delete_task: 'Delete This Quest',
      planning_confirm_register: 'Confirm Registration for',
      planning_temp_tasks: 'temporary quests',
      planning_close: 'Close',
      
      // Long-term Project
      longterm_title: '🎯 Long-term Project Planning 🎯',
      longterm_subtitle: 'Paste your long-term plans, the Guild will automatically distribute them to daily quest board',
      longterm_placeholder: 'Paste your long-term plans...\n\nExample:\nMonday: Complete project proposal design\nTuesday: Discuss proposal with team\nWednesday: Revise and submit proposal\nDecember 25: Prepare year-end summary',
      longterm_parsing: 'Guild administrator is updating quest board...',
      longterm_start_parse: 'Start Parsing',
      longterm_identified: 'Identified',
      longterm_epic_quests: 'epic quests',
      longterm_reenter: 'Re-enter',
      longterm_edit_date: 'Date:',
      longterm_edit_title: 'RPG Epic Title:',
      longterm_edit_content: 'Original Quest Content:',
      longterm_edit_done: 'Done Editing',
      longterm_task_content_label: 'Quest Content:',
      longterm_creating: 'Adding to quest board...',
      longterm_confirm_add: 'Confirm and Add to Quest Board'
    }
  };

  const t = (key, params = {}) => {
    let text = translations[language][key] || key;
    
    // Replace parameters like {count}, {days}, {message}
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(paramKey => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
      });
    }
    
    return text;
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
