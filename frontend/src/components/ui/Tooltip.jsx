import { Tooltip as BaseTooltip } from '@base-ui/react';

export function Tooltip({
  children,
  content,
  side = 'right',
  align = 'center',
  sideOffset = 8,
  delay = 150,
  disabled = false,
}) {
  if (disabled || !content) return children;

  return (
    <BaseTooltip.Root delay={delay}>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50">
          <BaseTooltip.Popup className="bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900 text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl transition-all duration-150 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 outline-none pointer-events-none border border-slate-800 dark:border-slate-200">
            {content}
            <BaseTooltip.Arrow className="fill-slate-900 dark:fill-slate-100" />
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
