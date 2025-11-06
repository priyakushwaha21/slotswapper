import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Check, X, Inbox } from "lucide-react";
import { format } from "date-fns";

interface SwapRequest {
  id: string;
  requester_event: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
  };
  owner_event: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
  };
  status: string;
}

interface IncomingRequestsProps {
  userId: string;
}

const IncomingRequests = ({ userId }: IncomingRequestsProps) => {
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchIncomingRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("swap_requests")
      .select(
        `
        id,
        status,
        requester_event:requester_event_id(id, title, start_time, end_time),
        owner_event:owner_event_id(id, title, start_time, end_time)
      `
      )
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch incoming requests",
        variant: "destructive",
      });
    } else {
      setRequests(data as any || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) {
      fetchIncomingRequests();
    }

    // Set up realtime subscription
    const channel = supabase
      .channel('incoming-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'swap_requests',
          filter: `owner_id=eq.${userId}`
        },
        (payload) => {
          console.log('Incoming request change:', payload);
          fetchIncomingRequests();
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Swap Request!",
              description: "Someone wants to swap with you",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleAccept = async (request: SwapRequest) => {
    setLoading(true);

    // Get current user_id of both events
    const { data: requesterEventData } = await supabase
      .from("events")
      .select("user_id")
      .eq("id", request.requester_event.id)
      .single();

    const { data: ownerEventData } = await supabase
      .from("events")
      .select("user_id")
      .eq("id", request.owner_event.id)
      .single();

    if (!requesterEventData || !ownerEventData) {
      toast({
        title: "Error",
        description: "Failed to get event owners",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Swap the owners
    const updates = [
      supabase
        .from("events")
        .update({ user_id: ownerEventData.user_id, status: "BUSY" })
        .eq("id", request.requester_event.id),
      supabase
        .from("events")
        .update({ user_id: requesterEventData.user_id, status: "BUSY" })
        .eq("id", request.owner_event.id),
    ];

    const results = await Promise.all(updates);
    if (results.some((r) => r.error)) {
      toast({
        title: "Error",
        description: "Failed to swap events",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Update request status
    const { error: updateError } = await supabase
      .from("swap_requests")
      .update({ status: "ACCEPTED" })
      .eq("id", request.id);

    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
    } else {
      // Send email notification to the requester
      const { data: requesterData } = await supabase.auth.admin.getUserById(
        requesterEventData?.user_id || ""
      );

      if (requesterData?.user?.email) {
        supabase.functions
          .invoke("send-swap-notification", {
            body: {
              recipientEmail: requesterData.user.email,
              recipientName: requesterData.user.user_metadata?.name || requesterData.user.email,
              notificationType: "accepted",
              requesterEventTitle: request.requester_event.title,
              ownerEventTitle: request.owner_event.title,
            },
          })
          .catch((err) => console.error("Failed to send email:", err));
      }

      toast({
        title: "Success",
        description: "Swap accepted! Events have been exchanged.",
      });
      fetchIncomingRequests();
    }
    setLoading(false);
  };

  const handleReject = async (request: SwapRequest) => {
    setLoading(true);

    // Set both events back to SWAPPABLE
    const updates = [
      supabase
        .from("events")
        .update({ status: "SWAPPABLE" })
        .eq("id", request.requester_event.id),
      supabase
        .from("events")
        .update({ status: "SWAPPABLE" })
        .eq("id", request.owner_event.id),
    ];

    const results = await Promise.all(updates);
    if (results.some((r) => r.error)) {
      toast({
        title: "Error",
        description: "Failed to update events",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Update request status
    const { error: updateError } = await supabase
      .from("swap_requests")
      .update({ status: "REJECTED" })
      .eq("id", request.id);

    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
    } else {
      // Get requester user_id from the events table
      const { data: requesterEventData } = await supabase
        .from("events")
        .select("user_id")
        .eq("id", request.requester_event.id)
        .single();

      // Send email notification to the requester
      if (requesterEventData?.user_id) {
        const { data: requesterData } = await supabase.auth.admin.getUserById(
          requesterEventData.user_id
        );

        if (requesterData?.user?.email) {
          supabase.functions
            .invoke("send-swap-notification", {
              body: {
                recipientEmail: requesterData.user.email,
                recipientName: requesterData.user.user_metadata?.name || requesterData.user.email,
                notificationType: "rejected",
                requesterEventTitle: request.requester_event.title,
                ownerEventTitle: request.owner_event.title,
              },
            })
            .catch((err) => console.error("Failed to send email:", err));
        }
      }

      toast({
        title: "Request rejected",
        description: "The swap request has been rejected.",
      });
      fetchIncomingRequests();
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Inbox className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No incoming swap requests</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {requests.map((request) => (
        <Card key={request.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">Swap Request</CardTitle>
              <Badge
                className={
                  request.status === "ACCEPTED"
                    ? "bg-success text-success-foreground"
                    : request.status === "REJECTED"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-warning text-warning-foreground"
                }
              >
                {request.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 bg-accent/10 rounded-lg border border-accent/30">
                <h4 className="font-semibold text-sm mb-2">They're offering:</h4>
                <p className="font-medium">{request.requester_event.title}</p>
                <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(request.requester_event.start_time), "MMM dd, yyyy")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(request.requester_event.start_time), "HH:mm")} -{" "}
                    {format(new Date(request.requester_event.end_time), "HH:mm")}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                <h4 className="font-semibold text-sm mb-2">For your event:</h4>
                <p className="font-medium">{request.owner_event.title}</p>
                <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(request.owner_event.start_time), "MMM dd, yyyy")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(request.owner_event.start_time), "HH:mm")} -{" "}
                    {format(new Date(request.owner_event.end_time), "HH:mm")}
                  </div>
                </div>
              </div>
            </div>

            {request.status === "PENDING" && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-success hover:bg-success/90"
                  onClick={() => handleAccept(request)}
                  disabled={loading}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Accept
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleReject(request)}
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default IncomingRequests;
