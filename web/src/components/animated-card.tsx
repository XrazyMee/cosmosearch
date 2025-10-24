import { motion } from 'framer-motion';
import React from 'react';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  onClick,
}) => {
  const cardVariants = {
    rest: {
      y: 0,
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
    },
    hover: {
      y: -5,
      boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.1)',
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.div
      variants={onClick ? cardVariants : undefined}
      whileHover={onClick ? 'hover' : undefined}
      onClick={onClick}
      className={className}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        borderRadius: '8px',
      }}
    >
      {children}
    </motion.div>
  );
};
