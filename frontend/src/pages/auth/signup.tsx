import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFrappePostCall } from 'frappe-react-sdk';
import { motion } from 'framer-motion';
import { Calendar, Mail, Lock, User, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/button';
import { useSession } from '@/context/session';
import LanguageToggle from '@/components/language-toggle';
import { useTranslation } from '@/lib/i18n';
import QuickStartSignup from './quick-start';
import ReferralInvite from '@/components/growth-referrals/ReferralInvite';
import { signupParams } from '@/lib/referral-link';

interface PublicSettings {
  signup_enabled: boolean;
  self_signup_mode: string;
  requires_verification: boolean;
  admin_approval: boolean;
  unavailable_reason?: string;
}

const Signup = () => {
  const navigate = useNavigate();
  const { call: signup } = useFrappePostCall('appointment.scheduler.registration.signup');
  const { reload } = useSession();
  const { t } = useTranslation();

  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'active' | 'pending_approval' | null>(null);
  // `?ref=<code>` and `?source=<channel>` go with the account to its first business.
  const [attribution] = useState(() => {
    const { ref, source } = signupParams(window.location.search);
    return { ...(ref ? { ref } : {}), ...(source ? { source } : {}) };
  });

  useEffect(() => {
    fetch('/api/method/appointment.scheduler.registration.public_settings', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setSettings(data?.message ?? null))
      .catch(() => setSettings(null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signup({ email, full_name: fullName, password, redirect_to: '/home', ...attribution });
      if (result?.message?.signed_in) {
        // The server started the new account's session: go straight to business setup.
        const next = await reload();
        navigate(next?.landing || '/onboarding', { replace: true });
        return;
      }
      setStatus((result?.message?.status as typeof status) || 'active');
      if ((result?.message?.status || 'active') === 'active') {
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      setError((err as { message?: string })?.message || t('auth.signup.failed'));
    } finally {
      setLoading(false);
    }
  };

  if (status) {
    const message =
      status === 'pending_approval'
          ? t('auth.signup.pending')
          : t('auth.signup.redirecting');
    return (
      <div className="relative min-h-screen overflow-hidden bg-linear-to-br/srgb from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          data-qa="signup-success"
          className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('auth.signup.created')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
          <Link to="/login" className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
            {t('auth.signup.goSignIn')}
          </Link>
        </motion.div>
      </div>
    );
  }

  const disabled = !settings?.signup_enabled;

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br/srgb from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="absolute left-4 top-4 z-20 [&_[data-qa=language-current]+span]:hidden" data-qa="auth-language">
        <LanguageToggle />
      </div>
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute top-0 -left-1/4 w-96 h-96 bg-gradient-hero opacity-20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute bottom-0 -right-1/4 w-96 h-96 bg-gradient-feature opacity-20 rounded-full blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-16 h-16 bg-linear-to-br/srgb from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl"
            >
              <Calendar className="w-8 h-8 text-white" />
            </motion.div>
          </Link>
          <h1 data-qa="signup-heading" className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('auth.signup.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t('auth.signup.subtitle')}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
        >
          {disabled ? (
            <div role="alert" data-qa="signup-disabled" className="space-y-4 text-center">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-gray-700 dark:text-gray-300">
                {settings ? (settings.unavailable_reason || t('auth.signup.closed')) : t('auth.signup.loading')}
              </p>
              <Button asChild variant="outline">
                <Link to="/login">{t('auth.signup.backSignIn')}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {attribution.ref && <ReferralInvite code={attribution.ref} />}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.signup.fullName')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('auth.signup.namePlaceholder')}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.passwordLabel')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('auth.signup.passwordHint')}</p>
              </div>

              <Button type="submit" data-qa="signup-submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('auth.signup.creating')}
                  </>
                ) : (
                  t('auth.signup.submit')
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.signup.haveAccount')}{' '}
              <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
                {t('auth.signup.signIn')}
              </Link>
            </p>
          </div>
        </motion.div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            ← {t('auth.backHome')}
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

/** A prefill token from the customer-to-business prompt opens the one-tap setup instead. */
const SignupPage = () => {
  const params = new URLSearchParams(window.location.search);
  const prefill = params.get('prefill');
  if (prefill) return <QuickStartSignup prefill={prefill} source={params.get('source') || 'customer_prompt'} refCode={params.get('ref')} />;
  return <Signup />;
};

export default SignupPage;
