import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Send } from "lucide-react";
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

interface OutgoingRequestsProps {
  userId: string;
}

const OutgoingRequests = ({ userId }: OutgoingRequestsProps) => {
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOutgoingRequests = async () => {
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
      .eq("requester_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch outgoing requests",
        variant: "destructive",
      });
    } else {
      setRequests(data as any || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) {
      fetchOutgoingRequests();
    }

    // Set up realtime subscription
    const channel = supabase
      .channel('outgoing-requests-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'swap_requests',
          filter: `requester_id=eq.${userId}`
        },
        (payload) => {
          console.log('Outgoing request status change:', payload);
          fetchOutgoingRequests();
          
          const newStatus = (payload.new as any).status;
          if (newStatus === 'ACCEPTED') {
            toast({
              title: "Swap Accepted!",
              description: "Your swap request was accepted",
            });
          } else if (newStatus === 'REJECTED') {
            toast({
              title: "Swap Rejected",
              description: "Your swap request was rejected",
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

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
          <Send className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No outgoing swap requests</p>
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
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                <h4 className="font-semibold text-sm mb-2">You're offering:</h4>
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

              <div className="p-3 bg-accent/10 rounded-lg border border-accent/30">
                <h4 className="font-semibold text-sm mb-2">Requesting:</h4>
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default OutgoingRequests;
