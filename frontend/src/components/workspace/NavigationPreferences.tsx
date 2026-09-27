import { Link } from 'react-router-dom';
import { useTheme } from '@/components/theme-provider';
import { Checkbox } from '@/components/checkbox/checkbox';
import { FieldSelect } from '@/components/analytics/FieldSelect';
import { useNavigationPreference } from './useNavigationPreference';

export function NavigationPreferences() {
    const { theme, setTheme, saving, isLoadingColors } = useTheme();
    const { value, update, error } = useNavigationPreference();
    return (
        <section className="space-y-4">
            <div>
                <h2 className="font-heading text-lg font-semibold">Navigation & color mode</h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Choose your workspace appearance. Published website branding is managed separately in website settings.</p>
            </div>
            <Link to="/settings/appearance" className="block text-sm underline" style={{color: 'var(--accent-primary-text, var(--accent-primary))'}}>Palette, typography, text size and density</Link>
            <div className="grid gap-5 sm:grid-cols-2">
            <FieldSelect
                className="flex flex-col items-start gap-2"
                disabled={saving || isLoadingColors}
                label="Color mode"
                aria-label="Color mode"
                value={theme}
                onValueChange={value => setTheme(value as 'light' | 'dark' | 'system')}
                options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'Match device' }]}
                triggerClassName="min-h-11 w-full"
            />
            <FieldSelect
                className="flex flex-col items-start gap-2"
                label="Navigation placement"
                aria-label="Navigation placement"
                value={value.placement}
                onValueChange={next => void update({ ...value, placement: next as 'top' | 'sidebar' })}
                options={[{ value: 'top', label: 'Top navigation' }, { value: 'sidebar', label: 'Left sidebar' }]}
                triggerClassName="min-h-11 w-full"
            />
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm">
                <Checkbox checked={value.collapsed} onCheckedChange={checked => void update({ ...value, collapsed: Boolean(checked) })} />
                Keep sidebar collapsed
            </label>
            {error && <p role="alert">Unable to save navigation preferences.</p>}
        </section>
    );
}
