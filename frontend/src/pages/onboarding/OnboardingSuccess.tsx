import { useFrappePostCall } from 'frappe-react-sdk';
import LivePageSuccess, { type LivePage } from '@/components/live-page-success';
import { useSession } from '@/context/session';
import { GalleryTemplateNext } from './GalleryTemplateNext';

export interface CreatedBusiness {
  business_name: string;
  /** The first offering's booking page (organizations). */
  public_path?: string;
  /** The business's public page: its published site, else `/schedule/org/<slug>` (or the provider's page). */
  business_path?: string;
  organization?: string;
  /** Set for an independent provider's business. */
  provider?: string;
  /** True when the booking page was published during setup. */
  published?: boolean;
}

interface PublishResult {
  business_path?: string;
  published?: boolean;
}

/** The link to share after setup: the business page, not one service. */
export function businessPagePath(business: Pick<CreatedBusiness, 'business_path' | 'public_path'>): string {
  return business.business_path || business.public_path || '';
}

/** The end of setup for an organization or an independent provider. */
export function OnboardingSuccess({ business, qa = 'onboarding' }: { business: CreatedBusiness; qa?: string }) {
  const { reload } = useSession();
  const { call: publishOrganization } = useFrappePostCall<{ message: PublishResult }>('appointment.scheduler.workspace.publish');
  const { call: publishProvider } = useFrappePostCall<{ message: PublishResult }>('appointment.scheduler.independent.publish');
  const page: LivePage = { businessName: business.business_name, path: businessPagePath(business), published: Boolean(business.published) };
  const independent = Boolean(business.provider);

  async function publish(): Promise<LivePage> {
    const response = independent
      ? await publishProvider({ provider: business.provider, published: 1 })
      : await publishOrganization({ organization: business.organization, published: 1 });
    await reload();
    return { ...page, path: response.message.business_path || page.path, published: Boolean(response.message.published) };
  }

  return (
    <LivePageSuccess
      page={page}
      qa={qa}
      onPublish={independent || business.organization ? publish : undefined}
      settingsPath={independent ? '/settings/independent-booking' : '/settings/business'}
      next={<GalleryTemplateNext qa={qa} />}
    />
  );
}
