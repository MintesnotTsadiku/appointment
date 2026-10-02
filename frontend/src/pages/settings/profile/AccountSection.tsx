import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { LogOut } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/alert-dialog';
import { Button } from '@/components/button';
import { SettingsSection } from '@/components/settings-layout';
import { useTranslation } from '@/lib/i18n';

export function AccountSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useFrappeAuth();
  const [confirming, setConfirming] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <SettingsSection title={t('staff.profile.accountTitle')} description={t('staff.profile.accountDescription')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{t('staff.profile.logout')}</p>
          <p className="text-xs text-muted-foreground">{t('staff.profile.logoutDescription')}</p>
        </div>
        <Button type="button" variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirming(true)}>
          <LogOut aria-hidden="true" />
          {t('staff.profile.logout')}
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('staff.profile.logoutTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('staff.profile.logoutConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('staff.form.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>{t('staff.profile.logout')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
