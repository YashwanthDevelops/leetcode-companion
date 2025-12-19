import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    CalendarClock,
    BarChart3,
    Settings,
    ChevronLeft,
    Flame
} from 'lucide-react';
import { useStore } from '../../stores/useStore';

interface NavItem {
    icon: React.ElementType;
    label: string;
    active?: boolean;
}

const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: CalendarClock, label: 'Reviews' },
    { icon: BarChart3, label: 'Analytics' },
    { icon: Settings, label: 'Settings' },
];

export const Sidebar = () => {
    const { sidebarOpen, toggleSidebar } = useStore();

    return (
        <motion.aside
            initial={false}
            animate={{ width: sidebarOpen ? 240 : 72 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="fixed left-0 top-0 h-screen bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] flex flex-col z-50"
        >
            {/* Logo Section */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-[hsl(var(--border))]">
                <motion.div
                    className="flex items-center gap-3 overflow-hidden"
                    animate={{ opacity: sidebarOpen ? 1 : 0 }}
                >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-lc-orange)] to-[var(--color-lc-purple)] flex items-center justify-center">
                        <Flame className="w-5 h-5 text-white" />
                    </div>
                    {sidebarOpen && (
                        <span className="font-semibold text-[hsl(var(--foreground))] whitespace-nowrap">
                            LeetCode Companion
                        </span>
                    )}
                </motion.div>

                <button
                    onClick={toggleSidebar}
                    className="w-8 h-8 rounded-lg bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--accent))] flex items-center justify-center transition-colors"
                >
                    <motion.div
                        animate={{ rotate: sidebarOpen ? 0 : 180 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronLeft className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    </motion.div>
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3">
                <ul className="space-y-1">
                    {navItems.map((item) => (
                        <li key={item.label}>
                            <button
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${item.active
                                        ? 'bg-[var(--color-lc-orange)]/10 text-[var(--color-lc-orange)]'
                                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'
                                    }`}
                            >
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                {sidebarOpen && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="font-medium whitespace-nowrap"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Bottom Section */}
            <div className="p-3 border-t border-[hsl(var(--border))]">
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-[var(--color-lc-orange)]/10 to-[var(--color-lc-purple)]/10"
                    >
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Keep Grinding!</p>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                            Consistency is key 🔥
                        </p>
                    </motion.div>
                )}
            </div>
        </motion.aside>
    );
};
