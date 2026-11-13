import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

const h = React.createElement;

const PasswordResetEmail = ({ resetUrl }) =>
  h(
    Html,
    null,
    h(Head),
    h(Preview, null, "Reset your Applora password"),
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
            padding: "40px",
          },
        },
        h(
          Heading,
          {
            style: {
              color: "#18181b",
              fontSize: "26px",
              lineHeight: "1.3",
              margin: "0 0 14px",
            },
          },
          "Reset your password"
        ),
        h(
          Text,
          {
            style: {
              color: "#52525b",
              fontSize: "15px",
              lineHeight: "24px",
            },
          },
          "Use the secure link below to choose a new password. This link expires in 15 minutes and can only be used once."
        ),
        h(
          Link,
          {
            href: resetUrl,
            style: {
              backgroundColor: "#2563eb",
              borderRadius: "8px",
              color: "#ffffff",
              display: "inline-block",
              fontSize: "15px",
              fontWeight: "600",
              margin: "12px 0",
              padding: "12px 18px",
              textDecoration: "none",
            },
          },
          "Choose a new password"
        ),
        h(
          Text,
          {
            style: {
              color: "#71717a",
              fontSize: "12px",
              lineHeight: "20px",
              wordBreak: "break-all",
            },
          },
          "If the button does not work, copy this link into your browser: ",
          resetUrl
        ),
        h(
          Text,
          {
            style: {
              color: "#71717a",
              fontSize: "12px",
              lineHeight: "20px",
            },
          },
          "If you did not request a password reset, you can ignore this email."
        )
      )
    )
  );

export default PasswordResetEmail;
