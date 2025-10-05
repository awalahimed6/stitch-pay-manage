import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Package, MapPin, Phone, DollarSign } from "lucide-react";

interface Delivery {
  id: string;
  order_id: string;
  status: string;
  assigned_at: string;
  completed_at: string | null;
  notes: string | null;
  orders: {
    id: string;
    customer_name: string;
    phone: string;
    item_description: string;
    total_price: number;
    remaining_balance: number;
    due_date: string | null;
    notes: string | null;
    delivery_address?: any;
    delivery_fee?: number;
  };
}

export default function DeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (userRole !== "deliverer") {
      navigate("/");
      toast.error("Access Denied");
    } else {
      fetchDeliveryDetail();
    }
  }, [userRole, id, navigate]);

  const fetchDeliveryDetail = async () => {
    try {
      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          *,
          orders (
            id,
            customer_name,
            phone,
            item_description,
            total_price,
            remaining_balance,
            due_date,
            notes,
            delivery_address,
            delivery_fee
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      setDelivery(data);
      setNotes(data.notes || "");
    } catch (error: any) {
      toast.error("Error", { description: error.message });
      navigate("/deliverer/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = async (newStatus: string) => {
    if (!delivery) return;

    setUpdating(true);
    try {
      const updateData: any = {
        status: newStatus,
        notes,
      };

      if (newStatus === "delivered" || newStatus === "cancelled") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("deliveries")
        .update(updateData)
        .eq("id", delivery.id);

      if (error) throw error;

      toast.success("Success", {
        description: `Delivery status updated to ${newStatus.replace("_", " ")}`,
      });

      fetchDeliveryDetail();
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    } finally {
      setUpdating(false);
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

  if (!delivery) {
    return null;
  }

  const canUpdateStatus = delivery.status !== "delivered" && delivery.status !== "cancelled";

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/deliverer/dashboard")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <div className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-3xl font-bold">Delivery Details</h1>
          {getStatusBadge(delivery.status)}
        </div>
        <p className="text-muted-foreground">
          Assigned: {new Date(delivery.assigned_at).toLocaleDateString()}
        </p>
        {delivery.completed_at && (
          <p className="text-muted-foreground">
            Completed: {new Date(delivery.completed_at).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Customer Name</Label>
              <p className="font-semibold text-lg">{delivery.orders.customer_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground flex items-center">
                <Phone className="mr-1 h-4 w-4" /> Phone Number
              </Label>
              <p className="font-semibold">{delivery.orders.phone}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Item Description</Label>
              <p>{delivery.orders.item_description}</p>
            </div>
            {delivery.orders.delivery_address && (
              <div>
                <Label className="text-muted-foreground flex items-center">
                  <MapPin className="mr-1 h-4 w-4" /> Delivery Address
                </Label>
                <p className="font-semibold">
                  {delivery.orders.delivery_address.street}, House {delivery.orders.delivery_address.houseNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  {delivery.orders.delivery_address.city}
                </p>
              </div>
            )}
            {delivery.orders.notes && (
              <div>
                <Label className="text-muted-foreground">Order Notes</Label>
                <p className="text-sm">{delivery.orders.notes}</p>
              </div>
            )}
            {delivery.orders.due_date && (
              <div>
                <Label className="text-muted-foreground">Due Date</Label>
                <p>{new Date(delivery.orders.due_date).toLocaleDateString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-muted-foreground">Total Price</Label>
              <p className="font-semibold">{delivery.orders.total_price} ETB</p>
            </div>
            <div className="flex justify-between">
              <Label className="text-muted-foreground">Remaining Balance</Label>
              <p className="font-semibold text-destructive">
                {delivery.orders.remaining_balance} ETB
              </p>
            </div>
            {delivery.orders.delivery_fee && delivery.orders.delivery_fee > 0 && (
              <div className="flex justify-between">
                <Label className="text-muted-foreground">Delivery Fee</Label>
                <p className="font-semibold">{delivery.orders.delivery_fee} ETB</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Notes</CardTitle>
            <CardDescription>Add notes about this delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the delivery..."
              rows={4}
              disabled={!canUpdateStatus}
            />
          </CardContent>
        </Card>

        {canUpdateStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
              <CardDescription>Accept order and change delivery status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {delivery.status === "pending" && (
                <Button
                  className="w-full"
                  onClick={() => updateDeliveryStatus("out_for_delivery")}
                  disabled={updating}
                >
                  Accept & Start Delivery
                </Button>
              )}
              {delivery.status === "out_for_delivery" && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => updateDeliveryStatus("delivered")}
                    disabled={updating}
                  >
                    Mark as Delivered
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => updateDeliveryStatus("cancelled")}
                    disabled={updating}
                  >
                    Cancel Delivery
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!canUpdateStatus && (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                This delivery has been {delivery.status === "delivered" ? "completed" : "cancelled"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
