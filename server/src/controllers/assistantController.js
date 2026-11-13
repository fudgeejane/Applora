import mongoose from "mongoose";
import ChatConversation from "../models/ChatConversation.js";
import { GeminiServiceError, geminiService } from "../services/geminiService.js";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_ITEM_LENGTH = 4000;
const MAX_TOTAL_HISTORY_LENGTH = 10000;

function sanitizeMessageText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function createConversationTitle(text) {
  const words = sanitizeMessageText(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
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

function serializeConversation(document) {
  const value = document.toObject ? document.toObject() : document;
  return {
    id: String(value._id),
    title: value.title,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    messages: (value.messages || []).map((message) => ({
      id: `${message.role}-${message.createdAt || value.updatedAt}`,
      role: message.role,
      text: message.text,
      createdAt: message.createdAt,
    })),
  };
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  const normalized = [];
  for (const item of messages) {
    if (!item || typeof item !== "object") continue;

    const text = sanitizeMessageText(item.text);
    const role = item.role === "user" || item.role === "assistant" ? item.role : null;
    if (!role || !text) continue;

    normalized.push({
      role,
      text,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    });
  }

  return normalized; 
}

export function validateChatRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Enter a message to continue." };
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    return { error: "Enter a message to continue." };
  }
  const message = body.message.trim();
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { error: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.` };
  }

  const history = body.history ?? [];
  if (!Array.isArray(history) || history.length > MAX_HISTORY_MESSAGES) {
    return { error: "Conversation history is invalid. Start a new conversation and try again." };
  }

  let totalHistoryLength = 0;
  const normalizedHistory = [];
  for (const item of history) {
    if (
      !item
      || typeof item !== "object"
      || !["user", "assistant"].includes(item.role)
      || typeof item.text !== "string"
      || !item.text.trim()
      || item.text.trim().length > MAX_HISTORY_ITEM_LENGTH
    ) {
      return { error: "Conversation history is invalid. Start a new conversation and try again." };
    }
    const text = item.text.trim();
    totalHistoryLength += text.length;
    if (totalHistoryLength > MAX_TOTAL_HISTORY_LENGTH) {
      return { error: "Conversation history is too long. Start a new conversation and try again." };
    }
    normalizedHistory.push({ role: item.role, text });
  }

  return { value: { message, history: normalizedHistory } };
}

export async function listConversations(req, res, next) {
  try {
    const conversations = await ChatConversation.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean();
    return res.json({ conversations: conversations.map(serializeConversation) });
  } catch (error) {
    return next(error);
  }
}

export async function createConversation(req, res, next) {
  try {
    const title = sanitizeMessageText(req.body?.title) || createConversationTitle(req.body?.messages?.[0]?.text || "");
    const messages = normalizeMessages(req.body?.messages);
    const conversation = await ChatConversation.create({
      userId: req.user.id,
      title,
      messages,
    });

    return res.status(201).json({ conversation: serializeConversation(conversation) });
  } catch (error) {
    return next(error);
  }
}

export async function updateConversation(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const existing = await ChatConversation.findOne({ _id: req.params.id, userId: req.user.id });
    if (!existing) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const nextTitle = sanitizeMessageText(req.body?.title) || existing.title;
    const nextMessages = normalizeMessages(req.body?.messages);
    const update = { title: nextTitle };
    if (nextMessages.length) {
      update.messages = nextMessages;
    }

    const updated = await ChatConversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      update,
      { new: true, runValidators: true }
    );

    return res.json({ conversation: serializeConversation(updated) });
  } catch (error) {
    return next(error);
  }
}

export async function deleteConversation(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const deleted = await ChatConversation.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!deleted) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

export async function chatAssistant(req, res, next) {
  const parsed = validateChatRequest(req.body);
  if (parsed.error) return res.status(400).json({ message: parsed.error });

  try {
    const reply = await geminiService.chat(parsed.value);
    const trimmedReply = reply.trim();
    const incomingMessages = normalizeMessages(req.body.messages);

    const conversationTitle = sanitizeMessageText(req.body.title) || createConversationTitle(req.body.message);
    const userMessage = { role: "user", text: parsed.value.message, createdAt: new Date() };
    const assistantMessage = { role: "assistant", text: trimmedReply, createdAt: new Date() };
    const finalMessages = incomingMessages.length ? [...incomingMessages, assistantMessage] : [userMessage, assistantMessage];

    let conversation;
    if (req.body.conversationId && mongoose.isValidObjectId(req.body.conversationId)) {
      conversation = await ChatConversation.findOneAndUpdate(
        { _id: req.body.conversationId, userId: req.user.id },
        { $set: { messages: finalMessages } },
        { new: true, upsert: false, runValidators: true }
      );
    }

    if (!conversation) {
      conversation = await ChatConversation.create({
        userId: req.user.id,
        title: conversationTitle,
        messages: finalMessages,
      });
    }

    return res.json({ reply: trimmedReply, conversation: serializeConversation(conversation) });
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      console.error("Gemini chat request failed:", error.statusCode, error.diagnosticCode);
      return res.status(error.statusCode).json({ message: error.publicMessage });
    }
    return next(error);
  }
}
