// ============================================================
// FaciliAI — Zod Validation Schemas
// T1/T2/Consolidation のレスポンスを検証し、
// 不正JSONが来てもクラッシュしない構造にする
// ============================================================

import { z } from 'zod';
import { NODE_TYPES, RELATION_TYPES, INSIGHT_TYPES } from './types';

// ------- 共通 -------
const nodeTypeSchema = z.enum(NODE_TYPES);
const relationTypeSchema = z.enum(RELATION_TYPES);
const insightTypeSchema = z.enum(INSIGHT_TYPES);

// ------- T1 Schema -------
const t1CreateSchema = z.object({
  action: z.literal('CREATE'),
  node: z.object({
    label: z.string().min(1).max(50),
    type: nodeTypeSchema,
    parentId: z.string().nullable(),
    relation: relationTypeSchema.nullable(),
    summary: z.string().min(1).max(200),
    confidence: z.number().min(0).max(1),
  }),
});

const t1UpdateSchema = z.object({
  action: z.literal('UPDATE'),
  targetNodeId: z.string().min(1),
  update: z.object({
    label: z.string().min(1).max(50).optional(),
    summary: z.string().min(1).max(200).optional(),
    type: nodeTypeSchema.optional(),
    relation: relationTypeSchema.optional(),
    // 新しい補足情報（insightsに追記される、上書きなし）
    insight: z.object({
      text: z.string().min(1).max(60),
      type: insightTypeSchema,
    }).optional(),
  }),
});

const t1IgnoreSchema = z.object({
  action: z.literal('IGNORE'),
  reason: z.string().optional(),
});

export const t1ResponseSchema = z.discriminatedUnion('action', [
  t1CreateSchema,
  t1UpdateSchema,
  t1IgnoreSchema,
]);

export type T1ResponseValidated = z.infer<typeof t1ResponseSchema>;

// ------- T2 / Consolidation Operation Schemas -------
const t2MergeSchema = z.object({
  op: z.literal('MERGE'),
  sourceId: z.string(),
  targetId: z.string(),
  mergedSummary: z.string(),
});

const t2ReparentSchema = z.object({
  op: z.literal('REPARENT'),
  nodeId: z.string(),
  newParentId: z.string().nullable(),
  newRelation: relationTypeSchema.nullable(),
});

const t2UpdateTypeSchema = z.object({
  op: z.literal('UPDATE_TYPE'),
  nodeId: z.string(),
  newType: nodeTypeSchema,
});

const t2UpdateLabelSchema = z.object({
  op: z.literal('UPDATE_LABEL'),
  nodeId: z.string(),
  newLabel: z.string().min(1).max(50),
});

const t2DeleteSchema = z.object({
  op: z.literal('DELETE'),
  nodeId: z.string(),
  reason: z.string(),
});

const t2UpdateSummarySchema = z.object({
  op: z.literal('UPDATE_SUMMARY'),
  nodeId: z.string(),
  newSummary: z.string().min(1).max(200),
});

const t2OperationSchema = z.discriminatedUnion('op', [
  t2MergeSchema,
  t2ReparentSchema,
  t2UpdateTypeSchema,
  t2UpdateLabelSchema,
  t2DeleteSchema,
  t2UpdateSummarySchema,
]);

export const t2ResponseSchema = z.object({
  operations: z.array(t2OperationSchema),
  summary: z.string(),
});

export type T2ResponseValidated = z.infer<typeof t2ResponseSchema>;

// ------- OpenAI Structured Output JSON Schema -------
// T1用（OpenAI response_format に渡すスキーマ）
export const t1OpenAISchema = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['CREATE', 'UPDATE', 'IGNORE'] },
    // CREATE用
    node: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'UIに表示する短い具体的テキスト（5〜20文字）' },
        type: { type: 'string', enum: [...NODE_TYPES] },
        parentId: { type: ['string', 'null'], description: '親ノードのID。なければnull' },
        relation: { type: ['string', 'null'], enum: [...RELATION_TYPES, null] },
        summary: { type: 'string', description: 'ノードの意味の説明（内部用）' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['label', 'type', 'parentId', 'relation', 'summary', 'confidence'],
    },
    // UPDATE用
    targetNodeId: { type: 'string' },
    update: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        summary: { type: 'string' },
        type: { type: 'string', enum: [...NODE_TYPES] },
        relation: { type: 'string', enum: [...RELATION_TYPES] },
        insight: {
          type: 'object',
          description: 'ノードに追加する補足情報（配列に蓄積、上書きなし）',
          properties: {
            text: { type: 'string', description: 'UIに表示する短文（20文字以内）' },
            type: { type: 'string', enum: [...INSIGHT_TYPES] },
          },
          required: ['text', 'type'],
        },
      },
    },
    // IGNORE用
    reason: { type: 'string' },
  },
  required: ['action'],
};

// T2用
export const t2OpenAISchema = {
  type: 'object',
  properties: {
    operations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          op: { type: 'string', enum: ['MERGE', 'REPARENT', 'UPDATE_TYPE', 'UPDATE_LABEL', 'DELETE', 'UPDATE_SUMMARY'] },
          sourceId: { type: 'string' },
          targetId: { type: 'string' },
          mergedSummary: { type: 'string' },
          nodeId: { type: 'string' },
          newParentId: { type: ['string', 'null'] },
          newRelation: { type: ['string', 'null'], enum: [...RELATION_TYPES, null] },
          newType: { type: 'string', enum: [...NODE_TYPES] },
          newLabel: { type: 'string' },
          reason: { type: 'string' },
          newSummary: { type: 'string' },
        },
        required: ['op'],
      },
    },
    summary: { type: 'string', description: 'T2で行った修正の概要' },
  },
  required: ['operations', 'summary'],
};
