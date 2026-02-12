import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

interface AlertEmailParams {
  to: string
  alertName: string
  logMessage: string
  logLevel: string
  logService: string
  logTimestamp: string
}

export async function sendAlertEmail({
  to,
  alertName,
  logMessage,
  logLevel,
  logService,
  logTimestamp,
}: AlertEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "LogReef Alerts <alerts@logreef.dev>",
    to: [to],
    subject: `[LogReef Alert] ${alertName} triggered`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
        <div style="border-bottom: 2px solid #2dd4a8; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="margin: 0; color: #ededed;">Alert Triggered: ${alertName}</h2>
        </div>
        <div style="background: #13151b; border: 1px solid #252830; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 12px 6px 0; color: #8b8b8b; font-size: 13px; white-space: nowrap;">Level</td>
              <td style="padding: 6px 0; font-size: 13px;">
                <span style="background: ${logLevel === "error" ? "#dc2626" : logLevel === "warn" ? "#eab308" : "#2dd4a8"}; color: ${logLevel === "error" || logLevel === "warn" ? "#fff" : "#000"}; padding: 2px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase; font-weight: 600;">
                  ${logLevel}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 12px 6px 0; color: #8b8b8b; font-size: 13px;">Service</td>
              <td style="padding: 6px 0; color: #ededed; font-size: 13px; font-family: monospace;">${logService}</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px 6px 0; color: #8b8b8b; font-size: 13px;">Time</td>
              <td style="padding: 6px 0; color: #ededed; font-size: 13px;">${logTimestamp}</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px 6px 0; color: #8b8b8b; font-size: 13px; vertical-align: top;">Message</td>
              <td style="padding: 6px 0; color: #ededed; font-size: 13px; font-family: monospace; word-break: break-all;">${logMessage}</td>
            </tr>
          </table>
        </div>
        <p style="color: #8b8b8b; font-size: 12px; margin: 0;">
          You are receiving this because you have an active alert rule in LogReef.
          <a href="https://app.logreef.dev/alerts" style="color: #2dd4a8;">Manage alerts</a>
        </p>
      </div>
    `,
  })

  if (error) {
    console.error("[LogReef] Failed to send alert email:", error)
    throw error
  }

  return data
}

interface WelcomeEmailParams {
  to: string
  name?: string
}

export async function sendWelcomeEmail({ to, name }: WelcomeEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "LogReef <hello@logreef.dev>",
    to: [to],
    subject: "Welcome to LogReef",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
        <div style="border-bottom: 2px solid #2dd4a8; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="margin: 0; color: #ededed;">Welcome to LogReef${name ? `, ${name}` : ""}!</h2>
        </div>
        <p style="color: #c4c4c4; font-size: 14px; line-height: 1.7;">
          Your account is ready. Here is how to start shipping logs in under 2 minutes:
        </p>
        <ol style="color: #c4c4c4; font-size: 14px; line-height: 1.9; padding-left: 20px;">
          <li>Go to <a href="https://app.logreef.dev/settings" style="color: #2dd4a8;">Settings</a> and create an API key</li>
          <li>Install the Rust agent or use the REST API</li>
          <li>Watch your logs stream into the <a href="https://app.logreef.dev/dashboard" style="color: #2dd4a8;">dashboard</a></li>
        </ol>
        <p style="color: #8b8b8b; font-size: 12px; margin-top: 32px;">
          Questions? Reply to this email or check the <a href="https://github.com/logreef/logreef" style="color: #2dd4a8;">docs</a>.
        </p>
      </div>
    `,
  })

  if (error) {
    console.error("[LogReef] Failed to send welcome email:", error)
    throw error
  }

  return data
}
