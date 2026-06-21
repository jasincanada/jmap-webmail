'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpDown, ChevronDown, Filter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { ListFilter, ListSort } from '@/lib/list-query-utils';
import { isListFilterActive } from '@/lib/list-query-utils';
import { isMailboxListViewActive } from '@/lib/jmap/search-utils';
import { useSettingsStore } from '@/stores/settings-store';
import { useAuthStore } from '@/stores/auth-store';
import { useEmailStore } from '@/stores/email-store';

interface MenuOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

function DropdownMenu<T extends string>({
  label,
  icon: Icon,
  value,
  options,
  isActive,
  onChange,
}: {
  label: string;
  icon: typeof Filter;
  value: T;
  options: MenuOption<T>[];
  isActive?: boolean;
  onChange: (value: T) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const selectedLabel = options.find((option) => option.value === value)?.label ?? label;

  const getMenuPosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 };
    const rect = buttonRef.current.getBoundingClientRect();
    return { top: rect.bottom + 6, left: Math.max(8, rect.left) };
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((open) => !open);
        }}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
          'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border bg-background text-foreground',
        )}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="whitespace-nowrap">{selectedLabel}</span>
        <ChevronDown className={cn('w-3 h-3 shrink-0 opacity-70 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[200] min-w-[12rem] max-w-[16rem] rounded-md border border-border bg-background shadow-lg animate-in fade-in-0 zoom-in-95 duration-100"
          style={getMenuPosition()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={option.value === value}
                className={cn(
                  'w-full px-3 py-2 text-left transition-colors hover:bg-muted',
                  option.value === value && 'bg-accent text-accent-foreground',
                )}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span className="block text-sm">{option.label}</span>
                {option.description && (
                  <span className="block text-xs text-muted-foreground mt-0.5">{option.description}</span>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function EmailListControls() {
  const t = useTranslations('email_list');
  const { client } = useAuthStore();
  const { selectedMailbox, fetchEmails, searchQuery, searchFilters } = useEmailStore();
  const listSort = useSettingsStore((state) => state.listSort);
  const listFilter = useSettingsStore((state) => state.listFilter);
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const mailboxListViewActive = isMailboxListViewActive(searchQuery, searchFilters);
  const [isUpdating, setIsUpdating] = useState(false);

  const refreshList = async () => {
    if (!client || !selectedMailbox) return;
    setIsUpdating(true);
    try {
      await fetchEmails(client, selectedMailbox);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFilterChange = async (next: ListFilter) => {
    updateSetting('listFilter', next);
    await refreshList();
  };

  const handleSortChange = async (next: ListSort) => {
    updateSetting('listSort', next);
    await refreshList();
  };

  const filterOptions: MenuOption<ListFilter>[] = [
    { value: 'all', label: t('list_filter.all'), description: t('list_filter.all_hint') },
    { value: 'unread', label: t('list_filter.unread'), description: t('list_filter.unread_hint') },
    { value: 'read', label: t('list_filter.read'), description: t('list_filter.read_hint') },
    { value: 'starred', label: t('list_filter.starred'), description: t('list_filter.starred_hint') },
    { value: 'attachments', label: t('list_filter.attachments'), description: t('list_filter.attachments_hint') },
  ];

  const sortOptions: MenuOption<ListSort>[] = [
    { value: 'date-desc', label: t('list_sort.date_desc') },
    { value: 'date-asc', label: t('list_sort.date_asc') },
    { value: 'subject-asc', label: t('list_sort.subject_asc') },
    { value: 'subject-desc', label: t('list_sort.subject_desc') },
    { value: 'sender-asc', label: t('list_sort.sender_asc') },
    { value: 'sender-desc', label: t('list_sort.sender_desc') },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 relative z-20 pointer-events-auto">
      <DropdownMenu
        label={t('list_filter.label')}
        icon={Filter}
        value={listFilter}
        options={filterOptions}
        isActive={isListFilterActive(listFilter)}
        onChange={handleFilterChange}
      />
      <DropdownMenu
        label={t('list_sort.label')}
        icon={ArrowUpDown}
        value={listSort}
        options={sortOptions}
        onChange={handleSortChange}
      />
      {isUpdating && (
        <span className="text-xs text-muted-foreground animate-pulse">{t('list_controls.updating')}</span>
      )}
      {!mailboxListViewActive && (
        <span className="text-xs text-muted-foreground">{t('list_controls.search_active_hint')}</span>
      )}
    </div>
  );
}