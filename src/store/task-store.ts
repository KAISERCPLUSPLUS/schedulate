import { create } from "zustand";

import { type Task } from "../types/index";

interface TaskStore {
    tasks: Task[];
    removeAllTasks: () => void;
    addTask: (task: Task) => void;
}

export const useTaskStore = create<TaskStore>()((set) => ({
    tasks: [],
    removeAllTasks: () => set(() => ({ tasks: [] })),
    addTask: (task: Task) => set((state) => ({ tasks: [...state.tasks, task] })),
}));
