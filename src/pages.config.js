/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import CraftingPage from './pages/CraftingPage';
import Journal from './pages/Journal';
import LongTermCalendarPage from './pages/LongTermCalendarPage';
import LongTermProjectPage from './pages/LongTermProjectPage';
import Profile from './pages/Profile';
import QuestBoard from './pages/QuestBoard';
import Treasures from './pages/Treasures';
import crafting from './pages/crafting';
import longTermProject from './pages/long-term-project';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CraftingPage": CraftingPage,
    "Journal": Journal,
    "LongTermCalendarPage": LongTermCalendarPage,
    "LongTermProjectPage": LongTermProjectPage,
    "Profile": Profile,
    "QuestBoard": QuestBoard,
    "Treasures": Treasures,
    "crafting": crafting,
    "long-term-project": longTermProject,
}

export const pagesConfig = {
    mainPage: "QuestBoard",
    Pages: PAGES,
    Layout: __Layout,
};