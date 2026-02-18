import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, X, ThumbsUp, ArrowLeftRight, Loader2 } from 'lucide-react';

const STORAGE_KEY = 'trailreplay_v2_feedback_solicited';
const ACTIVITY_KEY = 'trailreplay_v2_activity';
const MAYBE_LATER_KEY = 'trailreplay_v2_maybe_later';
const MIN_ACTIVITY = 3;
const MAYBE_LATER_COOLDOWN = 86400000; // 24 hours

interface ActivityData {
  count: number;
  firstVisit: number;
  lastActivity: number;
}

export function FeedbackSolicitation() {
  const [showPopup, setShowPopup] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [preference, setPreference] = useState<'v1' | 'v2' | 'both' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track activity
  useEffect(() => {
    const trackActivity = () => {
      try {
        const stored = localStorage.getItem(ACTIVITY_KEY);
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
  }, []);

  const checkAndShowSolicitation = useCallback((activity: ActivityData) => {
    // Don't show if already solicited
    if (localStorage.getItem(STORAGE_KEY) === 'true') {
      return;
    }

    // Check maybe later cooldown
    const maybeLater = localStorage.getItem(MAYBE_LATER_KEY);
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
  }, []);

  const handleYes = () => {
    setShowPopup(false);
    setShowForm(true);
  };

  const handleMaybeLater = () => {
    localStorage.setItem(MAYBE_LATER_KEY, Date.now().toString());
    setShowPopup(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowPopup(false);
  };

  const handleSubmitFeedback = async () => {
    setIsSubmitting(true);
    setError(null);

    // Build the feedback message
    const preferenceLabels = {
      v1: 'Prefers v1 (Classic)',
      v2: 'Prefers v2 (New)',
      both: 'Likes both versions',
    };
    const message = [
      `Version Preference: ${preference ? preferenceLabels[preference] : 'Not specified'}`,
      '',
      'Additional Feedback:',
      feedback || '(No additional feedback provided)',
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
            source: 'v2-feedback-solicitation',
            preference,
          },
        }),
      });

      if (res.ok) {
        localStorage.setItem(STORAGE_KEY, 'true');
        setSubmitted(true);
        setTimeout(() => {
          setShowForm(false);
          setSubmitted(false);
        }, 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseForm = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowForm(false);
  };

  if (!showPopup && !showForm) {
    return null;
  }

  return (
    <>
      {/* Solicitation Popup */}
      {showPopup && (
        <div className="fixed bottom-24 right-4 z-50 animate-slide-up">
          <div className="bg-[var(--evergreen)] text-[var(--canvas)] rounded-xl p-4 shadow-lg max-w-sm">
            <div className="flex items-start gap-3">
              <div className="bg-[var(--trail-orange)] rounded-full p-2">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold mb-1">Share your thoughts?</h3>
                <p className="text-sm opacity-90 mb-3">
                  We'd love to hear which version you prefer - v1 or v2!
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleYes}
                    className="px-3 py-1.5 bg-[var(--trail-orange)] text-[var(--canvas)] rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Sure!
                  </button>
                  <button
                    onClick={handleMaybeLater}
                    className="px-3 py-1.5 bg-white/10 rounded-md text-sm hover:bg-white/20 transition-colors"
                  >
                    Maybe later
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-1.5 text-sm opacity-60 hover:opacity-100 transition-opacity"
                  >
                    Don't ask again
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--canvas)] border-2 border-[var(--evergreen)] rounded-xl p-6 max-w-md w-full animate-fade-in">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ThumbsUp className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-[var(--evergreen)] mb-2">
                  Thank you!
                </h3>
                <p className="text-[var(--evergreen-60)]">
                  Your feedback helps us improve Trail Replay.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[var(--evergreen)]">
                    Version Comparison Feedback
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
                    Which version do you prefer?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPreference('v1')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        preference === 'v1'
                          ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]'
                          : 'border-[var(--evergreen-40)] hover:border-[var(--evergreen)]'
                      }`}
                    >
                      <div className="font-bold text-[var(--evergreen)]">v1</div>
                      <div className="text-xs text-[var(--evergreen-60)]">Classic</div>
                    </button>
                    <button
                      onClick={() => setPreference('v2')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        preference === 'v2'
                          ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]'
                          : 'border-[var(--evergreen-40)] hover:border-[var(--evergreen)]'
                      }`}
                    >
                      <div className="font-bold text-[var(--evergreen)]">v2</div>
                      <div className="text-xs text-[var(--evergreen-60)]">New</div>
                    </button>
                    <button
                      onClick={() => setPreference('both')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        preference === 'both'
                          ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]'
                          : 'border-[var(--evergreen-40)] hover:border-[var(--evergreen)]'
                      }`}
                    >
                      <ArrowLeftRight className="w-5 h-5 mx-auto text-[var(--evergreen)]" />
                      <div className="text-xs text-[var(--evergreen-60)]">Both</div>
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
                    Your email (optional, for follow-up)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full p-3 border-2 border-[var(--evergreen-40)] rounded-lg text-sm focus:border-[var(--trail-orange)] focus:outline-none"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
                    Any additional feedback? (optional)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="What do you like or dislike about each version?"
                    className="w-full p-3 border-2 border-[var(--evergreen-40)] rounded-lg resize-none h-24 text-sm focus:border-[var(--trail-orange)] focus:outline-none"
                  />
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
                    Skip
                  </button>
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={!preference || isSubmitting}
                    className="flex-1 py-2 px-4 bg-[var(--trail-orange)] text-[var(--canvas)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Submit'
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
