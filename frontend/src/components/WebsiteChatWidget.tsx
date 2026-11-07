import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import { sendWebsiteChatMessage, WebsiteChatMessage } from '../lib/api';

interface ChatMessage extends WebsiteChatMessage {
  id: number;
  createdAt: number;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 1,
  role: 'assistant',
  content: 'Hai! Aku asisten World Monitor. Ada yang ingin kamu tanyakan tentang fitur atau cara menggunakan website ini?',
  createdAt: Date.now(),
};

const MAX_MESSAGE_LENGTH = 1000;
const MIN_SEND_INTERVAL_MS = 3000;

export default function WebsiteChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<number | null>(null);
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  const [remainingCooldown, setRemainingCooldown] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = isSending || typingMessageId !== null;

  useEffect(() => {
    if (!isOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isOpen, messages, visibleCharacters, isSending]);

  useEffect(() => {
    if (!typingMessageId) return;
    const reply = messages.find(message => message.id === typingMessageId);
    if (!reply) return;

    let position = 0;
    const step = Math.max(1, Math.ceil(reply.content.length / 110));
    const timer = window.setInterval(() => {
      position = Math.min(reply.content.length, position + step);
      setVisibleCharacters(position);
      if (position >= reply.content.length) {
        window.clearInterval(timer);
        setTypingMessageId(null);
        setIsSending(false);
      }
    }, 22);

    return () => window.clearInterval(timer);
  }, [typingMessageId, messages]);

  useEffect(() => {
    if (remainingCooldown <= 0) return;
    const timer = window.setTimeout(() => setRemainingCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [remainingCooldown]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || content.length > MAX_MESSAGE_LENGTH || isBusy || remainingCooldown > 0) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content,
      createdAt: Date.now(),
    };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setDraft('');
    setIsSending(true);
    setRemainingCooldown(Math.ceil(MIN_SEND_INTERVAL_MS / 1000));

    try {
      const reply = await sendWebsiteChatMessage(conversation.slice(-8));
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: reply,
        createdAt: Date.now(),
      };
      setMessages(current => [...current, assistantMessage]);
      setVisibleCharacters(0);
      setTypingMessageId(assistantMessage.id);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Chat tidak dapat terhubung. Coba lagi sebentar.',
        createdAt: Date.now(),
      };
      setMessages(current => [...current, errorMessage]);
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[70]">
      {isOpen && (
        <section
          aria-label="Chat bantuan World Monitor"
          className="absolute bottom-[4.5rem] right-0 flex h-[min(620px,calc(100dvh-7rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-cyan-800/60 bg-[#071226] shadow-[0_20px_80px_rgba(0,0,0,0.65)]"
        >
          <header className="flex items-center justify-between border-b border-cyan-900/60 bg-[#0a1930] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-950">
                <img src="/favicon.png" alt="" className="h-7 w-7 object-contain" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0a1930] bg-emerald-400" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-white">World Monitor AI</h2>
                <div className="flex items-center gap-1 text-[10px] text-emerald-300">
                  <Sparkles className="h-3 w-3" />
                  Asisten bantuan website
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Tutup chat"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div
            className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4"
            aria-live="polite"
            aria-relevant="additions text"
          >
            <div className="flex justify-center">
              <span className="rounded-full border border-emerald-900/50 bg-emerald-950/30 px-2.5 py-1 text-[10px] text-emerald-300">
                Tanya seputar fitur World Monitor
              </span>
            </div>
            {messages.map(message => {
              const isAssistant = message.role === 'assistant';
              const isTyping = message.id === typingMessageId;
              const text = isTyping ? message.content.slice(0, visibleCharacters) : message.content;
              return (
                <div key={message.id} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                      isAssistant
                        ? 'rounded-tl-sm border border-cyan-900/50 bg-[#10213a] text-gray-100'
                        : 'rounded-tr-sm bg-cyan-700 text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{text}</p>
                    <time className={`mt-1 block text-right text-[9px] ${isAssistant ? 'text-gray-500' : 'text-cyan-100/70'}`}>
                      {new Date(message.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                </div>
              );
            })}
            {isSending && typingMessageId === null && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-cyan-900/50 bg-[#10213a] px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-cyan-900/50 bg-[#081226] p-3">
            <div className="mb-2 flex items-center justify-center gap-1 text-[9px] text-gray-500">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              Pesan dibatasi dan diproses aman di server
            </div>
            <form onSubmit={event => void sendMessage(event)} className="flex items-end gap-2">
              <div className="flex-1 rounded-xl border border-cyan-900/70 bg-black/30 focus-within:border-cyan-500/70">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={event => setDraft(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                  onKeyDown={handleKeyDown}
                  placeholder="Tulis pesan..."
                  aria-label="Tulis pesan untuk asisten"
                  rows={1}
                  maxLength={MAX_MESSAGE_LENGTH}
                  disabled={isBusy}
                  className="max-h-28 min-h-11 w-full resize-none bg-transparent px-3 py-3 text-[13px] text-white outline-none placeholder:text-gray-500 disabled:opacity-60"
                />
              </div>
              <button
                type="submit"
                disabled={!draft.trim() || isBusy || remainingCooldown > 0}
                aria-label="Kirim pesan"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-600 text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <div className="mt-1 flex justify-between px-1 text-[9px] text-gray-600">
              <span>{remainingCooldown > 0 ? `Tunggu ${remainingCooldown} dtk sebelum mengirim lagi` : 'Enter untuk kirim · Shift+Enter baris baru'}</span>
              <span>{draft.length}/{MAX_MESSAGE_LENGTH}</span>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        aria-label={isOpen ? 'Tutup chat bantuan' : 'Buka chat bantuan'}
        aria-expanded={isOpen}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/50 bg-gradient-to-br from-cyan-500 to-blue-700 text-white shadow-[0_8px_30px_rgba(0,190,255,0.35)] transition hover:scale-105 hover:shadow-[0_8px_36px_rgba(0,190,255,0.55)]"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!isOpen && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#060D1F] bg-emerald-400" />}
      </button>
    </div>
  );
}
