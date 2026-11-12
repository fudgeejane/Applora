import mongoose from "mongoose";
import Application from "../models/Application.js";
import Resume from "../models/Resume.js";

const editableFields = [
  "role", "company", "location", "workSetup", "salaryMin", "salaryMax",
  "salaryCurrency", "salaryPeriod", "source", "url", "status", "dateApplied",
  "resumeUsed", "resumeId", "notes", "employmentType", "contactName",
  "contactEmail", "contactLinkedIn", "interview", "archived",
];

function createActivity(type, message) {
  return {
    id: new mongoose.Types.ObjectId().toString(),
    type,
    message,
    createdAt: new Date().toISOString(),
  };
}

function isValidInterviewDateTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time || "")) {
    return false;
  }
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date;
}

function serialize(application) {
  const value = application.toObject ? application.toObject() : application;
  const fields = { ...value };
  delete fields._id;
  delete fields.__v;
  delete fields.userId;
  return { ...fields, id: String(value._id) };
}

function payload(body) {
  const result = {};
  for (const key of editableFields) {
    if (Object.hasOwn(body || {}, key)) result[key] = body[key];
  }
  if (result.status === "Under Review") result.status = "Screening";
  if (result.status === "Accepted") result.status = "Offer";
  return result;
}

async function validateResumeReference(data, userId, res) {
  if (!Object.hasOwn(data, "resumeId") || data.resumeId === "") return true;
  if (typeof data.resumeId !== "string" || !mongoose.isValidObjectId(data.resumeId)) {
    res.status(400).json({ message: "Choose a valid saved resume." });
    return false;
  }
  const resumeExists = await Resume.exists({ _id: data.resumeId, userId });
  if (!resumeExists) {
    res.status(400).json({ message: "The selected resume is not available in your account." });
    return false;
  }
  return true;
}

export async function listApplications(req, res, next) {
  try {
    const applications = await Application.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json({ applications: applications.map(serialize) });
  } catch (error) { next(error); }
}

export async function createApplication(req, res, next) {
  try {
    const data = payload(req.body);
    if (!data.role?.trim() || !data.company?.trim()) {
      return res.status(400).json({ message: "Position and company are required." });
    }
    if (!(await validateResumeReference(data, req.user.id, res))) return;
    const application = await Application.create({
      ...data,
      userId: req.user.id,
      activity: [createActivity("application_created", "Application added")],
    });
    return res.status(201).json({ application: serialize(application) });
  } catch (error) { return next(error); }
}

export async function updateApplication(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Application not found." });
    const data = payload(req.body);
    if ((Object.hasOwn(data, "role") && !data.role?.trim()) || (Object.hasOwn(data, "company") && !data.company?.trim())) {
      return res.status(400).json({ message: "Position and company cannot be empty." });
    }
    if (!(await validateResumeReference(data, req.user.id, res))) return;
    const previous = await Application.findOne({ _id: req.params.id, userId: req.user.id });
    if (!previous) return res.status(404).json({ message: "Application not found." });

    const activity = [];
    if (Object.hasOwn(data, "status") && data.status !== previous.status) {
      activity.push(createActivity("application_status_changed", `Status changed from ${previous.status} to ${data.status}`));
    }
    if (Object.hasOwn(data, "interview") && data.interview === null && previous.interview) {
      activity.push(createActivity("interview_removed", "Interview removed"));
    }
    if (!activity.length) activity.push(createActivity("application_updated", "Application details updated"));

    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: data, $push: { activity: { $each: activity } } },
      { returnDocument: "after", runValidators: true },
    );
    if (!application) return res.status(404).json({ message: "Application not found." });
    return res.json({ application: serialize(application) });
  } catch (error) { return next(error); }
}

export async function deleteApplication(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Application not found." });
    const application = await Application.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!application) return res.status(404).json({ message: "Application not found." });
    return res.status(204).end();
  } catch (error) { return next(error); }
}

export async function scheduleInterview(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Application not found." });
    const {
      date, time, type, format = "", interviewer = "", interviewerEmail = "",
      interviewerPhone = "", meetingLink = "", location = "", notes = "",
      questions = "", checklist = [], outcome = "Pending", status = "upcoming",
      thankYouSent = false, reminder = false, reminderLeadTime = "1 hour before",
    } = req.body || {};
    if (!isValidInterviewDateTime(date, time)) {
      return res.status(400).json({ message: "A valid interview date and time are required." });
    }
    if (meetingLink && !/^https?:\/\//i.test(meetingLink)) {
      return res.status(400).json({ message: "Meeting link must begin with http:// or https://." });
    }
    if (interviewerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(interviewerEmail)) {
      return res.status(400).json({ message: "Enter a valid interviewer email address." });
    }
    if (!Array.isArray(checklist) || checklist.length > 50 || checklist.some((item) => typeof item?.text !== "string")) {
      return res.status(400).json({ message: "Interview checklist is invalid." });
    }
    if (!["Pending", "Passed", "Rejected", "Offer", "No response"].includes(outcome)) {
      return res.status(400).json({ message: "Interview outcome is invalid." });
    }
    if (!["upcoming", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Interview status is invalid." });
    }
    if (!["15 minutes before", "1 hour before", "1 day before"].includes(reminderLeadTime)) {
      return res.status(400).json({ message: "Interview reminder timing is invalid." });
    }
    const previous = await Application.findOne({ _id: req.params.id, userId: req.user.id });
    if (!previous) return res.status(404).json({ message: "Application not found." });
    const updatedStatus = outcome === "Rejected" ? "Rejected"
      : outcome === "Offer" ? "Offer"
        : ["Rejected", "Offer"].includes(previous.status) ? previous.status : "Interview";
    const interviewActivity = previous.interview
      ? createActivity("interview_updated", "Interview details updated")
      : createActivity("interview_scheduled", `Interview scheduled for ${date} at ${time}`);
    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        $set: { interview: {
        date, time, type: type || "Phone", format, interviewer, interviewerEmail,
        interviewerPhone, meetingLink, location, notes, questions, checklist,
        outcome, status, thankYouSent: Boolean(thankYouSent), reminder: Boolean(reminder), reminderLeadTime,
        }, status: updatedStatus },
        $push: { activity: interviewActivity },
      },
      { returnDocument: "after", runValidators: true },
    );
    if (!application) return res.status(404).json({ message: "Application not found." });
    return res.json({ application: serialize(application) });
  } catch (error) { return next(error); }
}
