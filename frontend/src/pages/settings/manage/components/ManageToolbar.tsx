import { Building2, Search, Users } from 'lucide-react';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { TabsList, TabsTrigger } from '@/components/tabs';
import { useTranslation } from '@/lib/i18n';
import type { OrganizationNode } from '../types';

export type ViewType = 'organization' | 'provider';

interface ManageToolbarProps {
  showTabs: boolean;
  viewType: ViewType;
  organizations: OrganizationNode[];
  selectedOrgIndex: number;
  onSelectOrg: (index: number) => void;
  query: string;
  onQueryChange: (value: string) => void;
}

/** View switch (organization / provider), business picker and search. Must render inside <Tabs> when showTabs. */
export function ManageToolbar({ showTabs, viewType, organizations, selectedOrgIndex, onSelectOrg, query, onQueryChange }: ManageToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-card sm:flex-row sm:flex-wrap sm:items-center">
      {showTabs && (
        <TabsList aria-label={t('staff.manage.viewBy')} className="w-full sm:w-auto">
          <TabsTrigger value="organization" data-qa="manage-view-organization" className="flex-1 sm:flex-none">
            <Building2 aria-hidden="true" />
            {t('staff.manage.views.organization')}
          </TabsTrigger>
          <TabsTrigger value="provider" data-qa="manage-view-provider" className="flex-1 sm:flex-none">
            <Users aria-hidden="true" />
            {t('staff.manage.views.provider')}
          </TabsTrigger>
        </TabsList>
      )}
      {viewType === 'organization' && organizations.length > 1 && (
        <div className="w-full min-w-0 sm:w-64">
          <Label htmlFor="manage-org-select" className="sr-only">{t('staff.manage.selectOrganization')}</Label>
          <Select value={String(selectedOrgIndex)} onValueChange={(value) => onSelectOrg(Number(value))}>
            <SelectTrigger id="manage-org-select" data-qa="manage-org-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org, index) => (
                <SelectItem key={org.name} value={String(index)}>
                  {org.organization_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="relative w-full min-w-0 sm:ml-auto sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          data-qa="manage-search"
          aria-label={t('staff.manage.searchLabel')}
          placeholder={t('staff.manage.searchPlaceholder')}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
