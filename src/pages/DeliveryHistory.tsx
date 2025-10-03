import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Search } from "lucide-react";

interface Delivery {
  id: string;
  order_id: string;
  status: string;
  assigned_at: string;
  completed_at: string | null;
  orders: {
    customer_name: string;
    phone: string;
    item_description: string;
    total_price: number;
  };
}

export default function DeliveryHistory() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (userRole !== "deliverer") {
      navigate("/");
      toast.error("Access Denied");
    } else {
      fetchDeliveryHistory();
    }
  }, [userRole, navigate]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDeliveries(deliveries);
    } else {
      const filtered = deliveries.filter(
        (delivery) =>
          delivery.orders.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          delivery.orders.phone.includes(searchQuery) ||
          delivery.orders.item_description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDeliveries(filtered);
    }
  }, [searchQuery, deliveries]);

  const fetchDeliveryHistory = async () => {
    try {
      // First get the deliverer record
      const { data: delivererData, error: delivererError } = await supabase
        .from("deliverers")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (delivererError) throw delivererError;

      // Get completed deliveries
      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          *,
          orders (
            customer_name,
            phone,
            item_description,
            total_price
          )
        `)
        .eq("deliverer_id", delivererData.id)
        .in("status", ["delivered", "cancelled"])
        .order("completed_at", { ascending: false });

      if (error) throw error;

      setDeliveries(data || []);
      setFilteredDeliveries(data || []);
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
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

  return (
    <div className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/deliverer/dashboard")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Delivery History</h1>
        <p className="text-muted-foreground">Your completed and cancelled deliveries</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by customer, phone, or item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History ({filteredDeliveries.length})</CardTitle>
          <CardDescription>All your past deliveries</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDeliveries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No delivery history found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredDeliveries.map((delivery) => (
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
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          Assigned: {new Date(delivery.assigned_at).toLocaleDateString()}
                        </span>
                        {delivery.completed_at && (
                          <span>
                            Completed: {new Date(delivery.completed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
