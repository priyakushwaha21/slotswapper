import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: "BUSY" | "SWAPPABLE" | "SWAP_PENDING";
}

interface EventListProps {
  userId: string;
}

const EventList = ({ userId }: EventListProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .order("start_time", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      });
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) {
      fetchEvents();
    }

    // Set up realtime subscription
    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Event change:', payload);
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleToggleSwappable = async (eventId: string, currentStatus: string) => {
    const newStatus = currentStatus === "SWAPPABLE" ? "BUSY" : "SWAPPABLE";
    const { error } = await supabase
      .from("events")
      .update({ status: newStatus })
      .eq("id", eventId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update event status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Event marked as ${newStatus.toLowerCase()}`,
      });
      fetchEvents();
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase.from("events").delete().eq("id", eventId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
      fetchEvents();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SWAPPABLE":
        return "bg-accent text-accent-foreground";
      case "SWAP_PENDING":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

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
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No events yet. Create your first event to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {events.map((event) => (
        <Card key={event.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{event.title}</CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
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
              </div>
              <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {event.status !== "SWAP_PENDING" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleSwappable(event.id, event.status)}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {event.status === "SWAPPABLE" ? "Mark as Busy" : "Make Swappable"}
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteEvent(event.id)}
                disabled={event.status === "SWAP_PENDING"}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default EventList;
