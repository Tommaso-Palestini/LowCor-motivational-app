export function addActivity(activities, { name, type, amount, period }) {
  const newActivity = {
    id: crypto.randomUUID(),
    name,
    type,
    status: "active",
    goal: { amount, period },
    resumeNote: "",
  };
  return [...activities, newActivity];
}

export function setFocus(activities, activityId) {
  return activities.map((activity) => {
    if (activity.id === activityId) {
      return { ...activity, status: "focus" };
    }
    if (activity.status === "focus") {
      return { ...activity, status: "active" };
    }
    return activity;
  });
}

export function parkActivity(activities, activityId, resumeNote) {
  return activities.map((activity) =>
    activity.id === activityId
      ? { ...activity, status: "parked", resumeNote }
      : activity
  );
}

export function resumeActivity(activities, activityId) {
  return activities.map((activity) =>
    activity.id === activityId ? { ...activity, status: "active" } : activity
  );
}