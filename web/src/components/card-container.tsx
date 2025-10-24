import { cn } from '@/lib/utils';
import { PropsWithChildren } from 'react';

type CardContainerProps = { className?: string } & PropsWithChildren;

export function CardContainer({ children, className }: CardContainerProps) {
  return (
    <section
      className={cn(
        'grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
        'min-h-[180px]', // 设置最小高度以适应新设计的卡片
        className,
      )}
    >
      {children}
    </section>
  );
}
