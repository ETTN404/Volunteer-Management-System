import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  User,
  Sparkles,
  RefreshCw,
  Clock,
  Award,
  Zap,
  HelpCircle,
  X,
} from 'lucide-react';
import { Volunteer, User as UserType, Shift, Organization } from '../../types/vms';
import { ImpactScoreService } from '../../services/impactScoreService';

interface VolunBotChatProps {
  volunteer: Volunteer;
  user: UserType;
  org: Organization;
  upcomingShifts: Shift[];
  isOpen?: boolean;
  onClose?: () => void;
  isInline?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  source?: string;
}

export const VolunBotChat: React.FC<VolunBotChatProps> = ({
  volunteer,
  user,
  org,
  upcomingShifts,
  isOpen = true,
  onClose,
  isInline = false,
}) => {
  const milestoneProgress = ImpactScoreService.getMilestoneProgress(volunteer.total_hours);
  const nextShift = upcomingShifts[0];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      content: `Hello ${user.name}! I am VolunBot, your volunteer assistant for ${org.name}.\n\nYou have ${volunteer.total_hours} verified hours (${milestoneProgress.hoursToNext} hrs to next milestone certificate) and an Impact Score of ${volunteer.impact_score}/100.\n\nHow can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'volunbot-engine',
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputMessage).trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const volunteerContext = {
        name: user.name,
        orgName: org.name,
        totalHours: volunteer.total_hours,
        impactScore: volunteer.impact_score,
        skills: volunteer.skills,
        nextShift: nextShift
          ? {
              title: nextShift.title,
              date: nextShift.start_time,
              location: org.name,
            }
          : null,
        recentHistory: `Attended community food relief packaging and distribution`,
        hoursToNextMilestone: milestoneProgress.hoursToNext,
      };

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          volunteerContext,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: data.reply || 'I am ready to assist with questions on shifts, check-in, or milestone credentials.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source || 'gemini-3.7-flash',
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: `You currently have ${volunteer.total_hours} verified hours. Feel free to ask about your schedule, geofence radius, or certificates!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'local-fallback',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'When is my next shift?',
    'How do I earn my next certificate milestone?',
    'How is my Impact Score calculated?',
    'What skills are most in demand?',
  ];

  if (!isOpen && !isInline) return null;

  return (
    <div
      className={`${
        isInline
          ? 'bg-[#1e293b] border border-slate-700 rounded-lg h-[580px]'
          : 'fixed bottom-12 right-4 z-50 w-full max-w-md h-[520px] bg-[#1e293b] border border-slate-700 rounded-lg shadow-2xl'
      } flex flex-col overflow-hidden animate-in fade-in duration-200`}
    >
      {/* High Density Header */}
      <div className="bg-slate-900 px-3.5 py-2.5 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/40">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-white">VOLUNBOT AI CONCIERGE</span>
              <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-indigo-950 text-indigo-400 border border-indigo-800">
                GEMINI-3.7
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">Context: {user.name} ({org.name})</p>
          </div>
        </div>

        {onClose && !isInline && (
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages List (High Density) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-950">
        {messages.map((m) => {
          const isBot = m.role === 'model';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-2 ${isBot ? 'justify-start' : 'justify-end'}`}
            >
              {isBot && (
                <div className="w-6 h-6 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px] font-bold">
                  AI
                </div>
              )}

              <div
                className={`max-w-[85%] rounded p-2.5 text-xs font-mono leading-relaxed ${
                  isBot
                    ? 'bg-[#1e293b] border border-slate-700 text-slate-200'
                    : 'bg-indigo-600 text-white font-medium'
                }`}
              >
                <div className="whitespace-pre-line">{m.content}</div>
                <div
                  className={`text-[9px] mt-1 flex items-center justify-between gap-2 font-mono ${
                    isBot ? 'text-slate-400' : 'text-indigo-200'
                  }`}
                >
                  <span>{m.timestamp}</span>
                  {m.source && <span className="opacity-75">{m.source}</span>}
                </div>
              </div>

              {!isBot && (
                <div className="w-6 h-6 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px]">
                  ME
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono py-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>VolunBot reasoning...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="px-2 py-0.5 rounded bg-[#1e293b] hover:bg-slate-800 text-slate-300 hover:text-indigo-300 text-[10px] font-mono border border-slate-700 whitespace-nowrap transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <div className="p-2 bg-slate-900 border-t border-slate-700">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type query (shifts, hours, policies)..."
            className="flex-1 bg-slate-950 text-slate-200 text-xs font-mono px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded border border-indigo-400/40 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
