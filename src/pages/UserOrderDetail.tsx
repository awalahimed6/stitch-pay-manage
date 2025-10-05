import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CreditCard, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateReceipt } from "@/lib/receipt";

interface Order {
  id: string;
  customer_name: string;
  phone: string;
  item_description: string;
  total_price: number;
  remaining_balance: number;
  status: string;
  created_at: string;
  due_date: string | null;
  notes: string | null;
  delivery_required?: boolean;
  delivery_address?: any;
  delivery_fee?: number;
  delivery_status?: string;
}

interface Payment {
  id: string;
  payer_name: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
}

export default function UserOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  // Handle return from payment gateway
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      toast({ title: 'Payment Successful', description: 'Your payment was received.' });
      fetchOrderDetails();
      params.delete('payment');
      const url = new URL(window.location.href);
      url.search = params.toString();
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  const fetchOrderDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/user/auth");
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (orderError) throw orderError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", id)
        .order("payment_date", { ascending: false });

      if (paymentsError) throw paymentsError;

      // Load user profile data for payment form
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      setOrder(orderData);
      setPayments(paymentsData || []);
      setFullName(profile?.full_name || orderData.customer_name);
      setEmail(user.email || "");
      setPhone(profile?.phone || orderData.phone);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/user/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!order || !paymentAmount || Number(paymentAmount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    if (!fullName || !email || !phone) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (Number(paymentAmount) > Number(order.remaining_balance)) {
      toast({
        title: "Error",
        description: "Payment amount cannot exceed remaining balance",
        variant: "destructive",
      });
      return;
    }

    if (Number(order.total_price) <= 0) {
      toast({
        title: "Error",
        description: "Order price has not been set yet. Please wait for staff to confirm pricing.",
        variant: "destructive",
      });
      return;
    }

    setProcessingPayment(true);

    try {
      const { data, error } = await supabase.functions.invoke('chapa-payment', {
        body: {
          orderId: order.id,
          amount: Number(paymentAmount),
          email: email,
          fullName: fullName,
          phone: phone,
          // After payment, return to this order detail page
          returnUrl: `${window.location.origin}/user/orders/${order.id}?payment=success`,
        },
      });

      if (error) {
        console.error('Payment function error:', error);
        throw new Error(error.message || 'Failed to initialize payment');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.checkoutUrl) {
        // Redirect to Chapa checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received from payment system');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initialize payment. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (order) {
      generateReceipt(order, payments);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500";
      case "partial":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => navigate("/user/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{order.item_description}</CardTitle>
                <CardDescription>
                  Order placed on {new Date(order.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(order.status)}>
                {order.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <p className="text-sm text-muted-foreground">Name: {order.customer_name}</p>
                <p className="text-sm text-muted-foreground">Phone: {order.phone}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Payment Summary</h3>
                {order.delivery_required && order.delivery_fee && order.delivery_fee > 0 && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Item Price: <span className="font-bold">ETB {(Number(order.total_price) - Number(order.delivery_fee)).toFixed(2)}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Delivery Fee: <span className="font-bold">ETB {Number(order.delivery_fee).toFixed(2)}</span>
                    </p>
                  </>
                )}
                <p className="text-sm text-muted-foreground">
                  Total Price: <span className="font-bold">ETB {Number(order.total_price).toFixed(2)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Remaining Balance:{" "}
                  <span className="font-bold text-destructive">ETB {Number(order.remaining_balance).toFixed(2)}</span>
                </p>
              </div>
            </div>

            {order.delivery_required && order.delivery_address && (
              <div>
                <h3 className="font-semibold mb-2">Delivery Information</h3>
                <p className="text-sm text-muted-foreground">
                  Address: {order.delivery_address.street}, House {order.delivery_address.houseNumber}, {order.delivery_address.city}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">Delivery Status:</span>
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
            )}

            {order.notes && (
              <div>
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </div>
            )}

            {order.total_price === 0 ? (
              <Card className="bg-yellow-500/10 border-yellow-500/20">
                <CardHeader>
                  <CardTitle className="text-lg text-yellow-700 dark:text-yellow-400">
                    Awaiting Price Quote
                  </CardTitle>
                  <CardDescription>
                    Our staff is reviewing your order and will set a price soon. You'll be able to make payment once the price is confirmed.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : order.status !== 'paid' && Number(order.remaining_balance) > 0 ? (
              <Card className="bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg">Make a Payment</CardTitle>
                  <CardDescription>Pay using Chapa payment gateway</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Enter full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="09xxxxxxxx or 07xxxxxxxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Format: 09xxxxxxxx or 07xxxxxxxx
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Payment Amount (ETB)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        max={order.remaining_balance}
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum: ETB {Number(order.remaining_balance).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handlePayment}
                    disabled={processingPayment}
                    className="w-full"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {processingPayment ? "Processing..." : "Pay with Chapa"}
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Payment History</h3>
                <Button variant="outline" size="sm" onClick={handleDownloadReceipt}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              </div>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">ETB {Number(payment.amount).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.payment_date).toLocaleDateString()} -{" "}
                          {payment.payment_method.toUpperCase()}
                        </p>
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-muted-foreground">{payment.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
