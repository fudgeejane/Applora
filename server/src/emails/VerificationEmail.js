import React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Hr,
  Preview,
  Img,
} from "@react-email/components";

const h = React.createElement;

const VerificationEmail = ({ code }) =>
  h(
    Html,
    null,
    h(Head),
    h(Preview, null, "Your Applora verification code: ", code),
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
          Section,
          {
            style: {
              marginBottom: "36px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            },
          },
          h(Img, {
            src: "cid:applora-logo",
            alt: "Applora",
            width: "36",
            height: "36",
            style: { display: "block" },
          }),
        ),
        h(
          Heading,
          {
            style: {
              color: "#18181b",
              fontSize: "26px",
              fontWeight: "700",
              letterSpacing: "-0.8px",
              lineHeight: "1.3",
              margin: "0 0 14px",
            },
          },
          "Verify your email address"
        ),
        h(
          Text,
          {
            style: {
              color: "#52525b",
              fontSize: "15px",
              lineHeight: "24px",
              margin: "0 0 28px",
            },
          },
          "Welcome to Applora! We're excited to have you on board. Enter the verification code below to verify your email address and get started."
        ),
        h(
          Section,
          {
            style: {
              backgroundColor: "#f4f7ff",
              border: "1px solid #dbeafe",
              borderRadius: "10px",
              padding: "28px 16px",
              textAlign: "center",
              marginBottom: "24px",
            },
          },
          h(
            Text,
            {
              style: {
                color: "#64748b",
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "2px",
                margin: "0 0 12px",
                textTransform: "uppercase",
              },
            },
            "Your verification code"
          ),
          h(
            Heading,
            {
              style: {
                color: "#2563eb",
                fontSize: "36px",
                fontWeight: "700",
                letterSpacing: "10px",
                lineHeight: "1.2",
                margin: 0,
              },
            },
            code
          )
        ),
        h(
          Text,
          {
            style: {
              color: "#52525b",
              fontSize: "13px",
              lineHeight: "21px",
              margin: "0 0 28px",
              textAlign: "center",
            },
          },
          "This code will expire in ",
          h("strong", { style: { color: "#18181b" } }, "2 minutes."),
          " Please do not share this code with anyone."
        ),
        h(Hr, { style: { borderColor: "#e4e4e7", margin: "0 0 24px" } }),
        h(
          Text,
          {
            style: {
              color: "#71717a",
              fontSize: "12px",
              lineHeight: "20px",
              margin: "0 0 8px",
            },
          },
          "If you didn't create an Applora account, you can safely ignore this email. No further action is required."
        ),
        h(
          Text,
          {
            style: {
              color: "#a1a1aa",
              fontSize: "11px",
              lineHeight: "18px",
              margin: "20px 0 0",
              textAlign: "center",
            },
          },
          "© ",
          new Date().getFullYear(),
          " Applora. All rights reserved."
        )
      )
    )
  );

export default VerificationEmail;
