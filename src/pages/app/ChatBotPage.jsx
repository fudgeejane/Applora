import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import {
  ArrowUp,
  BriefcaseBusiness,
  Clock3,
  EllipsisVertical,
  Menu,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useStyle } from "../../components/ui/Style";
import Portal from "../../components/ui/Portal";
import api from "../../lib/api";
import LumiLogo from "../../assets/Lumi.png";

const prompts = [
  { icon: BriefcaseBusiness, text: "Help me prepare for an interview" },
  { icon: Sparkles, text: "How can I improve my resume for this role?" },
  { icon: MessageCircle, text: "Plan my job search for the next two weeks" },
];

function recentHistory(messages) {
  const history = messages.slice(-12).map(({ role, text }) => ({ role, text }));
  while (history.reduce((total, item) => total + item.text.length, 0) > 10000) {
    history.shift();
  }
  return history;
}

function formatConversationDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const now = new Date();
  return date.toDateString() === now.toDateString()
    ? "Today"
    : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function createConversationTitle(input) {
  const words = (input || "")
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) || [];
  const stopWords = new Set([
    "a", "an", "and", "are", "as", "at", "be", "can", "could", "do", "for", "from",
    "help", "how", "i", "in", "is", "it", "me", "my", "of", "on", "please", "the",
    "this", "to", "with", "would", "you", "your",
    "ako", "ang", "ano", "at", "ba", "can", "gusto", "ito", "ko", "mga", "mo",
    "ng", "para", "paano", "po", "sa", "sana", "tulong",
  ]);
  const keywords = [...new Set(words.filter((word) => !stopWords.has(word)))].slice(0, 6);
  const title = (keywords.length ? keywords : words.slice(0, 4)).join(" ");
  if (!title) return "New conversation";
  return title.length > 60 ? `${title.slice(0, 57)}...` : title;
}

function normalizeConversation(item) {
  const messages = (Array.isArray(item?.messages) ? item.messages : []).map((message, index) => ({
    id: message?.id || `${message?.role || "message"}-${index}`,
    role: message?.role === "assistant" ? "assistant" : "user",
    text: typeof message?.text === "string" ? message.text : "",
    createdAt: message?.createdAt || new Date().toISOString(),
  }));
  const firstUserMessage = messages.find((message) => message.role === "user" && message.text.trim());
  const firstMessageTitle = firstUserMessage ? createConversationTitle(firstUserMessage.text) : "New conversation";
  const cleanedFirstMessage = firstUserMessage?.text.trim().replace(/\s+/g, " ") || "";
  const legacyAutoTitle = cleanedFirstMessage.length > 60
    ? `${cleanedFirstMessage.slice(0, 57)}...`
    : cleanedFirstMessage;
  const savedTitle = item?.title || "New conversation";
  const title = savedTitle === "New conversation" || savedTitle === legacyAutoTitle
    ? firstMessageTitle
    : savedTitle;

  return {
    id: item?.id || item?._id,
    title,
    updatedAt: item?.updatedAt || new Date().toISOString(),
    messages,
  };
}

function groupConversationsByDate(conversations) {
  const today = new Date();
  const groups = {
    Today: [],
    "Yesterday": [],
    "Previous 7 Days": [],
    Older: [],
  };

  for (const conversation of conversations) {
    const date = new Date(conversation.updatedAt);
    const diffInDays = Math.floor((today.getTime() - date.getTime()) / 86400000);

    if (diffInDays === 0) {
      groups.Today.push(conversation);
    } else if (diffInDays === 1) {
      groups["Yesterday"].push(conversation);
    } else if (diffInDays <= 7) {
      groups["Previous 7 Days"].push(conversation);
    } else {
      groups.Older.push(conversation);
    }
  }

  return groups;
}

function ConversationHistorySkeleton({ style }) {
  const placeholder = `animate-pulse rounded ${style.grayBg2}`;

  return (
    <div className="space-y-5 px-2" role="status" aria-label="Loading conversations" aria-busy="true">
      <span className="sr-only">Loading conversations</span>
      {[0, 1, 2].map((group) => (
        <div key={group} className="space-y-2.5">
          <div className={`h-2.5 w-20 ${placeholder}`} />
          {[0, 1].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-xl px-1 py-2">
              <div className={`h-3 flex-1 ${placeholder}`} />
              <div className={`h-3 w-3 shrink-0 rounded-full ${placeholder}`} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ConversationHistoryPanel({
  style,
  panelClassName,
  isLoading,
  onClose,
  startConversation,
  isSending,
  searchQuery,
  setSearchQuery,
  groupedConversations,
  selectedConversation,
  chooseConversation,
  menuOpenId,
  setMenuOpenId,
  setRenameDraft,
  setConversationActionError,
  setConversationDialog,
  filteredConversations,
}) {
  return (
    <aside className={`flex flex-col border-r p-3 ${style.border} ${style.secondaryBg} ${panelClassName}`}>
      <div className="flex items-center justify-between gap-3 px-1 pb-4 pt-1">
        <div className="flex min-w-0 items-center gap-2">
          <img src={LumiLogo} alt="Lumi Logo" className="h-12 w-12 shrink-0 rounded-full" />
          <p className={`truncate text-base font-semibold sm:text-lg ${style.primaryText}`}>Ask Lumi</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat history"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg lg:hidden ${style.hoverBg} ${style.secondaryText}`}
        >
          <X size={18} />
        </button>
      </div>

      <button
        type="button"
        onClick={startConversation}
        disabled={isSending}
        className={`flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${style.buttonBlue}`}
      >
        <Plus size={16} /> New chat
      </button>

      <label className={`mt-3 flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 ${style.input}`}>
        <Search size={16} className={style.secondaryText} />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search conversations"
          className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-inherit"
        />
      </label>
      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <ConversationHistorySkeleton style={style} />
        ) : (
        <div className="space-y-4">
          {Object.entries(groupedConversations).map(([heading, entries]) => {
            if (entries.length === 0) return null;

            return (
              <div key={heading}>
                <p className={`mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] ${style.mutedText}`}>
                  {heading}
                </p>
                <div className="space-y-1.5">
                  {entries.map((conversation) => (
                    <div key={conversation.id} className="group relative flex min-w-0 items-center rounded-xl">
                      <button
                        type="button"
                        onClick={() => chooseConversation(conversation)}
                        className={`min-w-0 flex-1 rounded-xl py-2.5 pl-2.5 pr-1 text-left transition ${selectedConversation === conversation.id ? "bg-blue-100/80 dark:bg-blue-500/10" : style.hoverBg}`}
                      >
                        <span className="block min-w-0">
                          <span className={`block truncate text-sm font-medium capitalize ${style.primaryText}`}>
                            {conversation.title}
                          </span>
                          <span className={`mt-1 flex items-center gap-1 text-[10px] ${style.mutedText}`}>
                            <Clock3 size={11} />
                            {formatConversationDate(conversation.updatedAt)}
                          </span>
                        </span>
                      </button>

                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setMenuOpenId((openId) => openId === conversation.id ? null : conversation.id)}
                          aria-label={`Conversation actions for ${conversation.title}`}
                          className={`mr-1 flex h-8 w-8 items-center justify-center rounded-lg ${style.hoverBg} ${style.secondaryText}`}
                        >
                          <EllipsisVertical size={14} />
                        </button>

                        {menuOpenId === conversation.id && (
                          <div className={`absolute right-0 top-full z-20 mt-1 w-36 rounded-md border shadow-lg ${style.secondaryBg} ${style.border}`}>
                            <button
                              type="button"
                              onClick={() => {
                                setRenameDraft(conversation.title);
                                setConversationActionError("");
                                setConversationDialog({ type: "rename", conversationId: conversation.id });
                                setMenuOpenId(null);
                              }}
                              className={`flex w-full items-center gap-2 rounded-t-md px-4 py-2.5 text-left text-sm ${style.secondaryText} ${style.hoverBg}`}
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConversationActionError("");
                                setConversationDialog({ type: "delete", conversationId: conversation.id });
                                setMenuOpenId(null);
                              }}
                              className={`flex w-full items-center gap-2 rounded-b-md px-4 py-2.5 text-left text-sm ${style.secondaryText} ${style.hoverBg}`}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredConversations.length === 0 && (
            <p className={`px-2 py-3 text-sm ${style.mutedText}`}>
              {searchQuery ? "No chats match your search." : "Your chats will appear here."}
            </p>
          )}
        </div>
        )}
      </div>
    </aside>
  );
}

export default function ChatBotPage() {
  const style = useStyle();
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get("prompt") || "";
  const textareaRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState(initialPrompt);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConversationHistoryLoading, setIsConversationHistoryLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [failedRequest, setFailedRequest] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [conversationDialog, setConversationDialog] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [isConversationActionLoading, setIsConversationActionLoading] = useState(false);
  const [conversationActionError, setConversationActionError] = useState("");

  const activeConversation = conversations.find((item) => item.id === selectedConversation) || null;
  const dialogConversation = conversationDialog
    ? conversations.find((item) => item.id === conversationDialog.conversationId) || null
    : null;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [draft]);

  useEffect(() => {
    if (!conversationDialog) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !isConversationActionLoading) {
        setConversationDialog(null);
        setConversationActionError("");
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [conversationDialog, isConversationActionLoading]);

  const loadConversations = useCallback(async () => {
    try {
      const response = await api.get("/assistant/conversations");
      const nextConversations = (response.data?.conversations || []).map(normalizeConversation);
      setConversations(nextConversations);
    } catch (error) {
      console.error("Unable to load assistant conversations:", error);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadConversations().finally(() => setIsConversationHistoryLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadConversations]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [...conversations].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return conversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const groupedConversations = useMemo(() => groupConversationsByDate(filteredConversations), [filteredConversations]);

  const saveConversationLocally = (id, title, nextMessages) => {
    setConversations((current) => {
      const existing = current.find((conversation) => conversation.id === id);
      const normalized = {
        id,
        title: existing?.title || title,
        updatedAt: new Date().toISOString(),
        messages: nextMessages,
      };
      return [
        normalized,
        ...current.filter((conversation) => conversation.id !== id && !conversation.id.startsWith("draft-")),
      ];
    });
  };

  const startConversation = () => {
    setSelectedConversation(null);
    setMessages([]);
    setDraft("");
    setErrorMessage("");
    setFailedRequest(null);
    setMenuOpenId(null);
    setIsHistoryOpen(false);
  };

  const chooseConversation = (conversation) => {
    if (isSending) return;
    setSelectedConversation(conversation.id);
    setMessages(conversation.messages);
    setErrorMessage("");
    setFailedRequest(null);
    setMenuOpenId(null);
    setIsHistoryOpen(false);
  };

  const completeRequest = async (request) => {
    setIsSending(true);
    setErrorMessage("");
    setFailedRequest(null);

    try {
      const response = await api.post("/assistant/chat", {
        message: request.message,
        history: request.history,
        title: request.title,
        conversationId: request.conversationId || undefined,
        messages: request.submittedMessages,
      });

      const reply = response.data?.reply;
      if (typeof reply !== "string" || !reply.trim()) {
        throw new Error("The AI service returned an empty reply.");
      }

      const nextMessages = [...request.submittedMessages, { role: "assistant", text: reply.trim() }];
      const finalConversationId = response.data?.conversation?.id || request.conversationId || `local-${Date.now()}`;

      setSelectedConversation(finalConversationId);
      setMessages(nextMessages);
      saveConversationLocally(finalConversationId, response.data?.conversation?.title || request.title, nextMessages);
      setMenuOpenId(null);
      await loadConversations();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message || "Unable to send your message. Please try again.");
      setFailedRequest(request);
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending || failedRequest) return;

    const draftConversationId = selectedConversation || `draft-${Date.now()}`;
    const submittedMessages = [...messages, { role: "user", text }];
    const existingConversation = conversations.find((conversation) => conversation.id === selectedConversation);
    const request = {
      conversationId: selectedConversation,
      title: existingConversation?.title || createConversationTitle(text),
      message: text,
      history: recentHistory(messages),
      submittedMessages,
    };

    setSelectedConversation(draftConversationId);
    setMessages(submittedMessages);
    saveConversationLocally(draftConversationId, request.title, submittedMessages);
    setDraft("");
    setErrorMessage("");
    await completeRequest({ ...request, conversationId: request.conversationId || draftConversationId });
  };

  const closeConversationDialog = () => {
    if (isConversationActionLoading) return;
    setConversationDialog(null);
    setConversationActionError("");
  };

  const handleRename = async (event) => {
    event.preventDefault();
    if (conversationDialog?.type !== "rename") return;

    const conversationId = conversationDialog.conversationId;
    const target = conversations.find((conversation) => conversation.id === conversationId);
    if (!target) return;

    const cleanedTitle = renameDraft.trim();
    if (!cleanedTitle || isConversationActionLoading) return;

    try {
      setIsConversationActionLoading(true);
      setConversationActionError("");
      const response = await api.patch(`/assistant/conversations/${conversationId}`, {
        title: cleanedTitle,
        messages: target.messages,
      });
      const updated = normalizeConversation(response.data?.conversation || { ...target, title: cleanedTitle });
      setConversations((current) => current.map((conversation) => (conversation.id === conversationId ? updated : conversation)));
      if (selectedConversation === conversationId) {
        setMessages(updated.messages);
      }
      setConversationDialog(null);
    } catch (error) {
      setConversationActionError(error.response?.data?.message || "Unable to rename this conversation.");
    } finally {
      setIsConversationActionLoading(false);
    }
    setMenuOpenId(null);
  };

  const handleDelete = async () => {
    if (conversationDialog?.type !== "delete" || isConversationActionLoading) return;

    const conversationId = conversationDialog.conversationId;
    const target = conversations.find((conversation) => conversation.id === conversationId);
    if (!target) return;

    try {
      setIsConversationActionLoading(true);
      setConversationActionError("");
      await api.delete(`/assistant/conversations/${conversationId}`);
      setConversations((current) => current.filter((conversation) => conversation.id !== conversationId));
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      setConversationDialog(null);
    } catch (error) {
      setConversationActionError(error.response?.data?.message || "Unable to delete this conversation.");
    } finally {
      setIsConversationActionLoading(false);
    }
    setMenuOpenId(null);
  };

  const historyPanelProps = {
    style,
    isLoading: isConversationHistoryLoading,
    onClose: () => setIsHistoryOpen(false),
    startConversation,
    isSending,
    searchQuery,
    setSearchQuery,
    groupedConversations,
    selectedConversation,
    chooseConversation,
    menuOpenId,
    setMenuOpenId,
    setRenameDraft,
    setConversationActionError,
    setConversationDialog,
    filteredConversations,
  };

  return (
    <div className={`relative h-[calc(100dvh-2rem)] min-h-[480px] w-full overflow-hidden rounded-md border sm:h-[calc(100dvh-3rem)] lg:h-[calc(100dvh-4rem)] ${style.border} ${style.secondaryBg} ${style.primaryText}`}>
      {isHistoryOpen && (
        <Portal>
          <div className="fixed inset-0 z-[10000] lg:hidden">
            <button type="button" onClick={() => setIsHistoryOpen(false)} aria-label="Close chat history" className="absolute inset-0 bg-black/40" />
            <ConversationHistoryPanel {...historyPanelProps} panelClassName="absolute inset-y-0 left-0 z-10 w-[min(88vw,300px)]" />
          </div>
        </Portal>
      )}
      <div className="grid h-full min-w-0 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ConversationHistoryPanel {...historyPanelProps} panelClassName="hidden lg:relative lg:flex lg:w-auto" />

          <section className={`flex min-h-0 min-w-0 flex-col ${style.primaryBg}`}>
            <div className={`flex min-w-0 items-center gap-2 border-b px-3 py-3  sm:px-5 ${style.border}`}>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                aria-label="Open chat history"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg lg:hidden ${style.hoverBg} ${style.secondaryText}`}
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className={`truncate text-sm font-semibold ${style.primaryText}`}>
                  {activeConversation?.title || "New conversation"}
                </h2>
                <p className={` hidden truncate text-xs sm:block ${style.secondaryText}`}>
                  Your career assistant for resumes, interviews, and job searches.
                </p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 text-[11px] ${style.secondaryText}`}>
                {isSending ? (
                  <>
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" /> Thinking
                  </>
                ) : (
                  "Lumi"
                )}
              </span>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
              {messages.length === 0 && (
                <div className="flex min-h-full flex-col items-center justify-center px-2 py-8 text-center">
                    <img src={LumiLogo} alt="Lumi Logo" className="h-12 w-12 sm:h-24 sm:w-24 rounded-full" />
                  <h3 className={`mt-4 text-xl font-semibold ${style.primaryText}`}>How can Lumi help?</h3>
                  <p className={`mt-2 max-w-md text-sm leading-6 ${style.secondaryText}`}>
                    Ask about resume reviews, interview prep, application tracking, or your next career move.
                  </p>
                  <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-3">
                    {prompts.map(({ icon: Icon, text }) => (
                      <button
                        key={text}
                        type="button"
                        onClick={() => setDraft(text)}
                        className={`flex items-center min-h-14 items-center gap-4 rounded-lg border p-3 text-left text-sm leading-5 transition ${style.border} ${style.primaryText} ${style.hoverBg}`}
                      >
                        <Icon size={16} className={`shrink-0 ${style.primaryText}`}/>
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={`${message.role}-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    

                    <div
                      className={`max-w-[88%] px-4 py-2.5  sm:max-w-[78%] ${message.role === "assistant" ? `${style.grayBg} ${style.primaryText} rounded-t-2xl rounded-br-2xl  ` : "bg-blue-600 text-white rounded-t-2xl rounded-bl-2xl"}`}
                    >
                     

                      <div className="markdown-content text-sm leading-6">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {message.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isSending && (
                <div className={`ml-11 flex items-center gap-2 text-sm ${style.secondaryText}`} role="status">
                  <img src={LumiLogo} alt="" aria-hidden="true" className="h-5 w-5 rounded-full object-cover" />
                  Thinking…
                </div>
              )}

              {errorMessage && (
                <div className="ml-11 flex flex-wrap items-center gap-3" role="alert">
                  <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                  {failedRequest && (
                    <button
                      type="button"
                      onClick={() => void completeRequest(failedRequest)}
                      disabled={isSending}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs disabled:opacity-60 ${style.border} ${style.secondaryText} ${style.hoverBg}`}
                    >
                      <RotateCcw size={13} aria-hidden="true" /> Try again
                    </button>
                  )}
                </div>
              )}

              
            </div>

            <div className={`shrink-0 border-t p-3 sm:px-5 ${style.border}`}>
              <form onSubmit={(event) => void sendMessage(event)} className={`flex items-end gap-2 rounded-xl border p-2 ${style.input}`}>
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(event);
                    }
                  }}
                  disabled={isSending || Boolean(failedRequest)}
                  maxLength={4000}
                  rows={1}
                  placeholder="Ask Lumi..."
                  aria-label="Message Lumi"
                  className="max-h-32 min-h-10 flex-1 items-center  resize-none bg-transparent px-2 py-2 text-sm outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || isSending || Boolean(failedRequest)}
                  aria-label="Send message"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-60 ${style.buttonBlue}`}
                >
                  <ArrowUp size={18} />
                </button>
              </form>
              <p className={`mt-2 text-center text-xs ${style.secondaryText}`}>
                Answers are generated by AI and may not be accurate. Always verify information before acting on it.
              </p>
            </div>
          </section>
      </div>

      {dialogConversation && (
        <Portal>
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4">
          <button
            type="button"
            aria-label="Dismiss conversation dialog"
            onClick={closeConversationDialog}
            disabled={isConversationActionLoading}
            className="absolute inset-0"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="conversation-dialog-title"
            aria-describedby="conversation-dialog-description"
            className={`relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5 shadow-2xl sm:p-6 ${style.secondaryBg} ${style.border}`}
          >
            <header className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="conversation-dialog-title" className={`text-lg font-semibold sm:text-xl ${style.primaryText}`}>
                  {conversationDialog.type === "rename" ? "Rename chat" : "Delete chat?"}
                </h2>
                <p id="conversation-dialog-description" className={`mt-1.5 text-sm leading-5 ${style.secondaryText}`}>
                  {conversationDialog.type === "rename"
                    ? "Choose a short, descriptive name for this conversation."
                    : `“${dialogConversation.title}” will be permanently deleted. This action cannot be undone.`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeConversationDialog}
                disabled={isConversationActionLoading}
                aria-label="Close dialog"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.hoverBg} ${style.secondaryText}`}
              >
                <X size={18} />
              </button>
            </header>

            {conversationActionError && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
                {conversationActionError}
              </p>
            )}

            {conversationDialog.type === "rename" ? (
              <form onSubmit={(event) => void handleRename(event)}>
                <label className="mb-5 block">
                  <span className={`mb-2 block text-sm font-medium ${style.primaryText}`}>Chat name</span>
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    maxLength={60}
                    placeholder="Enter a chat name"
                    className={`w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${style.input}`}
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeConversationDialog}
                    disabled={isConversationActionLoading}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${style.border} ${style.secondaryText} ${style.hoverBg}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!renameDraft.trim() || isConversationActionLoading}
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium ${style.buttonBlue}`}
                  >
                    {isConversationActionLoading ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeConversationDialog}
                  disabled={isConversationActionLoading}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${style.border} ${style.secondaryText} ${style.hoverBg}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={isConversationActionLoading}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isConversationActionLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            )}
          </section>
        </div>
        </Portal>
      )}
    </div>
  );
}
