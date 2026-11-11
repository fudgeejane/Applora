const legacyInterviews = [
  {
    applicationId: "northstar",
    date: "2026-11-14",
    time: "10:30 AM",
    type: "Video call",
  },
  {
    applicationId: "brightline",
    date: "2026-11-17",
    time: "2:00 PM",
    type: "Video call",
  },
];

const activeStatuses = new Set(["Applied", "Screening", "Under Review"]);
const terminalStatuses = new Set(["Rejected", "Withdrawn"]);
const staleStatuses = new Set([...activeStatuses, "Interview", "Offer"]);

// Total excludes archived records; Active counts Applied/Screening/Under Review only.
// Response rate is any non-Applied status over total; offer rate counts Offer and Accepted over total.
// Interview metrics count scheduled interview events, independently of application stage.
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
  const legacyById = new Map(legacyInterviews.map((interview) => [interview.applicationId, interview]));
  return applications.flatMap((application) => {
    const interview = application.interview || legacyById.get(application.id);
    if (!interview?.date) return [];
    return [{ ...interview, applicationId: application.id, company: application.company, role: application.role }];
  });
}

export function getUpcomingInterviewApplicationIds(applications = [], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Set(
    getApplicationInterviews(applications.filter((application) => !application.archived))
      .filter((interview) => {
        const date = localDate(interview.date);
        return date && dayDifference(date, today) >= 0;
      })
      .map((interview) => interview.applicationId),
  );
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
  return [activityDate, application.updatedAt, application.dateApplied]
    .filter(Boolean)
    .sort()
    .at(-1);
}

function getFollowUpDate(application) {
  return application.followUpDate || application.followUpAt || null;
}

export function getDashboardStats(applications = [], now = new Date()) {
  const visibleApplications = applications.filter((application) => !application.archived);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const interviews = getApplicationInterviews(visibleApplications)
    .filter((interview) => {
      const date = localDate(interview.date);
      return date && dayDifference(date, today) >= 0;
    })
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
  let responseCount = 0;
  let activeCount = 0;

  visibleApplications.forEach(({ status }) => {
    if (status !== "Applied") responseCount += 1;
    if (activeStatuses.has(status)) activeCount += 1;

    if (status === "Applied") counts.applied += 1;
    else if (status === "Screening" || status === "Under Review") counts.underReview += 1;
    else if (status === "Interview") counts.interview += 1;
    else if (status === "Offer" || status === "Accepted") counts.offer += 1;
    else if (status === "Rejected") counts.rejected += 1;
    else if (status === "Withdrawn") counts.withdrawn += 1;
  });

  const total = visibleApplications.length;
  const offerCount = counts.offer;
  // Keep the focus order predictable: interview in 7 days, due follow-up, then stale active application.
  let upNext = interviewsThisWeek[0]
    ? { type: "interview", applicationId: interviewsThisWeek[0].applicationId, interview: interviewsThisWeek[0] }
    : null;

  if (!upNext) {
    const dueFollowUp = visibleApplications
      .filter((application) => !terminalStatuses.has(application.status))
      .map((application) => ({ application, date: localDate(getFollowUpDate(application)) }))
      .filter(({ date }) => date && date <= today)
      .sort((left, right) => left.date - right.date)[0];
    if (dueFollowUp) {
      upNext = { type: "follow-up", applicationId: dueFollowUp.application.id, application: dueFollowUp.application };
    }
  }

  if (!upNext) {
    const staleApplication = visibleApplications
      .filter((application) => staleStatuses.has(application.status))
      .map((application) => {
        const updatedDate = localDate(getMostRecentUpdate(application));
        return { application, updatedDate, daysSinceUpdate: updatedDate ? dayDifference(today, updatedDate) : 0 };
      })
      .filter(({ daysSinceUpdate }) => daysSinceUpdate >= 7)
      .sort((left, right) => right.daysSinceUpdate - left.daysSinceUpdate)[0];
    if (staleApplication) {
      upNext = {
        type: "no-response",
        applicationId: staleApplication.application.id,
        application: staleApplication.application,
        daysSinceUpdate: staleApplication.daysSinceUpdate,
      };
    }
  }

  return {
    applications: visibleApplications,
    total,
    active: activeCount,
    interviews: interviews.length,
    interviewsThisWeek: interviewsThisWeek.length,
    offers: offerCount,
    responseRate: total ? Math.round((responseCount / total) * 100) : 0,
    offerRate: total ? Math.round((offerCount / total) * 100) : 0,
    responseCount,
    counts,
    upcomingInterviews: interviews,
    upNext,
  };
}
