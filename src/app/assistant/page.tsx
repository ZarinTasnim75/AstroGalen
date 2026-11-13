'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Send, Trash2, Bot, User, ShieldAlert, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';
import { respondTo, contextFromRecords, QUICK_PROMPTS, type AssistantContext } from '@/lib/assistant';
import type { ChatMessage, AssessmentRecord } from '@/lib/types';
import { useOnline } from '@/components/offline-status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, Card, CardTitle } from '@/components/ui/card';
import { Disclaimer } from '@/components/disclaimer';

export default function AssistantPage() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [ctx, setCtx] = React.useState<AssistantContext>({ completedToday: { physical: false, mental: false } });
  const [busy, setBusy] = React.useState(false);
  const online = useOnline();
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    (async () => {
      const msgs = await db.chatLog.orderBy('ts').toArray();
      if (msgs.length === 0) {
        const greeting: ChatMessage = {
          ts: Date.now(),
          role: 'assistant',
          text:
            "Hey, astronaut! 👋 I'm ORBI's voice — your offline health companion. How are you feeling today? " +
            'I can explain your measurements, listen when something feels off, and guide you through the app. I never diagnose — for that there’s the mission medical officer.',
        };
        await db.chatLog.add(greeting);
        setMessages([greeting]);
      } else {
        setMessages(msgs);
      }
      const recs: AssessmentRecord[] = await db.assessments.orderBy('ts').toArray();
      setCtx(contextFromRecords(recs));
    })();
  }, []);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    const userMsg: ChatMessage = { ts: Date.now(), role: 'user', text };
    await db.chatLog.add(userMsg);
    const reply = respondTo(text, ctx);
    const replyMsg: ChatMessage = { ts: Date.now(), role: 'assistant', text: reply.text, tag: reply.tag };
    await db.chatLog.add(replyMsg);
    setMessages((m) => [...m, userMsg, replyMsg]);
    if (reply.tag === 'urgent') {
      toast.error('Urgent symptom mentioned — follow onboard emergency procedure.');
    } else if (reply.tag === 'symptom') {
      toast.message('Symptom noted in conversation. Consider recording it in today’s assessment.');
    }
    setBusy(false);
  };

  const clearChat = async () => {
    await db.chatLog.clear();
    setMessages([]);
    toast.success('Conversation history cleared from this device.');
    const greeting: ChatMessage = {
      ts: Date.now(),
      role: 'assistant',
      text: 'Fresh start! How can I help you today, astronaut?',
    };
    await db.chatLog.add(greeting);
    setMessages([greeting]);
  };

  const urgentCount = messages.filter((m) => m.tag === 'urgent').length;

  return (
    <div className="space-y-4">
      <header className="pt-4">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge tone="cyan">AI Assistant</Badge>
          <Badge tone={online ? 'green' : 'amber'}>{online ? 'Online — offline engine still active' : 'Offline — local engine active'}</Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orbit-cyan via-orbit-blue to-orbit-violet bg-clip-text text-transparent">
          ORBI Health Companion
        </h1>
        <p className="text-sm text-orbit-muted mt-1 max-w-3xl">
          A supportive conversational companion for long missions. It works fully offline using local intent recognition and a
          curated knowledge base. It never diagnoses and never replaces the mission medical officer.
        </p>
      </header>

      <Disclaimer compact />

      <Card className="flex flex-col" style={{ minHeight: '60vh' }}>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="mb-0">Conversation (stored locally on this device)</CardTitle>
          <Button variant="outline" size="sm" onClick={clearChat}>
            <Trash2 className="h-3.5 w-3.5" /> Clear chat
          </Button>
        </div>

        {urgentCount > 0 && (
          <div className="rounded-xl border border-orbit-red/50 bg-orbit-red/10 p-3 text-sm flex items-start gap-2 mb-2">
            <ShieldAlert className="h-5 w-5 text-orbit-red shrink-0 mt-0.5" />
            <p>
              This conversation contained urgent-symptom wording. The standing instruction: follow the onboard emergency
              procedure and contact the medical officer — the assistant cannot provide emergency care.
            </p>
          </div>
        )}

        <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ maxHeight: '52vh' }} aria-live="polite">
          {messages.map((m, i) => (
            <div key={m.id ?? i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-orbit-cyan/15 border border-orbit-cyan/30 rounded-br-md'
                    : 'panel rounded-bl-md'
                } ${m.tag === 'urgent' ? 'border-orbit-red/60 bg-orbit-red/10' : ''}`}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-orbit-muted mb-1">
                  {m.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                  {m.role === 'user' ? 'You' : 'ORBI'}
                  {m.tag === 'symptom' && <Badge tone="amber" className="text-[9px] px-1 py-0">symptom</Badge>}
                  {m.tag === 'urgent' && <Badge tone="red" className="text-[9px] px-1 py-0">urgent</Badge>}
                </span>
                {m.text}
              </div>
            </div>
          ))}
          {busy && <p className="text-xs text-orbit-muted animate-pulse">ORBI is thinking…</p>}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => void send(p)}
              className="rounded-full border border-orbit-border px-2.5 py-1 text-[11px] text-orbit-muted hover:border-orbit-cyan/50 hover:text-orbit-cyan transition"
            >
              <Sparkles className="inline h-3 w-3 mr-1 -mt-0.5" />
              {p}
            </button>
          ))}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell ORBI how you feel, or ask about your health…"
            aria-label="Message ORBI"
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" /> Send
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle>What the assistant can (and cannot) do</CardTitle>
        <ul className="text-sm text-orbit-muted list-disc pl-5 mt-2 space-y-1">
          <li>Acknowledge and help you record reported physical or mental changes — never diagnose a cause.</li>
          <li>Recognize urgent-symptom wording and direct you to the onboard emergency procedure immediately.</li>
          <li>Offer relaxation exercises, encourage daily assessments, and explain the five spaceflight hazards.</li>
          <li>Work fully offline; no health data leaves your device unless you explicitly send a report.</li>
          <li>An optional online AI provider can be integrated later (server-side key, explicit permission) — the offline engine remains the default.</li>
        </ul>
      </Card>
    </div>
  );
}

