import { SettingsSection } from '@/components/settings-layout';
import { useTranslation } from '@/lib/i18n';
import { LanguagePair, SwitchRow, TextField } from './fields';
import type { GrowthFlag, GrowthValues } from './types';

interface GrowthPanelProps {
  value: GrowthValues;
  errors: Record<string, string>;
  onChange: (next: Partial<GrowthValues>) => void;
}

const K = 'staff.brandGrowth.growth';

/** Growth switches, numbers and texts, grouped like the Growth Settings DocType. */
export function GrowthPanel({ value, errors, onChange }: GrowthPanelProps) {
  const { t } = useTranslation();
  const flag = (field: GrowthFlag, key: string, children?: React.ReactNode) => (
    <SwitchRow id={`growth-${field.replace(/_/g, '-')}`} label={t(`${K}.${key}`)} description={t(`${K}.${key}Hint`)}
      checked={Boolean(value[field])} onChange={(checked) => onChange({ [field]: checked ? 1 : 0 })}>
      {children}
    </SwitchRow>
  );
  const number = (field: GrowthFlag, key: string, min = 0, max?: number) => (
    <TextField id={`growth-${field.replace(/_/g, '-')}`} type="number" min={min} max={max} label={t(`${K}.${key}`)} value={value[field]}
      error={errors[field]} onChange={(text) => onChange({ [field]: text === '' ? 0 : Math.trunc(Number(text)) })} />
  );
  const pair = (field: 'own_page_text' | 'share_message', key: string, hint?: string, multiline = false) => (
    <LanguagePair id={`growth-${field.replace(/_/g, '-')}`} label={t(`${K}.${key}`)} en={value[`${field}_en`]} am={value[`${field}_am`]}
      multiline={multiline} maxLength={field === 'own_page_text' ? 80 : 280} hint={hint}
      errors={{ en: errors[`${field}_en`], am: errors[`${field}_am`] }}
      onChange={(language, text) => onChange({ [`${field}_${language}`]: text })} />
  );

  return (
    <div className="space-y-6">
      <SettingsSection title={t(`${K}.touchpoints`)} description={t(`${K}.touchpointsHint`)}>
        <div className="divide-y">
          {flag('powered_by_pages', 'poweredByPages')}
          {flag('powered_by_emails', 'poweredByEmails')}
          {flag('powered_by_sms', 'poweredBySms')}
          {flag('book_again_enabled', 'bookAgain')}
          {flag('customer_business_prompt_enabled', 'customerPrompt')}
        </div>
        <div className="mt-5 border-t pt-5">{pair('own_page_text', 'ownPageText', t(`${K}.ownPageTextHint`))}</div>
      </SettingsSection>

      <SettingsSection title={t(`${K}.sharing`)} description={t(`${K}.sharingHint`)}>
        {pair('share_message', 'shareMessage', t(`${K}.shareMessageHint`), true)}
        <div className="mt-5 border-t pt-5">{flag('posters_enabled', 'posters')}</div>
      </SettingsSection>

      <SettingsSection title={t(`${K}.referrals`)} description={t(`${K}.referralsHint`)}>
        <div className="divide-y">
          {flag('business_referrals_enabled', 'businessReferrals', <>
            {number('referral_threshold_bookings', 'thresholdBookings')}
            {number('referral_reward_free_bookings', 'rewardFreeBookings')}
          </>)}
          {flag('customer_referrals_enabled', 'customerReferrals', number('customer_referral_default_percent', 'customerPercent', 0, 100))}
          {flag('partner_program_enabled', 'partnerProgram', number('partner_reward_free_bookings', 'partnerReward'))}
        </div>
      </SettingsSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsSection title={t(`${K}.tools`)}>
          {flag('tools_enabled', 'toolsEnabled')}
        </SettingsSection>
        <SettingsSection title={t(`${K}.marketing`)}>
          {number('marketing_live_minutes', 'liveMinutes', 1)}
        </SettingsSection>
      </div>

      <SettingsSection title={t(`${K}.showoff`)} description={t(`${K}.showoffHint`)}>
        <div className="divide-y">
          {flag('directory_enabled', 'directory')}
          {flag('year_review_enabled', 'yearReview')}
          {flag('template_credit_enabled', 'templateCredit')}
        </div>
      </SettingsSection>
    </div>
  );
}
