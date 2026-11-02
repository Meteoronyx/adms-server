export function Tabs({
  tabs,
  items,
  activeTab,
  value,
  onChange,
  className = '',
}) {
  const tabList = tabs || items || [];
  const currentTab = activeTab !== undefined ? activeTab : value;

  return (
    <div
      className={`flex items-center gap-6 border-b border-border overflow-x-auto select-none ${className}`}
      role="tablist"
    >
      {tabList.map((tab, idx) => {
        const tabKey = tab.id ?? tab.key ?? tab.value ?? idx;
        const isActive = currentTab === tabKey;
        const Icon = tab.icon;
        const badgeValue = tab.badge !== undefined ? tab.badge : tab.count;

        return (
          <button
            key={tabKey}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(tabKey)}
            className={`relative flex items-center gap-2 pb-2.5 pt-1 text-sm whitespace-nowrap transition-colors duration-150 ${
              isActive
                ? 'text-ink font-semibold'
                : 'text-muted hover:text-ink font-normal'
            }`}
          >
            {Icon && (
              <Icon
                size={15}
                strokeWidth={1.7}
                className={isActive ? 'text-accent' : 'text-muted'}
              />
            )}
            <span>{tab.label}</span>
            {badgeValue !== undefined && (
              <span
                className={`ml-0.5 px-1.5 h-5 inline-flex items-center rounded-[4px] text-xs num ${
                  isActive
                    ? 'bg-accent-soft text-accent-ink font-medium'
                    : 'bg-raised text-muted font-normal'
                }`}
              >
                {badgeValue}
              </span>
            )}
            <span
              className={`
                absolute left-0 right-0 bottom-0 h-[2px] bg-accent
                transition-[transform,opacity] duration-150 ease-out
                ${isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-75'}
              `}
            />
          </button>
        );
      })}
    </div>
  );
}

