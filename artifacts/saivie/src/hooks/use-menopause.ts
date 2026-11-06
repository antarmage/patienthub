import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { menopauseEnrollmentSchema, menopauseSubmissionSchema, menopauseStateSchema, type MenopauseEnrollment, type MenopauseSubmission } from "../../../../lib/db/src/menopause";

export function useMenopause(patientId: number, audience: "doctor" | "patient") {
  const queryClient = useQueryClient();
  const url = `/api/patients/${patientId}/menopause`;
  const queryKey = [url, audience];
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => menopauseStateSchema.parse(await receptionRequest(url, { signal })),
    enabled: Number.isSafeInteger(patientId) && patientId > 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async (input: { enrollment: MenopauseEnrollment } | { submission: MenopauseSubmission }) => {
      const enrollment = "enrollment" in input;
      const body = enrollment ? menopauseEnrollmentSchema.parse(input.enrollment) : menopauseSubmissionSchema.parse(input.submission);
      await receptionRequest(`${url}/${enrollment ? "enrollment" : "entries"}`, {
        method: enrollment ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: [url] }); },
  });
  return { query, mutation };
}
