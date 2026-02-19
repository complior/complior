import type { ScanResult, GateResult, ScoreZone } from '../types/common.types.js';

export interface EventMap {
  readonly 'scan.completed': { readonly result: ScanResult };
  readonly 'scan.started': { readonly projectPath: string };
  readonly 'file.changed': { readonly path: string; readonly action: 'create' | 'edit' | 'delete' };
  readonly 'score.updated': { readonly before: number; readonly after: number };
  readonly 'gate.checked': { readonly result: GateResult };
  readonly 'fix.validated': { readonly checkId: string; readonly passed: boolean; readonly scoreDelta: number };
  readonly 'fix.undone': { readonly checkId: string; readonly restoredFiles: readonly string[] };
  readonly 'badge.generated': { readonly path: string; readonly score: number; readonly zone: ScoreZone };
  readonly 'share.created': { readonly id: string; readonly score: number };
  readonly 'external-scan.completed': { readonly url: string; readonly score: number };
  readonly 'report.generated': { readonly path: string; readonly format: 'pdf' | 'markdown' };
}

export type EventHandler<T> = (payload: T) => void;

export interface EventBusPort {
  readonly on: <K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>) => void;
  readonly off: <K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>) => void;
  readonly emit: <K extends keyof EventMap>(event: K, payload: EventMap[K]) => void;
}
