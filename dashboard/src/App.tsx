import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { StatsCards } from './components/Stats/StatsCards';
import { ReviewQueue } from './components/Reviews/ReviewQueue';
import { ContributionHeatmap } from './components/Heatmap/ContributionHeatmap';
import { useStore } from './stores/useStore';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

function Dashboard() {
  const { sidebarOpen } = useStore();

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] dark">
      <Sidebar />
      <Header />

      {/* Main Content */}
      <main
        className="pt-24 transition-all duration-200 relative z-0"
        style={{ marginLeft: sidebarOpen ? 240 : 72 }}
      >
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
          {/* Stats Row */}
          <section>
            <StatsCards />
          </section>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Review Queue */}
            <section>
              <ReviewQueue />
            </section>

            {/* Heatmap */}
            <section className="lg:col-span-1">
              <ContributionHeatmap />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

export default App;
