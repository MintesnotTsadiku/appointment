import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useOnboarding } from '@/context/onboarding';
import { Button } from '@/components/button';
import { Check, Copy, Share2, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';

const Step5Success = () => {
  const { completeOnboarding } = useOnboarding();
  const navigate = useNavigate();
  const [bookingUrl, setBookingUrl] = useState('');
  const [fullBookingUrl, setFullBookingUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch the booking URL from the backend
  const { data: bookingData, isLoading: loadingBookingUrl } = useFrappeGetCall<{
    message: { success: boolean; booking_url: string; event_type_id?: string };
  }>('appointment.onboarding.get_booking_url');

  useEffect(() => {
    if (bookingData?.message?.booking_url) {
      const relativeUrl = bookingData.message.booking_url;
      setBookingUrl(relativeUrl);
      // Construct full URL properly - only prepend origin if it's a relative path
      const fullUrl = relativeUrl.startsWith('http')
        ? relativeUrl
        : `${window.location.origin}${relativeUrl}`;
      setFullBookingUrl(fullUrl);
    }
  }, [bookingData]);

  // Generate QR Code
  const generateQRCode = () => {
    if (!qrCanvasRef.current || !fullBookingUrl) return;

    const canvas = qrCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple QR code generation using a basic pattern
    // For production, use a proper QR library like qrcode or qrcode.react
    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Use a simple QR code library approach - for now, we'll use a web API or library
    // For simplicity, let's use a QR code API service
    const qrImage = new Image();
    qrImage.crossOrigin = 'anonymous';
    qrImage.onload = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(qrImage, 0, 0, size, size);
    };
    // Using QR Server API (free, no key required)
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(fullBookingUrl)}`;
  };

  useEffect(() => {
    if (showQR && fullBookingUrl && qrCanvasRef.current) {
      generateQRCode();
    }
  }, [showQR, fullBookingUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullBookingUrl || bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleWhatsAppShare = () => {
    const url = fullBookingUrl || bookingUrl;
    const message = encodeURIComponent(`Book an appointment with me: ${url}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleTelegramShare = () => {
    const url = fullBookingUrl || bookingUrl;
    const message = encodeURIComponent(`Book an appointment with me: ${url}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${message}`, '_blank');
  };

  const handleQRCodeClick = () => {
    if (!fullBookingUrl && !bookingUrl) return;
    setShowQR(!showQR);
  };

  const handleGoToDashboard = async () => {
    await completeOnboarding();
    // The home page will automatically show the dashboard
    window.location.reload();
  };

  return (
    <div className="relative">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: Math.random() * window.innerWidth,
                y: -20,
                rotate: 0,
              }}
              animate={{
                y: window.innerHeight + 20,
                rotate: Math.random() * 360,
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                ease: 'linear',
                delay: Math.random() * 0.5,
              }}
              onAnimationComplete={() => {
                if (i === 49) setShowConfetti(false);
              }}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: [
                  '#6366F1',
                  '#10B981',
                  '#F59E0B',
                  '#EF4444',
                  '#8B5CF6',
                ][Math.floor(Math.random() * 5)],
              }}
            />
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
        <div className="text-center space-y-6">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="mx-auto w-20 h-20 bg-gradient-hero rounded-full flex items-center justify-center"
          >
            <Check className="w-12 h-12 text-white" />
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-gray-900 dark:text-white"
          >
            🎉 You're All Set!
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600 dark:text-gray-400 text-lg"
          >
            Your booking page is ready to share with customers
          </motion.p>

          {/* Booking URL */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Your booking link:
            </p>
            <div className="flex items-center justify-between space-x-2">
              <code className="text-sm text-brand-primary flex-1 text-left break-all">
                {fullBookingUrl || bookingUrl || (loadingBookingUrl ? 'Loading...' : 'No booking URL available')}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="flex items-center space-x-2 flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* Share Options */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Share with your customers:
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={handleWhatsAppShare}
                className="flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="#25D366" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleTelegramShare}
                className="flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="#0088cc" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                <span>Telegram</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleQRCodeClick}
                disabled={!fullBookingUrl && !bookingUrl}
                className="flex items-center space-x-2"
              >
                <QrCode className="w-5 h-5" />
                <span>QR Code</span>
              </Button>
            </div>
          </motion.div>

          {/* QR Code Modal */}
          {showQR && fullBookingUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
              onClick={() => setShowQR(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-xl max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
                  Scan to Book
                </h3>
                <div className="flex justify-center mb-4">
                  <canvas ref={qrCanvasRef} className="border-2 border-gray-200 dark:border-gray-700 rounded-lg" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                  Scan this QR code to open the booking page
                </p>
                <Button
                  onClick={() => setShowQR(false)}
                  className="w-full bg-gradient-hero hover:opacity-90 text-white"
                >
                  Close
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Next Steps */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-left bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Next steps:
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <span className="text-brand-primary mr-2">•</span>
                <span>Test your booking page by visiting the link</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-primary mr-2">•</span>
                <span>Configure payment (optional) to accept deposits</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-primary mr-2">•</span>
                <span>Customize notifications for customers</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-primary mr-2">•</span>
                <span>Add more services or team members</span>
              </li>
            </ul>
          </motion.div>

          {/* Go to Dashboard */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              onClick={handleGoToDashboard}
              className="w-full bg-gradient-hero hover:opacity-90 text-white text-lg py-6"
            >
              Go to Dashboard →
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Step5Success;

