
import nodemailer from "nodemailer";
import React from "react";
import { render } from "@react-email/render";
import { fileURLToPath } from "node:url";
import process from "node:process";

import VerificationEmail from "../emails/VerificationEmail.js";
import PasswordResetEmail from "../emails/PasswordResetEmail.js";

const logoPath = fileURLToPath(
  new URL("../../../src/assets/Logo.png", import.meta.url)
);

export const sendVerificationEmail = async (email, code) => {
  // Validate environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "EMAIL_USER or EMAIL_PASS is missing from the environment variables."
    );
  }

  // Create transporter only when sending an email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Render React Email template
  const emailHtml = await render(
    React.createElement(VerificationEmail, { code })
  );

  // Send email
  const result = await transporter.sendMail({
    from: `"Applora" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify your Applora account",
    html: emailHtml,
    attachments: [
      {
        filename: "Logo.png",
        path: logoPath,
        cid: "applora-logo",
      },
    ],
  });

  console.log("Verification email sent:", result.messageId);

  return result;
};

export const sendPasswordResetEmail = async (email, resetUrl) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "EMAIL_USER or EMAIL_PASS is missing from the environment variables."
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  const emailHtml = await render(
    React.createElement(PasswordResetEmail, { resetUrl })
  );

  return transporter.sendMail({
    from: `"Applora" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset your Applora password",
    html: emailHtml,
    attachments: [
      {
        filename: "Logo.png",
        path: logoPath,
        cid: "applora-logo",
      },
    ],
  });
};

export const sendSupportEmail = async ({ name, email, message }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "EMAIL_USER or EMAIL_PASS is missing from the environment variables."
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter.sendMail({
    from: { name, address: email },
    envelope: {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
    },
    to: process.env.EMAIL_USER,
    replyTo: email,
    subject: "New Help Center message",
    text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
  });
};
