import { Panel } from '@/components/analytics/Panels';
import { StatusBadge } from '@/components/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table';
import { useTranslation } from '@/lib/i18n';
import { etb, type Activity } from './types';

export function ActivityTable({ rows }: { rows: Activity[] }) {
  const { t } = useTranslation();
  return (
    <Panel title={t('staff.admin.recentActivity')} subtitle={t('staff.admin.recentActivitySubtitle')} qa="admin-recent-activity">
      <div className="-mx-5 overflow-x-auto px-5">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t('staff.admin.colId')}</TableHead>
              <TableHead>{t('staff.admin.colClient')}</TableHead>
              <TableHead>{t('staff.admin.colProvider')}</TableHead>
              <TableHead>{t('staff.admin.colStatus')}</TableHead>
              <TableHead>{t('staff.admin.colDate')}</TableHead>
              <TableHead className="text-right">{t('staff.admin.colAmount')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => <ActivityRow key={row.id} row={row} />)
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {t('staff.admin.noActivity')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}

function ActivityRow({ row }: { row: Activity }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{row.id}</TableCell>
      <TableCell className="font-medium">{row.client_name}</TableCell>
      <TableCell className="text-muted-foreground">{row.provider}</TableCell>
      <TableCell>
        <StatusBadge status={row.status} />
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
        {row.date && new Date(row.date).toLocaleDateString()}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">{row.amount > 0 ? etb(row.amount) : '—'}</TableCell>
    </TableRow>
  );
}
