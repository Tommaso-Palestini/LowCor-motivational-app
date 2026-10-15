export function addReminder(reminders, text) {
  const newReminder = {
    id: crypto.randomUUID(),
    text,
    done: false,
  };
  return [...reminders, newReminder];
}

export function toggleReminder(reminders, reminderId) {
  return reminders.map((reminder) =>
    reminder.id === reminderId ? { ...reminder, done: !reminder.done } : reminder
  );
}

export function deleteReminder(reminders, reminderId) {
  return reminders.filter((reminder) => reminder.id !== reminderId);
}