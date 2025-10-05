import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package, TruckIcon, CheckCircle, XCircle, Power } from "lucide-react";

interface Delivery {
  id: string;
  order_id: string;
  status: string;
  assigned_at: string;
  notes: string | null;
  orders: {
    customer_name: string;
    phone: string;
    item_description: string;
    total_price: number;
    remaining_balance: number;
  };
}

export default function DelivererDashboard() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [delivererId, setDelivererId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    outForDelivery: 0,
    delivered: 0,
    cancelled: 0,
  });

  useEffect(() => {
    if (userRole !== "deliverer") {
      navigate("/");
      toast.error("Access Denied", {
        description: "You must be a deliverer to access this page",
      });
    } else {
      fetchDeliveries();
    }
  }, [userRole, navigate]);

  const fetchDeliveries = async () => {
    try {
      // First get the deliverer record
      const { data: delivererData, error: delivererError } = await supabase
        .from("deliverers")
        .select("id, is_online")
        .eq("user_id", user?.id)
        .single();

      if (delivererError) throw delivererError;

      setDelivererId(delivererData.id);
      setIsOnline(delivererData.is_online);

      // Then get all deliveries for this deliverer
      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          *,
          orders (
            customer_name,
            phone,
            item_description,
            total_price,
            remaining_balance
          )
        `)
        .eq("deliverer_id", delivererData.id)
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      setDeliveries(data || []);

      // Calculate stats
      const stats = {
        pending: data?.filter((d) => d.status === "pending").length || 0,
        outForDelivery: data?.filter((d) => d.status === "out_for_delivery").length || 0,
        delivered: data?.filter((d) => d.status === "delivered").length || 0,
        cancelled: data?.filter((d) => d.status === "cancelled").length || 0,
      };
      setStats(stats);
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!delivererId) return;
    
    try {
      const newStatus = !isOnline;
      const { error } = await supabase
        .from("deliverers")
        .update({ is_online: newStatus })
        .eq("id", delivererId);

      if (error) throw error;

      setIsOnline(newStatus);
      toast.success(newStatus ? "You are now online" : "You are now offline");
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending" },
      out_for_delivery: { variant: "default" as const, label: "Out for Delivery" },
      delivered: { variant: "default" as const, label: "Delivered" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeDeliveries = deliveries.filter(
    (d) => d.status === "pending" || d.status === "out_for_delivery"
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Deliveries</h1>
          <p className="text-muted-foreground">Manage your delivery assignments</p>
        </div>
        <Card className="p-4">
          <div className="flex items-center space-x-4">
            <Power className={`h-5 w-5 ${isOnline ? 'text-green-500' : 'text-gray-400'}`} />
            <div className="flex items-center space-x-2">
              <Switch
                id="online-status"
                checked={isOnline}
                onCheckedChange={toggleOnlineStatus}
              />
              <Label htmlFor="online-status" className="font-semibold">
                {isOnline ? 'Online' : 'Offline'}
              </Label>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out for Delivery</CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.outForDelivery}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Active Deliveries</CardTitle>
          <CardDescription>
            Deliveries that need your attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeDeliveries.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active deliveries</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeDeliveries.map((delivery) => (
                <Link
                  key={delivery.id}
                  to={`/deliverer/deliveries/${delivery.id}`}
                  className="block"
                >
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {delivery.orders.customer_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {delivery.orders.phone}
                          </p>
                        </div>
                        {getStatusBadge(delivery.status)}
                      </div>
                      <p className="text-sm mb-2">{delivery.orders.item_description}</p>
                      <p className="text-sm text-muted-foreground">
                        Assigned: {new Date(delivery.assigned_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Link to="/deliverer/history" className="text-primary hover:underline">
        View Delivery History →
      </Link>
    </div>
  );
}
