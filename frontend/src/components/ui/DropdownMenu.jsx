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
          <Menu.Popup className="min-w-[160px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-1 text-slate-900 dark:text-slate-100 transition-all duration-150 ease-out data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 outline-none">
            {items.map((item, idx) => {
              if (item.type === 'separator') {
                return (
                  <Menu.Separator
                    key={idx}
                    className="h-px bg-slate-100 dark:bg-slate-800 my-1"
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
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors outline-none select-none data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed ${
                    isDanger
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-950/40'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800'
                  }`}
                >
                  {Icon && <Icon size={14} className={isDanger ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'} />}
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
