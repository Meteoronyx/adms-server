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
          <BaseTooltip.Popup className="bg-ink text-white text-xs font-medium px-2.5 py-1 rounded-[6px] transition-[transform,opacity] duration-150 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 outline-none pointer-events-none">
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
