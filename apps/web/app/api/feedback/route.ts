import { NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════════
   Route Handler: POST /api/feedback
   Receives bug reports and feedback from the footer modal.
   Sends an email to wilmerandrade40@gmail.com server-side,
   keeping the recipient email confidential.
   ═══════════════════════════════════════════════════════ */

export async function POST(request: Request) {
  try {
    const { name, contact, message } = await request.json();

    if (!name || !contact || !message) {
      return NextResponse.json(
        { success: false, error: "Nombre, contacto y mensaje son campos requeridos" },
        { status: 400 }
      );
    }

    const recipientEmail = "wilmerandrade40@gmail.com";

    // Log the feedback receipt on the server console (confidential)
    console.log(`[FEEDBACK] Enviando reporte a ${recipientEmail} | Nombre/Org: ${name} | Remitente: ${contact} | Mensaje: ${message}`);

    // If Resend API key is configured in the environment, use it to send the real email
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "feedback@pricescout.cl",
            to: recipientEmail,
            subject: "Reporte de Error / Feedback - PriceScout",
            html: `
              <h3>Nuevo Reporte de Error en PriceScout</h3>
              <p><strong>Nombre / Organización:</strong> ${name}</p>
              <p><strong>Remitente (Contacto):</strong> ${contact}</p>
              <p><strong>Mensaje:</strong></p>
              <p style="white-space: pre-wrap; background-color: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">${message}</p>
              <br/>
              <p style="color: #64748b; font-size: 11px;">Enviado automáticamente desde el formulario de soporte de PriceScout.</p>
            `,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          console.error("[FEEDBACK] Error enviando email vía Resend API:", errData);
        } else {
          console.log("[FEEDBACK] Email enviado exitosamente vía Resend API.");
        }
      } catch (emailErr) {
        console.error("[FEEDBACK] Excepción al enviar email:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[FEEDBACK] Error en handler:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
