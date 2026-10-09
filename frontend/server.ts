import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.error('Failed to initialize GoogleGenAI client:', e);
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'VolunTrack VMS Frontend & AI Proxy',
      timestamp: new Date().toISOString(),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // VolunBot Gemini AI Chat Endpoint (Server-Side with Context Injection according to VMS Backend Master Plan §13)
  app.post('/api/gemini/chat', async (req: Request, res: Response) => {
    try {
      const { message, volunteerContext, history } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const client = getAIClient();

      // Formulate context-rich system prompt per VMS backend plan §13.1
      const systemInstruction = `You are VolunBot, the official intelligent AI assistant for the Volunteer Management System (VolunTrack VMS).
Your goal is to provide warm, encouraging, precise, and practical assistance to volunteers regarding their service, schedules, hours, skills, milestones, certificates, and opportunities.

[VOLUNTEER CONTEXT]
- Volunteer Name: ${volunteerContext?.name || 'Volunteer'}
- Organization: ${volunteerContext?.orgName || 'Community Network'}
- Total Verified Service Hours: ${volunteerContext?.totalHours || 0} hrs
- Impact Score: ${volunteerContext?.impactScore || 0} / 100
- Registered Skills: ${volunteerContext?.skills?.join(', ') || 'General Volunteer'}
- Next Upcoming Shift: ${volunteerContext?.nextShift ? `${volunteerContext.nextShift.title} on ${volunteerContext.nextShift.date} at ${volunteerContext.nextShift.location}` : 'No upcoming shifts scheduled'}
- Recent Service History: ${volunteerContext?.recentHistory || 'Active in community programs'}
- Milestone Progress: ${volunteerContext?.hoursToNextMilestone ?? 0} hrs remaining to next certificate milestone

[RULES]
1. Only answer questions related to volunteer activities, schedules, skills, impact score calculations, certificates, and safety.
2. Be helpful, concise, positive, and accurate.
3. If asked how the impact score works: Explain that base score is 0.1 pts per verified hour, +20% for shifts requiring 3+ skills, +15% for on-time check-in, and +10% for high attendance rate.
4. If asked about milestones: Milestones award automated signed certificates at 10, 25, 50, 100, 200, and 500 verified hours.`;

      if (client) {
        // Prepare contents for Gemini 3.7 Flash
        const contents: any[] = [];
        if (Array.isArray(history) && history.length > 0) {
          // Take last 8 turns
          const recentHistory = history.slice(-8);
          for (const item of recentHistory) {
            contents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: item.content }],
            });
          }
        }

        contents.push({
          role: 'user',
          parts: [{ text: message }],
        });

        const response = await client.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        });

        const replyText = response.text || 'I am ready to help with your volunteer schedule and impact tracking!';
        return res.json({
          reply: replyText,
          source: 'gemini-3.7-flash',
          status: 'success',
        });
      } else {
        // Realistic fallback if GEMINI_API_KEY is not yet populated
        const lower = message.toLowerCase();
        let fallbackReply = `Hello ${volunteerContext?.name || 'there'}! I'm VolunBot. You currently have ${volunteerContext?.totalHours || 0} verified service hours with an Impact Score of ${volunteerContext?.impactScore || 0}/100. `;

        if (lower.includes('next shift') || lower.includes('upcoming')) {
          fallbackReply += volunteerContext?.nextShift
            ? `Your next shift is "${volunteerContext.nextShift.title}" on ${volunteerContext.nextShift.date} at ${volunteerContext.nextShift.location}. Remember to check in within 100m of the venue!`
            : `You don't have any shifts scheduled right now. Check out the "Browse Events" tab to sign up!`;
        } else if (lower.includes('certificate') || lower.includes('milestone') || lower.includes('hours')) {
          const next = volunteerContext?.hoursToNextMilestone || 5;
          fallbackReply += `You are ${next} hours away from your next verified milestone certificate! Certificates are automatically awarded at 10, 25, 50, 100, 200, and 500 hours.`;
        } else if (lower.includes('impact') || lower.includes('score')) {
          fallbackReply += `Your Impact Score is calculated at 0.1 pts/hr plus bonus multipliers: +20% for 3+ skill shifts, +15% for early check-in, and +10% for attendance consistency.`;
        } else if (lower.includes('check in') || lower.includes('qr') || lower.includes('gps')) {
          fallbackReply += `To check in, open "My Schedule", click Check-In on your active shift, scan the coordinator's QR code within 100m geofence radius, and provide your digital signature!`;
        } else {
          fallbackReply += `How else can I assist you with your shifts, certificates, or community service today?`;
        }

        return res.json({
          reply: fallbackReply,
          source: 'volunbot-context-engine',
          status: 'success',
          note: 'Using context-aware local response engine. Set GEMINI_API_KEY for dynamic AI responses.',
        });
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({
        error: 'Failed to generate response',
        details: error?.message || String(error),
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VolunTrack VMS server running on http://localhost:${PORT}`);
  });
}

startServer();
