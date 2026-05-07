import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date();
    const dayOfMonth = today.getDate();

    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, full_name, due_date, unit_number, admin_id, profile_id");

    if (tenantsError) throw tenantsError;

    const notifications: Array<{user_id: string; message: string; type: string}> = [];

    for (const tenant of tenants || []) {
      const daysUntilDue = tenant.due_date - dayOfMonth;

      if (daysUntilDue === 3) {
        notifications.push({
          user_id: tenant.admin_id,
          message: `Reminder: Rent due in 3 days for ${tenant.full_name}${tenant.unit_number ? ` (Unit ${tenant.unit_number})` : ""}`,
          type: "reminder",
        });
        if (tenant.profile_id) {
          notifications.push({
            user_id: tenant.profile_id,
            message: "Your rent is due in 3 days. Please ensure timely payment.",
            type: "reminder",
          });
        }
      } else if (daysUntilDue === 1) {
        notifications.push({
          user_id: tenant.admin_id,
          message: `Reminder: Rent due TOMORROW for ${tenant.full_name}${tenant.unit_number ? ` (Unit ${tenant.unit_number})` : ""}`,
          type: "reminder",
        });
        if (tenant.profile_id) {
          notifications.push({
            user_id: tenant.profile_id,
            message: "Your rent is due TOMORROW. Please pay today to avoid being marked late.",
            type: "warning",
          });
        }
      } else if (daysUntilDue < 0) {
        const { data: latestPayment } = await supabase
          .from("payments")
          .select("status, date")
          .eq("tenant_id", tenant.id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        const isAlreadyPaid = latestPayment?.status === "paid" &&
          new Date(latestPayment.date).getMonth() === today.getMonth();

        if (!isAlreadyPaid) {
          await supabase
            .from("payments")
            .upsert({
              tenant_id: tenant.id,
              amount: 0,
              status: "late",
              date: today.toISOString().split("T")[0],
              notes: "Auto-flagged as late by system",
            });

          notifications.push({
            user_id: tenant.admin_id,
            message: `Overdue: ${tenant.full_name} has not paid rent (${Math.abs(daysUntilDue)} day(s) overdue)`,
            type: "warning",
          });
        }
      }
    }

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({ success: true, processed: tenants?.length || 0, notifications: notifications.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
