import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/User.js";
import { generateOTP, hashOTP } from "../utils/generateOTP.js";
import { sendVerificationEmail } from "../services/emailServices.js";

// REGISTER
export const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters and contain an uppercase letter, lowercase letter, and number.",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const verificationCode = generateOTP();
    const hashedCode = hashOTP(verificationCode);

    const user = new User({
      email: normalizedEmail,
      password,
      isEmailVerified: false,
      verificationCode: hashedCode,
      verificationCodeExpiresAt: new Date(
        Date.now() + 2 * 60 * 1000
      ),
      lastVerificationCodeSentAt: new Date(),
      verificationAttempts: 0,
    });

    await user.save();

    try {
      await sendVerificationEmail(
        normalizedEmail,
        verificationCode
      );
    } catch (emailError) {
      await User.deleteOne({ _id: user._id });

      console.error("Verification email error:", emailError);

      return res.status(500).json({
        success: false,
        message: "Unable to send verification email. Please try again.",
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email for the verification code.",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during registration.",
    });
  }
};

// VERIFY EMAIL
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required.",
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit verification code.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select(
      "+verificationCode +verificationCodeExpiresAt +verificationAttempts"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found. Please register first.",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "This email has already been verified.",
      });
    }

    if (!user.verificationCode || !user.verificationCodeExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "No active verification code. Please request a new one.",
      });
    }

    if (Date.now() > user.verificationCodeExpiresAt.getTime()) {
      user.verificationCode = null;
      user.verificationCodeExpiresAt = null;
      user.verificationAttempts = 0;

      await user.save();

      return res.status(400).json({
        success: false,
        message: "Verification code expired. Please request a new one.",
      });
    }

    if (user.verificationAttempts >= 5) {
      user.verificationCode = null;
      user.verificationCodeExpiresAt = null;

      await user.save();

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }

    const submittedHash = Buffer.from(hashOTP(code), "hex");
    const storedHash = Buffer.from(user.verificationCode, "hex");

    const isCodeValid =
      submittedHash.length === storedHash.length &&
      crypto.timingSafeEqual(submittedHash, storedHash);

    if (!isCodeValid) {
      user.verificationAttempts += 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "Incorrect verification code.",
        attemptsRemaining: 5 - user.verificationAttempts,
      });
    }

    user.isEmailVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiresAt = null;
    user.lastVerificationCodeSentAt = null;
    user.verificationAttempts = 0;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now sign in.",
      email: user.email,
    });
  } catch (error) {
    console.error("Email verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during email verification.",
    });
  }
};


// RESEND VERIFICATION CODE
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select(
      "+verificationCode +verificationCodeExpiresAt +lastVerificationCodeSentAt +verificationAttempts"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found. Please register first.",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "This email has already been verified.",
      });
    }

    const now = Date.now();

    // Check if the current verification code is still valid
    if (
      user.verificationCode &&
      user.verificationCodeExpiresAt &&
      user.verificationCodeExpiresAt.getTime() > now
    ) {
      const remainingSeconds = Math.ceil(
        (user.verificationCodeExpiresAt.getTime() - now) / 1000
      );

      return res.status(400).json({
        success: false,
        message: "Your current verification code is still valid.",
        expiresInSeconds: remainingSeconds,
      });
    }

    // Enforce 5-minute cooldown from the previous email
    if (user.lastVerificationCodeSentAt) {
      const nextAllowedTime =
        user.lastVerificationCodeSentAt.getTime() + 5 * 60 * 1000;

      if (now < nextAllowedTime) {
        const retryAfterSeconds = Math.ceil(
          (nextAllowedTime - now) / 1000
        );

        return res.status(429).json({
          success: false,
          message: "Please wait before requesting another code.",
          retryAfterSeconds,
        });
      }
    }

    // Generate a new verification code
    const verificationCode = generateOTP();

    const previousSentAt = user.lastVerificationCodeSentAt;

    user.verificationCode = hashOTP(verificationCode);
    user.verificationCodeExpiresAt = new Date(
      now + 2 * 60 * 1000
    );
    user.lastVerificationCodeSentAt = new Date(now);
    user.verificationAttempts = 0;

    await user.save();

    try {
      await sendVerificationEmail(
        normalizedEmail,
        verificationCode
      );
    } catch (emailError) {
      user.verificationCode = null;
      user.verificationCodeExpiresAt = null;
      user.lastVerificationCodeSentAt = previousSentAt;

      await user.save();

      console.error("Resend verification email error:", emailError);

      return res.status(500).json({
        success: false,
        message: "Unable to send verification email. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "A new verification code has been sent to your email.",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("Resend verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while resending the verification code.",
    });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Explicitly include the password because the User model hides it by default
    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before signing in.",
        requiresVerification: true,
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during login.",
    });
  }
};

// LOGOUT
export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

// GET CURRENT USER
export const getMe = (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      isEmailVerified: req.user.isEmailVerified,
      profileCompleted: req.user.profileCompleted,
    },
  });
};


// COMPLETE USER PROFILE
export const completeProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required.",
      });
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      return res.status(400).json({
        success: false,
        message: "First name and last name cannot be empty.",
      });
    }

    if (trimmedFirstName.length > 50 || trimmedLastName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Names cannot exceed 50 characters.",
      });
    }

    const user = req.user;

    if (user.profileCompleted) {
      return res.status(400).json({
        success: false,
        message: "Your profile is already completed.",
      });
    }

    user.firstName = trimmedFirstName;
    user.lastName = trimmedLastName;
    user.profileCompleted = true;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile completed successfully.",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (error) {
    console.error("Complete profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while completing your profile.",
    });
  }
};
    