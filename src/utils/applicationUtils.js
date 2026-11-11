export function createApplicationId() {
  return `application-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
