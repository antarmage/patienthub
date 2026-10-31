export interface ReceptionLabTask {
    id: number;
    test: string;
    due: string;
    status: string | null;
    patient: string;
}

export interface ReceptionTask extends ReceptionLabTask {
    type: "lab" | "usg";
    title: string;
    urgency: "High" | "Medium";
}

export function pendingReceptionTasks(tasks: ReceptionLabTask[]): ReceptionTask[] {
    return tasks
        .filter((task) => task.status === "Pending" || task.status === "Delayed")
        .map((task) => ({
            ...task,
            type: /usg|scan/i.test(task.test) ? "usg" : "lab",
            title: task.status === "Delayed" ? `Urgent: ${task.test}` : `Book ${task.test}`,
            urgency: task.status === "Delayed" || task.due === "Today" ? "High" : "Medium",
        }));
}
