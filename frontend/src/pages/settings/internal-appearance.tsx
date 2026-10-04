import { useEffect, useState, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useSession } from '@/context/session';
import { StaffShell } from '@/components/staff-shell';
import { useTheme } from '@/components/theme-provider';
import { appearanceDefaults, palettes, fontFamilies, type Appearance } from '@/components/theme-provider/appearance';

type Choice = { key: string; label: string; description?: string };
function RadioCards({ label, choices, value, change, disabled }: { label: string; choices: readonly Choice[]; value: string; change: (value: string) => void; disabled: boolean }) {
  return <><h2>{label}</h2><div role="radiogroup" aria-label={label} className="internal-choice-grid">{choices.map((choice, index) => <button type="button" role="radio" aria-checked={choice.key === value} tabIndex={choice.key === value ? 0 : -1} disabled={disabled} key={choice.key} className="internal-choice" onClick={() => change(choice.key)} onKeyDown={event => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : (index + (['ArrowLeft','ArrowUp'].includes(event.key) ? -1 : 1) + choices.length) % choices.length;
    change(choices[next].key);
    (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
  }}><strong>{choice.label}</strong>{choice.description && <small>{choice.description}</small>}{label === 'Application palette' && <span className="internal-swatches">{(() => { const palette = palettes.find(row => row.key === choice.key)!; return [palette.canvas,palette.accent,palette.dark].map(color => <i key={color} style={{background:color}}/>); })()}</span>}{label === 'Typography' && <span style={{display:'block',marginTop:'.5rem',fontFamily:fontFamilies[choice.key as Appearance['typography']]}}>Welcome · እንኳን ደህና መጡ</span>}</button>)}</div></>;
}
export default function InternalAppearance() {
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
    <Link to="/settings">← Settings and navigation preferences</Link>
    <h1>Application appearance</h1><p>Personal settings for internal pages, saved to your account across devices.</p>
    <p>Choose an option to preview it immediately. Save to keep your choices.</p>
    <RadioCards label="Application palette" choices={palettes} value={appearance.palette} change={value=>change('palette',value)} disabled={disabled}/>
    <RadioCards label="Color mode" choices={[{key:'light',label:'Light'},{key:'dark',label:'Dark'},{key:'system',label:'System',description:'Follow your device'}]} value={appearance.mode} change={value=>change('mode',value)} disabled={disabled}/>
    <RadioCards label="Typography" choices={[{key:'system',label:'System sans',description:'Device sans + Noto Ethiopic'},{key:'noto',label:'Noto Ethiopic',description:'Noto Ethiopic + device sans'},{key:'serif',label:'Classic serif',description:'DejaVu Serif + Noto Ethiopic'}]} value={appearance.typography} change={value=>change('typography',value)} disabled={disabled}/>
    <RadioCards label="Text size" choices={[{key:'standard',label:'Standard'},{key:'large',label:'Large'}]} value={appearance.text_size} change={value=>change('text_size',value)} disabled={disabled}/>
    <RadioCards label="Density" choices={[{key:'comfortable',label:'Comfortable',description:'Roomier panels and rows'},{key:'compact',label:'Compact',description:'Tighter panels; mobile touch targets stay large'}]} value={appearance.density} change={value=>change('density',value)} disabled={disabled}/>
    <section aria-label="Appearance live preview" className="internal-preview"><h2>Your workspace · የሥራ ቦታ</h2><p>{resolvedTheme === 'dark' ? 'Dark' : 'Light'} preview · appointments and activity</p><div className="internal-preview-row"><strong>09:30 · Consultation</strong><span style={{color:'var(--status-confirmed-text)'}}>Confirmed</span><button type="button">View appointment</button></div><p>Readable text, familiar status colors, and your chosen spacing.</p></section>
    {appearanceError && <p role="alert">{appearanceError}</p>}
    <p role="status">{message || (dirty ? 'Unsaved appearance preview' : 'Saved appearance')}</p>
    <div className="internal-actions"><button type="button" className="internal-save" disabled={disabled || !dirty} onClick={async()=>{try{await saveAppearance();setMessage('Appearance saved to your account.');}catch{setMessage('');}}}>{saving?'Saving…':'Save appearance'}</button><button type="button" disabled={disabled} onClick={()=>{cancelAppearance();setMessage('Saved appearance restored.');}}>Cancel</button><button type="button" disabled={disabled} onClick={()=>{previewAppearance({...appearanceDefaults});setMessage('Defaults previewed. Save to keep them.');}}>Reset defaults</button></div>
  </div></StaffShell>;
}
