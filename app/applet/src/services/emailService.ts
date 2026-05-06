export const EmailService = {
  getGmailToken: async (): Promise<string | null> => {
    try {
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const { auth } = await import('../firebase');
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      
      // Force account selection to ensure they can pick the right account to send from
      provider.setCustomParameters({
        prompt: 'consent'
      });
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      return credential?.accessToken || null;
    } catch (error) {
      console.error("Failed to get Gmail token", error);
      return null;
    }
  },

  sendEmail: async (accessToken: string, to: string, subject: string, body: string): Promise<boolean> => {
    try {
      const emailContent = [
        'Content-Type: text/html; charset="UTF-8"',
        'MIME-Version: 1.0',
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body,
      ].join('\n');

      const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedEmail,
        }),
      });

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  },

  broadcastAnnouncement: async (accessToken: string, targetEmails: string[], title: string, content: string): Promise<void> => {
    const subject = `[TechSprint] Announcement: ${title}`;
    const body = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #4f46e5;">TechSprint Announcement</h2>
        <h3>${title}</h3>
        <p>${content.replace(/\n/g, '<br>')}</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">You are receiving this email because you signed up for TechSprint using your Google account.</p>
      </div>
    `;

    // Process in batches or one by one to avoid rate limits
    for (const email of targetEmails) {
      await EmailService.sendEmail(accessToken, email, subject, body);
    }
  }
};
