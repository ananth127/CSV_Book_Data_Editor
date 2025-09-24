import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  label?: string;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className,
  label,
  showPercentage = true
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full space-y-2", className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className="text-primary font-medium tabular-nums">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className="relative w-full bg-secondary rounded-full h-3 overflow-hidden shadow-inner">
        {/* Background shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse opacity-20" />
        
        {/* Progress bar */}
        <div
          className="relative h-full bg-gradient-to-r from-primary via-primary to-blue-500 transition-all duration-700 ease-out rounded-full shadow-sm"
          style={{ width: `${percentage}%` }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse rounded-full" />
        </div>
      </div>
    </div>
  );
};