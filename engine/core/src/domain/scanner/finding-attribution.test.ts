import { describe, it, expect } from 'vitest';
import { buildFileOwnership, attributeFindings, expandPerAgentFindings, PER_AGENT_DOC_CHECK_IDS, type AgentInfo } from './finding-attribution.js';
import { buildImportGraph } from './import-graph.js';
import type { FileInfo } from '../../ports/scanner.port.js';
import type { Finding } from '../../types/common.types.js';

const makeFile = (path: string, content: string): FileInfo => ({
  path: `/project/${path}`,
  relativePath: path,
  content,
  extension: '.' + (path.split('.').pop() ?? 'ts'),
});

const makeFinding = (overrides: Partial<Finding> = {}): Finding => ({
  checkId: 'test-check',
  type: 'fail',
  message: 'test finding',
  severity: 'medium',
  ...overrides,
});

describe('buildFileOwnership', () => {
  it('assigns files reachable by one agent only', () => {
    const files = [
      makeFile('agent-a/index.ts', `import { helper } from './helper.js';`),
      makeFile('agent-a/helper.ts', `export const helper = 1;`),
      makeFile('agent-b/main.ts', `export const b = 2;`),
    ];
    const graph = buildImportGraph(files);
    const agents: AgentInfo[] = [
      { name: 'agent-a', sourceFiles: ['agent-a/index.ts'] },
      { name: 'agent-b', sourceFiles: ['agent-b/main.ts'] },
    ];

    const ownership = buildFileOwnership(agents, graph);

    expect(ownership.fileToOwner.get('agent-a/index.ts')).toBe('agent-a');
    expect(ownership.fileToOwner.get('agent-a/helper.ts')).toBe('agent-a');
    expect(ownership.fileToOwner.get('agent-b/main.ts')).toBe('agent-b');
    expect(ownership.sharedFiles.size).toBe(0);
  });

  it('marks files reachable by 2+ agents as shared', () => {
    const files = [
      makeFile('agent-a/index.ts', `import { util } from '../lib/util.js';`),
      makeFile('agent-b/main.ts', `import { util } from '../lib/util.js';`),
      makeFile('lib/util.ts', `export const util = 1;`),
    ];
    const graph = buildImportGraph(files);
    const agents: AgentInfo[] = [
      { name: 'agent-a', sourceFiles: ['agent-a/index.ts'] },
      { name: 'agent-b', sourceFiles: ['agent-b/main.ts'] },
    ];

    const ownership = buildFileOwnership(agents, graph);

    expect(ownership.sharedFiles.has('lib/util.ts')).toBe(true);
    expect(ownership.fileToOwner.has('lib/util.ts')).toBe(false);
  });
});

describe('attributeFindings', () => {
  // Test 1: Single agent — all findings attributed
  it('attributes all findings to sole agent', () => {
    const files = [makeFile('src/app.ts', `export const x = 1;`)];
    const graph = buildImportGraph(files);
    const agents: AgentInfo[] = [{ name: 'my-agent', sourceFiles: ['src/app.ts'] }];
    const findings = [
      makeFinding({ file: 'src/app.ts' }),
      makeFinding({ file: 'other.ts' }),
      makeFinding(), // no file
    ];

    const result = attributeFindings(findings, agents, graph);

    expect(result).toHaveLength(3);
    expect(result.every(f => f.agentId === 'my-agent')).toBe(true);
  });

  // Test 2: Two agents, separate dirs — correct attribution
  it('attributes findings to correct agents by import graph', () => {
    const files = [
      makeFile('agent-a/index.ts', `import { h } from './helper.js';`),
      makeFile('agent-a/helper.ts', `export const h = 1;`),
      makeFile('agent-b/main.ts', `import { u } from './utils.js';`),
      makeFile('agent-b/utils.ts', `export const u = 2;`),
    ];
    const graph = buildImportGraph(files);
    const agents: AgentInfo[] = [
      { name: 'agent-a', sourceFiles: ['agent-a/index.ts'] },
      { name: 'agent-b', sourceFiles: ['agent-b/main.ts'] },
    ];
    const findings = [
      makeFinding({ checkId: 'c1', file: 'agent-a/helper.ts' }),
      makeFinding({ checkId: 'c2', file: 'agent-b/utils.ts' }),
    ];

    const result = attributeFindings(findings, agents, graph);

    expect(result[0].agentId).toBe('agent-a');
    expect(result[1].agentId).toBe('agent-b');
  });

  // Test 3: Shared utility imported by both agents → project-level
  it('leaves shared utility findings as project-level', () => {
    const files = [
      makeFile('agent-a/index.ts', `import { util } from '../lib/shared.js';`),
      makeFile('agent-b/main.ts', `import { util } from '../lib/shared.js';`),
      makeFile('lib/shared.ts', `export const util = 1;`),
    ];
    const graph = buildImportGraph(files);
    const agents: AgentInfo[] = [
      { name: 'agent-a', sourceFiles: ['agent-a/index.ts'] },
      { name: 'agent-b', sourceFiles: ['agent-b/main.ts'] },
    ];
    const findings = [makeFinding({ file: 'lib/shared.ts' })];

    const result = attributeFindings(findings, agents, graph);

    expect(result[0].agentId).toBeUndefined();
  });

  // Test 4: Transitive imports (3 levels deep)
  it('follows transitive imports through 3 levels', () => {
    const files = [
      makeFile('src/entry.ts', `import { mid } from './mid.js';`),
      makeFile('src/mid.ts', `import { deep } from './deep.js';`),
      makeFile('src/deep.ts', `export const deep = 1;`),
    ];
    const graph = buildImportGraph(files);
    const agents: AgentInfo[] = [
      { name: 'agent-x', sourceFiles: ['src/entry.ts'] },
      { name: 'agent-y', sourceFiles: [] },
    ];
    const findings = [
      makeFinding({ checkId: 'c1', file: 'src/mid.ts' }),
      makeFinding({ checkId: 'c2', file: 'src/deep.ts' }),
    ];

    const result = attributeFindings(findings, agents, graph);

    expect(result[0].agentId).toBe('agent-x');
    expect(result[1].agentId).toBe('agent-x');
  });

  // Test 5: Finding without file (L1) in multi-agent → project-level
  it('leaves L1 findings without file as project-level in multi-agent', () => {
    const files = [
      makeFile('a/index.ts', `export const a = 1;`),
      makeFile('b/main.ts', `export const b = 2;`),
    ];
    const graph = buildImportGraph(files);
    const agents: AgentInfo[] = [
      { name: 'agent-a', sourceFiles: ['a/index.ts'] },
      { name: 'agent-b', sourceFiles: ['b/main.ts'] },
    ];
    const findings = [makeFinding({ file: undefined })];

    const result = attributeFindings(findings, agents, graph);

    expect(result[0].agentId).toBeUndefined();
  });

  // Test 6: Directory prefix fallback (doc file under agent dir)
  it('uses directory prefix fallback for non-code files', () => {
    const files = [
      makeFile('agents/bot-a/src/index.ts', `export const a = 1;`),
      makeFile('agents/bot-a/config.ts', `export const c = 1;`),
      makeFile('agents/bot-b/src/main.ts', `export const b = 2;`),
      makeFile('agents/bot-b/config.ts', `export const c = 2;`),
    ];
    const graph = buildImportGraph(files);
    const agents: AgentInfo[] = [
      { name: 'bot-a', sourceFiles: ['agents/bot-a/src/index.ts', 'agents/bot-a/config.ts'] },
      { name: 'bot-b', sourceFiles: ['agents/bot-b/src/main.ts', 'agents/bot-b/config.ts'] },
    ];
    // README under bot-a's directory, not in import graph
    const findings = [makeFinding({ file: 'agents/bot-a/docs/README.md' })];

    const result = attributeFindings(findings, agents, graph);

    expect(result[0].agentId).toBe('bot-a');
  });

  // Test 7: Root-level config (package.json) → project-level
  it('leaves root-level configs as project-level', () => {
    const files = [
      makeFile('src/a.ts', `export const a = 1;`),
      makeFile('src/b.ts', `export const b = 2;`),
    ];
    const graph = buildImportGraph(files);
    const agents: AgentInfo[] = [
      { name: 'agent-a', sourceFiles: ['src/a.ts'] },
      { name: 'agent-b', sourceFiles: ['src/b.ts'] },
    ];
    const findings = [makeFinding({ file: 'package.json' })];

    const result = attributeFindings(findings, agents, graph);

    expect(result[0].agentId).toBeUndefined();
  });

  // Test 8: Empty agents array → no attribution
  it('returns findings unchanged when no agents', () => {
    const graph = buildImportGraph([]);
    const findings = [makeFinding({ file: 'src/app.ts' })];

    const result = attributeFindings(findings, [], graph);

    expect(result[0].agentId).toBeUndefined();
  });

  // Test 9: Circular imports — handled, no infinite loop
  it('handles circular imports without infinite loop', () => {
    const files = [
      makeFile('src/a.ts', `import { b } from './b.js';`),
      makeFile('src/b.ts', `import { a } from './a.js';`),
    ];
    const graph = buildImportGraph(files);
    const agents: AgentInfo[] = [
      { name: 'circle-agent', sourceFiles: ['src/a.ts'] },
      { name: 'other', sourceFiles: [] },
    ];
    const findings = [
      makeFinding({ file: 'src/a.ts' }),
      makeFinding({ file: 'src/b.ts' }),
    ];

    const result = attributeFindings(findings, agents, graph);

    expect(result[0].agentId).toBe('circle-agent');
    expect(result[1].agentId).toBe('circle-agent');
  });

  // Test 10: Graph ownership beats directory prefix
  it('prefers graph ownership over directory prefix', () => {
    const files = [
      makeFile('agent-a/index.ts', `import { helper } from '../lib/helper.js';`),
      makeFile('lib/helper.ts', `export const helper = 1;`),
      makeFile('agent-b/main.ts', `export const b = 2;`),
    ];
    const graph = buildImportGraph(files);
    const agents: AgentInfo[] = [
      { name: 'agent-a', sourceFiles: ['agent-a/index.ts'] },
      { name: 'agent-b', sourceFiles: ['agent-b/main.ts'] },
    ];
    // lib/helper.ts is only reachable from agent-a via import graph
    // It's NOT under agent-b's directory prefix
    const findings = [makeFinding({ file: 'lib/helper.ts' })];

    const result = attributeFindings(findings, agents, graph);

    // Graph ownership: agent-a imports lib/helper → owned by agent-a
    expect(result[0].agentId).toBe('agent-a');
  });
});

describe('E2E: full multi-agent attribution pipeline', () => {
  it('attributes findings correctly across complex multi-agent project', () => {
    // Simulate a real multi-agent project:
    // - agent-chat: imports openai, has chat service + helper
    // - agent-embed: imports @ai-sdk/openai, has embed pipeline + processor
    // - shared lib/logger used by both
    // - config files under each agent dir
    // - root-level package.json
    const files = [
      // Agent Chat subtree
      makeFile('agents/chat/src/index.ts',
        `import { OpenAI } from 'openai';\nimport { format } from './format.js';\nimport { log } from '../../lib/logger.js';`),
      makeFile('agents/chat/src/format.ts',
        `export const format = (msg: string) => msg.trim();`),
      // Agent Embed subtree
      makeFile('agents/embed/src/main.ts',
        `import { embed } from '@ai-sdk/openai';\nimport { process } from './processor.js';\nimport { log } from '../../lib/logger.js';`),
      makeFile('agents/embed/src/processor.ts',
        `export const process = (data: string[]) => data;`),
      // Shared lib — imported by both
      makeFile('lib/logger.ts',
        `export const log = (msg: string) => console.log(msg);`),
      // Root config
      makeFile('package.json', `{"name":"multi-agent-project"}`),
    ];

    const graph = buildImportGraph(files);
    const agents: AgentInfo[] = [
      { name: 'chat-agent', sourceFiles: ['agents/chat/src/index.ts'] },
      { name: 'embed-agent', sourceFiles: ['agents/embed/src/main.ts'] },
    ];

    const findings = [
      // Finding on chat's direct file
      makeFinding({ checkId: 'sdk-no-disclosure', file: 'agents/chat/src/index.ts', severity: 'high' }),
      // Finding on chat's transitively-imported helper
      makeFinding({ checkId: 'missing-error-handling', file: 'agents/chat/src/format.ts', severity: 'medium' }),
      // Finding on embed's direct file
      makeFinding({ checkId: 'sdk-no-disclosure', file: 'agents/embed/src/main.ts', severity: 'high' }),
      // Finding on embed's transitively-imported processor
      makeFinding({ checkId: 'missing-validation', file: 'agents/embed/src/processor.ts', severity: 'medium' }),
      // Finding on shared logger — project-level
      makeFinding({ checkId: 'logging-no-retention', file: 'lib/logger.ts', severity: 'low' }),
      // Finding on root package.json — project-level
      makeFinding({ checkId: 'banned-package', file: 'package.json', severity: 'critical' }),
      // L1 finding without file — project-level
      makeFinding({ checkId: 'missing-fria', file: undefined, severity: 'high' }),
    ];

    const result = attributeFindings(findings, agents, graph);

    // Chat agent owns its files
    expect(result[0].agentId).toBe('chat-agent');   // index.ts
    expect(result[1].agentId).toBe('chat-agent');   // format.ts (transitive)

    // Embed agent owns its files
    expect(result[2].agentId).toBe('embed-agent');  // main.ts
    expect(result[3].agentId).toBe('embed-agent');  // processor.ts (transitive)

    // Shared logger → project-level (no agentId)
    expect(result[4].agentId).toBeUndefined();

    // Root config → project-level (no agentId)
    expect(result[5].agentId).toBeUndefined();

    // L1 finding without file → project-level
    expect(result[6].agentId).toBeUndefined();
  });

  it('attributeFindings is pure — does not mutate input', () => {
    const files = [
      makeFile('src/app.ts', `import { OpenAI } from 'openai';`),
    ];
    const graph = buildImportGraph(files);
    const agents: AgentInfo[] = [{ name: 'test-agent', sourceFiles: ['src/app.ts'] }];
    const original = makeFinding({ file: 'src/app.ts' });
    const findings = [original];

    const result = attributeFindings(findings, agents, graph);

    // Original finding not mutated
    expect(original.agentId).toBeUndefined();
    // Result has new agentId
    expect(result[0].agentId).toBe('test-agent');
    // Different object reference
    expect(result[0]).not.toBe(original);
  });

  it('buildFileOwnership returns frozen immutable result', () => {
    const files = [
      makeFile('src/a.ts', `export const a = 1;`),
    ];
    const graph = buildImportGraph(files);
    const agents: AgentInfo[] = [{ name: 'agent', sourceFiles: ['src/a.ts'] }];

    const ownership = buildFileOwnership(agents, graph);

    expect(Object.isFrozen(ownership)).toBe(true);
  });
});

describe('expandPerAgentFindings', () => {
  const agents: AgentInfo[] = [
    { name: 'agent-x', sourceFiles: ['src/x.ts'] },
    { name: 'agent-y', sourceFiles: ['src/y.ts'] },
  ];

  it('single agent → no expansion', () => {
    const singleAgent: AgentInfo[] = [{ name: 'sole', sourceFiles: ['src/app.ts'] }];
    const findings = [
      makeFinding({ checkId: 'fria', type: 'fail' }),
      makeFinding({ checkId: 'qms', type: 'fail' }),
    ];

    const result = expandPerAgentFindings(findings, singleAgent);

    expect(result).toBe(findings); // same reference, no-op
  });

  it('multi-agent, FRIA fail → expanded to N per-agent fails', () => {
    const findings = [
      makeFinding({ checkId: 'fria', type: 'fail', message: 'No FRIA found' }),
    ];

    const result = expandPerAgentFindings(findings, agents);

    expect(result).toHaveLength(2);
    expect(result[0].agentId).toBe('agent-x');
    expect(result[0].checkId).toBe('fria');
    expect(result[1].agentId).toBe('agent-y');
    expect(result[1].checkId).toBe('fria');
  });

  it('multi-agent, FRIA pass → expanded to per-agent passes', () => {
    const findings = [
      makeFinding({ checkId: 'fria', type: 'pass', message: 'FRIA found' }),
    ];

    const result = expandPerAgentFindings(findings, agents);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ checkId: 'fria', type: 'pass', agentId: 'agent-x' });
    expect(result[1]).toMatchObject({ checkId: 'fria', type: 'pass', agentId: 'agent-y' });
  });

  it('multi-agent, mixed per-agent + project-only checks', () => {
    const findings = [
      makeFinding({ checkId: 'fria', type: 'fail' }),
      makeFinding({ checkId: 'risk-management', type: 'fail' }),
      makeFinding({ checkId: 'qms', type: 'fail' }),              // project-level, not expanded
      makeFinding({ checkId: 'technical-documentation', type: 'pass' }), // pass, expanded per-agent
      makeFinding({ checkId: 'ai-literacy', type: 'fail' }),       // project-level
    ];

    const result = expandPerAgentFindings(findings, agents);

    // fria fail → 2, risk-management fail → 2, qms → 1, tech-doc pass → 2, ai-literacy → 1
    expect(result).toHaveLength(8);

    // First 2: fria expanded
    expect(result[0]).toMatchObject({ checkId: 'fria', agentId: 'agent-x' });
    expect(result[1]).toMatchObject({ checkId: 'fria', agentId: 'agent-y' });

    // Next 2: risk-management expanded
    expect(result[2]).toMatchObject({ checkId: 'risk-management', agentId: 'agent-x' });
    expect(result[3]).toMatchObject({ checkId: 'risk-management', agentId: 'agent-y' });

    // qms stays project-level
    expect(result[4]).toMatchObject({ checkId: 'qms' });
    expect(result[4].agentId).toBeUndefined();

    // tech-doc pass expanded per-agent (each agent gets credit)
    expect(result[5]).toMatchObject({ checkId: 'technical-documentation', type: 'pass', agentId: 'agent-x' });
    expect(result[6]).toMatchObject({ checkId: 'technical-documentation', type: 'pass', agentId: 'agent-y' });

    // ai-literacy stays project-level
    expect(result[7]).toMatchObject({ checkId: 'ai-literacy' });
    expect(result[7].agentId).toBeUndefined();
  });

  it('PER_AGENT_DOC_CHECK_IDS contains all 7 per-agent checks', () => {
    expect(PER_AGENT_DOC_CHECK_IDS.size).toBe(7);
    expect(PER_AGENT_DOC_CHECK_IDS.has('fria')).toBe(true);
    expect(PER_AGENT_DOC_CHECK_IDS.has('data-governance')).toBe(true);
    expect(PER_AGENT_DOC_CHECK_IDS.has('qms')).toBe(false);
  });
});
