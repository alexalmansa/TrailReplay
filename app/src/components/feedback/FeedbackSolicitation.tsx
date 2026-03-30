import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, X, ThumbsUp, Lightbulb, Wrench, Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n/useI18n';

const STORAGE_KEY = 'trailreplay_feedback_solicited';
const ACTIVITY_KEY = 'trailreplay_activity';
const MAYBE_LATER_KEY = 'trailreplay_maybe_later';
const LEGACY_STORAGE_KEY = 'trailreplay_v2_feedback_solicited';
const LEGACY_ACTIVITY_KEY = 'trailreplay_v2_activity';
const LEGACY_MAYBE_LATER_KEY = 'trailreplay_v2_maybe_later';
const MIN_ACTIVITY = 3;
const MAYBE_LATER_COOLDOWN = 86400000; // 24 hours
const MIN_WIDTH_FOR_POPUP = 900;
const MIN_FEEDBACK_LENGTH = 15;

interface ActivityData {
  count: number;
  firstVisit: number;
  lastActivity: number;
}

const safeStorageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeStorageGetAny = (...keys: string[]): string | null => {
  for (const key of keys) {
    const value = safeStorageGet(key);
    if (value !== null) {
      return value;
    }
  }

  return null;
};

const safeStorageSet = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`Could not persist "${key}" in localStorage:`, e);
  }
};

export function FeedbackSolicitation() {
  const { t } = useI18n();
  const [showPopup, setShowPopup] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<'loveIt' | 'needsWork' | 'featureRequest' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNarrowScreen, setIsNarrowScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MIN_WIDTH_FOR_POPUP : false
  );

  useEffect(() => {
    const updateViewport = () => {
      setIsNarrowScreen(window.innerWidth < MIN_WIDTH_FOR_POPUP);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  useEffect(() => {
    if (isNarrowScreen) {
      setShowPopup(false);
      setShowForm(false);
    }
  }, [isNarrowScreen]);

  const checkAndShowSolicitation = useCallback((activity: ActivityData) => {
    if (isNarrowScreen) {
      return;
    }

    // Don't show if already solicited
    if (safeStorageGetAny(STORAGE_KEY, LEGACY_STORAGE_KEY) === 'true') {
      return;
    }

    // Check maybe later cooldown
    const maybeLater = safeStorageGetAny(MAYBE_LATER_KEY, LEGACY_MAYBE_LATER_KEY);
    if (maybeLater && Date.now() - parseInt(maybeLater) < MAYBE_LATER_COOLDOWN) {
      return;
    }

    // Check activity threshold
    if (activity.count < MIN_ACTIVITY) {
      return;
    }

    // Check if user has been using app for at least 1 minute
    if (Date.now() - activity.firstVisit < 60000) {
      return;
    }

    // Show popup after a short delay
    setTimeout(() => setShowPopup(true), 2000);
  }, [isNarrowScreen]);

  // Track activity
  useEffect(() => {
    if (isNarrowScreen) {
      return;
    }

    const trackActivity = () => {
      try {
        const stored = safeStorageGetAny(ACTIVITY_KEY, LEGACY_ACTIVITY_KEY);
        const activity: ActivityData = stored
          ? JSON.parse(stored)
          : { count: 0, firstVisit: Date.now(), lastActivity: Date.now() };

        activity.count += 1;
        activity.lastActivity = Date.now();
        localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));

        // Check if we should show solicitation
        checkAndShowSolicitation(activity);
      } catch (e) {
        console.warn('Could not track activity:', e);
      }
    };

    // Track on initial load
    trackActivity();

    // Track on significant actions
    const handleClick = () => trackActivity();
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [checkAndShowSolicitation, isNarrowScreen]);

  const handleYes = () => {
    setShowPopup(false);
    setShowForm(true);
  };

  const handleMaybeLater = () => {
    setShowPopup(false);
    safeStorageSet(MAYBE_LATER_KEY, Date.now().toString());
  };

  const handleDismiss = () => {
    setShowPopup(false);
    safeStorageSet(STORAGE_KEY, 'true');
  };

  const handleSubmitFeedback = async () => {
    const trimmedFeedback = feedback.trim();
    if (!feedbackCategory || trimmedFeedback.length < MIN_FEEDBACK_LENGTH) {
      setError(t('feedback.minimumLengthError', { count: MIN_FEEDBACK_LENGTH }));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Build the feedback message
    const categoryLabels = {
      loveIt: t('feedback.loveIt'),
      needsWork: t('feedback.needsWork'),
      featureRequest: t('feedback.featureRequest'),
    };
    const questionLabels = {
      loveIt: t('feedback.loveItQuestion'),
      needsWork: t('feedback.needsWorkQuestion'),
      featureRequest: t('feedback.featureRequestQuestion'),
    };
    const message = [
      `Feedback Category: ${feedbackCategory ? categoryLabels[feedbackCategory] : 'Not specified'}`,
      '',
      `Question Shown: ${feedbackCategory ? questionLabels[feedbackCategory] : 'Not specified'}`,
      '',
      'Answer:',
      trimmedFeedback,
    ].join('\n');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'V2 Feedback User',
          email: email || '',
          message,
          website: '', // honeypot field
          meta: {
            path: location.pathname,
            ua: navigator.userAgent,
            source: 'feedback-solicitation',
            feedbackCategory,
          },
        }),
      });

      if (res.ok) {
        safeStorageSet(STORAGE_KEY, 'true');
        setSubmitted(true);
        setTimeout(() => {
          setShowForm(false);
          setSubmitted(false);
        }, 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || t('feedback.error'));
      }
    } catch {
      setError(t('feedback.errorSend'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    safeStorageSet(STORAGE_KEY, 'true');
  };

  const trimmedFeedbackLength = feedback.trim().length;
  const canSubmit = Boolean(feedbackCategory) && trimmedFeedbackLength >= MIN_FEEDBACK_LENGTH && !isSubmitting;

  const questionLabel = feedbackCategory
    ? t(`feedback.${feedbackCategory}Question`)
    : t('feedback.answerPromptDefault');

  const questionPlaceholder = feedbackCategory
    ? t(`feedback.${feedbackCategory}Placeholder`)
    : t('feedback.answerPlaceholderDefault');

  if (isNarrowScreen || (!showPopup && !showForm)) {
    return null;
  }

  return (
    <>
      {/* Solicitation Popup */}
      {showPopup && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] md:inset-x-auto md:bottom-24 md:right-4 md:w-auto">
          <div className="bg-[var(--evergreen)] text-[var(--canvas)] rounded-xl p-4 shadow-lg w-full max-w-sm mx-auto animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="bg-[var(--trail-orange)] rounded-full p-2">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold mb-1">{t('feedback.promptTitle')}</h3>
                <p className="text-sm opacity-90 mb-3">
                  {t('feedback.promptBody')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleYes}
                    className="px-3 py-1.5 bg-[var(--trail-orange)] text-[var(--canvas)] rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    {t('feedback.yes')}
                  </button>
                  <button
                    onClick={handleMaybeLater}
                    className="px-3 py-1.5 bg-white/10 rounded-md text-sm hover:bg-white/20 transition-colors"
                  >
                    {t('feedback.maybeLater')}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-1.5 text-sm opacity-60 hover:opacity-100 transition-opacity"
                  >
                    {t('feedback.dontAsk')}
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="opacity-80 hover:opacity-100 transition-opacity p-1"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseForm}
        >
          <div
            className="bg-[var(--canvas)] border-2 border-[var(--evergreen)] rounded-xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ThumbsUp className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-[var(--evergreen)] mb-2">
                  {t('feedback.thanksTitle')}
                </h3>
                <p className="text-[var(--evergreen-60)]">
                  {t('feedback.thanksBody')}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[var(--evergreen)]">
                    {t('feedback.formHeader')}
                  </h3>
                  <button
                    onClick={handleCloseForm}
                    className="p-1 hover:bg-[var(--evergreen)]/10 rounded"
                  >
                    <X className="w-5 h-5 text-[var(--evergreen-60)]" />
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
                    {t('feedback.formTitle')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setFeedbackCategory('loveIt')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        feedbackCategory === 'loveIt'
                          ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]'
                          : 'border-[var(--evergreen-40)] hover:border-[var(--evergreen)]'
                      }`}
                    >
                      <ThumbsUp className="w-5 h-5 mx-auto text-[var(--evergreen)]" />
                      <div className="text-xs text-[var(--evergreen-60)]">{t('feedback.loveIt')}</div>
                    </button>
                    <button
                      onClick={() => setFeedbackCategory('needsWork')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        feedbackCategory === 'needsWork'
                          ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]'
                          : 'border-[var(--evergreen-40)] hover:border-[var(--evergreen)]'
                      }`}
                    >
                      <Wrench className="w-5 h-5 mx-auto text-[var(--evergreen)]" />
                      <div className="text-xs text-[var(--evergreen-60)]">{t('feedback.needsWork')}</div>
                    </button>
                    <button
                      onClick={() => setFeedbackCategory('featureRequest')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        feedbackCategory === 'featureRequest'
                          ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]'
                          : 'border-[var(--evergreen-40)] hover:border-[var(--evergreen)]'
                      }`}
                    >
                      <Lightbulb className="w-5 h-5 mx-auto text-[var(--evergreen)]" />
                      <div className="text-xs text-[var(--evergreen-60)]">{t('feedback.featureRequest')}</div>
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
                    {t('feedback.emailLabel')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('feedback.emailPlaceholder')}
                    className="w-full p-3 border-2 border-[var(--evergreen-40)] rounded-lg text-sm focus:border-[var(--trail-orange)] focus:outline-none"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
                    {questionLabel}
                  </label>
                  <p className="mb-2 text-xs text-[var(--evergreen-60)]">
                    {t('feedback.answerHelper')}
                  </p>
                  <textarea
                    value={feedback}
                    onChange={(e) => {
                      setFeedback(e.target.value);
                      if (error) {
                        setError(null);
                      }
                    }}
                    placeholder={questionPlaceholder}
                    className="w-full p-3 border-2 border-[var(--evergreen-40)] rounded-lg resize-none h-24 text-sm focus:border-[var(--trail-orange)] focus:outline-none"
                  />
                  <div className="mt-2 text-xs text-[var(--evergreen-60)]">
                    {t('feedback.minimumLengthHint', { count: MIN_FEEDBACK_LENGTH })} {trimmedFeedbackLength}/{MIN_FEEDBACK_LENGTH}
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleCloseForm}
                    disabled={isSubmitting}
                    className="flex-1 py-2 px-4 border-2 border-[var(--evergreen)] text-[var(--evergreen)] rounded-lg font-medium hover:bg-[var(--evergreen)] hover:text-[var(--canvas)] transition-colors disabled:opacity-50"
                  >
                    {t('feedback.skip')}
                  </button>
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={!canSubmit}
                    className="flex-1 py-2 px-4 bg-[var(--trail-orange)] text-[var(--canvas)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('feedback.submitting')}
                      </>
                    ) : (
                      t('feedback.submit')
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
