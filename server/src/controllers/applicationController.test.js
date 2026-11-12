import test from "node:test";
import assert from "node:assert/strict";
import Application from "../models/Application.js";
import Resume from "../models/Resume.js";
import { createApplication, scheduleInterview, updateApplication } from "./applicationController.js";

const userId = "64b000000000000000000001";
const resumeId = "64b000000000000000000002";

function response() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("application creation rejects a resume that is not owned by the user", async () => {
  const originalExists = Resume.exists;
  const originalCreate = Application.create;
  let created = false;
  Resume.exists = async () => null;
  Application.create = async () => { created = true; };
  try {
    const res = response();
    await createApplication({
      body: { role: "Designer", company: "Example", resumeId },
      user: { id: userId },
    }, res, (error) => { throw error; });

    assert.equal(res.statusCode, 400);
    assert.equal(created, false);
  } finally {
    Resume.exists = originalExists;
    Application.create = originalCreate;
  }
});

test("application updates reject a resume that is not owned by the user", async () => {
  const originalExists = Resume.exists;
  const originalFindOneAndUpdate = Application.findOneAndUpdate;
  let updated = false;
  Resume.exists = async () => null;
  Application.findOneAndUpdate = async () => { updated = true; };
  try {
    const res = response();
    await updateApplication({
      params: { id: resumeId },
      body: { resumeId },
      user: { id: userId },
    }, res, (error) => { throw error; });

    assert.equal(res.statusCode, 400);
    assert.equal(updated, false);
  } finally {
    Resume.exists = originalExists;
    Application.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("application status updates append a persisted status-change activity", async () => {
  const originalFindOne = Application.findOne;
  const originalFindOneAndUpdate = Application.findOneAndUpdate;
  let update;
  Application.findOne = async () => ({ status: "Applied", interview: null });
  Application.findOneAndUpdate = async (_filter, updateDocument) => {
    update = updateDocument;
    return {
      _id: resumeId,
      status: "Screening",
      toObject() {
        return { _id: this._id, status: this.status, activity: updateDocument.$push.activity?.$each || [] };
      },
    };
  };
  try {
    const res = response();
    await updateApplication({
      params: { id: resumeId },
      body: { status: "Screening", activity: [{ message: "untrusted client event" }] },
      user: { id: userId },
    }, res, (error) => { throw error; });

    assert.equal(update.$set.status, "Screening");
    assert.equal(update.$set.activity, undefined);
    assert.match(update.$push.activity.$each[0].message, /Applied to Screening/);
    assert.equal(res.body.application.status, "Screening");
  } finally {
    Application.findOne = originalFindOne;
    Application.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("interview scheduling persists interview data and a related activity event", async () => {
  const originalFindOne = Application.findOne;
  const originalFindOneAndUpdate = Application.findOneAndUpdate;
  let update;
  Application.findOne = async () => ({ status: "Applied", interview: null });
  Application.findOneAndUpdate = async (_filter, updateDocument) => {
    update = updateDocument;
    return {
      _id: resumeId,
      status: updateDocument.$set.status,
      interview: updateDocument.$set.interview,
      toObject() {
        return { _id: this._id, status: this.status, interview: this.interview, activity: [updateDocument.$push.activity] };
      },
    };
  };
  try {
    const res = response();
    await scheduleInterview({
      params: { id: resumeId },
      body: {
        date: "2026-11-14",
        time: "10:30",
        type: "Technical",
        format: "Video",
        reminder: true,
        reminderLeadTime: "15 minutes before",
      },
      user: { id: userId },
    }, res, (error) => { throw error; });

    assert.equal(update.$set.status, "Interview");
    assert.equal(update.$set.interview.date, "2026-11-14");
    assert.equal(update.$set.interview.reminderLeadTime, "15 minutes before");
    assert.equal(update.$push.activity.type, "interview_scheduled");
    assert.equal(res.body.application.interview.date, "2026-11-14");
  } finally {
    Application.findOne = originalFindOne;
    Application.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
