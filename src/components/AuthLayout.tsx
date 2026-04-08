export default function AuthLayout({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) {
    return (
        <div className="min-h-screen relative overflow-hidden bg-dark-900">
            {/* Full page earth background */}
            <div 
                className="absolute inset-0 bg-cover bg-no-repeat"
                style={{ 
                    backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80')`,
                    backgroundPosition: 'center 70%'
                }}
            />
            <div className="absolute inset-0 bg-dark-900/70" />

            {/* Form container */}
            <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    <div className="bg-dark-900/80 backdrop-blur-sm border border-dark-700/50 rounded-lg p-8">
                        <div className="mb-8">
                            <h1 className="text-2xl font-medium text-white mb-2">{title}</h1>
                            <p className="text-slate-400 text-sm">{subtitle}</p>
                        </div>

                        {children}
                    </div>
                    
                    <p className="text-center text-slate-500 text-xs mt-6">
                        Urban Change Detection Platform
                    </p>
                </div>
            </div>
        </div>
    );
}
