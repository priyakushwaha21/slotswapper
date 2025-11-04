import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import SwapRequestDialog from "./SwapRequestDialog";

interface SwappableEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  user_id: string;
}

interface SwappableSlotsListProps {
  userId: string;
}

const SwappableSlotsList = ({ userId }: SwappableSlotsListProps) => {
  const [events, setEvents] = useState<SwappableEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SwappableEvent | null>(null);
  const { toast } = useToast();

  const fetchSwappableEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "SWAPPABLE")
      .neq("user_id", userId)
      .order("start_time", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch swappable slots",
        variant: "destructive",
      });
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) {
      fetchSwappableEvents();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            No swappable slots available at the moment. Check back later!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id} className="hover:shadow-lg transition-shadow border-accent/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{event.title}</CardTitle>
              <div className="flex flex-col gap-2 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(event.start_time), "MMM dd, yyyy")}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(event.start_time), "HH:mm")} -{" "}
                  {format(new Date(event.end_time), "HH:mm")}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-gradient-to-r from-accent to-accent/80"
                onClick={() => setSelectedEvent(event)}
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Request Swap
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedEvent && (
        <SwapRequestDialog
          targetEvent={selectedEvent}
          userId={userId}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
          onSuccess={fetchSwappableEvents}
        />
      )}
    </>
  );
};

export default SwappableSlotsList;
