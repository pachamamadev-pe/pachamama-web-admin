export interface ProjectWorkflowStage {
  number: number;
  name: string;
  key: string;
}

export const PROJECT_WORKFLOW_STAGES: ProjectWorkflowStage[] = [
  { number: 1, name: 'Relacionamiento Comunitario', key: 'planning' },
  { number: 2, name: 'Inventario', key: 'inventory' },
  { number: 3, name: 'Elaboración de PMF', key: 'pmf_development' },
  { number: 4, name: 'Evaluación y Aprobación (SERFOR)', key: 'serfor_evaluation' },
  { number: 5, name: 'Recolección', key: 'collection' },
  { number: 6, name: 'Acopio / Ingreso a CTP', key: 'ctp_entry' },
  { number: 7, name: 'Transformación Primaria', key: 'primary_transformation' },
];

export const PROJECT_WORKFLOW_STAGE_KEYS = PROJECT_WORKFLOW_STAGES.map((stage) => stage.key);

export const PROJECT_WORKFLOW_STAGE_LABELS: Record<string, string> = PROJECT_WORKFLOW_STAGES.reduce(
  (labels, stage) => {
    labels[stage.key] = stage.name;
    return labels;
  },
  {} as Record<string, string>,
);

export function getProjectWorkflowStageLabel(stageKey: string): string {
  return PROJECT_WORKFLOW_STAGE_LABELS[stageKey] ?? stageKey;
}
