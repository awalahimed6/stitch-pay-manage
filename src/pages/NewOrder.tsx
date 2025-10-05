import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const orderSchema = z.object({
  customerName: z.string().min(2, "Customer name must be at least 2 characters").max(100),
  phone: z.string().min(5, "Phone number must be at least 5 characters").max(20),
  itemDescription: z.string().min(5, "Item description must be at least 5 characters").max(1000),
  totalPrice: z.number().min(0.01, "Total price must be greater than 0"),
  downPayment: z.number().min(0, "Down payment cannot be negative"),
  dueDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
  deliveryRequired: z.boolean(),
  city: z.string().optional(),
  street: z.string().optional(),
  houseNumber: z.string().optional(),
});

export default function NewOrder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deliveryRequired, setDeliveryRequired] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const customerName = formData.get("customerName") as string;
    const phone = formData.get("phone") as string;
    const itemDescription = formData.get("itemDescription") as string;
    const totalPrice = parseFloat(formData.get("totalPrice") as string);
    const downPayment = parseFloat(formData.get("downPayment") as string) || 0;
    const dueDate = formData.get("dueDate") as string;
    const notes = formData.get("notes") as string;
    const city = formData.get("city") as string;
    const street = formData.get("street") as string;
    const houseNumber = formData.get("houseNumber") as string;

    try {
      // Validate inputs
      const validated = orderSchema.parse({
        customerName,
        phone,
        itemDescription,
        totalPrice,
        downPayment,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        deliveryRequired,
        city: deliveryRequired ? city : undefined,
        street: deliveryRequired ? street : undefined,
        houseNumber: deliveryRequired ? houseNumber : undefined,
      });

      if (deliveryRequired && (!city || !street || !houseNumber)) {
        throw new Error("Please fill in all delivery address fields");
      }

      // Validate down payment doesn't exceed total
      if (downPayment > totalPrice) {
        setErrors({ downPayment: "Down payment cannot exceed total price" });
        setIsLoading(false);
        return;
      }

      // Prepare delivery address if delivery is required
      const deliveryAddress = deliveryRequired ? {
        city: validated.city,
        street: validated.street,
        houseNumber: validated.houseNumber,
      } : null;

      const deliveryFee = deliveryRequired ? 50 : 0; // Default delivery fee of 50 ETB

      // Create order
      const remainingBalance = totalPrice - downPayment + deliveryFee;
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: validated.customerName,
          phone: validated.phone,
          item_description: validated.itemDescription,
          total_price: validated.totalPrice + deliveryFee,
          remaining_balance: remainingBalance,
          due_date: validated.dueDate || null,
          notes: validated.notes || null,
          created_by: user?.id,
          delivery_required: deliveryRequired,
          delivery_address: deliveryAddress,
          delivery_fee: deliveryFee,
          delivery_status: deliveryRequired ? 'pending' : 'not_applicable',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // If delivery is required, create a delivery record
      if (deliveryRequired && orderData) {
        const { error: deliveryError } = await supabase
          .from("deliveries")
          .insert({
            order_id: orderData.id,
            status: 'pending',
            notes: 'Created by staff for customer order with delivery',
          });

        if (deliveryError) {
          console.error('Error creating delivery:', deliveryError);
          // Don't fail the order creation if delivery record fails
        }
      }

      // If down payment was made, create payment record
      if (downPayment > 0) {
        const { error: paymentError } = await supabase.from("payments").insert({
          order_id: orderData.id,
          payer_name: validated.customerName,
          amount: downPayment,
          payment_method: "cash",
          notes: "Down payment",
          recorded_by: user?.id,
        });

        if (paymentError) throw paymentError;
      }

      toast({
        title: "Order created",
        description: "Order has been created successfully.",
      });

      navigate(`/orders/${orderData.id}`);
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
        console.error("Error creating order:", error);
        toast({
          title: "Error",
          description: "Failed to create order. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/orders")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Order</h1>
          <p className="text-muted-foreground">Create a new tailor order</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
          <CardDescription>Fill in the information for the new order</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  name="customerName"
                  required
                  disabled={isLoading}
                  placeholder="John Doe"
                />
                {errors.customerName && (
                  <p className="text-sm text-destructive">{errors.customerName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  disabled={isLoading}
                  placeholder="+1234567890"
                />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemDescription">Item Description *</Label>
              <Textarea
                id="itemDescription"
                name="itemDescription"
                required
                disabled={isLoading}
                placeholder="Describe the item to be tailored..."
                rows={3}
              />
              {errors.itemDescription && (
                <p className="text-sm text-destructive">{errors.itemDescription}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="totalPrice">Total Price ($) *</Label>
                <Input
                  id="totalPrice"
                  name="totalPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  disabled={isLoading}
                  placeholder="0.00"
                />
                {errors.totalPrice && (
                  <p className="text-sm text-destructive">{errors.totalPrice}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="downPayment">Down Payment ($)</Label>
                <Input
                  id="downPayment"
                  name="downPayment"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={isLoading}
                  placeholder="0.00"
                />
                {errors.downPayment && (
                  <p className="text-sm text-destructive">{errors.downPayment}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input id="dueDate" name="dueDate" type="date" disabled={isLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                disabled={isLoading}
                placeholder="Additional notes..."
                rows={2}
              />
              {errors.notes && <p className="text-sm text-destructive">{errors.notes}</p>}
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="deliveryRequired"
                  checked={deliveryRequired}
                  onChange={(e) => setDeliveryRequired(e.target.checked)}
                  disabled={isLoading}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="deliveryRequired" className="cursor-pointer">
                  Customer needs delivery (50 ETB delivery fee)
                </Label>
              </div>

              {deliveryRequired && (
                <div className="space-y-3 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      disabled={isLoading}
                      placeholder="Enter city"
                      required={deliveryRequired}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="street">Street *</Label>
                    <Input
                      id="street"
                      name="street"
                      disabled={isLoading}
                      placeholder="Enter street name"
                      required={deliveryRequired}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="houseNumber">House Number *</Label>
                    <Input
                      id="houseNumber"
                      name="houseNumber"
                      disabled={isLoading}
                      placeholder="Enter house number"
                      required={deliveryRequired}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/orders")}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="gradient-primary text-white">
                {isLoading ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
