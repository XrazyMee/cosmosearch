import { motion } from 'framer-motion';
import React from 'react';

interface AnimatedListItemProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({
  children,
  index = 0,
  className = '',
}) => {
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
        delay: index * 0.05,
      },
    },
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
};
