import { useEffect, useState, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useSession } from '@/context/session';
import { StaffShell } from '@/components/staff-shell';
import { useTheme } from '@/components/theme-provider';
import { appearanceDefaults, palettes, fontFamilies, type Appearance } from '@/components/theme-provider/appearance';
import { useTranslation } from '@/lib/i18n';

type Choice = { key: string; label: string; description?: string };
function RadioCards({ label, choices, value, change, disabled, sample }: { label: string; choices: readonly Choice[]; value: string; change: (value: string) => void; disabled: boolean; sample?: 'palette' | 'typography' }) {
  return <><h2>{label}</h2><div role="radiogroup" aria-label={label} className="internal-choice-grid">{choices.map((choice, index) => <button type="button" role="radio" aria-checked={choice.key === value} tabIndex={choice.key === value ? 0 : -1} disabled={disabled} key={choice.key} className="internal-choice" onClick={() => change(choice.key)} onKeyDown={event => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : (index + (['ArrowLeft','ArrowUp'].includes(event.key) ? -1 : 1) + choices.length) % choices.length;
    change(choices[next].key);
    (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
  }}><strong>{choice.label}</strong>{choice.description && <small>{choice.description}</small>}{sample === 'palette' && <span className="internal-swatches">{(() => { const palette = palettes.find(row => row.key === choice.key)!; return [palette.canvas,palette.accent,palette.dark].map((color, slot) => <i key={slot} style={{background:color}}/>); })()}</span>}{sample === 'typography' && <span style={{display:'block',marginTop:'.5rem',fontFamily:fontFamilies[choice.key as Appearance['typography']]}}>Welcome · እንኳን ደህና መጡ</span>}</button>)}</div></>;
}
export default function InternalAppearance() {
  const { t } = useTranslation();
  const { appearance, savedAppearance, previewAppearance, cancelAppearance, saveAppearance, saving, isLoadingColors, appearanceError, resolvedTheme } = useTheme();
  const { session, loading } = useSession();
  const [message, setMessage] = useState('');
  const dirty = JSON.stringify(appearance) !== JSON.stringify(savedAppearance);
  const cancelRef = useRef(cancelAppearance);
  cancelRef.current = cancelAppearance;
  useEffect(() => () => cancelRef.current(), []);
  const change = (key: keyof Appearance, value: string) => {setMessage('');previewAppearance({...appearance,[key]:value} as Appearance);};
  const disabled = saving || isLoadingColors;
  if (!loading && !session?.authenticated) return <Navigate to="/login" replace/>;
  return <StaffShell width="default"><div className="internal-appearance">
    <Link to="/settings">← {t('staff.appearance.back')}</Link>
    <h1>{t('staff.appearance.title')}</h1><p>{t('staff.appearance.intro')}</p>
    <p>{t('staff.appearance.hint')}</p>
    <RadioCards label={t('staff.appearance.paletteTitle')} sample="palette" choices={palettes.map(palette => ({ key: palette.key, label: t(`staff.appearance.palette.${palette.key}`) }))} value={appearance.palette} change={value=>change('palette',value)} disabled={disabled}/>
    <RadioCards label={t('staff.appearance.modeTitle')} choices={[{key:'light',label:t('staff.shell.themeLight')},{key:'dark',label:t('staff.shell.themeDark')},{key:'system',label:t('staff.shell.themeSystem'),description:t('staff.appearance.modeSystemHint')}]} value={appearance.mode} change={value=>change('mode',value)} disabled={disabled}/>
    <RadioCards label={t('staff.appearance.typographyTitle')} sample="typography" choices={(['system','noto','serif'] as const).map(key => ({key,label:t(`staff.appearance.typography.${key}`),description:t(`staff.appearance.typographyHint.${key}`)}))} value={appearance.typography} change={value=>change('typography',value)} disabled={disabled}/>
    <RadioCards label={t('staff.appearance.textSizeTitle')} choices={[{key:'standard',label:t('staff.publicExperience.motionStandard')},{key:'large',label:t('staff.appearance.large')}]} value={appearance.text_size} change={value=>change('text_size',value)} disabled={disabled}/>
    <RadioCards label={t('staff.appearance.densityTitle')} choices={[{key:'comfortable',label:t('staff.publicExperience.densityComfortable'),description:t('staff.appearance.densityHint.comfortable')},{key:'compact',label:t('staff.appearance.compact'),description:t('staff.appearance.densityHint.compact')}]} value={appearance.density} change={value=>change('density',value)} disabled={disabled}/>
    <section aria-label={t('staff.appearance.previewLabel')} className="internal-preview"><h2>Your workspace · የሥራ ቦታ</h2><p>{resolvedTheme === 'dark' ? t('staff.appearance.previewDark') : t('staff.appearance.previewLight')}</p><div className="internal-preview-row"><strong>09:30 · {t('staff.appearance.sampleService')}</strong><span style={{color:'var(--status-confirmed-text)'}}>{t('staff.status.confirmed')}</span><button type="button">{t('staff.appearance.viewAppointment')}</button></div><p>{t('staff.appearance.previewNote')}</p></section>
    {appearanceError && <p role="alert">{appearanceError}</p>}
    <p role="status">{message || (dirty ? t('staff.appearance.unsaved') : t('staff.appearance.saved'))}</p>
    <div className="internal-actions"><button type="button" className="internal-save" disabled={disabled || !dirty} onClick={async()=>{try{await saveAppearance();setMessage(t('staff.appearance.savedMessage'));}catch{setMessage('');}}}>{saving?t('staff.form.saving'):t('staff.appearance.save')}</button><button type="button" disabled={disabled} onClick={()=>{cancelAppearance();setMessage(t('staff.appearance.restored'));}}>{t('staff.form.cancel')}</button><button type="button" disabled={disabled} onClick={()=>{previewAppearance({...appearanceDefaults});setMessage(t('staff.appearance.defaultsPreviewed'));}}>{t('staff.appearance.reset')}</button></div>
  </div></StaffShell>;
}
