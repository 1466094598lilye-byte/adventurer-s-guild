import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function BottomSheet({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              maxHeight: '80vh',
              paddingBottom: 'env(safe-area-inset-bottom)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b-2" style={{ borderColor: 'var(--border-primary)' }}>
              <h3 className="text-lg font-black uppercase">{title}</h3>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <X className="w-6 h-6" strokeWidth={3} />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 64px)' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function BottomSheetOption({ label, selected, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-6 py-4 flex items-center justify-between font-bold transition-colors"
      style={{
        backgroundColor: selected ? 'var(--color-cyan)' : 'transparent',
        borderBottom: '2px solid var(--border-primary)'
      }}
    >
      <span className="text-lg">{label}</span>
      {icon && <span className="text-2xl">{icon}</span>}
      {selected && <span className="text-2xl">✓</span>}
    </button>
  );
}