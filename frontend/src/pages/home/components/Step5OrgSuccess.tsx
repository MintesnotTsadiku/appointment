import { useState, useEffect } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { CheckCircle, Copy, Share2, ExternalLink, QrCode } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/useWindowSize';

interface Step5OrgSuccessProps {
  onComplete: () => void;
}

interface ServiceUrl {
  name: string;
  url: string;
  event_type_id: string;
}

const Step5OrgSuccess = ({ onComplete }: Step5OrgSuccessProps) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const { width, height } = useWindowSize();

  const { data, isLoading, error } = useFrappeGetCall<{
    success: boolean;
    organization_url: string;
    services: ServiceUrl[];
  }>('frappe_appointment.onboarding.get_organization_booking_urls');
  
  // Extract the actual data from the API response
  const orgUrl = data?.message?.organization_url || data?.organization_url;
  const services = data?.message?.services || data?.services || [];

  const { call: completeOnboarding } = useFrappePostCall('frappe_appointment.onboarding.complete_organization_onboarding');

  useEffect(() => {
    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto-complete onboarding
    if (data) {
      completeOnboarding();
    }
  }, [data, completeOnboarding]);

  const handleCopy = (url: string, label: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleShare = (url: string, serviceName: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    const text = `Book ${serviceName} with us: ${fullUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: serviceName,
        text: text,
        url: fullUrl,
      });
    } else {
      handleCopy(url, serviceName);
    }
  };

  const openBookingPage = (url: string) => {
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading booking URLs...</p>
        </div>
      </div>
    );
  }
  
  if (error || (!orgUrl && !isLoading)) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">Failed to load booking URLs. Please refresh or contact support.</p>
          {import.meta.env.DEV && error && (
            <pre className="mt-4 text-xs text-left bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
              {JSON.stringify(error, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🎉 Your Organization is Ready!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Start accepting bookings with your custom booking links
          </p>
        </div>

        <div className="space-y-6">
          {/* Organization URL */}
          {orgUrl && (
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Organization Booking Page
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Main booking page for your organization
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-sm font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
                  {window.location.origin}{orgUrl}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(orgUrl, 'Organization')}
                >
                  {copiedUrl === 'Organization' ? (
                    <>✓ Copied</>
                  ) : (
                    <><Copy className="w-4 h-4" /></>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openBookingPage(orgUrl)}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Service URLs */}
          {services && services.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Service Booking Links
              </h3>
              <div className="space-y-3">
                {services.map((service) => (
                  <div
                    key={service.event_type_id}
                    className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {service.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(service.url, service.name)}
                        >
                          {copiedUrl === service.name ? (
                            <span className="text-green-600">✓ Copied</span>
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShare(service.url, service.name)}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openBookingPage(service.url)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded overflow-x-auto">
                      {window.location.origin}{service.url}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Share Options */}
          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Share Your Booking Links
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  const fullUrl = `${window.location.origin}${orgUrl}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(`Book with us: ${fullUrl}`)}`, '_blank');
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WhatsApp
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  const fullUrl = `${window.location.origin}${orgUrl}`;
                  window.open(`https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent('Book with us!')}`, '_blank');
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                </svg>
                Telegram
              </Button>
            </div>
          </div>

          {/* Next Steps */}
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              What's Next?
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Test your booking page by clicking the preview button</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Share your booking links with customers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Manage bookings from your dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Add more services or providers anytime</span>
              </li>
            </ul>
          </div>

          {/* Complete Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={onComplete}
              size="lg"
              className="px-12"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Step5OrgSuccess;


