import { Dialog } from '@base-ui/react';
import { X } from 'lucide-react';

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup
            className={`w-full ${sizeClasses[size] || sizeClasses.md} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-all duration-200 ease-out data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 outline-none p-6 text-slate-900 dark:text-slate-100 flex flex-col gap-4 relative`}
          >
            {/* Header */}
            {(title || description) && (
              <div className="pr-8">
                {title && (
                  <Dialog.Title className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {title}
                  </Dialog.Title>
                )}
                {description && (
                  <Dialog.Description className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {description}
                  </Dialog.Description>
                )}
              </div>
            )}

            {/* Close Button */}
            <Dialog.Close className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-400">
              <X size={18} />
            </Dialog.Close>

            {/* Content Body */}
            <div className="flex-1 text-sm">{children}</div>

            {/* Footer */}
            {footer && <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">{footer}</div>}
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
