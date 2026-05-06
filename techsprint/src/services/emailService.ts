import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

let sessionToken: string | null = null;

export const EmailService = {
  hasToken: () => !!sessionToken,

  getGmailToken: async (): Promise<string | null> => {
    if (sessionToken) return sessionToken;

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      
      if (auth.currentUser?.email) {
        provider.setCustomParameters({
          login_hint: auth.currentUser.email
          // Removed prompt: 'consent' to allow reuse of existing permissions if granted
        });
      }
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      
      if (token) {
        sessionToken = token;
      }
      
      return token;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/popup-closed-by-user') {
        console.warn("Gmail token acquisition canceled by user.");
        return null;
      }
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

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
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
        const errorData = await response.text();
        throw new Error(`Gmail API error: ${response.status} ${response.statusText} - ${errorData}`);
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
        <p style="font-size: 12px; color: #888;">You are receiving this email because you signed up for TechSprint.</p>
      </div>
    `;

    // Send in batches or one by one
    for (const email of targetEmails) {
      await EmailService.sendEmail(accessToken, email, subject, body);
    }
  }
};
