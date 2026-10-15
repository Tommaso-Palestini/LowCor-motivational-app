import { getWeekRange, toDateString } from "./dates";

export function calculateProgress(activity, blocks, today = new Date()) {
  const todayString = toDateString(today);
  const { start, end } = getWeekRange(today);

  const done = blocks.filter((block) => {
    if (block.activityId !== activity.id || !block.done) {
      return false;
    }
    if (activity.goal.period === "day") {
      return block.date === todayString;
    }
    return block.date >= start && block.date <= end;
  }).length;

  return {
    done,
    target: activity.goal.amount,
    completed: done >= activity.goal.amount,
  };
}
