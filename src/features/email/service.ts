export type EmailSendResult = {
  status: "sent" | "failed" | "skipped";
  providerMessageId?: string;
  errorMessage?: string;
};

export type EmailClient = {
  emails: {
    send(input: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      text: string;
    }): Promise<{ data?: { id?: string } | null; error?: { message?: string } | null }>;
  };
};

export async function sendReportEmail(params: {
  client: EmailClient;
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}): Promise<EmailSendResult> {
  const result = await params.client.emails.send({
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text
  });

  if (result.error) {
    return {
      status: "failed",
      errorMessage: result.error.message ?? "Resend delivery failed"
    };
  }

  return {
    status: "sent",
    providerMessageId: result.data?.id
  };
}
