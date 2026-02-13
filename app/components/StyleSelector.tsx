'use client';

import React, { useRef } from 'react';
import { STYLES } from '../config/styles';

interface StyleSelectorProps {
  currentStyle: string;
  onStyleChange: (key: string) => void;
  starredStyles: string[];
  onToggleStar: (key: string) => void;
  isStarred: (key: string) => boolean;
  isRecommended: (key: string) => boolean;
}

export default function StyleSelector({
  currentStyle,
  onStyleChange,
  starredStyles,
  onToggleStar,
  isStarred,
  isRecommended,
}: StyleSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedKeys = Object.keys(STYLES).sort((a, b) => {
    const aStarred = starredStyles.includes(a) ? 0 : 1;
    const bStarred = starredStyles.includes(b) ? 0 : 1;
    return aStarred - bStarred;
  });

  return (
    <div className="h-11 bg-white border-b border-border-light shrink-0 flex items-center">
      <div
        ref={scrollRef}
        className="styles-scroll flex items-center gap-1.5 overflow-x-auto px-4 w-full"
        style={{ scrollbarWidth: 'none' }}
      >
        {sortedKeys.map(key => {
          const style = STYLES[key];
          const isCurrent = currentStyle === key;
          const starred = isStarred(key);
          const recommended = isRecommended(key);

          return (
            <button
              key={key}
              onClick={() => onStyleChange(key)}
              className={`
                group shrink-0 cursor-pointer h-7 px-3 text-xs
                rounded-md transition-colors duration-150 select-none
                flex items-center gap-1 whitespace-nowrap
                ${isCurrent
                  ? 'bg-accent text-white font-medium'
                  : 'text-secondary hover:text-primary hover:bg-bg-secondary'
                }
              `}
            >
              {recommended && !starred && (
                <span className="text-[9px] opacity-40">◆</span>
              )}
              {starred && (
                <svg className={`w-3 h-3 ${isCurrent ? 'text-white/70' : 'text-accent/60'}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              )}
              <span>{style.name}</span>
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(key);
                }}
                className={`
                  text-[10px] opacity-0 group-hover:opacity-60 hover:!opacity-100
                  transition-opacity duration-150 cursor-pointer
                  ${isCurrent ? 'text-white' : 'text-accent'}
                `}
                title={starred ? '取消收藏' : '收藏'}
              >
                {starred ? '★' : '☆'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
