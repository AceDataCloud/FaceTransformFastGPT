import {
  createToolHandler,
  defineTool,
  type InputSchemaMetaType,
  type OutputSchemaMetaType,
  type SecretSchemaMetaType
} from '@fastgpt-plugin/sdk-factory';
import z from 'zod';

import { faceAction } from './src/client.ts';

const secretSchema = z.object({
  apiKey: z.string().min(1).meta({
    title: 'Ace Data Cloud API key',
    description: 'Create an application API key at platform.acedata.cloud. Do not include Bearer.',
    isSecret: true
  } satisfies SecretSchemaMetaType)
});

const actionSchema = z.enum(['keypoints', 'beautify', 'age', 'gender', 'swap', 'cartoon', 'liveness']);

const handler = createToolHandler({
  inputSchema: z.object({
    action: actionSchema.default('keypoints').meta({
      title: 'Action',
      description: 'Choose one face operation.'
    } satisfies InputSchemaMetaType),
    imageUrl: z.string().url().optional().meta({
      title: 'Image URL',
      description: 'HTTPS image URL for all actions except swap.',
      isToolParam: true
    } satisfies InputSchemaMetaType),
    sourceImageUrl: z.string().url().optional().meta({
      title: 'Source face image URL',
      description: 'HTTPS source face for swap only.'
    } satisfies InputSchemaMetaType),
    targetImageUrl: z.string().url().optional().meta({
      title: 'Target image URL',
      description: 'HTTPS target image for swap only.'
    } satisfies InputSchemaMetaType),
    targetAge: z.number().int().min(1).max(100).optional().meta({
      title: 'Target age',
      description: 'Required for age transform.'
    } satisfies InputSchemaMetaType),
    targetGender: z.number().int().min(0).max(1).optional().meta({
      title: 'Target gender',
      description: 'Required for gender transform: 0 male to female, 1 female to male.'
    } satisfies InputSchemaMetaType),
    analyzeMode: z.number().int().min(0).max(1).default(1).meta({
      title: 'Analyze mode',
      description: '0 all faces, 1 largest face. Only for keypoints.'
    } satisfies InputSchemaMetaType),
    smoothing: z.number().min(0).max(100).optional().meta({
      title: 'Smoothing', description: 'Only for beautify.'
    } satisfies InputSchemaMetaType),
    whitening: z.number().min(0).max(100).optional().meta({
      title: 'Whitening', description: 'Only for beautify.'
    } satisfies InputSchemaMetaType),
    faceLifting: z.number().min(0).max(100).optional().meta({
      title: 'Face lifting', description: 'Only for beautify.'
    } satisfies InputSchemaMetaType),
    eyeEnlarging: z.number().min(0).max(100).optional().meta({
      title: 'Eye enlarging', description: 'Only for beautify.'
    } satisfies InputSchemaMetaType)
  }),
  outputSchema: z.object({
    action: actionSchema.meta({ title: 'Action' } satisfies OutputSchemaMetaType),
    success: z.boolean().meta({ title: 'Succeeded' } satisfies OutputSchemaMetaType),
    faceCount: z.number().int().meta({ title: 'Detected faces' } satisfies OutputSchemaMetaType),
    mediaUrls: z.array(z.string()).meta({ title: 'Result image URLs' } satisfies OutputSchemaMetaType),
    costCredits: z.number().nullable().meta({ title: 'Reported Credits' } satisfies OutputSchemaMetaType),
    traceId: z.string().meta({ title: 'Trace ID' } satisfies OutputSchemaMetaType),
    data: z.record(z.string(), z.unknown()).meta({ title: 'Result data' } satisfies OutputSchemaMetaType)
  }),
  secretSchema,
  handler: async (input, ctx) => faceAction(input, ctx.secrets?.apiKey ?? '')
});

export default defineTool({
  manifest: {
    pluginId: 'acedataFaceTransform',
    version: '0.1.0',
    name: { en: 'Ace Data Cloud Face Transform', 'zh-CN': 'Ace Data Cloud 人脸处理' },
    description: {
      en: 'Analyze and transform authorized face images through Ace Data Cloud.',
      'zh-CN': '通过 Ace Data Cloud 分析或处理经授权的人脸图像。'
    },
    versionDescription: { en: 'Initial release', 'zh-CN': '首次发布' },
    author: 'Ace Data Cloud',
    repoUrl: 'https://github.com/AceDataCloud/FaceTransformFastGPT',
    tutorialUrl: 'https://github.com/AceDataCloud/FaceTransformFastGPT#quick-start',
    tags: ['multimodal'],
    permission: []
  },
  handler
});
