const STAGE_META: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planificación', color: '#6366F1' },
  inventory: { label: 'Inventario', color: '#3B82F6' },
  collection: { label: 'Recolección', color: '#10B981' },
  serfor_evaluation: { label: 'Eval. SERFOR', color: '#F59E0B' },
  primary_transformation: { label: 'Transform. Primaria', color: '#8B5CF6' },
  ctp_entry: { label: 'Acopio / Ingreso a CTP', color: '#EF4444' },
  closed: { label: 'Cerrado', color: '#6B7280' },
};

export function stageLabel(stage: string): string {
  return (
    STAGE_META[stage]?.label ?? stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function stageColor(stage: string): string {
  return STAGE_META[stage]?.color ?? '#9CA3AF';
}
