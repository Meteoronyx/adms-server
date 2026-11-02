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
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/40 transition-opacity duration-150 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup
            className={`w-full ${sizeClasses[size] || sizeClasses.md} bg-surface border border-border rounded-[8px] transition-[transform,opacity] duration-150 ease-out data-[ending-style]:opacity-0 data-[ending-style]:scale-98 data-[starting-style]:opacity-0 data-[starting-style]:scale-98 outline-none p-5 text-ink flex flex-col gap-4 relative`}
          >
            {(title || description) && (
              <div className="pr-8">
                {title && (
                  <Dialog.Title className="text-base font-semibold text-ink">
                    {title}
                  </Dialog.Title>
                )}
                {description && (
                  <Dialog.Description className="text-xs text-muted mt-1">
                    {description}
                  </Dialog.Description>
                )}
              </div>
            )}

            <Dialog.Close
              aria-label="Tutup dialog"
              className="absolute top-4 right-4 p-1.5 rounded-[6px] text-muted hover:text-ink hover:bg-raised transition-colors focus:outline-none"
            >
              <X size={16} />
            </Dialog.Close>

            <div className="flex-1 text-sm">{children}</div>

            {footer && (
              <div className="flex justify-end gap-2 pt-3 border-t border-rule">
                {footer}
              </div>
            )}
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
