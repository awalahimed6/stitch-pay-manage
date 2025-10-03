import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import NewOrder from "./pages/NewOrder";
import OrderDetail from "./pages/OrderDetail";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";

import UserDashboard from "./pages/UserDashboard";
import UserOrderDetail from "./pages/UserOrderDetail";
import DelivererManagement from "./pages/DelivererManagement";
import DelivererDashboard from "./pages/DelivererDashboard";
import DeliveryDetail from "./pages/DeliveryDetail";
import DeliveryHistory from "./pages/DeliveryHistory";


const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Layout>{children}</Layout>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/new"
              element={
                <ProtectedRoute>
                  <NewOrder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            
            {/* User routes */}
            <Route path="/user/dashboard" element={<UserDashboard />} />
            <Route path="/user/orders/:id" element={<UserOrderDetail />} />
            
            {/* Deliverer Management (Admin/Staff) */}
            <Route
              path="/deliverers"
              element={
                <ProtectedRoute>
                  <DelivererManagement />
                </ProtectedRoute>
              }
            />
            
            {/* Deliverer routes */}
            <Route
              path="/deliverer/dashboard"
              element={
                <ProtectedRoute>
                  <DelivererDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deliverer/deliveries/:id"
              element={
                <ProtectedRoute>
                  <DeliveryDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deliverer/history"
              element={
                <ProtectedRoute>
                  <DeliveryHistory />
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
