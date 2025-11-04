import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IncomingRequests from "@/components/IncomingRequests";
import OutgoingRequests from "@/components/OutgoingRequests";

const Requests = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-warning/5">
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                <Calendar className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                SlotSwapper
              </span>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Swap Requests</h1>
          <p className="text-muted-foreground">
            Manage your incoming and outgoing swap requests
          </p>
        </div>

        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="incoming">Incoming</TabsTrigger>
            <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="mt-6">
            <IncomingRequests userId={user?.id || ""} />
          </TabsContent>

          <TabsContent value="outgoing" className="mt-6">
            <OutgoingRequests userId={user?.id || ""} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Requests;
