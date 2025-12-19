import { Bell, Search } from 'lucide-react';
import { useStore } from '../../stores/useStore';

export const Header = () => {
    const { sidebarOpen } = useStore();

    return (
        <header
            className="fixed top-0 right-0 h-16 bg-[hsl(var(--card)/0.8)] backdrop-blur-xl border-b border-[hsl(var(--border))] flex items-center justify-between px-6 z-40 transition-all duration-200"
            style={{ left: sidebarOpen ? 240 : 72 }}
        >
            {/* Left Section */}
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                    Dashboard
                </h1>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                    <Search className="w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search problems..."
                        className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-[hsl(var(--muted-foreground))]"
                    />
                    <kbd className="text-xs bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded">⌘K</kbd>
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
                <button className="relative p-2 rounded-lg hover:bg-[hsl(var(--secondary))] transition-colors">
                    <Bell className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--color-lc-orange)]" />
                </button>

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-lc-green)] to-[var(--color-lc-blue)] flex items-center justify-center">
                        <span className="text-sm font-medium text-white">U</span>
                    </div>
                </div>
            </div>
        </header>
    );
};
