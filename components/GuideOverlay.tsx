import React, { useEffect, useRef, useState } from 'react';
import { useTask } from '../context/TaskContext';

const GuideOverlay: React.FC = () => {
  const { activeGuide, nextGuideStep, skipGuide, completeGuide, isGuideVisible } = useTask();
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [spotlightStyle, setSpotlightStyle] = useState({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isGuideVisible || !activeGuide) return;

    const currentStep = activeGuide.steps[activeGuide.currentStep];
    if (!currentStep) return;

    const updatePosition = () => {
      const targetElement = document.querySelector(currentStep.targetElement);
      
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const padding = 10;
        
        setPosition({
          top: Math.max(0, rect.top - padding),
          left: Math.max(0, rect.left - padding),
          width: rect.width + padding * 2,
          height: rect.height + padding * 2
        });

        if (tooltipRef.current) {
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          let tooltipTop = 0;
          let tooltipLeft = 0;

          switch (currentStep.position) {
            case 'top':
              tooltipTop = position.top - tooltipRect.height - 20;
              tooltipLeft = position.left + (position.width - tooltipRect.width) / 2;
              break;
            case 'bottom':
              tooltipTop = position.top + position.height + 20;
              tooltipLeft = position.left + (position.width - tooltipRect.width) / 2;
              break;
            case 'left':
              tooltipTop = position.top + (position.height - tooltipRect.height) / 2;
              tooltipLeft = position.left - tooltipRect.width - 20;
              break;
            case 'right':
              tooltipTop = position.top + (position.height - tooltipRect.height) / 2;
              tooltipLeft = position.left + position.width + 20;
              break;
            case 'center':
              tooltipTop = (window.innerHeight - tooltipRect.height) / 2;
              tooltipLeft = (window.innerWidth - tooltipRect.width) / 2;
              break;
          }

          tooltipRef.current.style.top = `${Math.max(10, Math.min(tooltipTop, window.innerHeight - tooltipRect.height - 10))}px`;
          tooltipRef.current.style.left = `${Math.max(10, Math.min(tooltipLeft, window.innerWidth - tooltipRect.width - 10))}px`;
        }
      } else if (currentStep.position === 'center') {
        setPosition({ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    const observer = new MutationObserver(updatePosition);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      observer.disconnect();
    };
  }, [isGuideVisible, activeGuide]);

  if (!isGuideVisible || !activeGuide) return null;

  const currentStep = activeGuide.steps[activeGuide.currentStep];
  if (!currentStep) return null;

  const progress = ((activeGuide.currentStep + 1) / activeGuide.steps.length) * 100;

  const handleNext = () => {
    if (currentStep.nextStep === 'finish') {
      completeGuide(activeGuide.id);
    } else {
      nextGuideStep();
    }
  };

  const handleBackdropClick = () => {
    if (currentStep.actionRequired) {
      return;
    }
    handleNext();
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Spotlight Effect */}
      <div 
        className="absolute transition-all duration-300 ease-out rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.75)]"
        style={{
          top: position.top,
          left: position.left,
          width: position.width,
          height: position.height
        }}
      />

      {/* Interactive overlay for non-action steps */}
      {!currentStep.actionRequired && (
        <div 
          className="absolute inset-0 pointer-events-auto cursor-pointer"
          onClick={handleBackdropClick}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute z-[10000] pointer-events-auto bg-gray-900 border border-blue-500/50 rounded-2xl shadow-2xl shadow-blue-500/20 max-w-[calc(100vw-20px)] sm:max-w-sm animate-in fade-in zoom-in duration-300"
        style={{ position: 'fixed' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold">
              {activeGuide.currentStep + 1}
            </div>
            <span className="text-[11px] sm:text-sm font-medium text-gray-400">{activeGuide.name}</span>
          </div>
          {currentStep.skipable && (
            <button
              onClick={skipGuide}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <span className="material-icons text-[16px] sm:text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-800">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-5">
          <h3 className="text-sm sm:text-lg font-bold text-white mb-1.5 sm:mb-2">{currentStep.title}</h3>
          <p className="text-[11px] sm:text-sm text-gray-400 leading-relaxed">{currentStep.content}</p>
          
          {currentStep.actionRequired && (
            <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex items-center gap-1.5 sm:gap-2 text-blue-400 text-[10px] sm:text-xs">
                <span className="material-icons text-[14px] sm:text-[16px]">touch_app</span>
                <span>请按提示完成操作后继续</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-t border-gray-800 bg-gray-900/50 rounded-b-2xl">
          <span className="text-[10px] sm:text-xs text-gray-500">
            {activeGuide.currentStep + 1} / {activeGuide.steps.length}
          </span>
          <div className="flex gap-1.5 sm:gap-2">
            {currentStep.skipable && (
              <button
                onClick={skipGuide}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 hover:text-white transition-colors"
              >
                跳过
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={currentStep.actionRequired}
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${
                currentStep.actionRequired
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-500/25'
              }`}
            >
              {currentStep.nextStep === 'finish' ? '完成' : '下一步'}
              <span className="material-icons text-[12px] sm:text-[14px] ml-1 align-middle">
                {currentStep.nextStep === 'finish' ? 'check' : 'arrow_forward'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Animated pulse for target element */}
      {currentStep.targetElement !== 'body' && (
        <div
          className="absolute rounded-xl border-2 border-blue-500 animate-pulse pointer-events-none"
          style={{
            top: position.top - 4,
            left: position.left - 4,
            width: position.width + 8,
            height: position.height + 8
          }}
        />
      )}
    </div>
  );
};

export default GuideOverlay;
