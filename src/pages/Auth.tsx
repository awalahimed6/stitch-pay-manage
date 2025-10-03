import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scissors, Users, User, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().optional(),
});

export default function Auth() {
  const [activeTab, setActiveTab] = useState<"admin" | "staff" | "customer" | "deliverer">("admin");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if already logged in
  useState(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Check user role and redirect
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single()
          .then(({ data: roleData }) => {
            if (roleData?.role === "customer") {
              navigate("/user/dashboard", { replace: true });
            } else if (roleData?.role === "deliverer") {
              navigate("/deliverer/dashboard", { replace: true });
            } else if (["admin", "staff"].includes(roleData?.role || "")) {
              navigate("/dashboard", { replace: true });
            }
          });
      }
      setCheckingAuth(false);
    });
  });

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin || activeTab === "admin") {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Check user role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .single();

        if (activeTab === "admin") {
          // Admin login - check for admin role only
          if (roleData?.role === "admin") {
            navigate("/dashboard");
          } else {
            await supabase.auth.signOut();
            throw new Error("This login is for administrators only.");
          }
        } else if (activeTab === "staff") {
          // Staff login - check for staff role
          if (roleData?.role === "staff") {
            navigate("/dashboard");
          } else {
            await supabase.auth.signOut();
            throw new Error("This login is for staff only. Please use the appropriate tab.");
          }
        } else if (activeTab === "deliverer") {
          // Deliverer login - check for deliverer role
          if (roleData?.role === "deliverer") {
            navigate("/deliverer/dashboard");
          } else {
            await supabase.auth.signOut();
            throw new Error("This login is for deliverers only. Please use the appropriate tab.");
          }
        } else {
          // Customer login - check for customer role
          if (roleData?.role === "customer") {
            navigate("/user/dashboard");
          } else {
            await supabase.auth.signOut();
            throw new Error("This login is for customers only. Please use the Staff tab.");
          }
        }
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone,
            },
            emailRedirectTo: `${window.location.origin}${activeTab === "staff" ? "/dashboard" : "/user/dashboard"}`,
          },
        });

        if (error) throw error;

        // Assign role based on active tab (staff or customer only in signup)
        if (data.user) {
          const assignedRole = activeTab === "staff" ? "staff" : "customer";
          
          await supabase
            .from("user_roles")
            .insert({
              user_id: data.user.id,
              role: assignedRole,
            });
        }

        toast({
          title: "Registration successful!",
          description: "Please check your email to verify your account.",
        });
        
        navigate(activeTab === "customer" ? "/user/dashboard" : "/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Scissors className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Tailor Shop Manager</CardTitle>
          <CardDescription>
            Choose your login type to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* User Type Selection */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "admin" | "staff" | "customer" | "deliverer")} className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="admin" className="flex items-center gap-1 text-xs sm:text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </TabsTrigger>
              <TabsTrigger value="staff" className="flex items-center gap-1 text-xs sm:text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Staff</span>
              </TabsTrigger>
              <TabsTrigger value="deliverer" className="flex items-center gap-1 text-xs sm:text-sm">
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Deliverer</span>
              </TabsTrigger>
              <TabsTrigger value="customer" className="flex items-center gap-1 text-xs sm:text-sm">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Customer</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Login/Signup Toggle */}
          {activeTab !== "admin" && activeTab !== "deliverer" && (
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-lg border p-1">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isLogin ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    !isLogin ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}
          
          {activeTab === "admin" && (
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">Admin Login Only</p>
            </div>
          )}
          
          {activeTab === "deliverer" && (
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">Deliverer Login Only</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && activeTab !== "admin" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+251 9 12345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : (isLogin || activeTab === "admin") ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
