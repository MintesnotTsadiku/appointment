/** Provider-centric view: Provider → Organizations → Locations → Services → EventTypes. */
import { useState } from 'react';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/states';
import { useTranslation } from '@/lib/i18n';
import { matchesQuery, type EditTarget, type ProviderNode } from '../types';
import { CreateItemModal } from './CreateItemModal';
import { EditItemModal } from './EditItemModal';
import { useItemDeletion } from './useItemDeletion';
import { createOptions, editOptions, type CreateContext } from './providerOptions';
import { ProviderNodeView, type NodeContext } from './ProviderTreeNodes';

interface ProviderHierarchyTreeProps {
  providers: ProviderNode[];
  onRefresh: () => void;
  query?: string;
}

function useExpandedSet() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return { isOpen: (key: string) => expanded.has(key), toggle };
}

export const ProviderHierarchyTree = ({ providers, onRefresh, query = '' }: ProviderHierarchyTreeProps) => {
  const { t } = useTranslation();
  const expansion = useExpandedSet();
  const [editItem, setEditItem] = useState<EditTarget | null>(null);
  const [createContext, setCreateContext] = useState<CreateContext | null>(null);
  const { requestDelete, dialog } = useItemDeletion(onRefresh);

  if (!providers || providers.length === 0) {
    return <EmptyState icon={Users} title={t('staff.manage.empty.providersInOrgs')} />;
  }

  const visible = providers.filter((p) => matchesQuery(p.provider_name, query) || matchesQuery(p.email, query));
  const ctx: NodeContext = {
    handlers: { t, edit: setEditItem, create: setCreateContext },
    isOpen: expansion.isOpen,
    toggle: expansion.toggle,
    onDelete: requestDelete,
  };

  return (
    <div className="space-y-4">
      {visible.length === 0 ? (
        <EmptyState icon={Users} title={t('staff.manage.noMatches')} compact />
      ) : (
        visible.map((provider) => <ProviderNodeView key={provider.name} provider={provider} ctx={ctx} />)
      )}

      {createContext && (
        <CreateItemModal
          isOpen
          onClose={() => setCreateContext(null)}
          type="event_type"
          organizationId={createContext.organization}
          context={createContext}
          organization={createOptions(providers, createContext)}
          onSuccess={() => {
            setCreateContext(null);
            onRefresh();
          }}
        />
      )}
      {editItem && (
        <EditItemModal isOpen onClose={() => setEditItem(null)} item={editItem} organization={editOptions(providers, editItem)} onSuccess={onRefresh} />
      )}
      {dialog}
    </div>
  );
};
