import QuestBoard from './pages/QuestBoard';
import Journal from './pages/Journal';
import Treasures from './pages/Treasures';
import Profile from './pages/Profile';
import AdminTest from './pages/AdminTest';
import Layout from './Layout.jsx';


export const PAGES = {
    "QuestBoard": QuestBoard,
    "Journal": Journal,
    "Treasures": Treasures,
    "Profile": Profile,
    "AdminTest": AdminTest,
}

export const pagesConfig = {
    mainPage: "QuestBoard",
    Pages: PAGES,
    Layout: Layout,
};