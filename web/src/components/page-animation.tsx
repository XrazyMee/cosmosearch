import React from 'react';
import { useLocation } from 'umi';

interface PageAnimationProps {
  children: React.ReactNode;
  className?: string;
}

export const PageAnimation: React.FC<PageAnimationProps> = ({
  children,
  className = '',
}) => {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className={`page-transition ${className}`}
      style={{
        animation: 'pageFadeIn 0.3s ease-out forwards',
      }}
    >
      {children}
    </div>
  );
};
