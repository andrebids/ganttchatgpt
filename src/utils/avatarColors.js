// Avatar color utilities
const DEFAULT_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#84cc16"];

export function getAvatarColor(user) {
  // If user has a specific color, use it
  if (user?.color) {
    return user.color;
  }
  
  // Otherwise, generate a deterministic color from user id/name
  const seed = String(user?.id ?? user?.name ?? "");
  const hash = seed.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
}
