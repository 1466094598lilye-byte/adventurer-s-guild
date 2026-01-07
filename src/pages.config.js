import Journal from './pages/Journal';
import Profile from './pages/Profile';
import QuestBoard from './pages/QuestBoard';
import Treasures from './pages/Treasures';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Journal": Journal,
    "Profile": Profile,
    "QuestBoard": QuestBoard,
    "Treasures": Treasures,
}

export const pagesConfig = {
    mainPage: "QuestBoard",
    Pages: PAGES,
    Layout: __Layout,
};