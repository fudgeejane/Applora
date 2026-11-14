import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const h = React.createElement;

const InterviewReminderEmail = ({
  candidateName,
  reminderType,
  role,
  company,
  scheduledDate,
  interviewType,
  platform,
  location,
  meetingLink,
}) => {
  const timing = reminderType === "7-day" ? "7 days" : "24 hours";
  return h(
    Html,
    null,
    h(Head),
    h(Preview, null, `Interview for ${company} in ${timing}`),
    h(
      Body,
      {
        style: {
          backgroundColor: "#f4f4f5",
          fontFamily: "Arial, Helvetica, sans-serif",
          margin: 0,
          padding: "40px 16px",
        },
      },
      h(
        Container,
        {
          style: {
            backgroundColor: "#ffffff",
            border: "1px solid #e4e4e7",
            borderRadius: "12px",
            maxWidth: "480px",
            margin: "0 auto",
            padding: "36px",
          },
        },
        h(
          Text,
          { style: { color: "#2563eb", fontSize: "13px", fontWeight: "700", letterSpacing: "1px", margin: "0 0 20px" } },
          "APPLORA",
        ),
        h(
          Heading,
          { style: { color: "#18181b", fontSize: "24px", lineHeight: "1.3", margin: "0 0 14px" } },
          `Your interview is in ${timing}`,
        ),
        h(
          Text,
          { style: { color: "#52525b", fontSize: "15px", lineHeight: "24px" } },
          `Hi ${candidateName || "there"}, thank you for applying to ${company}. This is a reminder about your upcoming interview.`,
        ),
        h(
          Section,
          { style: { backgroundColor: "#f8fafc", borderRadius: "8px", padding: "16px" } },
          h(Text, { style: { color: "#52525b", fontSize: "13px", margin: "0 0 4px" } }, "Company"),
          h(Text, { style: { color: "#18181b", fontSize: "15px", margin: "0 0 12px" } }, h("strong", null, company)),
          h(Text, { style: { color: "#52525b", fontSize: "13px", margin: "0 0 4px" } }, "Position"),
          h(Text, { style: { color: "#18181b", fontSize: "15px", margin: "0 0 12px" } }, role),
          h(Text, { style: { color: "#52525b", fontSize: "13px", margin: "0 0 4px" } }, "Date and time"),
          h(Text, { style: { color: "#18181b", fontSize: "15px", margin: "0 0 12px" } }, `${scheduledDate} Asia/Manila (UTC+8)`),
          h(Text, { style: { color: "#52525b", fontSize: "13px", margin: "0 0 4px" } }, "Interview"),
          h(Text, { style: { color: "#18181b", fontSize: "15px", margin: "0" } }, `${interviewType} · ${platform}`),
          location
            ? h(Text, { style: { color: "#52525b", fontSize: "14px", margin: "10px 0 0" } }, `Location: ${location}`)
            : null,
          meetingLink
            ? h(
              Text,
              { style: { fontSize: "14px", margin: "8px 0 0" } },
              h(Link, { href: meetingLink, style: { color: "#2563eb" } }, "Open meeting link"),
            )
            : null,
        ),
        h(
          Text,
          { style: { color: "#71717a", fontSize: "12px", lineHeight: "20px", margin: "24px 0 0" } },
          platform === "On-site"
            ? "Please plan to arrive a few minutes early and bring any materials you may need."
            : platform === "Phone"
              ? "Please keep your phone nearby and have any materials you need ready."
              : "Please join a few minutes early and have any materials you need ready.",
        ),
      ),
    ),
  );
};

export default InterviewReminderEmail;
