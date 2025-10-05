import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const orderSchema = z.object({
  itemDescription: z.string().min(5, "Item description must be at least 5 characters").max(1000),
  notes: z.string().max(1000).optional(),
  deliveryRequired: z.boolean(),
  city: z.string().optional(),
  street: z.string().optional(),
  houseNumber: z.string().optional(),
});

interface UserOrderFormProps {
  userId: string;
  userEmail: string;
  onSuccess?: () => void;
}

export default function UserOrderForm({ userId, userEmail, onSuccess }: UserOrderFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deliveryRequired, setDeliveryRequired] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const itemDescription = formData.get("itemDescription") as string;
    const notes = formData.get("notes") as string;
    const city = formData.get("city") as string;
    const street = formData.get("street") as string;
    const houseNumber = formData.get("houseNumber") as string;

    try {
      // Validate inputs
      const validated = orderSchema.parse({
        itemDescription,
        notes: notes || undefined,
        deliveryRequired,
        city: deliveryRequired ? city : undefined,
        street: deliveryRequired ? street : undefined,
        houseNumber: deliveryRequired ? houseNumber : undefined,
      });

      if (deliveryRequired && (!city || !street || !houseNumber)) {
        throw new Error("Please fill in all delivery address fields");
      }

      // Get user profile info
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", userId)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      // Prepare delivery address if delivery is required
      const deliveryAddress = deliveryRequired ? {
        city: validated.city,
        street: validated.street,
        houseNumber: validated.houseNumber,
      } : null;

      const deliveryFee = deliveryRequired ? 50 : 0; // Default delivery fee of 50 ETB

      // Create order with pending status (will be priced by staff)
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: profile.full_name,
          phone: profile.phone || "Not provided",
          item_description: validated.itemDescription,
          total_price: 0, // Will be set by staff
          remaining_balance: 0,
          notes: validated.notes || null,
          user_id: userId,
          created_by: userId,
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
            notes: 'Auto-created from customer order request',
          });

        if (deliveryError) {
          console.error('Error creating delivery:', deliveryError);
          // Don't fail the order creation if delivery record fails
        }
      }

      toast({
        title: "Order Request Submitted",
        description: "Your order has been submitted. Staff will contact you with pricing details.",
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/user/orders/${orderData.id}`);
      }
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
          description: "Failed to submit order request. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Order Request</CardTitle>
        <CardDescription>Submit details for your tailoring request</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="itemDescription">What would you like tailored? *</Label>
            <Textarea
              id="itemDescription"
              name="itemDescription"
              required
              disabled={isLoading}
              placeholder="Describe the item and what you'd like done (e.g., 'Blue suit jacket - hem sleeves and take in sides')"
              rows={4}
            />
            {errors.itemDescription && (
              <p className="text-sm text-destructive">{errors.itemDescription}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              disabled={isLoading}
              placeholder="Any specific requests or details..."
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
                I need delivery (50 ETB delivery fee)
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

          <p className="text-sm text-muted-foreground">
            Note: Staff will review your request and contact you with pricing and timeline.
          </p>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Submitting..." : "Submit Order Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}