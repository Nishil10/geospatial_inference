import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (name && email && password) {
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
            } catch (err) {
                setError('Network error, could not reach server.');
            }
        }
    };

    return (
        <AuthLayout
            title="Request access"
            subtitle="Create an account to get started."
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded text-sm mb-4">
                        {error}
                    </div>
                )}
                <div>
                    <label className="block text-sm text-slate-400 mb-2">Full name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-dark-800 border border-dark-600 text-white rounded px-4 py-3 text-sm focus:outline-none focus:border-slate-500 transition-colors"
                        placeholder="Your name"
                        required
                    />
                </div>

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
                    <label className="block text-sm text-slate-400 mb-2">Password</label>
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
                    className="w-full flex items-center justify-center gap-2 bg-white text-dark-900 font-medium rounded px-4 py-3 text-sm hover:bg-slate-100 transition-colors mt-8"
                >
                    Create account
                    <ArrowRight size={16} />
                </button>

                <p className="text-center text-sm text-slate-500 pt-4">
                    Already have an account?{' '}
                    <Link to="/login" className="text-white hover:underline">
                        Sign in
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}
