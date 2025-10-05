import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Deliverer {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  is_active: boolean;
  is_online: boolean;
  created_at: string;
}

export default function DelivererManagement() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [deliverers, setDeliverers] = useState<Deliverer[]>([]);
  const [filteredDeliverers, setFilteredDeliverers] = useState<Deliverer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDeliverer, setSelectedDeliverer] = useState<Deliverer | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (userRole !== "admin" && userRole !== "staff") {
      navigate("/");
      toast.error("Access Denied", {
        description: "You don't have permission to access this page",
      });
    } else {
      fetchDeliverers();
    }
  }, [userRole, navigate]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDeliverers(deliverers);
    } else {
      const filtered = deliverers.filter(
        (deliverer) =>
          deliverer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          deliverer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          deliverer.phone.includes(searchQuery)
      );
      setFilteredDeliverers(filtered);
    }
  }, [searchQuery, deliverers]);

  const fetchDeliverers = async () => {
    try {
      const { data, error } = await supabase
        .from("deliverers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeliverers(data || []);
      setFilteredDeliverers(data || []);
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setPassword("");
    setIsActive(true);
    setSelectedDeliverer(null);
  };

  const handleAddDeliverer = async () => {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      // Create deliverer record
      const { error: delivererError } = await supabase.from("deliverers").insert({
        user_id: authData.user.id,
        full_name: fullName,
        phone,
        email,
        is_active: isActive,
      });

      if (delivererError) throw delivererError;

      // Assign deliverer role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: "deliverer",
      });

      if (roleError) throw roleError;

      toast.success("Success", { description: "Deliverer added successfully" });
      setIsAddDialogOpen(false);
      resetForm();
      fetchDeliverers();
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    }
  };

  const handleEditDeliverer = async () => {
    if (!selectedDeliverer) return;

    try {
      const { error } = await supabase
        .from("deliverers")
        .update({
          full_name: fullName,
          phone,
          email,
          is_active: isActive,
        })
        .eq("id", selectedDeliverer.id);

      if (error) throw error;

      toast.success("Success", { description: "Deliverer updated successfully" });
      setIsEditDialogOpen(false);
      resetForm();
      fetchDeliverers();
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    }
  };

  const handleDeleteDeliverer = async (delivererId: string) => {
    if (!confirm("Are you sure you want to delete this deliverer?")) return;

    try {
      const { error } = await supabase
        .from("deliverers")
        .delete()
        .eq("id", delivererId);

      if (error) throw error;

      toast.success("Success", { description: "Deliverer deleted successfully" });
      fetchDeliverers();
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    }
  };

  const openEditDialog = (deliverer: Deliverer) => {
    setSelectedDeliverer(deliverer);
    setFullName(deliverer.full_name);
    setPhone(deliverer.phone);
    setEmail(deliverer.email);
    setIsActive(deliverer.is_active);
    setIsEditDialogOpen(true);
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Deliverer Management</h1>
          <p className="text-muted-foreground">Manage your delivery team</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> Add Deliverer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Deliverer</DialogTitle>
              <DialogDescription>
                Create a new deliverer account with login credentials
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+251912345678"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deliverer@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDeliverer}>Add Deliverer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deliverers ({filteredDeliverers.length})</CardTitle>
          <CardDescription>
            View and manage your delivery team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDeliverers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No deliverers found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Online</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliverers.map((deliverer) => (
                  <TableRow key={deliverer.id}>
                    <TableCell className="font-medium">
                      {deliverer.full_name}
                    </TableCell>
                    <TableCell>{deliverer.email}</TableCell>
                    <TableCell>{deliverer.phone}</TableCell>
                    <TableCell>
                      {deliverer.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${deliverer.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span className="text-sm">{deliverer.is_online ? 'Online' : 'Offline'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(deliverer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {userRole === "admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDeliverer(deliverer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Deliverer</DialogTitle>
            <DialogDescription>Update deliverer information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editFullName">Full Name</Label>
              <Input
                id="editFullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editPhone">Phone</Label>
              <Input
                id="editPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="editIsActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="editIsActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditDeliverer}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
