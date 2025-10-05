import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, DollarSign, Calendar, Phone, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { generateReceipt } from "@/lib/receipt";
import { z } from "zod";

interface Order {
  id: string;
  customer_name: string;
  phone: string;
  item_description: string;
  total_price: number;
  remaining_balance: number;
  status: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  delivery_required?: boolean;
  delivery_address?: any;
  delivery_fee?: number;
  delivery_status?: string;
}

interface Deliverer {
  id: string;
  full_name: string;
  is_active: boolean;
  is_online: boolean;
}

interface Delivery {
  id: string;
  deliverer_id: string | null;
  status: string;
}

interface Payment {
  id: string;
  payer_name: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
}

const paymentSchema = z.object({
  payerName: z.string().min(2, "Payer name must be at least 2 characters").max(100),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.enum(["cash", "bank", "other"]),
  notes: z.string().max(500).optional(),
});

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deliverers, setDeliverers] = useState<Deliverer[]>([]);
  const [currentDelivery, setCurrentDelivery] = useState<Delivery | null>(null);
  const [selectedDelivererId, setSelectedDelivererId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
      if (canManagePayments) {
        fetchDeliverers();
        fetchCurrentDelivery();
      }
    }
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", id)
        .order("payment_date", { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast({
        title: "Error",
        description: "Failed to load order details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliverers = async () => {
    try {
      const { data, error } = await supabase
        .from("deliverers")
        .select("id, full_name, is_active, is_online")
        .eq("is_active", true)
        .order("is_online", { ascending: false })
        .order("full_name");

      if (error) throw error;
      setDeliverers(data || []);
    } catch (error) {
      console.error("Error fetching deliverers:", error);
    }
  };

  const fetchCurrentDelivery = async () => {
    try {
      const { data, error } = await supabase
        .from("deliveries")
        .select("id, deliverer_id, status")
        .eq("order_id", id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setCurrentDelivery(data);
        setSelectedDelivererId(data.deliverer_id || "");
      }
    } catch (error) {
      console.error("Error fetching current delivery:", error);
    }
  };

  const handleAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payerName = formData.get("payerName") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const paymentMethod = formData.get("paymentMethod") as string;
    const notes = formData.get("notes") as string;

    try {
      const validated = paymentSchema.parse({
        payerName,
        amount,
        paymentMethod,
        notes: notes || undefined,
      });

      if (order && amount > order.remaining_balance) {
        setErrors({ amount: "Payment amount exceeds remaining balance" });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("payments").insert({
        order_id: id,
        payer_name: validated.payerName,
        amount: validated.amount,
        payment_method: validated.paymentMethod,
        notes: validated.notes || null,
        recorded_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Payment recorded",
        description: "Payment has been recorded successfully.",
      });

      // Reset form
      (e.target as HTMLFormElement).reset();
      
      // Refresh order details
      await fetchOrderDetails();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error("Error adding payment:", error);
        toast({
          title: "Error",
          description: "Failed to record payment. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePrice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const newPrice = parseFloat(formData.get("totalPrice") as string);
    const dueDate = formData.get("dueDate") as string;

    try {
      if (newPrice < 0) {
        setErrors({ totalPrice: "Price must be greater than or equal to 0" });
        setIsSubmitting(false);
        return;
      }

      // Calculate how much has been paid
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const newBalance = newPrice - totalPaid;

      const { error } = await supabase
        .from("orders")
        .update({
          total_price: newPrice,
          remaining_balance: newBalance,
          due_date: dueDate || null,
          status: newBalance <= 0 ? "paid" : totalPaid > 0 ? "partial" : "pending",
        })
        .eq("id", id);

      if (error) throw error;

      // Auto-assign deliverer if delivery is required and deliverer is selected
      if (order?.delivery_required && selectedDelivererId) {
        await handleAssignDeliverer();
      }

      toast({
        title: "Price Updated",
        description: "Order price has been updated successfully.",
      });

      setIsEditingPrice(false);
      await fetchOrderDetails();
    } catch (error) {
      console.error("Error updating price:", error);
      toast({
        title: "Error",
        description: "Failed to update price. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignDeliverer = async () => {
    if (!selectedDelivererId || !order) return;

    try {
      if (currentDelivery) {
        // Update existing delivery
        const { error } = await supabase
          .from("deliveries")
          .update({
            deliverer_id: selectedDelivererId,
            status: "pending",
          })
          .eq("id", currentDelivery.id);

        if (error) throw error;
      } else {
        // Create new delivery
        const { error } = await supabase
          .from("deliveries")
          .insert({
            order_id: id,
            deliverer_id: selectedDelivererId,
            status: "pending",
          });

        if (error) throw error;
      }

      toast({
        title: "Deliverer Assigned",
        description: "Deliverer has been assigned to this order.",
      });

      await fetchCurrentDelivery();
    } catch (error) {
      console.error("Error assigning deliverer:", error);
      toast({
        title: "Error",
        description: "Failed to assign deliverer.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadReceipt = () => {
    if (order) {
      generateReceipt(order, payments);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'partial':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    }
  };

  const canManagePayments = userRole === 'admin' || userRole === 'staff';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Order not found.</p>
        <Button onClick={() => navigate("/orders")} className="mt-4">
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/orders")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{order.customer_name}</h1>
            <p className="text-muted-foreground">Order Details</p>
          </div>
        </div>
        <Button onClick={handleDownloadReceipt} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Download Receipt
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Order Information
              <Badge variant="secondary" className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{order.phone}</span>
            </div>
            
            <Separator />
            
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Item Description</p>
              <p className="text-sm">{order.item_description}</p>
              {order.delivery_required && order.delivery_address && (
                <p className="text-sm mt-2 text-primary font-medium">
                  📍 Delivery to: {order.delivery_address.street}, House {order.delivery_address.houseNumber}, {order.delivery_address.city}
                </p>
              )}
            </div>

            {order.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              </>
            )}

            {order.delivery_required && order.delivery_address && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Delivery Information</p>
                  <p className="text-sm">
                    {order.delivery_address.street}, House {order.delivery_address.houseNumber}, {order.delivery_address.city}
                  </p>
                  {order.delivery_fee && order.delivery_fee > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Delivery Fee: ETB {Number(order.delivery_fee).toFixed(2)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge className={
                      order.delivery_status === 'delivered' ? 'bg-green-500' :
                      order.delivery_status === 'out_for_delivery' ? 'bg-blue-500' :
                      order.delivery_status === 'cancelled' ? 'bg-red-500' :
                      'bg-gray-500'
                    }>
                      {(order.delivery_status || 'pending').replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Price Section - Staff can edit */}
            {canManagePayments && isEditingPrice ? (
              <form onSubmit={handleUpdatePrice} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="totalPrice">Total Price ($)</Label>
                  <Input
                    id="totalPrice"
                    name="totalPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={order.total_price}
                    required
                    disabled={isSubmitting}
                  />
                  {errors.totalPrice && (
                    <p className="text-sm text-destructive">{errors.totalPrice}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date (Optional)</Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    defaultValue={order.due_date || ""}
                    disabled={isSubmitting}
                  />
                </div>

                {order.delivery_required && (
                  <div className="space-y-2">
                    <Label htmlFor="deliverer">Assign Deliverer</Label>
                    <Select
                      value={selectedDelivererId}
                      onValueChange={setSelectedDelivererId}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a deliverer" />
                      </SelectTrigger>
                      <SelectContent>
                        {deliverers.map((deliverer) => (
                          <SelectItem key={deliverer.id} value={deliverer.id}>
                            {deliverer.full_name} {deliverer.is_online ? '🟢' : '⚫'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      🟢 = Online  ⚫ = Offline
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : order.delivery_required && selectedDelivererId ? "Save & Assign Deliverer" : "Save Price"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditingPrice(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Price</p>
                    <p className="text-2xl font-bold">${Number(order.total_price).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Remaining</p>
                    <p className="text-2xl font-bold text-destructive">
                      ${Number(order.remaining_balance).toFixed(2)}
                    </p>
                  </div>
                </div>

                {canManagePayments && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingPrice(true)}
                    className="w-full gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    {order.total_price === 0 ? "Set Price" : "Edit Price"}
                  </Button>
                )}

                {order.due_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Due: {new Date(order.due_date).toLocaleDateString()}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Add Payment Form */}
        {canManagePayments && order.status !== 'paid' && (
          <Card>
            <CardHeader>
              <CardTitle>Record Payment</CardTitle>
              <CardDescription>Add a new payment for this order</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payerName">Payer Name</Label>
                  <Input
                    id="payerName"
                    name="payerName"
                    defaultValue={order.customer_name}
                    required
                    disabled={isSubmitting}
                  />
                  {errors.payerName && (
                    <p className="text-sm text-destructive">{errors.payerName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={order.remaining_balance}
                    required
                    disabled={isSubmitting}
                  />
                  {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
                  <p className="text-xs text-muted-foreground">
                    Maximum: ${Number(order.remaining_balance).toFixed(2)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select name="paymentMethod" defaultValue="cash" disabled={isSubmitting}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    disabled={isSubmitting}
                    placeholder="Payment notes..."
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-primary text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Recording..." : "Record Payment"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>All payments recorded for this order</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No payments recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{payment.payer_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="capitalize">{payment.payment_method}</span>
                      <span>•</span>
                      <span>{new Date(payment.payment_date).toLocaleDateString()}</span>
                    </div>
                    {payment.notes && (
                      <p className="text-sm text-muted-foreground">{payment.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">
                      +${Number(payment.amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
