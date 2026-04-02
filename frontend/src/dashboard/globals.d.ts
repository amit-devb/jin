export {};

declare global {
  interface Window {
    openApi(path: string): Promise<void>;
    incidentAction(id: number, action: string, snoozeMinutes?: number): Promise<void>;
    schedulerAction(jobId: string, action: string): Promise<void>;
    confirmIncident(id: number, action: string, minutes?: number): void;
    confirmDrawerIncident(id: number, action: string, minutes?: number): void;
    confirmScheduler(jobId: string, action: string): void;
    confirmError(id: number, action: string): void;
    changePage(kind: string, delta: number): void;
    saveIncidentNotes(id: number): Promise<void>;
    saveOperatorHandle(): void;
    applyResolutionPreset(value: string): void;
    applyNamedView(id: number): Promise<void>;
    deleteNamedView(id: number): void;
    setDefaultNamedView(id: number): void;
    showIncident(id: number): void;
    quickFixBaseline(id: number): void;
    updateFieldRole(fieldName: string, role: string): void;
    setView(v: string): void;
  }
}
