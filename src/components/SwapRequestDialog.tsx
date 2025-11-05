import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

interface SwapRequestDialogProps {
  targetEvent: Event;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SwapRequestDialog = ({
  targetEvent,
  userId,
  open,
  onOpenChange,
  onSuccess,
}: SwapRequestDialogProps) => {
  const [mySwappableEvents, setMySwappableEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && userId) {
      fetchMySwappableEvents();
    }
  }, [open, userId]);

  const fetchMySwappableEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "SWAPPABLE")
      .order("start_time", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch your swappable events",
        variant: "destructive",
      });
    } else {
      setMySwappableEvents(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!selectedEventId) {
      toast({
        title: "Error",
        description: "Please select one of your swappable events",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Verify both slots exist and are SWAPPABLE
    const { data: bothEvents, error: verifyError } = await supabase
      .from("events")
      .select("id, status, user_id")
      .in("id", [selectedEventId, targetEvent.id]);

    if (verifyError || !bothEvents || bothEvents.length !== 2) {
      toast({
        title: "Error",
        description: "Failed to verify events exist",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check both events are SWAPPABLE
    const allSwappable = bothEvents.every((event) => event.status === "SWAPPABLE");
    if (!allSwappable) {
      toast({
        title: "Error",
        description: "One or both events are no longer available for swapping",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const targetEventData = bothEvents.find((e) => e.id === targetEvent.id);

    // Update both events to SWAP_PENDING
    const { error: updateError } = await supabase
      .from("events")
      .update({ status: "SWAP_PENDING" })
      .in("id", [selectedEventId, targetEvent.id]);

    // Create swap request
    const { error: requestError } = await supabase.from("swap_requests").insert({
      requester_id: userId,
      requester_event_id: selectedEventId,
      owner_id: targetEventData?.user_id,
      owner_event_id: targetEvent.id,
      status: "PENDING",
    });

    if (requestError) {
      toast({
        title: "Error",
        description: "Failed to create swap request",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Swap request sent successfully",
      });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Swap</DialogTitle>
          <DialogDescription>
            Select one of your swappable events to offer in exchange
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 p-4 bg-accent/10 rounded-lg border border-accent/30">
          <h3 className="font-semibold mb-2">Requesting:</h3>
          <p className="font-medium">{targetEvent.title}</p>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(targetEvent.start_time), "MMM dd, yyyy")}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(new Date(targetEvent.start_time), "HH:mm")} -{" "}
              {format(new Date(targetEvent.end_time), "HH:mm")}
            </div>
          </div>
        </div>

        {mySwappableEvents.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            You don't have any swappable events. Mark one of your events as swappable first.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Your swappable events:</Label>
              <RadioGroup value={selectedEventId} onValueChange={setSelectedEventId}>
                <div className="space-y-2">
                  {mySwappableEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/5 cursor-pointer"
                    >
                      <RadioGroupItem value={event.id} id={event.id} />
                      <Label htmlFor={event.id} className="flex-1 cursor-pointer">
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(event.start_time), "MMM dd, yyyy")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(event.start_time), "HH:mm")} -{" "}
                              {format(new Date(event.end_time), "HH:mm")}
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !selectedEventId}>
              {loading ? "Sending request..." : "Send Swap Request"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SwapRequestDialog;
