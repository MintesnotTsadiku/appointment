import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { FieldHint, SettingsSection } from '@/components/settings-layout';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { TextField, LanguagePair } from './fields';
import { ImageInput } from './ImageInput';
import type { BrandValues } from './types';

interface BrandPanelProps {
  value: BrandValues;
  errors: Record<string, string>;
  onChange: (next: Partial<BrandValues>) => void;
}

/** Name, address, taglines, images, colour and contact of the platform. */
export function BrandPanel({ value, errors, onChange }: BrandPanelProps) {
  const { t } = useTranslation();
  const host = value.short_host || 'example.com';
  return (
    <div className="space-y-6">
      <SettingsSection title={t('staff.brandGrowth.identity.title')} description={t('staff.brandGrowth.identity.description')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="brand-product-name" label={t('staff.brandGrowth.identity.productName')} value={value.product_name} maxLength={60}
            error={errors.product_name} onChange={(product_name) => onChange({ product_name })} />
          <TextField id="brand-product-url" type="url" label={t('staff.brandGrowth.identity.productUrl')} value={value.product_url} placeholder="https://"
            hint={t('staff.brandGrowth.identity.productUrlHint')} error={errors.product_url} onChange={(product_url) => onChange({ product_url })} />
          <TextField id="brand-short-host" label={t('staff.brandGrowth.identity.shortHost')} value={value.short_host} maxLength={60}
            hint={t('staff.brandGrowth.identity.shortHostHint').replace('{0}', `${host}/hana`)} error={errors.short_host}
            onChange={(short_host) => onChange({ short_host })} />
        </div>
        <div className="mt-5">
          <LanguagePair id="brand-tagline" label={t('staff.brandGrowth.identity.tagline')} en={value.tagline_en} am={value.tagline_am} maxLength={140}
            onChange={(language, text) => onChange(language === 'en' ? { tagline_en: text } : { tagline_am: text })} />
        </div>
      </SettingsSection>

      <SettingsSection title={t('staff.brandGrowth.images.title')} description={t('staff.brandGrowth.images.description')}>
        <div className="grid gap-6 md:grid-cols-2">
          <ImageInput field="mark" shape="square" label={t('staff.brandGrowth.images.mark')} hint={t('staff.brandGrowth.images.markHint')}
            value={value.mark} onChange={(mark) => onChange({ mark })} />
          <ImageInput field="og_image" shape="square" label={t('staff.brandGrowth.images.ogImage')} hint={t('staff.brandGrowth.images.ogImageHint')}
            value={value.og_image} onChange={(og_image) => onChange({ og_image })} />
          <ImageInput field="logo" label={t('staff.brandGrowth.images.logo')} hint={t('staff.brandGrowth.images.logoHint')}
            value={value.logo} onChange={(logo) => onChange({ logo })} />
          <ImageInput field="logo_dark" dark label={t('staff.brandGrowth.images.logoDark')} hint={t('staff.brandGrowth.images.logoDarkHint')}
            value={value.logo_dark} onChange={(logo_dark) => onChange({ logo_dark })} />
        </div>
      </SettingsSection>

      <SettingsSection title={t('staff.brandGrowth.contact.title')} description={t('staff.brandGrowth.contact.description')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="brand-primary-color">{t('staff.brandGrowth.contact.primaryColor')}</Label>
            <div className="flex gap-2">
              <Input id="brand-primary-color-swatch" type="color" aria-label={t('staff.brandGrowth.contact.primaryColor')} data-qa="brand-primary-color-swatch"
                className="h-10 w-14 shrink-0 cursor-pointer p-1 max-sm:h-11" value={/^#[0-9a-f]{6}$/i.test(value.primary_color) ? value.primary_color : '#000000'}
                onChange={(event) => onChange({ primary_color: event.target.value.toUpperCase() })} />
              <Input id="brand-primary-color" data-qa="brand-primary-color" value={value.primary_color} maxLength={7} placeholder="#A23B72" spellCheck={false}
                aria-invalid={Boolean(errors.primary_color) || undefined} aria-describedby="brand-primary-color-hint"
                className={cn('font-mono uppercase', errors.primary_color && 'border-destructive')}
                onChange={(event) => onChange({ primary_color: event.target.value.trim() })} />
            </div>
            <FieldHint id="brand-primary-color-hint" error={Boolean(errors.primary_color)}>
              {errors.primary_color ? t(errors.primary_color) : t('staff.brandGrowth.contact.primaryColorHint')}
            </FieldHint>
          </div>
          <TextField id="brand-support-email" type="email" label={t('staff.brandGrowth.contact.supportEmail')} value={value.support_email}
            error={errors.support_email} onChange={(support_email) => onChange({ support_email })} />
          <TextField id="brand-telegram-url" type="url" label={t('staff.brandGrowth.contact.telegramUrl')} value={value.telegram_url} placeholder="https://t.me/"
            error={errors.telegram_url} onChange={(telegram_url) => onChange({ telegram_url })} />
        </div>
      </SettingsSection>
    </div>
  );
}
