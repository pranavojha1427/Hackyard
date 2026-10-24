"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const PREPOPULATED_PROMPTS = [
  "Which railway projects in Assam have cost overruns > 20%?",
  "What is the total original cost vs revised cost for projects in Maharashtra?",
  "Summarize critical projects showing highest delays"
];

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am the MoSPI Project Intelligence Assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage = text.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const url = "/api/chat";
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to communicate with API. Status: ${response.status}. URL: ${url}. Response: ${errText}`);
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `**Error:** Unable to reach the assistant API. Details: ${error?.message || "Unknown error"}. Make sure the backend is running.` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-900 text-white rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 ring-4 ring-indigo-200/50 transition-all duration-200 z-50 flex items-center gap-2 group"
          aria-label="Open Project Intelligence Assistant"
        >
          <Bot className="w-6 h-6 animate-pulse" />
          <span className="hidden sm:inline font-bold text-xs uppercase tracking-wider pr-1">MoSPI AI</span>
        </button>
      )}

      {/* Chat Widget Panel */}
      {isOpen && (
        <>
        <style>{`
          @keyframes macOpen {
            0% { opacity: 0; transform: scale(0.9) translateY(20px); transform-origin: bottom right; }
            100% { opacity: 1; transform: scale(1) translateY(0); transform-origin: bottom right; }
          }
        `}</style>
        <div 
          className="fixed bottom-6 right-6 w-[750px] max-w-[95vw] h-[780px] max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col z-50 border border-slate-200 overflow-hidden ring-1 ring-slate-900/10"
          style={{ animation: 'macOpen 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-5 flex justify-between items-center shrink-0 border-b border-indigo-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base tracking-tight text-white">MoSPI Intelligence Assistant</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Gemini AI
                  </span>
                </div>
                <p className="text-xs text-slate-300">Natural language portfolio analytics & query resolution</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition flex items-center justify-center"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/70">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    msg.role === "user" 
                      ? "bg-slate-900 text-white shadow-sm" 
                      : "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                  }`}
                >
                  {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-tr-xs shadow-md shadow-indigo-500/20"
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-sm prose prose-sm max-w-none"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap m-0 text-sm font-medium">{msg.content}</p>
                  ) : (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 shadow-xs">
                            <table className="w-full border-collapse text-xs" {...props} />
                          </div>
                        ),
                        thead: ({ node, ...props }) => <thead className="bg-slate-100 text-slate-800 font-mono text-[11px] uppercase tracking-wider" {...props} />,
                        tbody: ({ node, ...props }) => <tbody className="divide-y divide-slate-100 bg-white" {...props} />,
                        tr: ({ node, ...props }) => <tr className="hover:bg-slate-50 transition-colors" {...props} />,
                        th: ({ node, ...props }) => <th className="p-2.5 text-left font-bold border-b border-slate-200" {...props} />,
                        td: ({ node, ...props }) => <td className="p-2.5 text-slate-700" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 flex-row items-center">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
                  <Bot size={16} />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-white border border-slate-200 rounded-tl-xs shadow-sm flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="animate-spin text-indigo-600" size={16} />
                  Analyzing MoSPI project data...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-200 shrink-0">
            {/* Prompt Chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {PREPOPULATED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(prompt)}
                  disabled={isLoading}
                  className="text-xs bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-800 py-1.5 px-3 rounded-xl border border-indigo-200/60 transition text-left disabled:opacity-50 font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Field */}
            <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-2xl p-1.5 pl-4 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white focus-within:border-transparent transition">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about project delays, expenditures, state budgets..."
                className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-slate-800 py-2"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition shadow-sm"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
        </>
      )}
    </>
  );
}
