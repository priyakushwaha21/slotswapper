import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Calendar, Users, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                <ArrowRightLeft className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                SlotSwapper
              </span>
            </div>
            <Button onClick={() => navigate("/auth")}>Get Started</Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Peer-to-Peer Time Slot Scheduling
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Swap calendar events with other users effortlessly. Find the perfect time slot through collaborative scheduling.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
            Start Swapping Slots
            <ArrowRightLeft className="w-5 h-5 ml-2" />
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Manage Your Calendar</h3>
            <p className="text-muted-foreground">
              Create events and mark busy slots as swappable when you need flexibility.
            </p>
          </div>

          <div className="text-center p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
              <Users className="w-8 h-8 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Browse Marketplace</h3>
            <p className="text-muted-foreground">
              Discover swappable slots from other users and find the perfect time that works for you.
            </p>
          </div>

          <div className="text-center p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-success to-success/70 flex items-center justify-center">
              <Zap className="w-8 h-8 text-success-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Swaps</h3>
            <p className="text-muted-foreground">
              Send swap requests and get instant notifications when someone accepts your offer.
            </p>
          </div>
        </div>

        <div className="mt-20 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <div className="space-y-4 text-left">
            <div className="flex gap-4 items-start p-4 rounded-lg bg-card border border-border/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">Create & Mark Events</h4>
                <p className="text-muted-foreground">Add your calendar events and mark specific slots as "swappable" when you want flexibility.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start p-4 rounded-lg bg-card border border-border/50">
              <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">Browse & Request</h4>
                <p className="text-muted-foreground">Explore the marketplace of swappable slots and request swaps by offering one of your own slots.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start p-4 rounded-lg bg-card border border-border/50">
              <div className="w-8 h-8 rounded-full bg-success text-success-foreground flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">Accept & Swap</h4>
                <p className="text-muted-foreground">Receive notifications for incoming requests and accept swaps that work for you. The system automatically updates both calendars.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/50 mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 SlotSwapper. Peer-to-peer time slot scheduling made simple.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
