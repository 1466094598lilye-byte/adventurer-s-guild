import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Scroll, BookOpen, Gem, User, LogIn } from "lucide-react";
import { LanguageProvider, useLanguage } from "@/components/LanguageContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { initAudioManager } from "@/components/AudioManager";
import TermsAndPrivacyDialog from "@/components/TermsAndPrivacyDialog";

function LayoutContent({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [showTerms, setShowTerms] = useState(false);

  // 初始化音频系统
  useEffect(() => {
    initAudioManager();
  }, []);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        // 游客模式下401错误是正常的，静默处理
        if (error?.response?.status === 401) {
          return null;
        }
        console.error('获取用户信息失败:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  const tabs = [
    { name: 'QuestBoard', label: t('nav_questboard'), icon: Scroll },
    { name: 'Journal', label: t('nav_journal'), icon: BookOpen },
    { name: 'Treasures', label: t('nav_treasures'), icon: Gem },
    { name: 'Profile', label: t('nav_profile'), icon: User }
  ];

  const isActive = (pageName) => {
    return location.pathname === createPageUrl(pageName);
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };



  return (
    <ErrorBoundary>
      <TermsAndPrivacyDialog isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Guest Mode Warning Banner */}
        {!user && (
          <div 
            className="w-full py-3 px-4 flex items-center justify-between gap-3 sticky top-0 z-40"
            style={{
              backgroundColor: 'var(--bg-warning)',
              borderBottom: '5px solid var(--border-primary)',
              boxShadow: '0 5px 0px rgba(0,0,0,0.1)',
              paddingTop: 'env(safe-area-inset-top)'
            }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-2xl flex-shrink-0 animate-pulse">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm uppercase leading-tight">
                  {t('guest_mode_warning_title')}
                </p>
                <p className="font-bold text-sm leading-tight mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {t('guest_mode_warning_subtitle')}
                </p>
                <p className="font-bold text-sm leading-tight mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {language === 'zh' ? '登录即表示同意 ' : 'By logging in, you agree to the '}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTerms(true);
                    }}
                    className="underline hover:opacity-70 cursor-pointer inline"
                    style={{ 
                      color: 'var(--color-orange)', 
                      fontWeight: 900,
                      textDecoration: 'underline',
                      background: 'none',
                      border: 'none',
                      padding: 0
                    }}
                  >
                    Terms and Privacy Policy for Adventurer Guild
                  </button>
                </p>
              </div>
            </div>
            <button
              onClick={handleLogin}
              className="flex-shrink-0 px-5 py-3 font-black uppercase text-sm flex flex-col items-center gap-1 animate-bounce-subtle"
              style={{
                backgroundColor: 'var(--color-orange)',
                color: 'var(--text-inverse)',
                border: '4px solid var(--border-primary)',
                boxShadow: '5px 5px 0px var(--border-primary)'
              }}
            >
              <div className="flex items-center gap-2">
                <LogIn className="w-5 h-5" strokeWidth={3} />
                <span>{t('login_button')}</span>
              </div>
              <span className="text-sm font-bold opacity-90">
                {language === 'zh' ? '💾 保存进度' : '💾 Save Progress'}
              </span>
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 pb-20">
          {children}
        </div>

        {/* Bottom Navigation */}
        <nav 
          className="fixed bottom-0 left-0 right-0 z-50"
          style={{
            backgroundColor: 'var(--bg-black)',
            borderTop: '5px solid var(--border-warning)',
            paddingBottom: 'env(safe-area-inset-bottom)'
          }}
        >
          <div className="max-w-2xl mx-auto flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab.name);
              
              return (
                <Link
                  key={tab.name}
                  to={createPageUrl(tab.name)}
                  onClick={(e) => {
                    if (active) {
                      e.preventDefault();
                      window.scrollTo(0, 0);
                      navigate(createPageUrl(tab.name), { replace: true });
                    }
                  }}
                  className="flex-1 py-3 flex flex-col items-center gap-1 transition-all"
                  style={{
                    backgroundColor: active ? 'var(--color-yellow)' : 'transparent',
                    borderLeft: active ? '3px solid var(--border-primary)' : 'none',
                    borderRight: active ? '3px solid var(--border-primary)' : 'none',
                  }}
                >
                  <Icon 
                    className="w-6 h-6" 
                    strokeWidth={3}
                    style={{ color: active ? 'var(--text-primary)' : 'var(--color-yellow)' }}
                  />
                  <span 
                    className="text-sm font-black uppercase"
                    style={{ color: active ? 'var(--text-primary)' : 'var(--color-yellow)' }}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Neo-Brutalism Global Styles */}
        <style>{`
          :root {
            /* Backgrounds */
            --bg-primary: #F9FAFB;
            --bg-secondary: #FFF;
            --bg-warning: #FFE66D;
            --bg-cyan: #4ECDC4;
            --bg-orange: #FF6B35;
            --bg-pink: #C44569;
            --bg-black: #000;
            
            /* Text Colors */
            --text-primary: #000;
            --text-secondary: #666;
            --text-tertiary: #333;
            --text-inverse: #FFF;
            
            /* Border Colors */
            --border-primary: #000;
            --border-warning: #FFE66D;
            --border-orange: #FF6B35;
            
            /* Theme Colors */
            --color-yellow: #FFE66D;
            --color-orange: #FF6B35;
            --color-cyan: #4ECDC4;
            --color-pink: #C44569;
            
            /* Streak Card Backgrounds */
            --streak-current-bg: #FF6B35;
            --streak-longest-bg: #C44569;
            --streak-freeze-bg: #4ECDC4;
            
            /* Scrollbar */
            --scrollbar-track: #F0F0F0;
            --scrollbar-thumb: #000;
            --scrollbar-border: #FFE66D;
          }

          [data-theme="dark"] {
            /* Backgrounds */
            --bg-primary: #1a1a1a;
            --bg-secondary: #2a2a2a;
            --bg-warning: #3a3a2a;
            --bg-cyan: #2a3a3a;
            --bg-orange: #3a2a2a;
            --bg-pink: #3a2a3a;
            --bg-black: #f5f5f5;
            
            /* Text Colors */
            --text-primary: #f5f5f5;
            --text-secondary: #aaa;
            --text-tertiary: #ccc;
            --text-inverse: #1a1a1a;
            
            /* Border Colors */
            --border-primary: #f5f5f5;
            --border-warning: #FFE66D;
            --border-orange: #FF6B35;
            
            /* Theme Colors remain vibrant */
            --color-yellow: #FFE66D;
            --color-orange: #FF6B35;
            --color-cyan: #4ECDC4;
            --color-pink: #C44569;
            
            /* Streak Card Backgrounds - dark in dark mode */
            --streak-current-bg: #1a1a1a;
            --streak-longest-bg: #1a1a1a;
            --streak-freeze-bg: #1a1a1a;
            
            /* Scrollbar */
            --scrollbar-track: #2a2a2a;
            --scrollbar-thumb: #f5f5f5;
            --scrollbar-border: #FFE66D;
          }

          * {
            -webkit-tap-highlight-color: transparent;
          }

          /* 禁用导航、按钮和图标的文本选择 */
          nav, nav *, button, button *, a, a * {
            user-select: none;
            -webkit-user-select: none;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            overflow-x: hidden;
            overscroll-behavior: none;
          }

          input, textarea, button {
            outline: none;
          }

          input:focus, textarea:focus {
            outline: 3px solid var(--border-orange);
            outline-offset: 2px;
          }

          button:active {
            transform: translate(2px, 2px);
            box-shadow: 2px 2px 0px #000 !important;
          }

          ::selection {
            background: var(--color-yellow);
            color: var(--text-primary);
          }

          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          ::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
          }

          ::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border: 2px solid var(--scrollbar-border);
          }

          @keyframes bounce-subtle {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-5px);
            }
          }

          .animate-bounce-subtle {
            animation: bounce-subtle 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
}

export default function Layout({ children }) {
  return (
    <LanguageProvider>
      <LayoutContent children={children} />
    </LanguageProvider>
  );
}