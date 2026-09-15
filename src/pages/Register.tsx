import { useState } from 'react';
import { ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/auth/Field';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (name && email && password) {
            setSubmitting(true);
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('isAuthenticated', 'true');
                    localStorage.setItem('user', JSON.stringify(data));
                    navigate('/');
                } else {
                    setError(data.message || 'Registration failed');
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
            title="Request access"
            subtitle="Create an account to start monitoring change."
        >
            <form onSubmit={handleSubmit} aria-busy={submitting} className="space-y-5">
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
                    id="register-name"
                    label="Full name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    required
                    invalid={!!error}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <Field
                    id="register-email"
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
                    id="register-password"
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    required
                    invalid={!!error}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button
                    type="submit"
                    disabled={submitting}
                    className="group relative mt-2 flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-[3px] bg-brand-accent text-[12px] font-bold uppercase tracking-[0.16em] text-dark-900 transition-colors duration-200 hover:bg-[#34d399] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#080e1a]"
                >
                    {submitting ? (
                        <>
                            <Loader2 size={15} aria-hidden="true" className="gd-spinner animate-spin" />
                            Creating account
                            <span aria-hidden="true" className="gd-scan absolute bottom-0 left-0 h-0.5 w-1/3 bg-dark-900/45" />
                        </>
                    ) : (
                        <>
                            Create account
                            <ArrowRight
                                size={15}
                                aria-hidden="true"
                                className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                            />
                        </>
                    )}
                </button>

                <p className="pt-2 text-[13px] text-slate-400">
                    Already have an account?{' '}
                    <Link
                        to="/login"
                        className="rounded-sm text-white underline-offset-4 transition-colors hover:text-brand-accent hover:underline focus-visible:text-brand-accent focus-visible:underline focus-visible:outline-none"
                    >
                        Sign in
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}
