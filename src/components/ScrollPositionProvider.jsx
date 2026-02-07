import React, { createContext, useContext, useRef } from 'react';

const ScrollPositionContext = createContext();

export function ScrollPositionProvider({ children }) {
  const scrollPositions = useRef({});

  const saveScrollPosition = (pathname) => {
    scrollPositions.current[pathname] = window.scrollY;
  };

  const restoreScrollPosition = (pathname) => {
    const savedPosition = scrollPositions.current[pathname];
    if (savedPosition !== undefined) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        window.scrollTo(0, savedPosition);
      }, 0);
    }
  };

  return (
    <ScrollPositionContext.Provider value={{ saveScrollPosition, restoreScrollPosition }}>
      {children}
    </ScrollPositionContext.Provider>
  );
}

export function useScrollPosition() {
  const context = useContext(ScrollPositionContext);
  if (!context) {
    throw new Error('useScrollPosition must be used within ScrollPositionProvider');
  }
  return context;
}