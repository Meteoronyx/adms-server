import { Menu } from '@base-ui/react';

export function DropdownMenu({
  trigger,
  items = [],
  align = 'end',
  side = 'bottom',
  sideOffset = 4,
}) {
  return (
    <Menu.Root>
      <Menu.Trigger render={trigger} />
      <Menu.Portal>
        <Menu.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50">
          <Menu.Popup className="min-w-[168px] bg-surface border border-border rounded-[8px] p-1 text-ink transition-[transform,opacity] duration-150 ease-out data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 outline-none">
            {items.map((item, idx) => {
              if (item.type === 'separator') {
                return (
                  <Menu.Separator
                    key={idx}
                    className="h-px bg-rule my-1"
                  />
                );
              }

              const Icon = item.icon;
              const isDanger = item.variant === 'danger';

              return (
                <Menu.Item
                  key={idx}
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={`flex items-center gap-2.5 px-2.5 h-8 text-xs font-medium rounded-[6px] cursor-pointer transition-colors outline-none select-none data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed ${
                    isDanger
                      ? 'text-negative hover:bg-negative-bg data-[highlighted]:bg-negative-bg'
                      : 'text-ink hover:bg-raised data-[highlighted]:bg-raised'
                  }`}
                >
                  {Icon && <Icon size={14} className={isDanger ? 'text-negative' : 'text-muted'} />}
                  <span>{item.label}</span>
                </Menu.Item>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
