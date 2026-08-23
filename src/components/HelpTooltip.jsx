import React, { useState, useRef, useEffect } from 'react';

export default function HelpTooltip({ text, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPos, setActualPos] = useState(position);
  const triggerRef = useRef(null);
  const tooltipId = React.useId();

  const handleMouseEnter = () => {
    checkPosition();
    setIsVisible(true);
  };
  const handleMouseLeave = () => setIsVisible(false);
  
  const handleFocus = () => {
    checkPosition();
    setIsVisible(true);
  };
  const handleBlur = () => setIsVisible(false);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsVisible(false);
    }
  };

  const checkPosition = () => {
    if (triggerRef.current && position === 'top') {
      const rect = triggerRef.current.getBoundingClientRect();
      if (rect.top < 100) {
        setActualPos('bottom');
      } else {
        setActualPos('top');
      }
    } else {
      setActualPos(position);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isVisible) checkPosition();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isVisible, position]);

  const posClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-ink border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-ink border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-ink border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-ink border-t-transparent border-b-transparent border-l-transparent'
  };

  return (
    <div 
      className="relative inline-flex items-center" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        ref={triggerRef}
        className="text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal rounded-full transition-colors flex items-center justify-center p-0.5"
        aria-describedby={isVisible ? tooltipId : undefined}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-label="More information"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
      </button>
      
      <div 
        id={tooltipId}
        role="tooltip"
        className={`absolute z-50 w-max max-w-xs bg-ink text-paper rounded-lg shadow-xl p-3 text-sm font-body transition-all duration-150 pointer-events-none
          ${posClasses[actualPos]}
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}
        `}
      >
        {text}
        <div 
          className={`absolute border-[5px] ${arrowClasses[actualPos]}`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
