'use strict';

/**
 * Detection Patterns Seed — Top 100 AI Tools
 *
 * Populates RegistryTool.detectionPatterns for the most widely used AI tools.
 * Each pattern object covers: npm, pip, imports, env_vars, api_calls, domains.
 *
 * Used by CLI `npx complior scan` to detect AI tools in codebases.
 *
 * Run via: npm run seed:detection-patterns
 */

const { Pool } = require('pg');
require('dotenv').config();

// ─── Shared pattern groups (reused across model families) ─────────────────────

const OPENAI_BASE = {
  npm: ['openai'],
  pip: ['openai'],
  imports: ['from openai import', 'import openai', "require('openai')", 'import OpenAI from'],
  env_vars: ['OPENAI_API_KEY', 'OPENAI_ORG_ID', 'OPENAI_BASE_URL'],
  api_calls: ['openai.chat.completions.create', 'client.chat.completions.create', 'new OpenAI('],
  domains: ['api.openai.com', 'platform.openai.com'],
};

const ANTHROPIC_BASE = {
  npm: ['@anthropic-ai/sdk'],
  pip: ['anthropic'],
  imports: ['from anthropic import', 'import Anthropic', "require('@anthropic-ai/sdk')"],
  env_vars: ['ANTHROPIC_API_KEY'],
  api_calls: ['anthropic.messages.create', 'client.messages.create', 'new Anthropic('],
  domains: ['api.anthropic.com'],
};

const GOOGLE_AI_BASE = {
  npm: ['@google/generative-ai', '@google-cloud/vertexai'],
  pip: ['google-generativeai', 'google-cloud-aiplatform'],
  imports: ['from google.generativeai', 'import { GoogleGenerativeAI }', 'import GoogleGenerativeAI'],
  env_vars: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
  api_calls: ['genAI.getGenerativeModel', 'model.generateContent', 'GoogleGenerativeAI('],
  domains: ['generativelanguage.googleapis.com', 'aiplatform.googleapis.com'],
};

const TRANSFORMERS_BASE = {
  npm: ['@huggingface/inference'],
  pip: ['transformers', 'torch', 'huggingface-hub'],
  imports: ['from transformers import', 'from huggingface_hub import', 'import { pipeline }'],
  env_vars: ['HF_TOKEN', 'HUGGING_FACE_HUB_TOKEN', 'HUGGINGFACE_API_KEY'],
  api_calls: ['pipeline(', 'AutoModel.from_pretrained', 'AutoTokenizer.from_pretrained'],
  domains: ['api-inference.huggingface.co', 'huggingface.co'],
};

// ─── Detection patterns keyed by RegistryTool.slug ────────────────────────────

const DETECTION_PATTERNS = {

  // ── Foundation models: OpenAI family ──────────────────────────────────────
  'openai': OPENAI_BASE,
  'chatgpt': OPENAI_BASE,
  'gpt-4': OPENAI_BASE,
  'gpt-4o': OPENAI_BASE,
  'gpt-4-turbo': OPENAI_BASE,
  'o1': {
    ...OPENAI_BASE,
    api_calls: [...OPENAI_BASE.api_calls, 'o1-mini', 'o1-preview', 'o3-mini'],
  },
  'o3': {
    ...OPENAI_BASE,
    api_calls: [...OPENAI_BASE.api_calls, 'o3-mini', 'o3-preview'],
  },

  // ── Foundation models: Anthropic family ───────────────────────────────────
  'claude': ANTHROPIC_BASE,
  'claude-3-5-sonnet': ANTHROPIC_BASE,
  'claude-3-opus': ANTHROPIC_BASE,
  'claude-4-5-sonnet': ANTHROPIC_BASE,
  'claude-4-6-opus': ANTHROPIC_BASE,

  // ── Foundation models: Google family ──────────────────────────────────────
  'gemini': GOOGLE_AI_BASE,
  'gemini-pro': GOOGLE_AI_BASE,
  'gemini-ultra': GOOGLE_AI_BASE,
  'palm-2': {
    npm: ['@google-ai/generativelanguage', '@google/generative-ai'],
    pip: ['google-generativeai'],
    imports: ['from google.generativeai', 'import { TextServiceClient }'],
    env_vars: ['GOOGLE_API_KEY'],
    api_calls: ['client.generateText', 'TextServiceClient('],
    domains: ['generativelanguage.googleapis.com'],
  },

  // ── Foundation models: Mistral ─────────────────────────────────────────────
  'mistral-ai': {
    npm: ['@mistralai/mistralai'],
    pip: ['mistralai'],
    imports: ['from mistralai', 'import MistralClient', 'import { Mistral }'],
    env_vars: ['MISTRAL_API_KEY'],
    api_calls: ['client.chat.complete', 'mistral.chat', 'Mistral('],
    domains: ['api.mistral.ai'],
  },
  'mistral-large': {
    npm: ['@mistralai/mistralai'],
    pip: ['mistralai'],
    imports: ['from mistralai', 'import { Mistral }'],
    env_vars: ['MISTRAL_API_KEY'],
    api_calls: ['client.chat.complete', 'mistral-large-latest'],
    domains: ['api.mistral.ai'],
  },

  // ── Foundation models: xAI Grok ───────────────────────────────────────────
  'grok': {
    npm: ['openai'],
    pip: ['openai'],
    imports: ['from openai import OpenAI', 'import OpenAI from'],
    env_vars: ['XAI_API_KEY', 'GROK_API_KEY'],
    api_calls: ["baseURL: 'https://api.x.ai/v1'", 'grok-beta', 'grok-2'],
    domains: ['api.x.ai'],
  },

  // ── Foundation models: Open-source / self-hosted ──────────────────────────
  'llama-2': {
    ...TRANSFORMERS_BASE,
    pip: [...TRANSFORMERS_BASE.pip, 'llama-cpp-python', 'llama-index'],
    imports: [...TRANSFORMERS_BASE.imports, 'from llama_cpp import Llama', 'LlamaForCausalLM'],
    api_calls: ['meta-llama/Llama-2-', 'Llama(model_path=', 'pipeline("text-generation"'],
  },
  'llama-3': {
    ...TRANSFORMERS_BASE,
    pip: [...TRANSFORMERS_BASE.pip, 'llama-cpp-python', 'llama-index-core'],
    imports: [...TRANSFORMERS_BASE.imports, 'from llama_cpp import Llama'],
    api_calls: ['meta-llama/Meta-Llama-3', 'Llama-3.1', 'Llama-3.3'],
  },
  'phi-3': {
    ...TRANSFORMERS_BASE,
    api_calls: ['microsoft/phi-3', 'microsoft/Phi-3', 'Phi-3-mini', 'Phi-3-medium'],
  },
  'falcon-180b': {
    ...TRANSFORMERS_BASE,
    api_calls: ['tiiuae/falcon-180B', 'tiiuae/falcon-40b', 'tiiuae/falcon-7b'],
  },

  // ── Multilingual / country-specific ───────────────────────────────────────
  'ernie-bot': {
    npm: [],
    pip: ['erniebot', 'qianfan', 'paddlepaddle'],
    imports: ['import erniebot', 'from qianfan import', 'import qianfan'],
    env_vars: ['EB_API_TYPE', 'EB_ACCESS_TOKEN', 'QIANFAN_AK', 'QIANFAN_SK', 'ERNIE_API_KEY'],
    api_calls: ['erniebot.ChatCompletion.create', 'qianfan.ChatCompletion'],
    domains: ['aip.baidubce.com', 'qianfan.baidubce.com'],
  },
  'kimi': {
    npm: ['openai'],
    pip: ['openai', 'moonshot'],
    imports: ['from openai import OpenAI'],
    env_vars: ['MOONSHOT_API_KEY', 'KIMI_API_KEY'],
    api_calls: ["baseURL: 'https://api.moonshot.cn/v1'", 'moonshot-v1-8k', 'moonshot-v1-32k'],
    domains: ['api.moonshot.cn', 'platform.moonshot.cn'],
  },

  // ── Enterprise LLM platforms ───────────────────────────────────────────────
  'azure-openai': {
    npm: ['openai', '@azure/openai'],
    pip: ['openai', 'azure-ai-inference'],
    imports: ['AzureOpenAI', 'import { AzureOpenAI }', 'from openai import AzureOpenAI'],
    env_vars: ['AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_API_VERSION', 'OPENAI_API_TYPE'],
    api_calls: ['new AzureOpenAI(', 'AzureOpenAI(', 'azure_endpoint='],
    domains: ['*.openai.azure.com', 'cognitiveservices.azure.com', 'oai.azure.com'],
  },
  'aws-bedrock': {
    npm: ['@aws-sdk/client-bedrock-runtime', '@aws-sdk/client-bedrock'],
    pip: ['boto3', 'botocore', 'anthropic[bedrock]'],
    imports: ['BedrockRuntimeClient', 'from boto3', 'import boto3', 'BedrockClient'],
    env_vars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_BEDROCK_MODEL_ID'],
    api_calls: ['bedrock.invoke_model', 'BedrockRuntimeClient', 'client.converse', 'InvokeModelCommand'],
    domains: ['bedrock-runtime.amazonaws.com', 'bedrock.amazonaws.com'],
  },
  'google-vertex-ai': {
    npm: ['@google-cloud/aiplatform', '@google-cloud/vertexai'],
    pip: ['google-cloud-aiplatform', 'vertexai'],
    imports: ['from google.cloud import aiplatform', 'import vertexai', 'from vertexai import'],
    env_vars: ['GOOGLE_APPLICATION_CREDENTIALS', 'VERTEXAI_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'VERTEXAI_LOCATION'],
    api_calls: ['aiplatform.init(', 'vertexai.init(', 'GenerativeModel(', 'TextGenerationModel.from_pretrained'],
    domains: ['aiplatform.googleapis.com', 'us-central1-aiplatform.googleapis.com'],
  },
  'ibm-watsonx': {
    npm: ['ibm-watson', '@ibm-cloud/watsonx-ai'],
    pip: ['ibm-watson', 'ibm-watsonx-ai'],
    imports: ['from ibm_watsonx_ai import', 'import WatsonxAI', 'from ibm_watson import'],
    env_vars: ['WATSONX_API_KEY', 'WATSONX_PROJECT_ID', 'IBM_WATSON_API_KEY', 'WATSONX_URL'],
    api_calls: ['ModelInference(', 'WatsonxAI(', 'foundation_models.TextGenParameters'],
    domains: ['us-south.ml.cloud.ibm.com', 'eu-de.ml.cloud.ibm.com', 'jp-tok.ml.cloud.ibm.com'],
  },
  'together-ai': {
    npm: ['together-ai'],
    pip: ['together'],
    imports: ['from together import', 'import Together', "require('together-ai')"],
    env_vars: ['TOGETHER_API_KEY'],
    api_calls: ['together.chat.completions.create', 'Together()', 'client.completions.create'],
    domains: ['api.together.xyz', 'api.together.ai'],
  },

  // ── Coding AI ─────────────────────────────────────────────────────────────
  'github-copilot': {
    npm: [],
    pip: [],
    imports: ['// GitHub Copilot', '# GitHub Copilot'],
    env_vars: ['GITHUB_TOKEN', 'GH_TOKEN', 'COPILOT_TOKEN'],
    api_calls: [],
    domains: ['copilot-proxy.githubusercontent.com', 'githubcopilot.com', 'api.githubcopilot.com'],
  },
  'cursor': {
    npm: [],
    pip: [],
    imports: [],
    env_vars: ['CURSOR_API_KEY'],
    api_calls: [],
    domains: ['cursor.sh', 'api2.cursor.sh', 'www.cursor.com'],
  },
  'codeium': {
    npm: [],
    pip: [],
    imports: [],
    env_vars: ['CODEIUM_API_KEY'],
    api_calls: [],
    domains: ['codeium.com', 'server.codeium.com', 'web-backend.codeium.com'],
  },
  'tabnine': {
    npm: [],
    pip: [],
    imports: [],
    env_vars: ['TABNINE_API_KEY'],
    api_calls: [],
    domains: ['www.tabnine.com', 'api.tabnine.com'],
  },

  // ── Embedding models & vector stores ──────────────────────────────────────
  'cohere': {
    npm: ['cohere-ai'],
    pip: ['cohere'],
    imports: ['from cohere import', 'import cohere', "require('cohere-ai')"],
    env_vars: ['COHERE_API_KEY'],
    api_calls: ['co.generate', 'co.embed', 'co.chat', 'co.rerank', 'cohere.Client('],
    domains: ['api.cohere.ai', 'api.cohere.com'],
  },
  'cohere-embed': {
    npm: ['cohere-ai'],
    pip: ['cohere'],
    imports: ['from cohere import', 'import cohere'],
    env_vars: ['COHERE_API_KEY'],
    api_calls: ['co.embed', 'co.embed_jobs.create', 'embed-english-v3.0', 'embed-multilingual-v3.0'],
    domains: ['api.cohere.com'],
  },
  'cohere-command-r': {
    npm: ['cohere-ai'],
    pip: ['cohere'],
    imports: ['from cohere import', 'import cohere'],
    env_vars: ['COHERE_API_KEY'],
    api_calls: ['co.chat', 'command-r-plus', 'command-r-08-2024'],
    domains: ['api.cohere.com'],
  },
  'hugging-face': {
    ...TRANSFORMERS_BASE,
    npm: [...TRANSFORMERS_BASE.npm, '@huggingface/hub', '@xenova/transformers'],
    pip: [...TRANSFORMERS_BASE.pip, 'datasets', 'accelerate', 'peft'],
  },
  'voyage-ai': {
    npm: ['voyageai'],
    pip: ['voyageai'],
    imports: ['import voyageai', 'from voyageai import'],
    env_vars: ['VOYAGE_API_KEY'],
    api_calls: ['vo.embed', 'voyageai.Client()', 'voyage-3', 'voyage-code-3'],
    domains: ['api.voyageai.com'],
  },
  'pinecone': {
    npm: ['@pinecone-database/pinecone'],
    pip: ['pinecone-client', 'pinecone'],
    imports: ['from pinecone import', 'import { Pinecone }', "require('@pinecone-database/pinecone')"],
    env_vars: ['PINECONE_API_KEY', 'PINECONE_INDEX_NAME', 'PINECONE_ENVIRONMENT', 'PINECONE_HOST'],
    api_calls: ['new Pinecone(', 'index.upsert(', 'index.query(', 'pc.Index('],
    domains: ['*.pinecone.io', 'controller.us-east1-gcp.pinecone.io'],
  },
  'weaviate': {
    npm: ['weaviate-client'],
    pip: ['weaviate-client'],
    imports: ['import weaviate', 'import { WeaviateClient }', "require('weaviate-client')"],
    env_vars: ['WEAVIATE_URL', 'WEAVIATE_API_KEY', 'WEAVIATE_HOST'],
    api_calls: ['weaviate.connect_to_weaviate_cloud(', 'client.collections.create(', 'WeaviateClient('],
    domains: ['*.weaviate.network', '*.weaviate.cloud', 'console.weaviate.cloud'],
  },
  'chroma': {
    npm: ['chromadb'],
    pip: ['chromadb'],
    imports: ['from chromadb', 'import { ChromaClient }', "require('chromadb')"],
    env_vars: ['CHROMA_HOST', 'CHROMA_PORT', 'CHROMA_SERVER_AUTHN_CREDENTIALS'],
    api_calls: ['chromaClient.createCollection(', 'ChromaClient()', 'new ChromaClient('],
    domains: ['api.trychroma.com'],
  },

  // ── Agentic frameworks ─────────────────────────────────────────────────────
  'langchain': {
    npm: ['langchain', '@langchain/core', '@langchain/openai', '@langchain/anthropic', '@langchain/community'],
    pip: ['langchain', 'langchain-core', 'langchain-openai', 'langchain-anthropic', 'langchain-community'],
    imports: ['from langchain', 'from langchain.llms', 'from langchain_openai', 'from langchain.chains', 'from langchain_anthropic'],
    env_vars: ['LANGCHAIN_API_KEY', 'LANGCHAIN_TRACING_V2', 'LANGCHAIN_PROJECT', 'LANGCHAIN_ENDPOINT'],
    api_calls: ['new ChatOpenAI(', 'createRetrievalChain(', 'AgentExecutor', 'createOpenAIFunctionsAgent(', 'RunnableSequence'],
    domains: ['api.smith.langchain.com', 'smith.langchain.com'],
  },
  'langgraph': {
    npm: ['@langchain/langgraph', '@langchain/core'],
    pip: ['langgraph', 'langchain-core'],
    imports: ['from langgraph.graph', 'import { StateGraph }', 'from langgraph'],
    env_vars: ['LANGCHAIN_API_KEY', 'LANGSMITH_API_KEY'],
    api_calls: ['StateGraph(', 'createReactAgent(', 'graph.addNode(', 'CompiledStateGraph'],
    domains: ['api.smith.langchain.com'],
  },
  'crewai': {
    npm: [],
    pip: ['crewai', 'crewai-tools'],
    imports: ['from crewai import', 'from crewai_tools import'],
    env_vars: ['OPENAI_API_KEY', 'CREWAI_TELEMETRY_OPT_OUT'],
    api_calls: ['Crew(', 'Agent(', 'Task(', 'crew.kickoff('],
    domains: ['app.crewai.com', 'api.crewai.com'],
  },
  'autogen': {
    npm: [],
    pip: ['pyautogen', 'autogen-agentchat', 'autogen-ext'],
    imports: ['import autogen', 'from autogen import', 'from autogen_agentchat import'],
    env_vars: ['OPENAI_API_KEY'],
    api_calls: ['ConversableAgent(', 'AssistantAgent(', 'UserProxyAgent(', 'GroupChat('],
    domains: ['microsoft.github.io/autogen'],
  },
  'autogpt': {
    npm: [],
    pip: [],
    imports: ['from autogpt', 'autogpt'],
    env_vars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'AUTOGPT_WORKSPACE'],
    api_calls: [],
    domains: ['platform.agpt.co', 'agpt.co'],
  },

  // ── Observability & MLOps ──────────────────────────────────────────────────
  'langfuse': {
    npm: ['langfuse', 'langfuse-langchain'],
    pip: ['langfuse'],
    imports: ['from langfuse import', 'import { Langfuse }', "require('langfuse')"],
    env_vars: ['LANGFUSE_PUBLIC_KEY', 'LANGFUSE_SECRET_KEY', 'LANGFUSE_HOST', 'LANGFUSE_BASEURL'],
    api_calls: ['new Langfuse(', 'langfuse.trace(', 'langfuse.generation(', 'langfuse.span('],
    domains: ['cloud.langfuse.com', 'us.cloud.langfuse.com'],
  },
  'weights-biases': {
    npm: ['wandb'],
    pip: ['wandb'],
    imports: ['import wandb', "require('wandb')"],
    env_vars: ['WANDB_API_KEY', 'WANDB_PROJECT', 'WANDB_ENTITY', 'WANDB_DIR'],
    api_calls: ['wandb.init(', 'wandb.log(', 'wandb.finish(', 'wandb.run'],
    domains: ['api.wandb.ai', 'app.wandb.ai'],
  },
  'mlflow': {
    npm: [],
    pip: ['mlflow'],
    imports: ['import mlflow', 'from mlflow import'],
    env_vars: ['MLFLOW_TRACKING_URI', 'MLFLOW_S3_ENDPOINT_URL', 'MLFLOW_EXPERIMENT_NAME'],
    api_calls: ['mlflow.start_run(', 'mlflow.log_metric(', 'mlflow.log_artifact(', 'mlflow.set_experiment('],
    domains: ['mlflow.org'],
  },

  // ── Data annotation ────────────────────────────────────────────────────────
  'scale-ai': {
    npm: ['scaleapi'],
    pip: ['scaleapi'],
    imports: ['from scaleapi import', 'import scaleapi', "require('scaleapi')"],
    env_vars: ['SCALE_API_KEY'],
    api_calls: ['scaleClient.createTask(', 'ScaleClient(', 'client.create_task('],
    domains: ['api.scale.com', 'dashboard.scale.com'],
  },
  'labelbox': {
    npm: ['labelbox'],
    pip: ['labelbox'],
    imports: ['import labelbox as lb', 'from labelbox import', "require('labelbox')"],
    env_vars: ['LABELBOX_API_KEY'],
    api_calls: ['lb.Client(', 'client.create_dataset(', 'client.get_project('],
    domains: ['api.labelbox.com', 'app.labelbox.com'],
  },
  'roboflow': {
    npm: ['roboflow'],
    pip: ['roboflow', 'roboflowai'],
    imports: ['from roboflow import', 'import roboflow', "require('roboflow')"],
    env_vars: ['ROBOFLOW_API_KEY'],
    api_calls: ['rf.workspace(', 'Roboflow()', 'project.version('],
    domains: ['api.roboflow.com', 'detect.roboflow.com', 'app.roboflow.com'],
  },

  // ── Media AI ───────────────────────────────────────────────────────────────
  'midjourney': {
    npm: ['midjourney', 'node-midjourney'],
    pip: [],
    imports: ["require('midjourney')", 'import { Midjourney }'],
    env_vars: ['MIDJOURNEY_API_KEY', 'MIDJOURNEY_TOKEN'],
    api_calls: ['midjourney.imagine(', 'Midjourney(', 'client.Imagine('],
    domains: ['midjourney.com', 'discord.com/api'],
  },
  'stable-diffusion': {
    npm: [],
    pip: ['diffusers', 'torch', 'torchvision', 'stability-sdk'],
    imports: ['from diffusers import', 'from stability_sdk import', 'StableDiffusionPipeline', 'StableDiffusionXLPipeline'],
    env_vars: ['STABILITY_API_KEY', 'STABILITY_HOST', 'SD_WEBUI_URL'],
    api_calls: ['StableDiffusionPipeline.from_pretrained(', 'pipe(', 'stability_api.generate('],
    domains: ['api.stability.ai', 'stablediffusionapi.com'],
  },
  'stability-ai': {
    npm: ['@stability-ai/sdk'],
    pip: ['stability-sdk'],
    imports: ['from stability_sdk import', 'import { StabilityClient }'],
    env_vars: ['STABILITY_API_KEY', 'STABILITY_CLIENT_ID'],
    api_calls: ['StabilityInference(', 'stability_api.generate(', 'StabilityClient('],
    domains: ['api.stability.ai', 'grpc.stability.ai'],
  },
  'dall-e-3': {
    npm: ['openai'],
    pip: ['openai'],
    imports: ['from openai import OpenAI', 'import OpenAI from'],
    env_vars: ['OPENAI_API_KEY'],
    api_calls: ['openai.images.generate(', 'client.images.generate(', 'dall-e-3', 'dall-e-2'],
    domains: ['api.openai.com'],
  },
  'runway': {
    npm: ['@runwayml/sdk'],
    pip: ['runwayml'],
    imports: ["require('@runwayml/sdk')", 'import RunwayML from', 'from runwayml import'],
    env_vars: ['RUNWAYML_API_SECRET', 'RUNWAY_API_KEY'],
    api_calls: ['client.imageToVideo.create(', 'RunwayML(', 'client.textToImage.create('],
    domains: ['api.runwayml.com', 'runway.com'],
  },
  'synthesia': {
    npm: ['synthesia-sdk'],
    pip: ['synthesia'],
    imports: ["require('synthesia-sdk')", 'import Synthesia'],
    env_vars: ['SYNTHESIA_API_KEY'],
    api_calls: ['synthesia.videos.create(', 'synthesia.avatars.list('],
    domains: ['api.synthesia.io', 'app.synthesia.io'],
  },
  'heygen': {
    npm: ['heygen'],
    pip: [],
    imports: ["require('heygen')", 'import HeyGen', 'import { HeyGenSDK }'],
    env_vars: ['HEYGEN_API_KEY'],
    api_calls: ['heygen.video.create(', 'HeyGenSDK(', 'client.avatar.list('],
    domains: ['api.heygen.com', 'app.heygen.com'],
  },
  'd-id': {
    npm: ['@d-id/client'],
    pip: ['did-sdk'],
    imports: ["require('@d-id/client')", 'import { createTalks }'],
    env_vars: ['DID_API_KEY'],
    api_calls: ['createTalks(', 'createPresenter(', 'talks.create('],
    domains: ['api.d-id.com', 'studio.d-id.com'],
  },

  // ── Audio AI ───────────────────────────────────────────────────────────────
  'elevenlabs': {
    npm: ['elevenlabs'],
    pip: ['elevenlabs'],
    imports: ['from elevenlabs import', 'import { ElevenLabsClient }', "require('elevenlabs')"],
    env_vars: ['ELEVENLABS_API_KEY', 'ELEVEN_API_KEY', 'XI_API_KEY'],
    api_calls: ['elevenlabs.generate(', 'generate(text=', 'client.text_to_speech.convert(', 'ElevenLabsClient('],
    domains: ['api.elevenlabs.io', 'elevenlabs.io'],
  },
  'whisper': {
    npm: ['openai'],
    pip: ['openai-whisper', 'openai', 'faster-whisper'],
    imports: ['import whisper', 'from faster_whisper import', 'openai.audio.transcriptions'],
    env_vars: ['OPENAI_API_KEY'],
    api_calls: ['openai.audio.transcriptions.create(', 'whisper.load_model(', 'WhisperModel('],
    domains: ['api.openai.com'],
  },
  'deepgram': {
    npm: ['@deepgram/sdk'],
    pip: ['deepgram-sdk'],
    imports: ['from deepgram import', 'import { createClient }', "require('@deepgram/sdk')"],
    env_vars: ['DEEPGRAM_API_KEY'],
    api_calls: ['deepgram.listen.prerecorded.transcribeFile(', 'createClient(', 'deepgram.transcription'],
    domains: ['api.deepgram.com'],
  },
  'rev-ai': {
    npm: ['revai'],
    pip: ['rev_ai'],
    imports: ['from rev_ai import', 'import { RevAiApiClient }', "require('revai')"],
    env_vars: ['REV_AI_API_KEY', 'REV_ACCESS_TOKEN'],
    api_calls: ['client.submitJobLocalFile(', 'RevAiApiClient(', 'client.get_transcript_text('],
    domains: ['api.rev.ai'],
  },

  // ── Translation ────────────────────────────────────────────────────────────
  'deepl': {
    npm: ['deepl-node'],
    pip: ['deepl'],
    imports: ['import deepl', "import * as deepl from 'deepl-node'", "require('deepl-node')"],
    env_vars: ['DEEPL_API_KEY', 'DEEPL_API_AUTH_KEY', 'DEEPL_FREE_API_KEY'],
    api_calls: ['translator.translateText(', 'deepl.Translator(', 'translator.translate_text('],
    domains: ['api.deepl.com', 'api-free.deepl.com'],
  },

  // ── Writing AI ─────────────────────────────────────────────────────────────
  'jasper': {
    npm: [],
    pip: [],
    imports: [],
    env_vars: ['JASPER_API_KEY'],
    api_calls: [],
    domains: ['api.jasper.ai', 'app.jasper.ai'],
  },
  'copy-ai': {
    npm: [],
    pip: [],
    imports: [],
    env_vars: ['COPY_AI_API_KEY', 'COPYAI_API_KEY'],
    api_calls: [],
    domains: ['api.copy.ai', 'app.copy.ai'],
  },
  'writesonic': {
    npm: [],
    pip: [],
    imports: [],
    env_vars: ['WRITESONIC_API_KEY'],
    api_calls: [],
    domains: ['api.writesonic.com', 'app.writesonic.com'],
  },
  'notion-ai': {
    npm: ['@notionhq/client'],
    pip: ['notion-client'],
    imports: ["require('@notionhq/client')", 'import { Client } from "@notionhq/client"', 'from notion_client import'],
    env_vars: ['NOTION_TOKEN', 'NOTION_API_KEY', 'NOTION_SECRET'],
    api_calls: ['notion.pages.create(', 'Client({ auth:', 'notion.databases.query('],
    domains: ['api.notion.so', 'www.notion.so'],
  },

  // ── Search / Research AI ───────────────────────────────────────────────────
  'perplexity-ai': {
    npm: ['openai'],
    pip: ['openai'],
    imports: ['from openai import OpenAI'],
    env_vars: ['PERPLEXITY_API_KEY', 'PPLX_API_KEY'],
    api_calls: ["baseURL: 'https://api.perplexity.ai'", 'llama-3.1-sonar-', 'sonar-pro', 'sonar-reasoning'],
    domains: ['api.perplexity.ai', 'www.perplexity.ai'],
  },

  // ── B2B / Enterprise AI platforms ─────────────────────────────────────────
  'c3-ai': {
    npm: [],
    pip: ['c3ai'],
    imports: ['import c3ai', 'from c3ai import'],
    env_vars: ['C3_API_KEY', 'C3_API_URL'],
    api_calls: ['c3.type(', 'c3.fetch(', 'c3.evaluate('],
    domains: ['api.c3.ai', 'app.c3.ai'],
  },
  'datarobot': {
    npm: [],
    pip: ['datarobot'],
    imports: ['import datarobot as dr', 'from datarobot import'],
    env_vars: ['DATAROBOT_API_TOKEN', 'DATAROBOT_ENDPOINT'],
    api_calls: ['dr.Client(', 'dr.Project.create(', 'dr.Model.get('],
    domains: ['app.datarobot.com', 'app2.datarobot.com'],
  },
  'h2o-ai': {
    npm: [],
    pip: ['h2o', 'h2o-wave', 'h2ogpt'],
    imports: ['import h2o', 'from h2o import', 'from h2o_wave import'],
    env_vars: ['H2O_API_KEY', 'H2O_CLOUD_URL'],
    api_calls: ['h2o.init(', 'H2OAutoML(', 'h2o.import_file('],
    domains: ['api.h2o.ai', 'cloud.h2o.ai'],
  },
};

// ─── Seed runner ──────────────────────────────────────────────────────────────

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const slugs = Object.keys(DETECTION_PATTERNS);
  console.log(`\n🔍 Seeding detection patterns for ${slugs.length} tools...\n`);

  let updated = 0;
  let notFound = 0;

  for (const slug of slugs) {
    const patterns = DETECTION_PATTERNS[slug];

    const result = await pool.query(
      `UPDATE "RegistryTool"
       SET "detectionPatterns" = $1
       WHERE slug = $2
       RETURNING slug, name`,
      [JSON.stringify(patterns), slug],
    );

    if (result.rows.length > 0) {
      updated++;
      console.log(`  ✓ ${slug} (${result.rows[0].name})`);
    } else {
      notFound++;
      console.log(`  ○ ${slug} — not found in DB (skipped)`);
    }
  }

  // Summary
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`✅ Seeded: ${updated} tools`);
  console.log(`○  Not found in DB: ${notFound} tools`);

  // Verify coverage
  const coverage = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE "detectionPatterns" IS NOT NULL) AS with_patterns,
      COUNT(*) AS total
    FROM "RegistryTool"
  `);
  const { with_patterns, total } = coverage.rows[0];
  console.log(`\n📊 DB coverage: ${with_patterns} / ${total} tools have detectionPatterns`);

  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
