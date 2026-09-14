import { useState } from 'react';
import { ArrowRight, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/auth/Field';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const [error, setError] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [caps, setCaps] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (email && password) {
            // Inside the guard, not above it — otherwise an empty submit that
            // never enters the try would leave the button spinning forever.
            setSubmitting(true);
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('isAuthenticated', 'true');
                    localStorage.setItem('user', JSON.stringify(data));
                    navigate('/');
                } else {
                    setError(data.message || 'Login failed');
                }
            } catch {
                setError('Network error, could not reach server.');
            } finally {
                setSubmitting(false);
            }
        }
    };

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to open the change-detection console."
        >
            <form onSubmit={handleSubmit} aria-busy={submitting} className="space-y-5">
                {/* key={error} remounts the node so an identical repeated failure
                    re-announces. role="alert" already implies aria-live — adding
                    both causes duplicate announcements in some screen readers. */}
                {error && (
                    <div
                        key={error}
                        role="alert"
                        className="gd-slip flex items-start gap-2.5 border-l-2 border-brand-alert bg-brand-alert/[0.08] px-3 py-2.5 text-[13px] leading-snug text-red-300"
                    >
                        <AlertTriangle size={14} aria-hidden="true" className="mt-px shrink-0 text-brand-alert" />
                        <span>{error}</span>
                    </div>
                )}

                <Field
                    id="login-email"
                    label="Email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    spellCheck={false}
                    placeholder="you@example.com"
                    required
                    invalid={!!error}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <Field
                    id="login-password"
                    label="Password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    invalid={!!error}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => setCaps(e.getModifierState('CapsLock'))}
                    onKeyUp={(e) => setCaps(e.getModifierState('CapsLock'))}
                    onBlur={() => setCaps(false)}
                    action={
                        <a
                            href="#"
                            className="rounded-sm text-[11px] text-slate-400 transition-colors hover:text-brand-accent focus-visible:text-brand-accent focus-visible:underline focus-visible:outline-none"
                        >
                            Forgot password?
                        </a>
                    }
                    trailing={
                        <button
                            type="button"
                            onClick={() => setShowPw((v) => !v)}
                            aria-label={showPw ? 'Hide password' : 'Show password'}
                            aria-pressed={showPw}
                            className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/70"
                        >
                            {showPw ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                        </button>
                    }
                    hint={
                        caps ? (
                            <p
                                role="status"
                                className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-brand-warning"
                            >
                                <AlertTriangle size={12} aria-hidden="true" className="shrink-0" />
                                Caps Lock is on
                            </p>
                        ) : null
                    }
                />

                <button
                    type="submit"
                    disabled={submitting}
                    className="group relative mt-2 flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-md bg-brand-accent text-[12px] font-bold uppercase tracking-[0.16em] text-dark-900 transition-colors duration-200 hover:bg-[#34d399] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#080e1a]"
                >
                    {submitting ? (
                        <>
                            <Loader2 size={15} aria-hidden="true" className="gd-spinner animate-spin" />
                            Authenticating
                            <span aria-hidden="true" className="gd-scan absolute bottom-0 left-0 h-0.5 w-1/3 bg-dark-900/45" />
                        </>
                    ) : (
                        <>
                            Sign in
                            <ArrowRight
                                size={15}
                                aria-hidden="true"
                                className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                            />
                        </>
                    )}
                </button>

                <p className="pt-2 text-[13px] text-slate-400">
                    Don't have an account?{' '}
                    <Link
                        to="/register"
                        className="rounded-sm text-white underline-offset-4 transition-colors hover:text-brand-accent hover:underline focus-visible:text-brand-accent focus-visible:underline focus-visible:outline-none"
                    >
                        Request access
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}
