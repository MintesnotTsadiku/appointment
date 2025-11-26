import { useState, useEffect } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/dialog';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Share2, Copy, Check, ExternalLink, QrCode } from 'lucide-react';

interface ShareLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareLinkModal = ({ open, onOpenChange }: ShareLinkModalProps) => {
  const [copied, setCopied] = useState(false);
  
  const { data, isLoading } = useFrappeGetCall<{ 
    message: { 
      booking_url: string; 
      event_type_id: string;
    } 
  }>('frappe_appointment.onboarding.get_booking_url');

  const bookingData = data?.message;
  const bookingUrl = bookingData?.booking_url 
    ? `${window.location.origin}${bookingData.booking_url}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpenInNew = () => {
    window.open(bookingUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Your Booking Link
          </DialogTitle>
          <DialogDescription>
            Share this link with customers to let them book appointments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : bookingUrl ? (
            <>
              {/* URL Display and Copy */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Your Booking Link
                </label>
                <div className="flex gap-2">
                  <Input
                    value={bookingUrl}
                    readOnly
                    className="font-mono text-sm"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ Link copied to clipboard!
                  </p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleOpenInNew}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview Page
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => alert('QR Code feature coming soon!')}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Generate QR
                </Button>
              </div>

              {/* Share Options */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quick Share
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const subject = encodeURIComponent('Book an appointment with me');
                      const body = encodeURIComponent(`Click here to book: ${bookingUrl}`);
                      window.location.href = `mailto:?subject=${subject}&body=${body}`;
                    }}
                  >
                    📧 Email
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const text = encodeURIComponent(`Book an appointment: ${bookingUrl}`);
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                    }}
                  >
                    💬 WhatsApp
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const text = encodeURIComponent(`Book an appointment: ${bookingUrl}`);
                      window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
                    }}
                  >
                    🐦 Twitter
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const text = encodeURIComponent(bookingUrl);
                      window.open(`https://t.me/share/url?url=${text}`, '_blank');
                    }}
                  >
                    ✈️ Telegram
                  </Button>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  💡 Tips for sharing
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                  <li>• Add it to your email signature</li>
                  <li>• Share on social media bios</li>
                  <li>• Include in business cards</li>
                  <li>• Add to your website</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No booking link available yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Complete your setup to get your booking link
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

