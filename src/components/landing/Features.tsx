import { ShoppingBag, CreditCard, Users, Bell, BarChart3, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: ShoppingBag,
    title: "Order Management",
    description: "Track all your tailoring orders in one place with detailed customization options and status updates.",
  },
  {
    icon: CreditCard,
    title: "Payment Tracking",
    description: "Manage partial payments, full payments, and outstanding balances with integrated payment processing.",
  },
  {
    icon: Users,
    title: "Customer Portal",
    description: "Give your customers a dedicated portal to track their orders and make payments online.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Automated SMS and email notifications keep customers informed about their order status.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Get insights into your business with detailed reports on orders, revenue, and customer trends.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Enterprise-grade security with automatic backups to keep your business data safe.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything You Need to Run Your Shop
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features designed specifically for tailor shops to manage orders,
            payments, and customer relationships effortlessly.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="hover:shadow-elegant transition-smooth border-border hover:border-primary/50"
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
