'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { insightContent } from '@/data/insight-content';

interface InsightTooltipProps {
  metricKey: string;
  variant?: 'light' | 'dark';
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function InsightTooltip({
  metricKey,
  variant = 'light',
  position = 'top',
}: InsightTooltipProps) {
  const content = insightContent[metricKey];
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [resolvedPosition, setResolvedPosition] = useState(position);
  const iconRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculatePosition = useCallback(() => {
    if (!iconRef.current) return;

    const rect = iconRef.current.getBoundingClientRect();
    const panelWidth = 280;
    const panelHeight = 260; // estimated
    const gap = 8;

    let x = 0;
    let y = 0;
    let finalPosition = position;

    // Check if preferred position fits, otherwise flip
    switch (position) {
      case 'top':
        if (rect.top < panelHeight + gap) finalPosition = 'bottom';
        break;
      case 'bottom':
        if (window.innerHeight - rect.bottom < panelHeight + gap) finalPosition = 'top';
        break;
      case 'left':
        if (rect.left < panelWidth + gap) finalPosition = 'right';
        break;
      case 'right':
        if (window.innerWidth - rect.right < panelWidth + gap) finalPosition = 'left';
        break;
    }

    switch (finalPosition) {
      case 'top':
        x = rect.left + rect.width / 2 - panelWidth / 2;
        y = rect.top - gap;
        break;
      case 'bottom':
        x = rect.left + rect.width / 2 - panelWidth / 2;
        y = rect.bottom + gap;
        break;
      case 'left':
        x = rect.left - panelWidth - gap;
        y = rect.top + rect.height / 2 - panelHeight / 2;
        break;
      case 'right':
        x = rect.right + gap;
        y = rect.top + rect.height / 2 - panelHeight / 2;
        break;
    }

    // Clamp to viewport edges
    x = Math.max(8, Math.min(x, window.innerWidth - panelWidth - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - panelHeight - 8));

    setCoords({ x, y });
    setResolvedPosition(finalPosition);
  }, [position]);

  const handleOpen = useCallback(() => {
    calculatePosition();
    setOpen(true);
  }, [calculatePosition]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  // Close on scroll or resize
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  if (!content) return null;

  const iconColor =
    variant === 'dark' ? 'text-white/30 hover:text-white/60' : 'text-gray-300 hover:text-gray-500';

  const translateY = resolvedPosition === 'bottom' ? -4 : resolvedPosition === 'top' ? 4 : 0;
  const translateX = resolvedPosition === 'right' ? -4 : resolvedPosition === 'left' ? 4 : 0;

  return (
    <>
      <span
        ref={iconRef}
        className={`inline-flex cursor-help transition-colors duration-150 ${iconColor}`}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onTouchStart={(e) => {
          e.stopPropagation();
          if (open) {
            handleClose();
          } else {
            handleOpen();
          }
        }}
        role="button"
        aria-label={`Info about ${content.title}`}
        tabIndex={0}
        onFocus={handleOpen}
        onBlur={handleClose}
      >
        <Info size={14} />
      </span>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, y: translateY, x: translateX }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: translateY, x: translateX }}
                transition={{ duration: 0.15 }}
                className="fixed z-[80] max-w-[280px] bg-[#18202F] text-white shadow-xl rounded-xl p-4 pointer-events-none select-none"
                style={{ left: coords.x, top: coords.y }}
              >
                {/* Title */}
                <div className="text-sm font-bold mb-1.5 leading-snug">{content.title}</div>

                {/* Explanation */}
                <p className="text-xs text-white/70 leading-relaxed mb-3">{content.explanation}</p>

                {/* How It's Calculated */}
                <div className="text-[10px] font-semibold text-[#FBAF1A] uppercase tracking-wide mb-1">
                  How It&apos;s Calculated
                </div>
                <p className="text-xs text-white/60 leading-relaxed mb-3">{content.methodology}</p>

                {/* What You Can Do */}
                <div className="text-[10px] font-semibold text-[#FBAF1A] uppercase tracking-wide mb-1">
                  What You Can Do
                </div>
                <p className="text-xs text-white/60 leading-relaxed">{content.actionable}</p>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
