# Landing Page CMS Integration Guide

## Overview

The landing page now supports dynamic content management through the **Landing Page Settings** doctype. This allows non-technical users to update landing page content through the Frappe UI without touching code.

## Architecture

### Backend
- **Doctype**: `Landing Page Settings` (Singleton)
- **Location**: `frappe_appointment/scheduler/doctype/landing_page_settings/`
- **API**: `api.py` - Provides whitelisted endpoint for fetching settings
- **Child Tables**: 10 child table doctypes for structured data (images, partners, features, etc.)

### Frontend
- **Hook**: `useLandingPageSettings()` - Fetches settings from API
- **Context**: `LandingPageSettingsProvider` - Makes settings available to all components
- **Fallback**: Uses existing translation files if API fails or returns no data

## How to Access CMS Data in Components

### Method 1: Using the Context Hook (Recommended)

```typescript
import { useLandingPageSettingsContext } from '@/context/landingPageSettings';
import { useTranslation } from '@/lib/i18n';

const MyComponent = () => {
  const { settings, loading, getText } = useLandingPageSettingsContext();
  const { t } = useTranslation();

  // Use CMS data if available, fall back to translations
  const title = settings?.hero?.title
    ? getText(settings.hero.title)
    : t('hero.title');

  return <h1>{title}</h1>;
};
```

### Method 2: Direct Access Pattern (For More Control)

```typescript
import { useLandingPageSettingsContext } from '@/context/landingPageSettings';
import { useTranslation } from '@/lib/i18n';

const MyComponent = () => {
  const { settings, loading, error } = useLandingPageSettingsContext();
  const { t, language } = useTranslation();

  // Show loading state while fetching
  if (loading) {
    return <div>Loading...</div>;
  }

  // Use CMS data with fallback
  const getContent = () => {
    if (settings?.hero?.enabled) {
      return {
        title: language === 'am' 
          ? settings.hero.title.am 
          : settings.hero.title.en,
        subtitle: language === 'am'
          ? settings.hero.subtitle.am
          : settings.hero.subtitle.en
      };
    }

    // Fallback to translations
    return {
      title: t('hero.title'),
      subtitle: t('hero.subtitle')
    };
  };

  const content = getContent();

  return (
    <div>
      <h1>{content.title}</h1>
      <p>{content.subtitle}</p>
    </div>
  );
};
```

### Method 3: Conditional Rendering Based on CMS

```typescript
const MySection = () => {
  const { settings } = useLandingPageSettingsContext();

  // Only render if enabled in CMS
  if (settings && !settings.hero?.enabled) {
    return null;
  }

  return (
    <section>
      {/* Content here */}
    </section>
  );
};
```

## Accessing the Landing Page Settings

### Via Frappe UI
1. Open your site: `http://appointment.com/desk`
2. Navigate to: **Landing Page Settings**
3. Edit content in any language (English/Amharic)
4. Save changes
5. Frontend will automatically fetch new content on next page load

### Via API
```bash
curl http://appointment.com/api/method/frappe_appointment.scheduler.doctype.landing_page_settings.api.get_landing_page_settings
```

## Data Structure

The API returns data organized by section:

```typescript
{
  hero: {
    enabled: boolean,
    eyebrow: { en: string, am: string },
    headline1: { en: string, am: string },
    headline2: { en: string, am: string },
    // ...
  },
  partners: {
    enabled: boolean,
    title: { en: string, am: string },
    list: Array<{ name: string, logo: string }>,
    // ...
  },
  features: { /* ... */ },
  useCases: { /* ... */ },
  pricing: { /* ... */ },
  // ... etc
}
```

## Brand Colors

Brand colors from CMS are automatically applied to CSS variables:

```typescript
// In your component
const MyComponent = () => {
  // Colors are automatically applied to CSS variables when settings load
  return (
    <div className="bg-brand-primary text-brand-secondary">
      Styled with CMS colors!
    </div>
  );
};
```

CSS variables updated automatically:
- `--brand-primary`
- `--brand-secondary`
- `--brand-accent-gold`
- `--brand-accent-teal`

## Helper Functions

### `getText(obj)`
Automatically returns text in the current language:

```typescript
const { getText } = useLandingPageSettingsContext();

// Returns English or Amharic based on current language
const title = getText(settings?.hero?.title);
```

### `useBrandColors(settings)`
Returns brand colors with defaults:

```typescript
import { useBrandColors } from '@/lib/landingPageSettings';

const { settings } = useLandingPageSettingsContext();
const colors = useBrandColors(settings);

console.log(colors.primary); // '#6366F1' or custom color
```

## Caching

- **Duration**: Configurable in Landing Page Settings (default: 3600 seconds = 1 hour)
- **Client-side**: Settings are fetched once per page load
- **Server-side**: Frappe handles API caching based on the duration setting

To clear cache:
1. Update any field in Landing Page Settings
2. Save the document
3. Frontend will fetch fresh data on next page load

## Migration Strategy

You can gradually migrate components to use CMS data:

1. **Phase 1**: Keep existing translation-based system as fallback ✅ DONE
2. **Phase 2**: Wrap landing page with CMS provider ✅ DONE
3. **Phase 3**: Update components one by one to check CMS first
4. **Phase 4**: Deprecate hardcoded translations once all content is in CMS

## Example: Updated Hero Component

See `/home/minte/projects/frappe-bench/apps/frappe_appointment/frontend/src/pages/landing/sections/Hero.tsx` for a complete example of CMS integration with fallback.

## Troubleshooting

### Settings not loading?
1. Check browser console for API errors
2. Verify Landing Page Settings exists: `bench --site appointment.com console` then `frappe.db.exists('Landing Page Settings', 'Landing Page Settings')`
3. Check API permissions (should be guest-accessible)

### Wrong language showing?
- The `getText()` helper uses the current language from `TranslationProvider`
- Ensure your component is wrapped in both providers

### Custom fields not showing?
- Edit the JSON file to add new fields
- Reload doctype: `bench --site appointment.com console` then `frappe.reload_doctype('Landing Page Settings')`
- Update the `api.py` file to include new fields in the response
- Update TypeScript types in `landingPageSettings.ts`

## Performance Considerations

- Settings are fetched **once** on landing page mount
- Use React's built-in memoization for expensive computations
- Consider implementing a local cache if users navigate away and back

## Security

- API endpoint is whitelisted for guest access
- Only returns public content (no sensitive data)
- All child tables are filtered server-side
- Consider adding rate limiting for production

## Future Enhancements

- [ ] Add image upload support for hero carousel
- [ ] Implement draft/publish workflow
- [ ] Add version history
- [ ] Implement A/B testing support
- [ ] Add analytics tracking per CMS change
- [ ] Create visual page builder UI
- [ ] Add SEO preview in CMS
- [ ] Implement scheduled publishing

## Summary

✅ **Created**: Complete CMS system for landing page
✅ **Backend**: Doctype + Child Tables + API endpoint  
✅ **Frontend**: Hook + Context + Fallback system  
✅ **Data Populated**: All current landing page content migrated to CMS  
✅ **Integrated**: Provider wrapped around landing page  
🔄 **Next**: Update individual components to use CMS data

All components continue to work with existing translations while you gradually migrate them to use CMS data!




