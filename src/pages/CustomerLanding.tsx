import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors, CreditCard, FileText, Shield } from "lucide-react";

export default function CustomerLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Hero Section */}
      <header className="container mx-auto px-6 py-16 text-center">
        <div className="mb-8">
          <Scissors className="h-20 w-20 mx-auto text-primary mb-4" />
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Tailor Shop Credit System
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Track your orders, make payments, and download receipts - all in one place
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/user/auth")}>
            Get Started
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
            Staff Login
          </Button>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Scissors className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Order Tracking</CardTitle>
              <CardDescription>
                View all your tailoring orders and their status in real-time
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CreditCard className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Easy Payments</CardTitle>
              <CardDescription>
                Pay securely using Chapa payment gateway with full or partial payments
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Digital Receipts</CardTitle>
              <CardDescription>
                Download and print professional receipts for all your payments
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Secure & Safe</CardTitle>
              <CardDescription>
                Your data is protected with industry-standard security measures
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-16 bg-card/30 rounded-3xl my-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">1</span>
            </div>
            <h3 className="font-semibold mb-2">Register Account</h3>
            <p className="text-sm text-muted-foreground">
              Create your account with name, email, and phone number
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">2</span>
            </div>
            <h3 className="font-semibold mb-2">Track Orders</h3>
            <p className="text-sm text-muted-foreground">
              View all your orders and payment status in your dashboard
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">3</span>
            </div>
            <h3 className="font-semibold mb-2">Make Payments</h3>
            <p className="text-sm text-muted-foreground">
              Pay securely online and download your receipt instantly
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join hundreds of satisfied customers managing their tailoring orders digitally
        </p>
        <Button size="lg" onClick={() => navigate("/user/auth")}>
          Create Your Account Now
        </Button>
      </section>

      {/* Footer */}
      <footer className="bg-card/50 py-8 mt-16">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Tailor Shop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
