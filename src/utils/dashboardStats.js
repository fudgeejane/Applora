const inProgressStatuses = new Set(["Applied", "Screening", "Under Review", "Interview"]);
const terminalStatuses = new Set(["Rejected", "Withdrawn", "Offer", "Accepted"]);
const staleStatuses = new Set(["Applied", "Screening", "Under Review", "Interview"]);

function localDate(value) {
  if (!value) return null;
  const dateValue = typeof value === "string" ? value.slice(0, 10) : value;
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayDifference(later, earlier) {
  const laterDay = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  const earlierDay = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  return Math.round((laterDay - earlierDay) / 86400000);
}

function getApplicationInterviews(applications) {
  return applications.flatMap((application) => {
    const interview = application.interview;
    if (!interview?.date || (interview.status && interview.status !== "upcoming")) return [];
    return [{
      ...interview,
      applicationId: application.id,
      company: application.company,
      role: application.role,
    }];
  });
}

export function getUpcomingInterviewApplicationIds(applications = [], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Set(
    getApplicationInterviews(applications.filter((application) => !application.archived))
      .filter((interview) => isUpcoming(interview, today, now))
      .map((interview) => interview.applicationId),
  );
}

function isUpcoming(interview, today, now) {
  const date = localDate(interview.date);
  if (!date) return false;
  const difference = dayDifference(date, today);
  if (difference > 0) return true;
  if (difference < 0) return false;
  const time = /^(\d{2}):(\d{2})$/.exec(interview.time || "");
  if (!time) return true;
  const interviewMinutes = Number(time[1]) * 60 + Number(time[2]);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return interviewMinutes >= currentMinutes;
}

function sortByDateAndTime(left, right) {
  return `${left.date} ${left.time || ""}`.localeCompare(`${right.date} ${right.time || ""}`);
}

function getMostRecentUpdate(application) {
  const activityDate = (application.activity || [])
    .map((item) => item.createdAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  return [activityDate, application.updatedAt, application.createdAt, application.dateApplied]
    .filter(Boolean)
    .sort()
    .at(-1);
}

function getRecentActivity(applications, resumes) {
  const activity = [];
  applications.forEach((application) => {
    const entries = Array.isArray(application.activity) ? application.activity : [];
    let latestEventTime = 0;
    entries.forEach((entry, index) => {
      const eventTime = new Date(entry?.createdAt).getTime();
      if (!entry?.createdAt || !entry?.message || Number.isNaN(eventTime)) return;
      latestEventTime = Math.max(latestEventTime, eventTime);
      activity.push({
        id: entry.id || `${application.id}-activity-${index}`,
        message: entry.message,
        createdAt: entry.createdAt,
        href: `/applications/${encodeURIComponent(application.id)}`,
      });
    });
    if (!entries.length && application.createdAt) {
      activity.push({
        id: `${application.id}-created`,
        message: `Application added · ${application.role} at ${application.company}`,
        createdAt: application.createdAt,
        href: `/applications/${encodeURIComponent(application.id)}`,
      });
    } else {
      const updatedAtTime = new Date(application.updatedAt).getTime();
      if (updatedAtTime - latestEventTime > 1000) {
        activity.push({
          id: `${application.id}-updated`,
          message: `Application updated · ${application.role} at ${application.company}`,
          createdAt: application.updatedAt,
          href: `/applications/${encodeURIComponent(application.id)}`,
        });
      }
    }
  });

  resumes.forEach((resume) => {
    const entries = Array.isArray(resume.activity) ? resume.activity : [];
    let latestEventTime = 0;
    entries.forEach((entry, index) => {
      const eventTime = new Date(entry?.createdAt).getTime();
      if (!entry?.createdAt || !entry?.message || Number.isNaN(eventTime)) return;
      latestEventTime = Math.max(latestEventTime, eventTime);
      activity.push({
        id: entry.id || `${resume.id}-activity-${index}`,
        message: entry.message,
        createdAt: entry.createdAt,
        href: `/resume?resumeId=${encodeURIComponent(resume.id)}`,
      });
    });
    if (!entries.length && (resume.uploadedAt || resume.createdAt)) {
      activity.push({
        id: `${resume.id}-uploaded`,
        message: `Resume uploaded · ${resume.name || resume.fileName}`,
        createdAt: resume.uploadedAt || resume.createdAt,
        href: `/resume?resumeId=${encodeURIComponent(resume.id)}`,
      });
    } else {
      const updatedAtTime = new Date(resume.updatedAt).getTime();
      if (updatedAtTime - latestEventTime > 1000) {
        activity.push({
          id: `${resume.id}-updated`,
          message: `Resume details updated · ${resume.name || resume.fileName}`,
          createdAt: resume.updatedAt,
          href: `/resume?resumeId=${encodeURIComponent(resume.id)}`,
        });
      }
    }
  });

  return activity
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 6);
}

export function getDashboardStats(applications = [], now = new Date(), resumes = []) {
  const visibleApplications = applications.filter((application) => !application.archived);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const interviews = getApplicationInterviews(visibleApplications)
    .filter((interview) => isUpcoming(interview, today, now))
    .sort(sortByDateAndTime);
  const interviewsThisWeek = interviews.filter((interview) => {
    const date = localDate(interview.date);
    return date && dayDifference(date, today) <= 7;
  });

  const counts = {
    applied: 0,
    underReview: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
    withdrawn: 0,
  };
  let awaitingResponse = 0;
  let inProgress = 0;

  visibleApplications.forEach(({ status }) => {
    if (status === "Applied") awaitingResponse += 1;
    if (inProgressStatuses.has(status)) inProgress += 1;

    if (status === "Applied") counts.applied += 1;
    else if (status === "Screening" || status === "Under Review") counts.underReview += 1;
    else if (status === "Interview") counts.interview += 1;
    else if (status === "Offer" || status === "Accepted") counts.offer += 1;
    else if (status === "Rejected") counts.rejected += 1;
    else if (status === "Withdrawn") counts.withdrawn += 1;
  });

  const reminders = interviewsThisWeek.map((interview) => ({
    type: "interview",
    applicationId: interview.applicationId,
    interview,
  }));
  visibleApplications.forEach((application) => {
    const interview = application.interview;
    const interviewDate = localDate(interview?.date);
    if (
      interview
      && interview.status === "completed"
      && interviewDate
      && dayDifference(today, interviewDate) >= 0
      && (!interview.thankYouSent || ["Pending", "No response"].includes(interview.outcome))
    ) {
      reminders.push({ type: "interview-follow-up", applicationId: application.id, application, interview });
    }

    if (!staleStatuses.has(application.status) || terminalStatuses.has(application.status)) return;
    const updatedDate = localDate(getMostRecentUpdate(application));
    const daysSinceUpdate = updatedDate ? dayDifference(today, updatedDate) : 0;
    if (daysSinceUpdate >= 7) {
      reminders.push({ type: "no-response", applicationId: application.id, application, daysSinceUpdate });
    }
  });

  const nextInterview = interviews[0];
  const upNext = nextInterview
    ? { type: "interview", applicationId: nextInterview.applicationId, interview: nextInterview }
    : reminders[0] || null;

  return {
    applications: visibleApplications,
    total: visibleApplications.length,
    resumeCount: resumes.length,
    inProgress,
    awaitingResponse,
    interviews: interviews.length,
    interviewsThisWeek: interviewsThisWeek.length,
    offers: counts.offer,
    rejected: counts.rejected,
    counts,
    upcomingInterviews: interviews,
    reminders: reminders.slice(0, 5),
    recentActivity: getRecentActivity(visibleApplications, resumes),
    upNext,
  };
}
