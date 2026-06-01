export function isMastersOrPhd(type: string) {
  return (
    type.includes("MSc Degree-Seeking") ||
    type.includes("MSc Credit-Seeking") ||
    type.includes("PhD Degree-Seeking") ||
    type.includes("PhD Credit-Seeking")
  );
}

export function isCreditSeeking(type: string) {
  return (
    type.includes("MSc Credit-Seeking") || type.includes("PhD Credit-Seeking")
  );
}

export function isCurrentlyEnrolledInDegree(answer: string | undefined | null) {
  return answer?.trim().toLowerCase() === "yes";
}

export function isDegreeSeeking(type: string) {
  return (
    type.includes("MSc Degree-Seeking") || type.includes("PhD Degree-Seeking")
  );
}

export function isTraineeshipApplicant(type: string) {
  return type.includes("Traineeship");
}

export function isStaffMobilityApplicant(type: string) {
  return type.includes("Staff Mobility");
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
