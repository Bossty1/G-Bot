import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useWebSocket } from "@/hooks/useWebSocket";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Trades from "@/pages/Trades";
import Strategies from "@/pages/Strategies";
import Exchanges from "@/pages/Exchanges";
import Wallets from "@/pages/Wallets";
import Backtests from "@/pages/Backtests";
import Logs from "@/pages/Logs";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 2,
    },
  },
});

function AppLayout() {
  const { botStatus, connected } = useWebSocket();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar botStatus={botStatus} wsConnected={connected} />
      <main className="flex-1 ml-56 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Switch>
            <Route path="/" component={() => <Dashboard botStatus={botStatus} />} />
            <Route path="/trades" component={Trades} />
            <Route path="/strategies" component={Strategies} />
            <Route path="/exchanges" component={Exchanges} />
            <Route path="/wallets" component={Wallets} />
            <Route path="/backtests" component={Backtests} />
            <Route path="/logs" component={Logs} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppLayout />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
