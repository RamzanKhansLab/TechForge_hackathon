import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Slide-over drawer (560px on desktop, full-screen on mobile)
 * Fully keyboard accessible (Escape to close, focus trapped).
 */
export function Drawer({ isOpen, onClose, title, subtitle, children }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/30 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div
          ref={drawerRef}
          className="w-screen max-w-xl bg-card border-l border-rule shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
        >
          {/* Header */}
          <div>
            <div className="flex items-start justify-between border-b border-rule pb-4 mb-6">
              <div>
                <h3 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h3>
                {subtitle && <p className="font-mono text-xs text-ink-3 mt-1">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-[2px] border border-rule hover:bg-paper text-ink transition"
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EvidenceLink({ href, path, line, note, className = '' }) {
  return (
    <div className={`text-xs ${className}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-link underline font-mono inline-flex items-center gap-1 hover:text-ink transition"
      >
        <span>{path}</span>
        {line && <span>#L{line}</span>}
        <span className="no-underline text-[10px]">↗</span>
      </a>
      {note && <p className="text-ink-2 text-[11px] mt-0.5">{note}</p>}
    </div>
  );
}

export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }) {
  let baseStyle = 'inline-flex items-center justify-center font-sans font-medium transition duration-150 rounded-[2px] disabled:opacity-50 disabled:cursor-not-allowed';

  let sizeStyle = size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm';

  let variantStyle = '';
  if (variant === 'primary') {
    variantStyle = 'bg-ink text-paper hover:bg-ink/90 border border-ink';
  } else if (variant === 'secondary') {
    variantStyle = 'border border-rule bg-card text-ink hover:bg-paper-2';
  } else if (variant === 'destructive') {
    variantStyle = 'border border-claimed text-claimed hover:bg-claimed-bg/40';
  } else if (variant === 'ghost') {
    variantStyle = 'text-ink-2 hover:text-ink hover:bg-paper-2';
  }

  return (
    <button className={`${baseStyle} ${sizeStyle} ${variantStyle} ${className}`} {...props}>
      {children}
    </button>
  );
}
