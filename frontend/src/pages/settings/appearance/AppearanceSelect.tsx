import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface Props {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** Styled listbox with a single keyboard focus owner. */
export function AppearanceSelect({ value, onChange, children, disabled, className, 'aria-label': label }: Props) {
  const choices = Children.toArray(children).filter(isValidElement).map(child => {
    const props = child.props as { value?: string; children: string };
    return { value: props.value ?? props.children, label: props.children };
  });
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const selected = choices.find(choice => choice.value === value);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  const choose = (index: number) => { onChange({ target: { value: choices[index].value } }); setOpen(false); };
  return <div ref={root} className={`appearance-select ${className || ''}`}>
    <button type="button" role="combobox" aria-controls={`${id}-options`} aria-activedescendant={open ? `${id}-${active}` : undefined} aria-label={label} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => { setActive(Math.max(0, choices.findIndex(choice => choice.value === value))); setOpen(!open); }} onKeyDown={event => {
      if (event.key === 'Tab') setOpen(false);
      if (open && event.key === 'Escape') { setOpen(false); event.preventDefault(); }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); setOpen(true);
        setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : Math.max(0, Math.min(choices.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
      }
      if (open && ['Enter', ' '].includes(event.key)) { event.preventDefault(); choose(active); }
    }}><span>{selected?.label || 'Choose an option'}</span><ChevronDown size={16}/></button>
    {open && <div id={`${id}-options`} role="listbox" aria-label={`${label || "Selection"} options`} className="appearance-options">{choices.map((choice, index) => <button id={`${id}-${index}`} type="button" role="option" aria-selected={choice.value === value} key={choice.value} tabIndex={-1} data-active={index === active} onPointerMove={() => setActive(index)} onClick={event => { event.preventDefault(); event.stopPropagation(); choose(index); }}>{choice.label}{choice.value === value && <Check size={16}/>}</button>)}</div>}
  </div>;
}
