import type { ScanResult, GateResult } from '../types/common.types.js';

export interface EventMap {
  readonly 'scan.completed': { readonly result: ScanResult };
  readonly 'scan.started': { readonly projectPath: string };
  readonly 'file.changed': { readonly path: string; readonly action: 'create' | 'edit' | 'delete' };
  readonly 'score.updated': { readonly before: number; readonly after: number };
  readonly 'gate.checked': { readonly result: GateResult };
}

export type EventHandler<T> = (payload: T) => void;

export interface EventBusPort {
  readonly on: <K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>) => void;
  readonly off: <K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>) => void;
  readonly emit: <K extends keyof EventMap>(event: K, payload: EventMap[K]) => void;
}
