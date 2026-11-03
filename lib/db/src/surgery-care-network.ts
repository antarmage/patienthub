import { z } from "zod/v4";

export const surgeryCareRoles = ["nursing_home", "anesthetist", "pediatrician", "ot_assistant"] as const;
export type SurgeryCareRole = typeof surgeryCareRoles[number];
export const surgeryCareRoleLabels: Record<SurgeryCareRole, string> = {
  nursing_home: "Nursing home / facility",
  anesthetist: "Anaesthetist",
  pediatrician: "Paediatrician",
  ot_assistant: "OT assistant",
};

const memberId = z.number().int().positive().max(2147483647);
export const careNetworkDetailsSchema = z.object({
  role: z.enum(surgeryCareRoles),
  name: z.string().trim().min(1).max(200),
  affiliation: z.string().trim().max(200),
  phone: z.string().trim().max(40).refine((value) => !value || /^[+\d().\s-]+$/.test(value), "Enter a valid contact phone"),
  email: z.union([z.literal(""), z.email().max(254)]),
}).strict();
export const careNetworkUpdateSchema = careNetworkDetailsSchema.extend({ active: z.boolean() });
export const careNetworkMemberSchema = careNetworkUpdateSchema.extend({ id: memberId });
export type CareNetworkDetails = z.infer<typeof careNetworkDetailsSchema>;
export type CareNetworkMember = z.infer<typeof careNetworkMemberSchema>;

export const surgeryAssignmentsSchema = z.object({
  nursing_home: memberId.nullable(),
  anesthetist: memberId.nullable(),
  pediatrician: memberId.nullable(),
  ot_assistant: memberId.nullable(),
}).strict();
export type SurgeryAssignments = z.infer<typeof surgeryAssignmentsSchema>;
export const emptySurgeryAssignments: SurgeryAssignments = {
  nursing_home: null, anesthetist: null, pediatrician: null, ot_assistant: null,
};
export const surgeryTeamSchema = z.object({
  nursing_home: careNetworkMemberSchema.nullable(),
  anesthetist: careNetworkMemberSchema.nullable(),
  pediatrician: careNetworkMemberSchema.nullable(),
  ot_assistant: careNetworkMemberSchema.nullable(),
});
export type SurgeryTeam = z.infer<typeof surgeryTeamSchema>;
