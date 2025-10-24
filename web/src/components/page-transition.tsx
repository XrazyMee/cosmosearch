import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import { useLocation } from 'umi';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = '',
}) => {
  const location = useLocation();

  // 页面切换动画配置
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20,
      scale: 0.98,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.98,
    },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{
          type: 'tween',
          ease: 'easeOut',
          duration: 0.2,
        }}
        className={className}
        style={{ minHeight: '100%', width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
