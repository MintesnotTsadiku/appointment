import { useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode,
  X,
  Sparkles,
  Mail,
  MessageCircle,
  Twitter,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

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
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
      console.error('Failed to copy:', err);
    }
  };

  const handleOpenInNew = () => {
    window.open(bookingUrl, '_blank');
  };

  const shareActions = [
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      onClick: () => {
        const subject = encodeURIComponent('Book an appointment with me');
        const body = encodeURIComponent(`Click here to book: ${bookingUrl}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
      }
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      onClick: () => {
        const text = encodeURIComponent(`Book an appointment: ${bookingUrl}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }
    },
    {
      id: 'twitter',
      label: 'Twitter',
      icon: Twitter,
      onClick: () => {
        const text = encodeURIComponent(`Book an appointment: ${bookingUrl}`);
        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
      }
    },
    {
      id: 'telegram',
      label: 'Telegram',
      icon: Send,
      onClick: () => {
        const text = encodeURIComponent(bookingUrl);
        window.open(`https://t.me/share/url?url=${text}`, '_blank');
      }
    },
  ];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
          style={{ 
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-default)'
          }}
        >
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary" />

          {/* Header */}
          <div 
            className="flex items-center justify-between p-6"
            style={{ borderBottom: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div 
                  className="absolute inset-0 rounded-xl blur-lg opacity-50 bg-gradient-primary"
                />
                <div className="relative bg-gradient-primary p-2.5 rounded-xl">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Share Your Booking Link
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Share this link with customers to let them book appointments
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-lg transition-colors"
              style={{ 
                backgroundColor: 'var(--border-subtle)',
                color: 'var(--text-muted)'
              }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div 
                  className="animate-spin rounded-full h-8 w-8 border-2"
                  style={{ 
                    borderColor: 'var(--border-default)',
                    borderTopColor: 'var(--accent-primary)'
                  }}
                />
              </div>
            ) : bookingUrl ? (
              <>
                {/* URL Display and Copy */}
                <div className="space-y-2">
                  <label 
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Your Booking Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={bookingUrl}
                      readOnly
                      className="flex-1 px-4 py-3 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={handleCopy}
                      className="flex-shrink-0 px-4 py-3 rounded-xl font-medium transition-all"
                      style={{ 
                        backgroundColor: copied ? 'var(--accent-success-light)' : 'var(--accent-primary-light)',
                        color: copied ? 'var(--accent-success)' : 'var(--accent-primary)',
                        border: `1px solid ${copied ? 'var(--accent-success-light)' : 'var(--accent-primary-light)'}`
                      }}
                    >
                      {copied ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </motion.button>
                  </div>
                  {copied && (
                    <p className="text-sm" style={{ color: 'var(--accent-success)' }}>
                      ✓ Link copied to clipboard!
                    </p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleOpenInNew}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all"
                    style={{ 
                      backgroundColor: 'var(--border-subtle)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Preview Page
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => toast.info('QR Code feature coming soon!')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all"
                    style={{ 
                      backgroundColor: 'var(--border-subtle)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <QrCode className="w-4 h-4" />
                    Generate QR
                  </motion.button>
                </div>

                {/* Share Options */}
                <div className="space-y-3">
                  <p 
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Quick Share
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {shareActions.map((action) => (
                      <motion.button
                        key={action.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={action.onClick}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all"
                        style={{ 
                          backgroundColor: 'var(--border-subtle)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <action.icon className="w-4 h-4" />
                        {action.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div 
                  className="rounded-xl p-4"
                  style={{ 
                    backgroundColor: 'var(--accent-primary-light)',
                    border: '1px solid var(--accent-primary-light)'
                  }}
                >
                  <h4 
                    className="text-sm font-semibold mb-2 flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    Tips for sharing
                  </h4>
                  <ul className="text-sm space-y-1" style={{ color: 'var(--text-muted)' }}>
                    <li>• Add it to your email signature</li>
                    <li>• Share on social media bios</li>
                    <li>• Include in business cards</li>
                    <li>• Add to your website</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
                  No booking link available yet
                </p>
                <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
                  Complete your setup to get your booking link
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div 
            className="flex justify-end p-6 border-t"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onOpenChange(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-primary"
            >
              Close
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
