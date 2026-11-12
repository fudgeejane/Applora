import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp, Bot, BriefcaseBusiness, Clock3, MessageCircle, Plus,
  Send, Sparkles, UserRound,
} from "lucide-react";
import { useStyle } from "../../components/ui/Style";
import { Panel } from "./DashboardPage";

const conversations = [
  { title: "Preparing for a product design interview", date: "Today", preview: "Let’s get you ready for your upcoming interview..." },
  { title: "Improve my resume summary", date: "Yesterday", preview: "Here are a few ways you can make it more focused..." },
  { title: "How to follow up after applying", date: "Nov 7", preview: "A thoughtful follow-up can help you stand out..." },
  { title: "Career path in product design", date: "Nov 4", preview: "There are several directions you could explore..." },
];
const initialMessages = [
  { role: "user", text: "I have a product design interview with Northstar Digital on Friday. How should I prepare?" },
  { role: "assistant", text: "That’s exciting — let’s make sure you feel prepared. For a product design interview, it can help to focus on three things:\n\n• Pick one case study that shows your process, trade-offs, and impact.\n• Learn about Northstar’s product and prepare thoughtful questions for the team.\n• Practice explaining how you collaborate with research, product, and engineering.\n\nWould you like to work through a case study outline together?" },
];
const prompts = [
  { icon: BriefcaseBusiness, text: "Help me prepare for an interview" },
  { icon: Sparkles, text: "How can I improve my resume?" },
  { icon: MessageCircle, text: "Draft a follow-up email" },
];

export default function ChatBotPage() {
  const style = useStyle();
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get("prompt") || "";
  const [selectedConversation, setSelectedConversation] = useState(() => initialPrompt ? -1 : 0);
  const [messages, setMessages] = useState(() => initialPrompt ? [] : initialMessages);
  const [draft, setDraft] = useState(initialPrompt);

  const startConversation = () => {
    setSelectedConversation(-1);
    setMessages([]);
    setDraft("");
  };
  const sendMessage = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { role: "user", text }]);
    setDraft("");
  };
  const chooseConversation = (index) => {
    setSelectedConversation(index);
    setMessages(index === 0 ? initialMessages : [
      { role: "user", text: conversations[index].title },
      { role: "assistant", text: conversations[index].preview },
    ]);
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-5">
        <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${style.headingText}`}>AI Career Assistant</h1>
        <p className={`mt-1.5 text-sm ${style.secondaryText}`}>A space to think through your next career move.</p>
      </div>
      <Panel style={style} className="overflow-hidden p-0">
        <div className="grid min-h-[min(74vh,760px)] md:grid-cols-[250px_minmax(0,1fr)]">
          <aside className={`border-b p-4 md:border-b-0 md:border-r ${style.border}`}>
            <button type="button" onClick={startConversation} className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${style.buttonBlue}`}><Plus size={16} /> New conversation</button>
            <div className="mt-6">
              <p className={`mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider ${style.mutedText}`}>Recent conversations</p>
              <div className="max-h-52 space-y-1 overflow-y-auto md:max-h-[calc(74vh-130px)]">
                {conversations.map((conversation, index) => (
                  <button key={conversation.title} type="button" onClick={() => chooseConversation(index)} className={`w-full rounded-lg px-3 py-2.5 text-left ${selectedConversation === index ? "bg-blue-100/70 dark:bg-blue-500/10" : style.hoverBg}`}>
                    <span className={`block truncate text-xs font-medium ${style.primaryText}`}>{conversation.title}</span>
                    <span className={`mt-1 flex items-center gap-1 text-[10px] ${style.mutedText}`}><Clock3 size={11} />{conversation.date}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="flex min-h-[560px] min-w-0 flex-col">
            <div className={`flex items-center gap-3 border-b px-4 py-3.5 sm:px-6 ${style.border}`}>
              <span className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"><Bot size={19} /></span>
              <div className="min-w-0"><h2 className={`text-sm font-semibold ${style.primaryText}`}>{selectedConversation < 0 ? "New conversation" : "Career conversation"}</h2><p className={`mt-0.5 text-xs ${style.secondaryText}`}>Your thoughtful career companion</p></div>
              <span className={`ml-auto inline-flex items-center gap-1.5 text-[11px] ${style.mutedText}`}><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Ready</span>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
              {messages.length === 0 && (
                <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
                  <span className="rounded-2xl bg-blue-100 p-4 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"><Sparkles size={25} /></span>
                  <h3 className={`mt-4 text-lg font-semibold ${style.primaryText}`}>What’s on your mind?</h3>
                  <p className={`mt-1 max-w-sm text-sm ${style.secondaryText}`}>Explore ideas, get organized, or practice for your next opportunity.</p>
                  <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-3">
                    {prompts.map(({ icon: Icon, text }) => <button key={text} type="button" onClick={() => setDraft(text)} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs ${style.border} ${style.secondaryText} ${style.hoverBg}`}><Icon size={16} className="shrink-0 text-blue-600 dark:text-blue-400" />{text}</button>)}
                  </div>
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div key={`${message.role}-${index}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === "assistant" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"}`}>{message.role === "assistant" ? <Bot size={17} /> : <UserRound size={16} />}</span>
                    <div className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[78%] ${message.role === "assistant" ? `${style.grayBg} ${style.primaryText} rounded-tl-md` : "bg-blue-600 text-white rounded-tr-md"}`}>
                      {message.role === "assistant" && <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Career assistant</p>}
                      <p className="whitespace-pre-line text-sm leading-6">{message.text}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
                <div className="ml-11 flex flex-wrap gap-2">
                  {["Help me outline my case study", "What questions should I ask?"].map((prompt) => <button key={prompt} type="button" onClick={() => setDraft(prompt)} className={`rounded-full border px-3 py-1.5 text-xs ${style.border} ${style.secondaryText} ${style.hoverBg}`}>{prompt}</button>)}
                </div>
              )}
            </div>

            <div className={`border-t p-4 sm:px-6 ${style.border}`}>
              <form onSubmit={sendMessage} className={`flex items-end gap-2 rounded-xl border p-2 ${style.input}`}>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(event); } }} rows={1} placeholder="Message your career assistant..." aria-label="Message your career assistant" className="max-h-32 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-sm outline-none" />
                <button type="submit" disabled={!draft.trim()} aria-label="Send message" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.buttonBlue}`}><ArrowUp size={18} /></button>
              </form>
              <p className={`mt-2 text-center text-[10px] ${style.mutedText}`}><Send size={11} className="mr-1 inline" />Static preview only — messages are not sent to an AI service.</p>
            </div>
          </section>
        </div>
      </Panel>
    </div>
  );
}
