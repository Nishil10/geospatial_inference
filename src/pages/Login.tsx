import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (email && password) {
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
            } catch (err) {
                setError('Network error, could not reach server.');
            }
        }
    };

    return (
        <AuthLayout
            title="Welcome back!"
            subtitle="Sign in to continue to your dashboard."
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded text-sm mb-4">
                        {error}
                    </div>
                )}
                <div>
                    <label className="block text-sm text-slate-400 mb-2">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-dark-800 border border-dark-600 text-white rounded px-4 py-3 text-sm focus:outline-none focus:border-slate-500 transition-colors"
                        placeholder="you@example.com"
                        required
                    />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm text-slate-400">Password</label>
                        <a href="#" className="text-xs text-slate-500 hover:text-slate-400">Forgot Password?</a>
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-dark-800 border border-dark-600 text-white rounded px-4 py-3 text-sm focus:outline-none focus:border-slate-500 transition-colors"
                        placeholder="••••••••"
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-white text-dark-900 font-medium rounded px-4 py-3 text-sm hover:bg-slate-100 transition-colors"
                >
                    Sign in
                    <ArrowRight size={16} />
                </button>

                <p className="text-center text-sm text-slate-500 pt-4">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-white hover:underline">
                        Request access
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}
