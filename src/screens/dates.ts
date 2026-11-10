// Age from a saved date of birth (YYYY-MM-DD), used by the plan.

export function ageFrom(isoBirthDate: string, today = new Date()): number {
  const [y, m, d] = isoBirthDate.split('-').map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}
