import { useTheme } from '@/components/theme-provider';
import { Checkbox } from '@/components/checkbox/checkbox';
import { FieldSelect } from '@/components/analytics/FieldSelect';
import { useNavigationPreference } from './useNavigationPreference';

export function NavigationPreferences() {
    const { theme, setTheme } = useTheme();
    const { value, update, error } = useNavigationPreference();
    return (
        <section className="space-y-4">
            <div>
                <h2 className="font-heading text-lg font-semibold">Appearance & navigation</h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Choose your workspace appearance. Published website branding is managed separately in website settings.</p>
            </div>
            <FieldSelect
                label="Color mode"
                aria-label="Color mode"
                value={theme}
                onValueChange={value => setTheme(value as 'light' | 'dark' | 'system')}
                options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'Match device' }]}
                triggerClassName="min-w-[10rem]"
            />
            <FieldSelect
                label="Navigation placement"
                aria-label="Navigation placement"
                value={value.placement}
                onValueChange={next => void update({ ...value, placement: next as 'top' | 'sidebar' })}
                options={[{ value: 'top', label: 'Top navigation' }, { value: 'sidebar', label: 'Left sidebar' }]}
                triggerClassName="min-w-[10rem]"
            />
            <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={value.collapsed} onCheckedChange={checked => void update({ ...value, collapsed: Boolean(checked) })} />
                Keep sidebar collapsed
            </label>
            {error && <p role="alert">Unable to save navigation preferences.</p>}
        </section>
    );
}
