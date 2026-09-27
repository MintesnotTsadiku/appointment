import type { CSSProperties } from 'react';
import { Check, RotateCcw } from 'lucide-react';

export interface PaletteChoice { key: string; label: string; sample: Record<string, string> }
export interface FontChoice {
  key: string; label: string; scripts: string[];
  roles: Record<string, { family: string; weight: number }>;
  fontAssets: { key: string; family: string; src: string; weight: number; format: string }[];
  fallbacks: Record<string, string[]>;
}
export interface AppearanceOptions { palettes: PaletteChoice[]; fonts: FontChoice[] }

function selectWithKeyboard(event: React.KeyboardEvent, index: number, choices: { key: string }[], change: (key: string) => void) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + choices.length) % choices.length;
  change(choices[next].key);
  (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
}

export function AppearanceCards({ options, palette, font, onPalette, onFont, onReset, onUndo, disabled }: {
  options: AppearanceOptions; palette: string; font: string;
  onPalette: (key: string) => void; onFont: (key: string) => void;
  onReset: () => void; onUndo?: () => void; disabled: boolean;
}) {
  const assets = options.fonts.flatMap(choice => choice.fontAssets);
  return <section className="appearance-cards" aria-label="Template appearance">
    <style>{assets.map(asset => `@font-face{font-family:${JSON.stringify(asset.family)};src:url(${JSON.stringify(asset.src)});font-weight:${asset.weight};font-display:swap;}`).join('\n')}</style>
    <h2>Color palette</h2><p>Approved choices for this template.</p>
    <div role="radiogroup" aria-label="Color palette" className="palette-choices">{options.palettes.map((choice, index) => <button type="button" role="radio" aria-checked={palette === choice.key} tabIndex={palette === choice.key ? 0 : -1} disabled={disabled} key={choice.key} onClick={() => onPalette(choice.key)} onKeyDown={event => selectWithKeyboard(event, index, options.palettes, onPalette)} className="appearance-card">
      <span className="choice-title"><span className="choice-dot">{palette === choice.key && <Check size={12}/>}</span>{choice.label}</span>
      <div className="palette-sample" style={{ background: choice.sample.canvas, color: choice.sample.text }}><strong>A place to begin</strong><span>Carefully made for you.</span><span className="sample-button" style={{ background: choice.sample.primary, color: choice.sample.onPrimary }}>Book a visit</span></div>
      <div className="palette-swatches">{['canvas', 'text', 'primary'].map(role => <span key={role}><i style={{ background: choice.sample[role] }}/>{role === 'canvas' ? 'Surface' : role === 'primary' ? 'Button' : 'Text'}</span>)}</div>
    </button>)}</div>
    <h2>Font pairing</h2><p>Heading and body samples · Latin + Ethiopic</p>
    <div role="radiogroup" aria-label="Font pairing" className="font-choices">{options.fonts.map((choice, index) => {
      const heading = { fontFamily: `"${choice.roles.display.family}", serif`, fontWeight: choice.roles.display.weight } as CSSProperties;
      const body = { fontFamily: `"${choice.roles.body.family}", sans-serif` };
      const ethiopic = choice.fontAssets.find(asset => /ethiopic/i.test(asset.family) || /ethiopic/i.test(asset.src));
      return <button type="button" role="radio" aria-checked={font === choice.key} tabIndex={font === choice.key ? 0 : -1} disabled={disabled} key={choice.key} onClick={() => onFont(choice.key)} onKeyDown={event => selectWithKeyboard(event, index, options.fonts, onFont)} className="appearance-card font-card"><span className="choice-title"><span className="choice-dot">{font === choice.key && <Check size={12}/>}</span>{choice.label}</span><small>{choice.roles.display.family} / {choice.roles.body.family}</small><strong style={heading}>A place to begin</strong><span style={body}>Thoughtful care, at your pace.</span><strong lang="am" style={{ ...heading, fontFamily: `"${ethiopic?.family || choice.roles.display.family}"` }}>እንኳን ደህና መጡ</strong><span lang="am" style={{ ...body, fontFamily: `"${ethiopic?.family || choice.roles.body.family}"` }}>አገልግሎታችንን ይምረጡ።</span></button>;
    })}</div>
    {onUndo && <p role="status">Template defaults selected locally. Save to keep them, or Undo.</p>}
    <div className="appearance-reset"><button type="button" disabled={disabled} onClick={onReset}><RotateCcw size={14}/>Reset palette & fonts</button>{onUndo && <button type="button" onClick={onUndo}>Undo reset</button>}</div>
  </section>;
}
