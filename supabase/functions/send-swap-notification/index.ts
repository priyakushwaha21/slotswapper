import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SwapNotificationRequest {
  recipientEmail: string;
  recipientName: string;
  notificationType: "new_request" | "accepted" | "rejected";
  requesterName?: string;
  requesterEventTitle?: string;
  ownerEventTitle?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipientEmail,
      recipientName,
      notificationType,
      requesterName,
      requesterEventTitle,
      ownerEventTitle,
    }: SwapNotificationRequest = await req.json();

    console.log("Sending swap notification:", {
      recipientEmail,
      notificationType,
    });

    let subject = "";
    let html = "";

    switch (notificationType) {
      case "new_request":
        subject = "New Swap Request Received!";
        html = `
          <h1>Hello ${recipientName}!</h1>
          <p><strong>${requesterName}</strong> wants to swap time slots with you!</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>They're offering:</strong> ${requesterEventTitle}</p>
            <p><strong>For your event:</strong> ${ownerEventTitle}</p>
          </div>
          <p>Log in to SlotSwapper to review and respond to this request.</p>
          <p>Best regards,<br>SlotSwapper Team</p>
        `;
        break;

      case "accepted":
        subject = "Your Swap Request Was Accepted! 🎉";
        html = `
          <h1>Great news, ${recipientName}!</h1>
          <p>Your swap request has been accepted!</p>
          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <p><strong>Swap completed successfully!</strong></p>
            <p>Your event: ${requesterEventTitle}</p>
            <p>Swapped for: ${ownerEventTitle}</p>
          </div>
          <p>Log in to SlotSwapper to view your updated calendar.</p>
          <p>Best regards,<br>SlotSwapper Team</p>
        `;
        break;

      case "rejected":
        subject = "Swap Request Update";
        html = `
          <h1>Hello ${recipientName},</h1>
          <p>Unfortunately, your swap request was not accepted.</p>
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p><strong>Swap request declined</strong></p>
            <p>Your event: ${requesterEventTitle}</p>
            <p>Requested: ${ownerEventTitle}</p>
          </div>
          <p>Don't worry! Your event is now back to swappable status. You can browse the marketplace for other opportunities.</p>
          <p>Best regards,<br>SlotSwapper Team</p>
        `;
        break;
    }

    const emailResponse = await resend.emails.send({
      from: "SlotSwapper <onboarding@resend.dev>",
      to: [recipientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-swap-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
