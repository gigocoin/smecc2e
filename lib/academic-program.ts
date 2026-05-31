/** Academic program (mobility offering at a host institution). */
export type ProgramRecord = {
  id: string;
  universityId: string;
  universityName: string;
  country: string;
  type: ProgramTypeLabel;
  name: string;
  thematicArea: string;
  accreditationDetails: string;
  isActive: boolean;
};

export const PROGRAM_TYPES = ["Master", "Doctorate"] as const;

export type ProgramTypeLabel = (typeof PROGRAM_TYPES)[number];

export type CreateProgramInput = {
  universityId: string;
  country: string;
  type: ProgramTypeLabel;
  name: string;
  thematicArea: string;
  accreditationDetails: string;
};

export function programTypeToPrisma(type: ProgramTypeLabel): "MASTER" | "DOCTORATE" {
  return type === "Doctorate" ? "DOCTORATE" : "MASTER";
}

export function programTypeFromPrisma(type: "MASTER" | "DOCTORATE"): ProgramTypeLabel {
  return type === "DOCTORATE" ? "Doctorate" : "Master";
}
