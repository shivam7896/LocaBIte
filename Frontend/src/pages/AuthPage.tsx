import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get('redirect') || '/';

  const {
    isLoggedIn,
    loginStep,
    pendingIdentifier,
    sendOtp,
    verifyOtp,
    loginAsDemo,
    loginWithGoogle,
    setLoginStep
  } = useAuth();

  const [inputVal, setInputVal] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isLoggedIn) {
      const dest =
        (pendingIdentifier || inputVal).toLowerCase().includes('admin') ||
        (pendingIdentifier || inputVal).toLowerCase() === 'sk866436@gmail.com' ||
        (pendingIdentifier || inputVal).toLowerCase() === 'shivam789612@gmail.com'
          ? '/admin'
          : redirectTarget;
      navigate(dest, { replace: true });
    }
  }, [isLoggedIn, navigate, redirectTarget, pendingIdentifier, inputVal]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (loginStep === 'otp' && resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [loginStep, resendTimer]);

  useEffect(() => {
    if (loginStep === 'otp') {
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [loginStep]);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) {
      setErrorMsg('Please enter a valid email or mobile number.');
      return;
    }
    setErrorMsg('');
    setOtpDigits(['', '', '', '', '', '']);
    await sendOtp(inputVal.trim());
    setResendTimer(30);
  };

  const handleOtpChange = (index: number, val: string) => {
    // Only accept numeric input
    const cleanVal = val.replace(/\D/g, '');
    if (cleanVal.length > 1) {
      val = cleanVal.slice(-1);
    } else {
      val = cleanVal;
    }
    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);

    // Auto advance focus
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    const targetIdx = Math.min(pasted.length, 5);
    inputRefs.current[targetIdx]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const isAdmin =
    (pendingIdentifier || inputVal).toLowerCase().includes('admin') ||
    (pendingIdentifier || inputVal).toLowerCase() === 'sk866436@gmail.com' ||
    (pendingIdentifier || inputVal).toLowerCase() === 'shivam789612@gmail.com';

  const handleGoogleOneTap = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    const target = inputVal.trim() || 'shivam789612@gmail.com';
    const isTargetAdmin =
      target.toLowerCase() === 'shivam789612@gmail.com' ||
      target.toLowerCase() === 'sk866436@gmail.com' ||
      target.toLowerCase().includes('admin');
    const success = await loginWithGoogle(target);
    setIsGoogleLoading(false);
    if (success) {
      if (isTargetAdmin) {
        navigate('/admin');
      } else {
        navigate(redirectTarget);
      }
    } else {
      setErrorMsg('Google sign-in could not be completed. Please try with OTP.');
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter all 6 digits of your verification code.');
      return;
    }
    setErrorMsg('');
    const success = await verifyOtp(code, pendingIdentifier || inputVal);
    if (success) {
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate(redirectTarget);
      }
    } else {
      setErrorMsg('Invalid or expired verification code. Please check your email or click "Resend Code".');
    }
  };

  return (
    <div className="w-full bg-surface min-h-[calc(100vh-80px)] py-6 sm:py-12 flex items-center justify-center">
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* LEFT COLUMN: Brand Showcase & Student Testimonials (Desktop) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-between p-10 rounded-3xl bg-gradient-to-br from-surface-container via-surface-container-high to-surface-container-low shadow-level-1 relative overflow-hidden border border-outline-variant/30">
            {/* Ambient Blobs */}
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-secondary-container/25 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm uppercase tracking-wider font-extrabold shadow-xs">
                  <span className="material-symbols-outlined text-[15px] text-primary material-symbols-fill">
                    bolt
                  </span>
                  Hyper-Speed Campus Dispatch
                </span>
                <span className="font-body-sm text-[12px] text-on-surface-variant flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  Live in 18+ Campuses
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <h1 className="font-headline-lg text-3xl text-on-surface leading-tight font-extrabold tracking-tight">
                  Craving midnight pizza or out of daily essentials?{' '}
                  <span className="text-primary underline decoration-primary/30 decoration-wavy underline-offset-4">
                    We deliver in minutes.
                  </span>
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg mt-1">
                  LocaBite synchronizes cloud kitchens, student hubs, and 24/7 dark stores for frictionless delivery directly to your dorm door.
                </p>
              </div>

              {/* 3 Feature Highlights */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/20">
                  <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary text-[22px] material-symbols-fill">
                      electric_bolt
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-[14px] font-bold text-on-surface">
                      10–15 Min Campus Delivery
                    </span>
                    <span className="font-body-sm text-[12px] text-on-surface-variant">
                      Bypasses gate queues straight to designated quad hubs
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/20">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed/60 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[22px]">
                      local_offer
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-headline-sm text-[14px] font-bold text-on-surface">
                        Flat ₹100 OFF with code
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-primary text-on-primary font-mono text-[11px] font-bold">
                        LOCAFIRST
                      </span>
                    </div>
                    <span className="font-body-sm text-[12px] text-on-surface-variant">
                      Valid on all restaurant & grocery baskets above ₹199
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/20">
                  <div className="w-10 h-10 rounded-xl bg-tertiary-fixed/60 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-tertiary text-[22px] material-symbols-fill">
                      near_me
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-[14px] font-bold text-on-surface">
                      Hyper-Local Discovery
                    </span>
                    <span className="font-body-sm text-[12px] text-on-surface-variant">
                      Curated across 120+ top campus eateries & 24/7 grocery marts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial Quote */}
            <div className="relative z-10 mt-8 p-4 rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/20">
              <div className="flex items-start gap-3">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqxHXzVSlohl5ueL6SrR5W3Sff1SUuyq7sIp3xjxL-2LdsASHaAvcOBOIAdNAiyvBlKZi4jfEpWSZzKO5h8IJXJPRNa7wOsRm424lHo9rG6gbBcL4Jl6Ee0n2xztVFwnhDqhhkJ-cmARhpO_WY_ypr6IYO48oEO0FcnOkiZcY7fw1UMEwETlORb1xwr95w0mdgQcKGWEWUIPRSFQJ5zIdGZAW4eQ5tjcdG0eTEZ0O-oEB1u3cDRReg"
                  alt="Aarav S avatar"
                  className="w-11 h-11 rounded-full object-cover shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <div className="flex text-amber-500 text-[13px] mb-0.5">
                    {'★★★★★'}
                    <span className="font-label-sm text-[11px] text-secondary font-semibold ml-2">
                      Verified Student
                    </span>
                  </div>
                  <p className="font-body-md text-[13px] text-on-surface italic">
                    “LocaBite has completely changed hostel life — hot meals arrive before our lectures end!”
                  </p>
                  <span className="font-label-md text-[12px] text-on-surface-variant font-bold mt-1">
                    Aarav Sharma <span className="font-normal text-outline">• Quantum University</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Authentication Card (Desktop & Mobile) */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="w-full bg-surface-container-lowest p-6 sm:p-8 md:p-10 rounded-3xl shadow-level-2 border border-outline-variant/30 flex flex-col">
              {loginStep !== 'otp' ? (
                /* STEP 1: Phone / Email Entry */
                <>
                  <div className="flex flex-col gap-1 mb-6">
                    <div className="flex items-center justify-between">
                      <h2 className="font-headline-md text-2xl font-bold text-on-surface">
                        Welcome to LocaBite
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container/30 text-secondary font-label-sm text-[11px] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">lock</span>
                        Protected
                      </span>
                    </div>
                    <p className="font-body-md text-on-surface-variant text-[13px]">
                      Access campus food, late-night snacks, and 10-min mart orders in one tap.
                    </p>
                  </div>

                  {/* Student Voucher Perk Banner */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-fixed via-surface-container-high to-surface-container p-4 mb-6 shadow-xs flex items-center gap-3 border border-primary/20">
                    <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-on-primary text-[22px] material-symbols-fill">
                        redeem
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-lg text-label-lg text-primary font-extrabold">
                          ₹100 OFF
                        </span>
                        <span className="font-label-sm text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">
                          First 3 orders
                        </span>
                      </div>
                      <p className="font-body-sm text-[11px] text-on-surface-variant truncate">
                        Code auto-applied upon logging in with student email
                      </p>
                    </div>
                  </div>

                  {/* Google One-Tap SSO */}
                  <button
                    type="button"
                    onClick={handleGoogleOneTap}
                    disabled={isGoogleLoading}
                    className="h-12 w-full px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center gap-3 transition-colors shadow-xs border border-outline-variant/30 font-label-md text-label-md font-bold disabled:opacity-60 cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>{isGoogleLoading ? 'Signing in with Google...' : 'Continue with Google One-Tap'}</span>
                  </button>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center my-6">
                    <div className="w-full h-px bg-surface-variant" />
                    <span className="absolute bg-surface-container-lowest px-3 font-body-sm text-[11px] text-outline uppercase tracking-wider font-semibold">
                      or continue with email or phone
                    </span>
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleContinue} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-label-md text-label-md text-on-surface font-bold">
                          Email or Mobile Number
                        </label>
                        <span className="text-[11px] text-outline">Campus or Personal</span>
                      </div>

                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 text-on-surface-variant flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-[20px]">mail</span>
                        </div>
                        <input
                          type="text"
                          value={inputVal}
                          onChange={e => setInputVal(e.target.value)}
                          placeholder="name@campus.edu or +91"
                          required
                          className="w-full h-12 pl-11 pr-10 rounded-xl bg-surface-container-low text-on-surface font-body-lg text-body-lg focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary border border-outline-variant/30 shadow-inner transition-all placeholder:text-outline/70"
                        />
                        <span className="absolute right-3.5 text-secondary pointer-events-none">
                          <span className="material-symbols-outlined text-[18px]">verified</span>
                        </span>
                      </div>

                      {errorMsg && <span className="text-error text-[12px]">{errorMsg}</span>}
                    </div>

                    <button
                      type="submit"
                      className="w-full h-12 rounded-xl bg-primary hover:bg-[#d63d10] active:scale-[0.99] text-on-primary font-headline-sm text-headline-sm shadow-level-1 hover:shadow-level-2 transition-all flex items-center justify-center gap-2 mt-2 font-bold tracking-wide"
                    >
                      <span>Continue & Get Code</span>
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </button>
                  </form>

                  {/* Demo Login Quick Shortcut */}
                  <div className="mt-4 pt-4 border-t border-outline-variant/20 flex items-center justify-between">
                    <span className="text-[12px] text-on-surface-variant">Quick testing?</span>
                    <button
                      onClick={async () => {
                        await loginAsDemo();
                        navigate(redirectTarget);
                      }}
                      className="text-primary font-label-md text-label-md font-bold hover:underline"
                    >
                      Instant Demo Sign In (Aarav S.)
                    </button>
                  </div>
                </>
              ) : (
                /* STEP 2: 6-Digit OTP Verification */
                <form onSubmit={handleVerifySubmit} className="flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setLoginStep('input')}
                      className="flex items-center gap-1 text-[13px] font-semibold text-on-surface-variant hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                      <span>Change identifier</span>
                    </button>
                    <span className="text-[11px] font-bold text-secondary bg-secondary-container/40 px-2 py-0.5 rounded-full">
                      Step 2 of 2
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                      <span className="font-label-md text-label-md text-primary font-bold">
                        Waiting for verification code
                      </span>
                    </div>
                    <h2 className="font-headline-lg text-2xl font-bold text-on-surface tracking-tight">
                      Verify Your Code
                    </h2>
                    <p className="font-body-md text-on-surface-variant text-[13px]">
                      We sent a 6-digit code to{' '}
                      <strong className="text-on-surface">{pendingIdentifier}</strong>
                    </p>
                  </div>

                  {/* Instructions Banner */}
                  <div className="p-3 rounded-2xl bg-surface-container-high/60 border border-outline-variant/30 flex items-center gap-3 shadow-xs">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px] material-symbols-fill">
                        mark_email_unread
                      </span>
                    </div>
                    <div className="flex flex-col text-[12px]">
                      <span className="font-bold text-on-surface">Enter your 6-digit code</span>
                      <span className="text-on-surface-variant">Check your email inbox or <strong>Spam / Junk</strong> folder.</span>
                    </div>
                  </div>

                  {/* 6-Digit Boxes */}
                  <div className="flex flex-col items-center justify-center my-2">
                    <div className="grid grid-cols-6 gap-2 w-full max-w-[340px]">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={el => (inputRefs.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleOtpChange(idx, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(idx, e)}
                          onPaste={handlePaste}
                          autoComplete="one-time-code"
                          className="h-14 w-full text-center font-headline-lg text-xl font-bold text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-xs transition-all"
                        />
                      ))}
                    </div>
                    {errorMsg && <span className="text-error text-[12px] mt-2 text-center">{errorMsg}</span>}
                  </div>

                  {/* Countdown Timer & Resend */}
                  <div className="flex items-center justify-between text-[12px] text-on-surface-variant">
                    {resendTimer > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary/70 animate-pulse" />
                        Resend code in {resendTimer}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          setResendTimer(30);
                          setErrorMsg('');
                          setOtpDigits(['', '', '', '', '', '']);
                          await sendOtp(pendingIdentifier || inputVal);
                        }}
                        className="text-primary font-bold hover:underline cursor-pointer"
                      >
                        Resend Code
                      </button>
                    )}
                    <span className="text-outline text-[11px]">Didn't get code? Check Spam</span>
                  </div>

                  {/* Verify CTA */}
                  <button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-primary hover:bg-[#d63d10] active:scale-[0.99] text-on-primary font-headline-sm text-headline-sm shadow-level-1 hover:shadow-level-2 transition-all flex items-center justify-center gap-2 font-bold tracking-wide"
                  >
                    <span>Verify & Continue</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
