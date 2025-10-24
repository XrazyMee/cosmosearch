import { motion } from 'framer-motion';
import React from 'react';

interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  className = '',
  disabled = false,
}) => {
  const buttonVariants = {
    rest: {
      scale: 1,
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    },
    hover: {
      scale: 1.03,
      boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.15)',
      transition: { duration: 0.2, ease: 'easeOut' },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1, ease: 'easeOut' },
    },
  };

  return (
    <motion.button
      variants={buttonVariants}
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        border: 'none',
        outline: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </motion.button>
  );
};
