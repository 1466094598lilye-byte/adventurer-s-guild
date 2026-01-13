import Journal from './pages/Journal';
import Profile from './pages/Profile';
import Treasures from './pages/Treasures';
import QuestBoard from './pages/QuestBoard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Journal": Journal,
    "Profile": Profile,
    "Treasures": Treasures,
    "QuestBoard": QuestBoard,
}

export const pagesConfig = {
    mainPage: "QuestBoard",
    Pages: PAGES,
    Layout: __Layout,
};