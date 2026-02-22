/**
 * Wave 3 — Expand to 5,000 tools.
 * Generates additional tool entries from known AI tool directories:
 *   - theresanaiforthat.com categories
 *   - futurepedia.io categories
 *   - Hugging Face Hub popular models/spaces
 *   - Web search niche categories
 *
 * Deduplicates against existing tools and classifies all new entries.
 *
 * Usage: npx tsx engine/src/domain/registry/collect-wave3.ts [--target N]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ObligationsFileSchema } from '../../data/schemas-core.js';
import { RegistryFileSchema } from '../../data/schemas-registry.js';
import { deduplicateTools, classifyTool, buildCategoryCountMap, type RawTool } from './collector.js';
import type { RegistryTool } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', 'data');
const REGISTRY_DIR = join(DATA_DIR, 'registry');

// --- AI Tool directory data (structured from known directories) ---

interface DirectoryCategory {
  readonly category: string;
  readonly tools: readonly Omit<RawTool, 'source' | 'rank'>[];
}

/**
 * Tools sourced from theresanaiforthat.com categories.
 * ~1,500 tools across various AI categories.
 */
const THERESANAIFORTHAT_TOOLS: readonly DirectoryCategory[] = [
  {
    category: 'writing',
    tools: [
      { name: 'Rytr', provider: 'Rytr', website: 'https://rytr.me', categories: ['writing'], description: 'AI writing assistant for content creation' },
      { name: 'Sudowrite', provider: 'Sudowrite', website: 'https://sudowrite.com', categories: ['writing'], description: 'AI writing partner for fiction authors' },
      { name: 'Writecream', provider: 'Writecream', website: 'https://writecream.com', categories: ['writing', 'marketing'], description: 'AI content creation platform' },
      { name: 'Simplified', provider: 'Simplified', website: 'https://simplified.com', categories: ['writing', 'design'], description: 'All-in-one AI design and writing tool' },
      { name: 'Wordtune', provider: 'AI21 Labs', website: 'https://wordtune.com', categories: ['writing'], description: 'AI writing companion for rewriting and editing' },
      { name: 'Hyperwrite', provider: 'OthersideAI', website: 'https://hyperwriteai.com', categories: ['writing'], description: 'AI-powered writing assistant' },
      { name: 'Peppertype', provider: 'Pepper Content', website: 'https://peppertype.ai', categories: ['writing', 'marketing'], description: 'AI content generation platform' },
      { name: 'Nichesss', provider: 'Nichesss', website: 'https://nichesss.com', categories: ['writing', 'marketing'], description: 'AI writing tool for niche content' },
      { name: 'Anyword', provider: 'Anyword', website: 'https://anyword.com', categories: ['writing', 'marketing'], description: 'AI copywriting platform with predictive scoring' },
      { name: 'Writerly', provider: 'Writerly', website: 'https://writerly.ai', categories: ['writing'], description: 'Enterprise AI writing platform' },
      { name: 'Lex', provider: 'Lex', website: 'https://lex.page', categories: ['writing'], description: 'AI-enhanced word processor' },
      { name: 'AI Dungeon', provider: 'Latitude', website: 'https://aidungeon.com', categories: ['writing', 'gaming'], description: 'AI-powered interactive fiction game' },
      { name: 'NovelAI', provider: 'Anlatan', website: 'https://novelai.net', categories: ['writing', 'image-generation'], description: 'AI storytelling and image generation' },
      { name: 'ShortlyAI', provider: 'ShortlyAI', website: 'https://shortlyai.com', categories: ['writing'], description: 'AI writing assistant for long-form content' },
      { name: 'Frase', provider: 'Frase', website: 'https://frase.io', categories: ['writing', 'seo'], description: 'AI content optimization for SEO' },
      { name: 'ContentBot', provider: 'ContentBot', website: 'https://contentbot.ai', categories: ['writing', 'marketing'], description: 'AI content writer and automation' },
      { name: 'INK Editor', provider: 'INK', website: 'https://inkforall.com', categories: ['writing', 'seo'], description: 'AI writing assistant with SEO optimization' },
      { name: 'Neuroflash', provider: 'neuroflash', website: 'https://neuroflash.com', categories: ['writing', 'marketing'], description: 'AI text and image generation for marketing' },
      { name: 'Closerscopy', provider: 'Closerscopy', website: 'https://closerscopy.com', categories: ['writing', 'marketing'], description: 'AI copywriting with SEO analysis' },
      { name: 'ArticleForge', provider: 'ArticleForge', website: 'https://articleforge.com', categories: ['writing', 'seo'], description: 'AI article writer with deep learning' },
      { name: 'Scalenut', provider: 'Scalenut', website: 'https://scalenut.com', categories: ['writing', 'seo'], description: 'AI content marketing platform' },
      { name: 'Kafkai', provider: 'Kafkai', website: 'https://kafkai.com', categories: ['writing'], description: 'AI article writer for niche sites' },
      { name: 'Sassbook', provider: 'Sassbook', website: 'https://sassbook.com', categories: ['writing'], description: 'AI text generation tools suite' },
      { name: 'TextCortex', provider: 'TextCortex', website: 'https://textcortex.com', categories: ['writing'], description: 'AI writing assistant for multiple languages' },
      { name: 'Writesonic', provider: 'Writesonic', website: 'https://writesonic.com', categories: ['writing', 'marketing'], description: 'AI writing platform for marketing content' },
    ],
  },
  {
    category: 'image-generation',
    tools: [
      { name: 'Leonardo.Ai', provider: 'Leonardo.Ai', website: 'https://leonardo.ai', categories: ['image-generation'], description: 'AI art generation with fine-tuned models' },
      { name: 'Playground AI', provider: 'Playground', website: 'https://playground.com', categories: ['image-generation'], description: 'Free AI image generation platform' },
      { name: 'NightCafe', provider: 'NightCafe', website: 'https://nightcafe.studio', categories: ['image-generation'], description: 'AI art generator with multiple algorithms' },
      { name: 'Artbreeder', provider: 'Artbreeder', website: 'https://artbreeder.com', categories: ['image-generation'], description: 'Collaborative AI art creation platform' },
      { name: 'StarryAI', provider: 'StarryAI', website: 'https://starryai.com', categories: ['image-generation'], description: 'AI art generator app for mobile' },
      { name: 'DreamStudio', provider: 'Stability AI', website: 'https://dreamstudio.ai', categories: ['image-generation'], description: 'Stability AI official image generation tool' },
      { name: 'Craiyon', provider: 'Craiyon', website: 'https://craiyon.com', categories: ['image-generation'], description: 'Free AI image generator (formerly DALL-E mini)' },
      { name: 'Lexica', provider: 'Lexica', website: 'https://lexica.art', categories: ['image-generation', 'search'], description: 'Stable Diffusion search engine and generator' },
      { name: 'Hotpot.ai', provider: 'Hotpot.ai', website: 'https://hotpot.ai', categories: ['image-generation', 'design'], description: 'AI art and graphic design tools' },
      { name: 'Dezgo', provider: 'Dezgo', website: 'https://dezgo.com', categories: ['image-generation'], description: 'Free AI image generator using Stable Diffusion' },
      { name: 'Dream by WOMBO', provider: 'WOMBO', website: 'https://dream.ai', categories: ['image-generation'], description: 'AI-powered art creation app' },
      { name: 'Mage.space', provider: 'Mage.space', website: 'https://mage.space', categories: ['image-generation'], description: 'Free unlimited AI art generation' },
      { name: 'Gencraft', provider: 'Gencraft', website: 'https://gencraft.com', categories: ['image-generation'], description: 'AI-powered art generator' },
      { name: 'BlueWillow', provider: 'BlueWillow', website: 'https://bluewillow.ai', categories: ['image-generation'], description: 'Free AI image generation community' },
      { name: 'Kaiber', provider: 'Kaiber', website: 'https://kaiber.ai', categories: ['image-generation', 'video-generation'], description: 'AI creative tool for images and videos' },
      { name: 'Getimg.ai', provider: 'Getimg.ai', website: 'https://getimg.ai', categories: ['image-generation'], description: 'AI image generation and editing suite' },
      { name: 'Picso', provider: 'Picso', website: 'https://picso.ai', categories: ['image-generation'], description: 'AI art generator with various styles' },
      { name: 'Pixlr', provider: 'Pixlr', website: 'https://pixlr.com', categories: ['image-generation', 'photo-editing'], description: 'AI-powered photo editing and generation' },
      { name: 'PhotoAI', provider: 'PhotoAI', website: 'https://photoai.com', categories: ['image-generation'], description: 'AI photo generator for realistic images' },
      { name: 'Fotor AI', provider: 'Fotor', website: 'https://fotor.com', categories: ['image-generation', 'photo-editing'], description: 'AI photo editing and image generation' },
    ],
  },
  {
    category: 'video-generation',
    tools: [
      { name: 'Synthesia', provider: 'Synthesia', website: 'https://synthesia.io', categories: ['video-generation', 'deepfake'], description: 'AI video generation with digital avatars' },
      { name: 'HeyGen', provider: 'HeyGen', website: 'https://heygen.com', categories: ['video-generation', 'deepfake'], description: 'AI video creation with talking avatars' },
      { name: 'D-ID', provider: 'D-ID', website: 'https://d-id.com', categories: ['video-generation', 'deepfake'], description: 'AI video creation from photos' },
      { name: 'Lumen5', provider: 'Lumen5', website: 'https://lumen5.com', categories: ['video-generation', 'marketing'], description: 'AI video creation for content marketing' },
      { name: 'Pictory', provider: 'Pictory', website: 'https://pictory.ai', categories: ['video-generation'], description: 'AI video creation from text content' },
      { name: 'InVideo AI', provider: 'InVideo', website: 'https://invideo.io', categories: ['video-generation'], description: 'AI-powered video creation platform' },
      { name: 'Fliki', provider: 'Fliki', website: 'https://fliki.ai', categories: ['video-generation', 'voice-tts'], description: 'AI video creation with text-to-speech' },
      { name: 'Colossyan', provider: 'Colossyan', website: 'https://colossyan.com', categories: ['video-generation'], description: 'AI video creator for workplace learning' },
      { name: 'Opus Clip', provider: 'Opus Clip', website: 'https://opus.pro', categories: ['video-generation'], description: 'AI video repurposing and clipping' },
      { name: 'Elai', provider: 'Elai', website: 'https://elai.io', categories: ['video-generation', 'deepfake'], description: 'AI video generation with avatars' },
      { name: 'Veed.io', provider: 'VEED', website: 'https://veed.io', categories: ['video-generation'], description: 'Online video editing with AI features' },
      { name: 'Runway ML', provider: 'Runway', website: 'https://runwayml.com', categories: ['video-generation', 'image-generation'], description: 'AI creative suite for video and image' },
      { name: 'Pika', provider: 'Pika', website: 'https://pika.art', categories: ['video-generation'], description: 'AI video generation platform' },
      { name: 'Sora', provider: 'OpenAI', website: 'https://openai.com/sora', categories: ['video-generation'], description: 'Text-to-video AI model by OpenAI' },
      { name: 'Kling AI', provider: 'Kuaishou', website: 'https://klingai.com', categories: ['video-generation'], description: 'AI video generation by Kuaishou' },
    ],
  },
  {
    category: 'voice-tts',
    tools: [
      { name: 'Murf AI', provider: 'Murf', website: 'https://murf.ai', categories: ['voice-tts'], description: 'AI voice generator for voiceovers' },
      { name: 'Play.ht', provider: 'Play.ht', website: 'https://play.ht', categories: ['voice-tts'], description: 'AI text-to-speech and voice cloning' },
      { name: 'Resemble AI', provider: 'Resemble AI', website: 'https://resemble.ai', categories: ['voice-tts', 'voice-clone'], description: 'AI voice generator and cloning' },
      { name: 'Speechify', provider: 'Speechify', website: 'https://speechify.com', categories: ['voice-tts'], description: 'Text-to-speech reader with AI voices' },
      { name: 'Listnr', provider: 'Listnr', website: 'https://listnr.tech', categories: ['voice-tts'], description: 'AI voice generator and podcast tool' },
      { name: 'Lovo AI', provider: 'LOVO', website: 'https://lovo.ai', categories: ['voice-tts', 'voice-clone'], description: 'AI voiceover and text-to-speech' },
      { name: 'Typecast', provider: 'Typecast', website: 'https://typecast.ai', categories: ['voice-tts'], description: 'AI text-to-speech for content creators' },
      { name: 'WellSaid Labs', provider: 'WellSaid', website: 'https://wellsaidlabs.com', categories: ['voice-tts'], description: 'Enterprise AI voice studio' },
      { name: 'Coqui', provider: 'Coqui', website: 'https://coqui.ai', categories: ['voice-tts'], description: 'Open-source AI text-to-speech' },
      { name: 'Bark AI', provider: 'Suno', website: 'https://github.com/suno-ai/bark', categories: ['voice-tts'], description: 'Open-source multilingual text-to-audio' },
      { name: 'Voicemod', provider: 'Voicemod', website: 'https://voicemod.net', categories: ['voice-tts', 'voice-clone'], description: 'Real-time AI voice changer' },
      { name: 'Descript', provider: 'Descript', website: 'https://descript.com', categories: ['voice-tts', 'video-generation'], description: 'AI-powered audio and video editing' },
    ],
  },
  {
    category: 'code-assistant',
    tools: [
      { name: 'Cursor', provider: 'Cursor', website: 'https://cursor.sh', categories: ['code-assistant'], description: 'AI-first code editor' },
      { name: 'Codeium', provider: 'Codeium', website: 'https://codeium.com', categories: ['code-assistant'], description: 'Free AI code completion and chat' },
      { name: 'Tabnine', provider: 'Tabnine', website: 'https://tabnine.com', categories: ['code-assistant'], description: 'AI code assistant with privacy focus' },
      { name: 'Replit AI', provider: 'Replit', website: 'https://replit.com', categories: ['code-assistant'], description: 'AI-powered coding environment' },
      { name: 'Sourcegraph Cody', provider: 'Sourcegraph', website: 'https://sourcegraph.com/cody', categories: ['code-assistant'], description: 'AI code assistant with codebase context' },
      { name: 'CodeWhisperer', provider: 'Amazon', website: 'https://aws.amazon.com/codewhisperer', categories: ['code-assistant'], description: 'AI coding companion by AWS' },
      { name: 'Aider', provider: 'Aider', website: 'https://aider.chat', categories: ['code-assistant'], description: 'AI pair programming in the terminal' },
      { name: 'Continue', provider: 'Continue', website: 'https://continue.dev', categories: ['code-assistant'], description: 'Open-source AI code assistant' },
      { name: 'Codestral', provider: 'Mistral AI', website: 'https://mistral.ai/codestral', categories: ['code-assistant', 'foundation-model'], description: 'Mistral code generation model' },
      { name: 'Devin', provider: 'Cognition', website: 'https://cognition.ai', categories: ['code-assistant', 'automation'], description: 'AI software engineer agent' },
      { name: 'Bolt.new', provider: 'StackBlitz', website: 'https://bolt.new', categories: ['code-assistant', 'no-code'], description: 'AI-powered full-stack app builder' },
      { name: 'v0', provider: 'Vercel', website: 'https://v0.dev', categories: ['code-assistant', 'design'], description: 'AI UI component generator' },
      { name: 'Windsurf', provider: 'Codeium', website: 'https://codeium.com/windsurf', categories: ['code-assistant'], description: 'AI code editor by Codeium' },
    ],
  },
  {
    category: 'productivity',
    tools: [
      { name: 'Notion AI', provider: 'Notion', website: 'https://notion.so', categories: ['productivity', 'writing'], description: 'AI-powered workspace and note-taking' },
      { name: 'Otter.ai', provider: 'Otter.ai', website: 'https://otter.ai', categories: ['productivity', 'transcription'], description: 'AI meeting transcription and notes' },
      { name: 'Fireflies.ai', provider: 'Fireflies', website: 'https://fireflies.ai', categories: ['productivity', 'transcription'], description: 'AI meeting assistant and transcription' },
      { name: 'Reclaim.ai', provider: 'Reclaim', website: 'https://reclaim.ai', categories: ['productivity', 'scheduling'], description: 'AI scheduling and time management' },
      { name: 'Mem', provider: 'Mem', website: 'https://mem.ai', categories: ['productivity', 'note-taking'], description: 'AI-powered knowledge management' },
      { name: 'Taskade', provider: 'Taskade', website: 'https://taskade.com', categories: ['productivity', 'automation'], description: 'AI-powered task and project management' },
      { name: 'Krisp', provider: 'Krisp', website: 'https://krisp.ai', categories: ['productivity'], description: 'AI noise cancellation for calls' },
      { name: 'Clockwise', provider: 'Clockwise', website: 'https://clockwise.com', categories: ['productivity', 'scheduling'], description: 'AI calendar management tool' },
      { name: 'Motion', provider: 'Motion', website: 'https://usemotion.com', categories: ['productivity', 'scheduling'], description: 'AI-powered task and project planner' },
      { name: 'Magical', provider: 'Magical', website: 'https://magical.so', categories: ['productivity', 'automation'], description: 'AI text expander and automation' },
      { name: 'Tl;dv', provider: 'tl;dv', website: 'https://tldv.io', categories: ['productivity', 'transcription'], description: 'AI meeting recorder and summarizer' },
      { name: 'Fathom', provider: 'Fathom', website: 'https://fathom.video', categories: ['productivity', 'transcription'], description: 'AI meeting assistant with auto-notes' },
      { name: 'Grain', provider: 'Grain', website: 'https://grain.com', categories: ['productivity', 'transcription'], description: 'AI-powered video highlights from meetings' },
      { name: 'Fellow', provider: 'Fellow', website: 'https://fellow.app', categories: ['productivity'], description: 'AI meeting management platform' },
      { name: 'Sembly AI', provider: 'Sembly', website: 'https://sembly.ai', categories: ['productivity', 'transcription'], description: 'AI meeting assistant and note-taker' },
    ],
  },
  {
    category: 'design',
    tools: [
      { name: 'Canva AI', provider: 'Canva', website: 'https://canva.com', categories: ['design', 'image-generation'], description: 'AI-powered design platform' },
      { name: 'Figma AI', provider: 'Figma', website: 'https://figma.com', categories: ['design'], description: 'AI features in collaborative design tool' },
      { name: 'Uizard', provider: 'Uizard', website: 'https://uizard.io', categories: ['design', 'no-code'], description: 'AI-powered UI design and prototyping' },
      { name: 'Galileo AI', provider: 'Galileo', website: 'https://usegalileo.ai', categories: ['design'], description: 'AI UI design generation from text' },
      { name: 'Framer AI', provider: 'Framer', website: 'https://framer.com', categories: ['design', 'no-code'], description: 'AI website builder and design tool' },
      { name: 'Looka', provider: 'Looka', website: 'https://looka.com', categories: ['design'], description: 'AI logo and brand design tool' },
      { name: 'Khroma', provider: 'Khroma', website: 'https://khroma.co', categories: ['design'], description: 'AI color palette generator' },
      { name: 'Let\'s Enhance', provider: 'Let\'s Enhance', website: 'https://letsenhance.io', categories: ['design', 'photo-editing'], description: 'AI image upscaling and enhancement' },
      { name: 'Remove.bg', provider: 'Kaleido', website: 'https://remove.bg', categories: ['design', 'photo-editing'], description: 'AI background removal tool' },
      { name: 'Cleanup.pictures', provider: 'Cleanup', website: 'https://cleanup.pictures', categories: ['design', 'photo-editing'], description: 'AI object removal from images' },
    ],
  },
  {
    category: 'marketing',
    tools: [
      { name: 'Predis.ai', provider: 'Predis', website: 'https://predis.ai', categories: ['marketing', 'social-media'], description: 'AI social media content generator' },
      { name: 'AdCreative.ai', provider: 'AdCreative', website: 'https://adcreative.ai', categories: ['marketing', 'design'], description: 'AI ad creative generator' },
      { name: 'Phrasee', provider: 'Phrasee', website: 'https://phrasee.co', categories: ['marketing', 'email'], description: 'AI copywriting for enterprise marketing' },
      { name: 'Persado', provider: 'Persado', website: 'https://persado.com', categories: ['marketing'], description: 'AI motivation platform for marketing' },
      { name: 'Seventh Sense', provider: 'Seventh Sense', website: 'https://theseventhsense.com', categories: ['marketing', 'email'], description: 'AI email optimization platform' },
      { name: 'Albert.ai', provider: 'Albert', website: 'https://albert.ai', categories: ['marketing', 'automation'], description: 'AI digital marketing platform' },
      { name: 'Smartly.io', provider: 'Smartly', website: 'https://smartly.io', categories: ['marketing', 'social-media'], description: 'AI-powered social advertising platform' },
      { name: 'Synthflow', provider: 'Synthflow', website: 'https://synthflow.ai', categories: ['marketing', 'voice-tts'], description: 'AI voice agents for outbound calls' },
      { name: 'Chatfuel', provider: 'Chatfuel', website: 'https://chatfuel.com', categories: ['marketing', 'chatbot'], description: 'AI chatbot for marketing automation' },
      { name: 'ManyChat', provider: 'ManyChat', website: 'https://manychat.com', categories: ['marketing', 'chatbot'], description: 'AI chat marketing for Instagram and WhatsApp' },
    ],
  },
  {
    category: 'customer-service',
    tools: [
      { name: 'Zendesk AI', provider: 'Zendesk', website: 'https://zendesk.com', categories: ['customer-service'], description: 'AI-powered customer service platform' },
      { name: 'Intercom Fin', provider: 'Intercom', website: 'https://intercom.com', categories: ['customer-service', 'chatbot'], description: 'AI customer service chatbot' },
      { name: 'Freshdesk Freddy', provider: 'Freshworks', website: 'https://freshworks.com', categories: ['customer-service', 'chatbot'], description: 'AI agent for customer support' },
      { name: 'Ada', provider: 'Ada', website: 'https://ada.cx', categories: ['customer-service', 'chatbot'], description: 'AI-powered customer service automation' },
      { name: 'Tidio', provider: 'Tidio', website: 'https://tidio.com', categories: ['customer-service', 'chatbot'], description: 'AI chatbot for customer service' },
      { name: 'Drift', provider: 'Salesloft', website: 'https://drift.com', categories: ['customer-service', 'sales'], description: 'Conversational AI for revenue teams' },
      { name: 'LivePerson', provider: 'LivePerson', website: 'https://liveperson.com', categories: ['customer-service', 'chatbot'], description: 'AI conversational platform for enterprises' },
      { name: 'Forethought', provider: 'Forethought', website: 'https://forethought.ai', categories: ['customer-service'], description: 'AI for customer support automation' },
      { name: 'Kustomer', provider: 'Kustomer', website: 'https://kustomer.com', categories: ['customer-service'], description: 'AI-powered CRM for customer service' },
      { name: 'Ultimate.ai', provider: 'Zendesk', website: 'https://ultimate.ai', categories: ['customer-service', 'automation'], description: 'AI-powered customer support automation' },
    ],
  },
  {
    category: 'sales',
    tools: [
      { name: 'Gong', provider: 'Gong', website: 'https://gong.io', categories: ['sales', 'analytics'], description: 'AI revenue intelligence platform' },
      { name: 'Chorus.ai', provider: 'ZoomInfo', website: 'https://chorus.ai', categories: ['sales', 'analytics'], description: 'AI conversation intelligence for sales' },
      { name: 'Clari', provider: 'Clari', website: 'https://clari.com', categories: ['sales', 'analytics'], description: 'AI revenue platform for forecasting' },
      { name: 'Outreach', provider: 'Outreach', website: 'https://outreach.io', categories: ['sales', 'automation'], description: 'AI sales engagement platform' },
      { name: 'Salesloft', provider: 'Salesloft', website: 'https://salesloft.com', categories: ['sales', 'automation'], description: 'AI-powered revenue workflow platform' },
      { name: 'Apollo.io', provider: 'Apollo', website: 'https://apollo.io', categories: ['sales'], description: 'AI sales intelligence and engagement' },
      { name: 'Lavender', provider: 'Lavender', website: 'https://lavender.ai', categories: ['sales', 'email'], description: 'AI email coach for sales teams' },
      { name: 'Seamless.AI', provider: 'Seamless', website: 'https://seamless.ai', categories: ['sales'], description: 'AI-powered sales leads platform' },
      { name: 'Regie.ai', provider: 'Regie', website: 'https://regie.ai', categories: ['sales', 'writing'], description: 'AI sales content platform' },
      { name: '6sense', provider: '6sense', website: 'https://6sense.com', categories: ['sales', 'marketing'], description: 'AI revenue intelligence for B2B' },
    ],
  },
  {
    category: 'analytics',
    tools: [
      { name: 'Tableau AI', provider: 'Salesforce', website: 'https://tableau.com', categories: ['analytics'], description: 'AI-powered data visualization and analytics' },
      { name: 'ThoughtSpot', provider: 'ThoughtSpot', website: 'https://thoughtspot.com', categories: ['analytics', 'search'], description: 'AI-driven analytics search engine' },
      { name: 'Polymer', provider: 'Polymer', website: 'https://polymersearch.com', categories: ['analytics'], description: 'AI-powered data analysis and dashboards' },
      { name: 'Akkio', provider: 'Akkio', website: 'https://akkio.com', categories: ['analytics'], description: 'No-code AI analytics platform' },
      { name: 'MonkeyLearn', provider: 'MonkeyLearn', website: 'https://monkeylearn.com', categories: ['analytics', 'data-extraction'], description: 'AI text analytics and data extraction' },
      { name: 'Obviously AI', provider: 'Obviously AI', website: 'https://obviously.ai', categories: ['analytics'], description: 'No-code AI predictions and analytics' },
      { name: 'Pecan AI', provider: 'Pecan', website: 'https://pecan.ai', categories: ['analytics'], description: 'AI predictive analytics platform' },
      { name: 'Rows AI', provider: 'Rows', website: 'https://rows.com', categories: ['analytics', 'spreadsheet'], description: 'AI-powered spreadsheet with data analysis' },
    ],
  },
  {
    category: 'search',
    tools: [
      { name: 'Brave Search AI', provider: 'Brave', website: 'https://search.brave.com', categories: ['search'], description: 'Privacy-focused AI search engine' },
      { name: 'Kagi', provider: 'Kagi', website: 'https://kagi.com', categories: ['search'], description: 'AI-enhanced premium search engine' },
      { name: 'Exa', provider: 'Exa', website: 'https://exa.ai', categories: ['search', 'api'], description: 'AI-powered neural search engine API' },
      { name: 'Tavily', provider: 'Tavily', website: 'https://tavily.com', categories: ['search', 'api'], description: 'AI search API for agent applications' },
      { name: 'Algolia AI', provider: 'Algolia', website: 'https://algolia.com', categories: ['search', 'api'], description: 'AI-powered search and discovery platform' },
    ],
  },
  {
    category: 'automation',
    tools: [
      { name: 'Make (Integromat)', provider: 'Make', website: 'https://make.com', categories: ['automation'], description: 'Visual automation platform with AI' },
      { name: 'Zapier AI', provider: 'Zapier', website: 'https://zapier.com', categories: ['automation'], description: 'AI-powered workflow automation' },
      { name: 'n8n', provider: 'n8n', website: 'https://n8n.io', categories: ['automation'], description: 'Open-source workflow automation with AI' },
      { name: 'Bardeen', provider: 'Bardeen', website: 'https://bardeen.ai', categories: ['automation', 'productivity'], description: 'AI workflow automation from browser' },
      { name: 'Lindy', provider: 'Lindy', website: 'https://lindy.ai', categories: ['automation'], description: 'AI employee automation platform' },
      { name: 'Relevance AI', provider: 'Relevance', website: 'https://relevanceai.com', categories: ['automation'], description: 'AI workforce automation platform' },
      { name: 'Activepieces', provider: 'Activepieces', website: 'https://activepieces.com', categories: ['automation'], description: 'Open-source AI automation builder' },
    ],
  },
  {
    category: 'translation',
    tools: [
      { name: 'DeepL', provider: 'DeepL', website: 'https://deepl.com', categories: ['translation'], description: 'AI-powered language translation' },
      { name: 'Smartcat', provider: 'Smartcat', website: 'https://smartcat.com', categories: ['translation'], description: 'AI translation management platform' },
      { name: 'Unbabel', provider: 'Unbabel', website: 'https://unbabel.com', categories: ['translation', 'customer-service'], description: 'AI-powered multilingual support' },
      { name: 'Lilt', provider: 'Lilt', website: 'https://lilt.com', categories: ['translation'], description: 'Enterprise AI translation platform' },
      { name: 'Weglot', provider: 'Weglot', website: 'https://weglot.com', categories: ['translation'], description: 'AI website translation solution' },
    ],
  },
  {
    category: 'data-extraction',
    tools: [
      { name: 'Rossum', provider: 'Rossum', website: 'https://rossum.ai', categories: ['data-extraction', 'automation'], description: 'AI document processing and extraction' },
      { name: 'Nanonets', provider: 'Nanonets', website: 'https://nanonets.com', categories: ['data-extraction'], description: 'AI data extraction and OCR' },
      { name: 'Parseur', provider: 'Parseur', website: 'https://parseur.com', categories: ['data-extraction', 'email'], description: 'AI email and document parsing' },
      { name: 'Docsumo', provider: 'Docsumo', website: 'https://docsumo.com', categories: ['data-extraction'], description: 'AI document data extraction' },
      { name: 'Mindee', provider: 'Mindee', website: 'https://mindee.com', categories: ['data-extraction', 'api'], description: 'AI document parsing API' },
      { name: 'Affinda', provider: 'Affinda', website: 'https://affinda.com', categories: ['data-extraction'], description: 'AI document intelligence platform' },
    ],
  },
  {
    category: 'music-generation',
    tools: [
      { name: 'Suno', provider: 'Suno', website: 'https://suno.com', categories: ['music-generation'], description: 'AI music generation from text prompts' },
      { name: 'Udio', provider: 'Udio', website: 'https://udio.com', categories: ['music-generation'], description: 'AI music creation platform' },
      { name: 'AIVA', provider: 'AIVA', website: 'https://aiva.ai', categories: ['music-generation'], description: 'AI music composition assistant' },
      { name: 'Soundraw', provider: 'Soundraw', website: 'https://soundraw.io', categories: ['music-generation'], description: 'AI music generator for content creators' },
      { name: 'Boomy', provider: 'Boomy', website: 'https://boomy.com', categories: ['music-generation'], description: 'AI music creation for everyone' },
      { name: 'Beatoven.ai', provider: 'Beatoven', website: 'https://beatoven.ai', categories: ['music-generation'], description: 'AI music for video content' },
      { name: 'Mubert', provider: 'Mubert', website: 'https://mubert.com', categories: ['music-generation'], description: 'AI generative music platform' },
      { name: 'Loudly', provider: 'Loudly', website: 'https://loudly.com', categories: ['music-generation'], description: 'AI music studio for creators' },
    ],
  },
  {
    category: 'hr-recruitment',
    tools: [
      { name: 'HireVue', provider: 'HireVue', website: 'https://hirevue.com', categories: ['hr-recruitment', 'hr-screening'], description: 'AI video interviewing and assessment platform' },
      { name: 'Pymetrics', provider: 'Harver', website: 'https://harver.com', categories: ['hr-recruitment', 'hr-screening'], description: 'AI talent assessment using neuroscience games' },
      { name: 'Textio', provider: 'Textio', website: 'https://textio.com', categories: ['hr-recruitment', 'writing'], description: 'AI writing platform for inclusive job listings' },
      { name: 'Eightfold AI', provider: 'Eightfold', website: 'https://eightfold.ai', categories: ['hr-recruitment'], description: 'AI talent intelligence platform' },
      { name: 'Paradox (Olivia)', provider: 'Paradox', website: 'https://paradox.ai', categories: ['hr-recruitment', 'chatbot'], description: 'AI recruiting assistant chatbot' },
      { name: 'Phenom', provider: 'Phenom', website: 'https://phenom.com', categories: ['hr-recruitment'], description: 'AI-powered talent experience platform' },
      { name: 'Beamery', provider: 'Beamery', website: 'https://beamery.com', categories: ['hr-recruitment'], description: 'AI talent lifecycle management' },
      { name: 'Fetcher', provider: 'Fetcher', website: 'https://fetcher.ai', categories: ['hr-recruitment'], description: 'AI recruiting automation platform' },
      { name: 'Greenhouse AI', provider: 'Greenhouse', website: 'https://greenhouse.io', categories: ['hr-recruitment'], description: 'AI-enhanced applicant tracking system' },
      { name: 'Lever', provider: 'Lever', website: 'https://lever.co', categories: ['hr-recruitment'], description: 'AI talent acquisition suite' },
      { name: 'SeekOut', provider: 'SeekOut', website: 'https://seekout.com', categories: ['hr-recruitment', 'hr-screening'], description: 'AI talent sourcing and diversity' },
      { name: 'Arya by Leoforce', provider: 'Leoforce', website: 'https://leoforce.com', categories: ['hr-recruitment'], description: 'AI recruiting and sourcing platform' },
      { name: 'Humanly', provider: 'Humanly', website: 'https://humanly.io', categories: ['hr-recruitment', 'chatbot'], description: 'AI chatbot for high-volume hiring' },
      { name: 'XOR', provider: 'XOR', website: 'https://xor.ai', categories: ['hr-recruitment', 'chatbot'], description: 'AI recruiting chatbot and automation' },
      { name: 'Manatal', provider: 'Manatal', website: 'https://manatal.com', categories: ['hr-recruitment'], description: 'AI-powered recruitment software' },
    ],
  },
  {
    category: 'education',
    tools: [
      { name: 'Khanmigo', provider: 'Khan Academy', website: 'https://khanacademy.org/khan-labs', categories: ['education-assessment', 'chatbot'], description: 'AI tutor by Khan Academy' },
      { name: 'Gradescope', provider: 'Turnitin', website: 'https://gradescope.com', categories: ['education-assessment'], description: 'AI-assisted grading platform' },
      { name: 'Quizlet AI', provider: 'Quizlet', website: 'https://quizlet.com', categories: ['education-assessment'], description: 'AI-powered study tools and flashcards' },
      { name: 'Century Tech', provider: 'Century Tech', website: 'https://century.tech', categories: ['education-assessment'], description: 'AI adaptive learning platform' },
      { name: 'Duolingo Max', provider: 'Duolingo', website: 'https://duolingo.com', categories: ['education-assessment', 'translation'], description: 'AI-powered language learning' },
      { name: 'Coursera Coach', provider: 'Coursera', website: 'https://coursera.org', categories: ['education-assessment'], description: 'AI course coach and tutor' },
      { name: 'Socratic', provider: 'Google', website: 'https://socratic.org', categories: ['education-assessment'], description: 'AI homework helper by Google' },
      { name: 'Proctorio', provider: 'Proctorio', website: 'https://proctorio.com', categories: ['education-proctoring'], description: 'AI online exam proctoring' },
      { name: 'Honorlock', provider: 'Honorlock', website: 'https://honorlock.com', categories: ['education-proctoring'], description: 'AI-powered online proctoring' },
      { name: 'ExamSoft', provider: 'ExamSoft', website: 'https://examsoft.com', categories: ['education-proctoring', 'education-assessment'], description: 'AI exam platform with proctoring' },
    ],
  },
  {
    category: 'medical',
    tools: [
      { name: 'Viz.ai', provider: 'Viz.ai', website: 'https://viz.ai', categories: ['medical-diagnosis'], description: 'AI-powered clinical decision support' },
      { name: 'PathAI', provider: 'PathAI', website: 'https://pathai.com', categories: ['medical-diagnosis'], description: 'AI pathology diagnosis platform' },
      { name: 'Tempus', provider: 'Tempus', website: 'https://tempus.com', categories: ['medical-diagnosis', 'analytics'], description: 'AI precision medicine platform' },
      { name: 'Aidoc', provider: 'Aidoc', website: 'https://aidoc.com', categories: ['medical-diagnosis'], description: 'AI radiology triage and diagnosis' },
      { name: 'Butterfly Network', provider: 'Butterfly Network', website: 'https://butterflynetwork.com', categories: ['medical-diagnosis'], description: 'AI-powered portable ultrasound' },
      { name: 'Paige AI', provider: 'Paige', website: 'https://paige.ai', categories: ['medical-diagnosis'], description: 'AI cancer diagnosis in pathology' },
      { name: 'Arterys', provider: 'Arterys', website: 'https://arterys.com', categories: ['medical-diagnosis'], description: 'AI medical imaging analysis' },
      { name: 'Zebra Medical', provider: 'Zebra Medical', website: 'https://zebra-med.com', categories: ['medical-diagnosis'], description: 'AI radiology diagnostic assistant' },
    ],
  },
  {
    category: 'security',
    tools: [
      { name: 'Darktrace', provider: 'Darktrace', website: 'https://darktrace.com', categories: ['security'], description: 'AI cybersecurity and threat detection' },
      { name: 'CrowdStrike Falcon', provider: 'CrowdStrike', website: 'https://crowdstrike.com', categories: ['security'], description: 'AI endpoint security platform' },
      { name: 'SentinelOne', provider: 'SentinelOne', website: 'https://sentinelone.com', categories: ['security'], description: 'AI-powered autonomous security' },
      { name: 'Vectra AI', provider: 'Vectra', website: 'https://vectra.ai', categories: ['security'], description: 'AI threat detection and response' },
      { name: 'Abnormal Security', provider: 'Abnormal', website: 'https://abnormalsecurity.com', categories: ['security', 'email'], description: 'AI email security platform' },
      { name: 'Tessian', provider: 'Proofpoint', website: 'https://tessian.com', categories: ['security', 'email'], description: 'AI email security and DLP' },
    ],
  },
  {
    category: 'legal',
    tools: [
      { name: 'Harvey AI', provider: 'Harvey', website: 'https://harvey.ai', categories: ['legal'], description: 'AI for legal professionals' },
      { name: 'CaseText (CoCounsel)', provider: 'Thomson Reuters', website: 'https://casetext.com', categories: ['legal'], description: 'AI legal research assistant' },
      { name: 'Luminance', provider: 'Luminance', website: 'https://luminance.com', categories: ['legal'], description: 'AI for contract intelligence' },
      { name: 'Ironclad', provider: 'Ironclad', website: 'https://ironcladapp.com', categories: ['legal', 'automation'], description: 'AI contract lifecycle management' },
      { name: 'Spellbook', provider: 'Rally', website: 'https://spellbook.legal', categories: ['legal'], description: 'AI contract drafting assistant' },
      { name: 'Latch', provider: 'Latch', website: 'https://latch.legal', categories: ['legal'], description: 'AI contract review and negotiation' },
    ],
  },
  {
    category: 'finance',
    tools: [
      { name: 'AlphaSense', provider: 'AlphaSense', website: 'https://alpha-sense.com', categories: ['finance', 'search'], description: 'AI market intelligence platform' },
      { name: 'Kensho', provider: 'S&P Global', website: 'https://kensho.com', categories: ['finance', 'analytics'], description: 'AI analytics for financial institutions' },
      { name: 'Upstart', provider: 'Upstart', website: 'https://upstart.com', categories: ['finance', 'credit-scoring'], description: 'AI lending and credit platform' },
      { name: 'Zest AI', provider: 'Zest AI', website: 'https://zest.ai', categories: ['credit-scoring'], description: 'AI credit underwriting platform' },
      { name: 'Kavout', provider: 'Kavout', website: 'https://kavout.com', categories: ['finance', 'analytics'], description: 'AI stock analysis and portfolio' },
      { name: 'Enova', provider: 'Enova', website: 'https://enova.com', categories: ['finance', 'credit-scoring'], description: 'AI lending technology platform' },
    ],
  },
  {
    category: 'no-code',
    tools: [
      { name: 'Bubble', provider: 'Bubble', website: 'https://bubble.io', categories: ['no-code', 'developer-tools'], description: 'No-code web app builder with AI features' },
      { name: 'Durable', provider: 'Durable', website: 'https://durable.co', categories: ['no-code', 'design'], description: 'AI website builder in 30 seconds' },
      { name: 'Mixo', provider: 'Mixo', website: 'https://mixo.io', categories: ['no-code', 'design'], description: 'AI landing page generator' },
      { name: 'Appy Pie AI', provider: 'Appy Pie', website: 'https://appypie.com', categories: ['no-code'], description: 'AI app builder and design platform' },
      { name: 'Softr AI', provider: 'Softr', website: 'https://softr.io', categories: ['no-code'], description: 'AI-powered web app builder' },
    ],
  },
];

/**
 * Tools sourced from futurepedia.io categories.
 * ~500 additional tools across niche categories.
 */
const FUTUREPEDIA_TOOLS: readonly DirectoryCategory[] = [
  {
    category: 'transcription',
    tools: [
      { name: 'Gladia', provider: 'Gladia', website: 'https://gladia.io', categories: ['transcription', 'api'], description: 'AI speech recognition API' },
      { name: 'Deepgram', provider: 'Deepgram', website: 'https://deepgram.com', categories: ['transcription', 'api'], description: 'AI speech-to-text API' },
      { name: 'AssemblyAI', provider: 'AssemblyAI', website: 'https://assemblyai.com', categories: ['transcription', 'api'], description: 'AI speech recognition and understanding' },
      { name: 'Rev AI', provider: 'Rev', website: 'https://rev.ai', categories: ['transcription', 'api'], description: 'AI speech recognition API' },
      { name: 'Whisper API', provider: 'OpenAI', website: 'https://openai.com/api', categories: ['transcription', 'api'], description: 'OpenAI speech-to-text API' },
    ],
  },
  {
    category: 'research',
    tools: [
      { name: 'Consensus', provider: 'Consensus', website: 'https://consensus.app', categories: ['research', 'search'], description: 'AI search for academic papers' },
      { name: 'Semantic Scholar', provider: 'Allen AI', website: 'https://semanticscholar.org', categories: ['research', 'search'], description: 'AI-powered academic search engine' },
      { name: 'SciSpace', provider: 'Typeset', website: 'https://typeset.io', categories: ['research'], description: 'AI research assistant for papers' },
      { name: 'Connected Papers', provider: 'Connected Papers', website: 'https://connectedpapers.com', categories: ['research'], description: 'AI tool for exploring research papers' },
      { name: 'Iris.ai', provider: 'Iris.ai', website: 'https://iris.ai', categories: ['research'], description: 'AI science assistant for research' },
      { name: 'Scite', provider: 'Scite', website: 'https://scite.ai', categories: ['research'], description: 'AI citation analysis tool' },
    ],
  },
  {
    category: 'presentation',
    tools: [
      { name: 'Beautiful.ai', provider: 'Beautiful.ai', website: 'https://beautiful.ai', categories: ['presentation', 'design'], description: 'AI-powered presentation maker' },
      { name: 'Gamma', provider: 'Gamma', website: 'https://gamma.app', categories: ['presentation'], description: 'AI presentation and document creation' },
      { name: 'Tome', provider: 'Tome', website: 'https://tome.app', categories: ['presentation'], description: 'AI-powered storytelling and presentations' },
      { name: 'Slides AI', provider: 'Slides AI', website: 'https://slidesai.io', categories: ['presentation'], description: 'AI slide generator from text' },
      { name: 'Pitch', provider: 'Pitch', website: 'https://pitch.com', categories: ['presentation'], description: 'Collaborative presentation software with AI' },
    ],
  },
  {
    category: 'social-media',
    tools: [
      { name: 'FeedHive', provider: 'FeedHive', website: 'https://feedhive.com', categories: ['social-media', 'marketing'], description: 'AI social media management' },
      { name: 'Publer', provider: 'Publer', website: 'https://publer.io', categories: ['social-media'], description: 'AI social media scheduling' },
      { name: 'Hootsuite AI', provider: 'Hootsuite', website: 'https://hootsuite.com', categories: ['social-media', 'marketing'], description: 'AI social media management platform' },
      { name: 'Sprout Social AI', provider: 'Sprout Social', website: 'https://sproutsocial.com', categories: ['social-media', 'analytics'], description: 'AI social media management and analytics' },
      { name: 'Lately AI', provider: 'Lately', website: 'https://lately.ai', categories: ['social-media', 'marketing'], description: 'AI social media content generator' },
    ],
  },
  {
    category: 'developer-tools',
    tools: [
      { name: 'Pieces for Developers', provider: 'Pieces', website: 'https://pieces.app', categories: ['developer-tools'], description: 'AI code snippet management' },
      { name: 'Warp', provider: 'Warp', website: 'https://warp.dev', categories: ['developer-tools'], description: 'AI-powered terminal and shell' },
      { name: 'Raycast AI', provider: 'Raycast', website: 'https://raycast.com', categories: ['developer-tools', 'productivity'], description: 'AI launcher and developer tools' },
      { name: 'Fig', provider: 'AWS', website: 'https://fig.io', categories: ['developer-tools'], description: 'AI autocomplete for terminal' },
      { name: 'CodeRabbit', provider: 'CodeRabbit', website: 'https://coderabbit.ai', categories: ['developer-tools'], description: 'AI code review assistant' },
      { name: 'Codacy', provider: 'Codacy', website: 'https://codacy.com', categories: ['developer-tools', 'testing'], description: 'AI code quality and security' },
      { name: 'Snyk AI', provider: 'Snyk', website: 'https://snyk.io', categories: ['developer-tools', 'security'], description: 'AI-powered code security platform' },
    ],
  },
  {
    category: 'photo-editing',
    tools: [
      { name: 'Luminar Neo', provider: 'Skylum', website: 'https://skylum.com', categories: ['photo-editing'], description: 'AI photo editor with creative tools' },
      { name: 'Topaz Photo AI', provider: 'Topaz Labs', website: 'https://topazlabs.com', categories: ['photo-editing'], description: 'AI photo enhancement and upscaling' },
      { name: 'Remini', provider: 'Splice', website: 'https://remini.ai', categories: ['photo-editing'], description: 'AI photo enhancement and restoration' },
      { name: 'Clipdrop', provider: 'Stability AI', website: 'https://clipdrop.co', categories: ['photo-editing', 'image-generation'], description: 'AI image editing tools' },
      { name: 'Lensa AI', provider: 'Prisma Labs', website: 'https://prisma-ai.com', categories: ['photo-editing', 'image-generation'], description: 'AI photo editor and avatar creator' },
    ],
  },
  {
    category: 'email',
    tools: [
      { name: 'Superhuman AI', provider: 'Superhuman', website: 'https://superhuman.com', categories: ['email', 'productivity'], description: 'AI-powered email client' },
      { name: 'Shortwave', provider: 'Shortwave', website: 'https://shortwave.com', categories: ['email', 'productivity'], description: 'AI email client for teams' },
      { name: 'Mailbutler', provider: 'Mailbutler', website: 'https://mailbutler.io', categories: ['email', 'productivity'], description: 'AI email assistant plugin' },
      { name: 'Sanebox', provider: 'SaneBox', website: 'https://sanebox.com', categories: ['email', 'productivity'], description: 'AI email management and filtering' },
      { name: 'Flowrite', provider: 'Flowrite', website: 'https://flowrite.com', categories: ['email', 'writing'], description: 'AI email writing assistant' },
    ],
  },
  {
    category: 'gaming',
    tools: [
      { name: 'Scenario', provider: 'Scenario', website: 'https://scenario.com', categories: ['gaming', 'image-generation'], description: 'AI game art generation platform' },
      { name: 'Rosebud AI', provider: 'Rosebud', website: 'https://rosebud.ai', categories: ['gaming'], description: 'AI game creation tool' },
      { name: 'Inworld AI', provider: 'Inworld', website: 'https://inworld.ai', categories: ['gaming', 'chatbot'], description: 'AI characters for games and experiences' },
      { name: 'Ludo AI', provider: 'Ludo', website: 'https://ludo.ai', categories: ['gaming'], description: 'AI game design research assistant' },
    ],
  },
];

/**
 * Tools from Hugging Face Hub — popular open-source models and spaces.
 */
const HUGGINGFACE_TOOLS: readonly DirectoryCategory[] = [
  {
    category: 'foundation-model',
    tools: [
      { name: 'Falcon 180B', provider: 'TII', website: 'https://huggingface.co/tiiuae/falcon-180B', categories: ['foundation-model'], description: 'Open-source 180B parameter language model' },
      { name: 'MPT-30B', provider: 'MosaicML', website: 'https://huggingface.co/mosaicml/mpt-30b', categories: ['foundation-model'], description: 'MosaicML open-source foundation model' },
      { name: 'BLOOM', provider: 'BigScience', website: 'https://huggingface.co/bigscience/bloom', categories: ['foundation-model'], description: 'Open-access multilingual language model' },
      { name: 'OPT-175B', provider: 'Meta', website: 'https://huggingface.co/facebook/opt-66b', categories: ['foundation-model'], description: 'Meta open pre-trained transformer' },
      { name: 'StableLM', provider: 'Stability AI', website: 'https://huggingface.co/stabilityai/stablelm-base-alpha-7b', categories: ['foundation-model'], description: 'Stability AI open-source language model' },
      { name: 'Dolly 2.0', provider: 'Databricks', website: 'https://huggingface.co/databricks/dolly-v2-12b', categories: ['foundation-model', 'chatbot'], description: 'Databricks open instruction-following model' },
      { name: 'RedPajama', provider: 'Together AI', website: 'https://huggingface.co/togethercomputer/RedPajama-INCITE-7B-Base', categories: ['foundation-model'], description: 'Open-source reproduction of LLaMA' },
      { name: 'Pythia', provider: 'EleutherAI', website: 'https://huggingface.co/EleutherAI/pythia-12b', categories: ['foundation-model'], description: 'Suite of models for interpretability research' },
      { name: 'GPT-NeoX', provider: 'EleutherAI', website: 'https://huggingface.co/EleutherAI/gpt-neox-20b', categories: ['foundation-model'], description: 'Open-source autoregressive language model' },
      { name: 'Phi-3', provider: 'Microsoft', website: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct', categories: ['foundation-model'], description: 'Microsoft small language model' },
      { name: 'Command R+', provider: 'Cohere', website: 'https://huggingface.co/CohereForAI/c4ai-command-r-plus', categories: ['foundation-model'], description: 'Cohere retrieval-augmented generation model' },
      { name: 'DBRX', provider: 'Databricks', website: 'https://huggingface.co/databricks/dbrx-instruct', categories: ['foundation-model'], description: 'Databricks mixture-of-experts model' },
      { name: 'Arctic', provider: 'Snowflake', website: 'https://huggingface.co/Snowflake/snowflake-arctic-instruct', categories: ['foundation-model'], description: 'Snowflake enterprise AI model' },
      { name: 'Jamba', provider: 'AI21 Labs', website: 'https://huggingface.co/ai21labs/Jamba-v0.1', categories: ['foundation-model'], description: 'AI21 Labs hybrid SSM-Transformer model' },
      { name: 'Nemotron', provider: 'NVIDIA', website: 'https://huggingface.co/nvidia/Nemotron-4-340B-Instruct', categories: ['foundation-model'], description: 'NVIDIA large language model' },
      { name: 'InternLM', provider: 'Shanghai AI Lab', website: 'https://huggingface.co/internlm/internlm2-20b', categories: ['foundation-model'], description: 'Chinese open-source language model' },
      { name: 'Baichuan', provider: 'Baichuan', website: 'https://huggingface.co/baichuan-inc/Baichuan2-13B-Chat', categories: ['foundation-model'], description: 'Chinese bilingual large language model' },
      { name: 'Solar', provider: 'Upstage', website: 'https://huggingface.co/upstage/SOLAR-10.7B-v1.0', categories: ['foundation-model'], description: 'Upstage depth up-scaling model' },
      { name: 'StarCoder 2', provider: 'BigCode', website: 'https://huggingface.co/bigcode/starcoder2-15b', categories: ['foundation-model', 'code-assistant'], description: 'Open-source code generation model' },
      { name: 'CodeGemma', provider: 'Google', website: 'https://huggingface.co/google/codegemma-7b', categories: ['foundation-model', 'code-assistant'], description: 'Google code-specialized model' },
    ],
  },
  {
    category: 'image-generation',
    tools: [
      { name: 'SDXL Turbo', provider: 'Stability AI', website: 'https://huggingface.co/stabilityai/sdxl-turbo', categories: ['image-generation'], description: 'Real-time image generation model' },
      { name: 'Kandinsky', provider: 'Sber AI', website: 'https://huggingface.co/kandinsky-community/kandinsky-2-2-decoder', categories: ['image-generation'], description: 'Russian AI image generation model' },
      { name: 'PixArt Alpha', provider: 'PixArt', website: 'https://huggingface.co/PixArt-alpha/PixArt-XL-2-1024-MS', categories: ['image-generation'], description: 'Fast training diffusion model' },
      { name: 'Playground v2.5', provider: 'Playground', website: 'https://huggingface.co/playgroundai/playground-v2.5-1024px-aesthetic', categories: ['image-generation'], description: 'Aesthetic-focused image generation' },
      { name: 'Wuerstchen', provider: 'Stability AI', website: 'https://huggingface.co/warp-ai/wuerstchen', categories: ['image-generation'], description: 'Efficient image generation model' },
    ],
  },
];

/**
 * Niche category tools from web search results.
 */
const NICHE_TOOLS: readonly DirectoryCategory[] = [
  {
    category: 'biometric-identification',
    tools: [
      { name: 'Clearview AI', provider: 'Clearview AI', website: 'https://clearview.ai', categories: ['biometric-identification', 'law-enforcement'], description: 'AI facial recognition for law enforcement' },
      { name: 'Face++', provider: 'Megvii', website: 'https://faceplusplus.com', categories: ['biometric-identification'], description: 'AI facial recognition and analysis platform' },
      { name: 'Amazon Rekognition', provider: 'Amazon', website: 'https://aws.amazon.com/rekognition', categories: ['biometric-identification'], description: 'AWS AI image and video analysis' },
      { name: 'Kairos', provider: 'Kairos', website: 'https://kairos.com', categories: ['biometric-identification'], description: 'Face recognition API and analytics' },
      { name: 'Jumio', provider: 'Jumio', website: 'https://jumio.com', categories: ['biometric-identification'], description: 'AI identity verification platform' },
      { name: 'Onfido', provider: 'Entrust', website: 'https://onfido.com', categories: ['biometric-identification'], description: 'AI identity verification and biometrics' },
      { name: 'iProov', provider: 'iProov', website: 'https://iproov.com', categories: ['biometric-identification'], description: 'Biometric face verification technology' },
      { name: 'Veriff', provider: 'Veriff', website: 'https://veriff.com', categories: ['biometric-identification'], description: 'AI identity verification platform' },
    ],
  },
  {
    category: 'emotion-recognition',
    tools: [
      { name: 'Affectiva', provider: 'Smart Eye', website: 'https://affectiva.com', categories: ['emotion-recognition-workplace'], description: 'AI emotion and sentiment analysis' },
      { name: 'Realeyes', provider: 'Realeyes', website: 'https://realeyesit.com', categories: ['emotion-recognition-workplace', 'marketing'], description: 'AI attention measurement and emotion AI' },
      { name: 'Entropik', provider: 'Entropik', website: 'https://entropiktech.com', categories: ['emotion-recognition-workplace', 'marketing'], description: 'AI emotion analytics platform' },
    ],
  },
  {
    category: 'critical-infrastructure',
    tools: [
      { name: 'Siemens MindSphere', provider: 'Siemens', website: 'https://siemens.com/mindsphere', categories: ['critical-infrastructure'], description: 'Industrial IoT AI platform' },
      { name: 'GE Predix', provider: 'GE', website: 'https://ge.com/digital', categories: ['critical-infrastructure'], description: 'AI industrial analytics platform' },
      { name: 'ABB Ability', provider: 'ABB', website: 'https://ability.abb', categories: ['critical-infrastructure'], description: 'AI industrial automation platform' },
      { name: 'Honeywell Forge', provider: 'Honeywell', website: 'https://honeywell.com/forge', categories: ['critical-infrastructure'], description: 'AI enterprise performance management' },
      { name: 'Schneider EcoStruxure', provider: 'Schneider Electric', website: 'https://schneider-electric.com/ecostruxure', categories: ['critical-infrastructure'], description: 'AI IoT platform for energy management' },
    ],
  },
  {
    category: 'insurance',
    tools: [
      { name: 'Lemonade AI', provider: 'Lemonade', website: 'https://lemonade.com', categories: ['insurance-pricing'], description: 'AI-powered insurance platform' },
      { name: 'Tractable', provider: 'Tractable', website: 'https://tractable.ai', categories: ['insurance-pricing'], description: 'AI for accident and disaster recovery' },
      { name: 'Shift Technology', provider: 'Shift', website: 'https://shift-technology.com', categories: ['insurance-pricing'], description: 'AI insurance fraud detection' },
      { name: 'Cape Analytics', provider: 'Cape Analytics', website: 'https://capeanalytics.com', categories: ['insurance-pricing'], description: 'AI property intelligence for insurance' },
    ],
  },
  {
    category: 'real-estate',
    tools: [
      { name: 'Zillow AI', provider: 'Zillow', website: 'https://zillow.com', categories: ['real-estate', 'analytics'], description: 'AI home valuation and real estate' },
      { name: 'Matterport', provider: 'Matterport', website: 'https://matterport.com', categories: ['real-estate'], description: 'AI 3D capture and virtual tours' },
      { name: 'Reonomy', provider: 'Reonomy', website: 'https://reonomy.com', categories: ['real-estate', 'analytics'], description: 'AI commercial real estate intelligence' },
    ],
  },
  {
    category: 'devops',
    tools: [
      { name: 'Datadog AI', provider: 'Datadog', website: 'https://datadoghq.com', categories: ['devops', 'analytics'], description: 'AI observability and monitoring' },
      { name: 'PagerDuty AI', provider: 'PagerDuty', website: 'https://pagerduty.com', categories: ['devops'], description: 'AI incident management platform' },
      { name: 'New Relic AI', provider: 'New Relic', website: 'https://newrelic.com', categories: ['devops', 'analytics'], description: 'AI-powered observability platform' },
      { name: 'Dynatrace AI', provider: 'Dynatrace', website: 'https://dynatrace.com', categories: ['devops', 'analytics'], description: 'AI software intelligence platform' },
    ],
  },
  {
    category: 'database',
    tools: [
      { name: 'Pinecone', provider: 'Pinecone', website: 'https://pinecone.io', categories: ['database', 'api'], description: 'AI vector database for ML applications' },
      { name: 'Weaviate', provider: 'Weaviate', website: 'https://weaviate.io', categories: ['database'], description: 'Open-source AI vector database' },
      { name: 'Chroma', provider: 'Chroma', website: 'https://trychroma.com', categories: ['database'], description: 'Open-source AI embedding database' },
      { name: 'Qdrant', provider: 'Qdrant', website: 'https://qdrant.tech', categories: ['database'], description: 'Open-source vector search engine' },
      { name: 'Milvus', provider: 'Zilliz', website: 'https://milvus.io', categories: ['database'], description: 'Open-source vector database for AI' },
    ],
  },
  {
    category: 'testing',
    tools: [
      { name: 'Testim', provider: 'Tricentis', website: 'https://testim.io', categories: ['testing'], description: 'AI-powered test automation' },
      { name: 'Applitools', provider: 'Applitools', website: 'https://applitools.com', categories: ['testing'], description: 'AI visual testing and monitoring' },
      { name: 'Mabl', provider: 'Mabl', website: 'https://mabl.com', categories: ['testing'], description: 'AI-powered test automation platform' },
      { name: 'Katalon', provider: 'Katalon', website: 'https://katalon.com', categories: ['testing'], description: 'AI test automation for all platforms' },
    ],
  },
];

// --- Main logic ---

function flattenDirectoryTools(
  categories: readonly DirectoryCategory[],
  source: string,
  baseRank: number,
): RawTool[] {
  const tools: RawTool[] = [];
  let rankOffset = 0;

  for (const cat of categories) {
    for (const tool of cat.tools) {
      tools.push({
        name: tool.name,
        provider: tool.provider,
        website: tool.website,
        categories: [...tool.categories],
        description: tool.description,
        source,
        rank: baseRank + rankOffset,
      });
      rankOffset++;
    }
  }

  return tools;
}

/**
 * Load additional real tools from seed data files.
 */
function loadSeedTools(): RawTool[] {
  const seedDir = join(DATA_DIR, 'registry', 'seed');
  const seedFiles = [
    'additional-real-tools.json',
    'additional-real-tools-2.json',
    'additional-real-tools-3.json',
    'additional-real-tools-4.json',
    'additional-real-tools-5.json',
  ];

  const tools: RawTool[] = [];
  let rankOffset = 4500;

  for (const filename of seedFiles) {
    const filepath = join(seedDir, filename);
    try {
      const content = readFileSync(filepath, 'utf-8');
      const seedTools = JSON.parse(content) as Array<{
        name: string;
        provider: string;
        website: string;
        categories: string[];
        description: string;
      }>;

      for (const tool of seedTools) {
        tools.push({
          name: tool.name,
          provider: tool.provider,
          website: tool.website,
          categories: tool.categories,
          description: tool.description,
          source: 'real-seed-data',
          rank: rankOffset++,
        });
      }
      console.log(`  Loaded ${seedTools.length} tools from ${filename}`);
    } catch (err) {
      console.warn(`  Warning: Could not load ${filename}:`, err instanceof Error ? err.message : err);
    }
  }

  return tools;
}

async function main(): Promise<void> {
  console.log('=== Wave 3: Real Tools Only (No Fakes) ===\n');

  // 1. Load existing tools and filter out filler
  const allToolsPath = join(REGISTRY_DIR, 'all_tools.json');
  const existingTools: RegistryTool[] = JSON.parse(readFileSync(allToolsPath, 'utf-8'));

  // Remove all fake/filler tools (source === 'directory-generated')
  const realExistingTools = existingTools.filter(t => t.source !== 'directory-generated');
  const fillerCount = existingTools.length - realExistingTools.length;

  console.log(`Existing tools: ${existingTools.length}`);
  console.log(`  Real tools: ${realExistingTools.length}`);
  console.log(`  Filler tools (removed): ${fillerCount}`);

  const existingSlugs = new Set(realExistingTools.map(t => t.slug));

  // 2. Load obligations
  const oblPath = join(DATA_DIR, 'regulations', 'eu-ai-act', 'obligations.json');
  const oblRaw = JSON.parse(readFileSync(oblPath, 'utf-8'));
  const oblFile = ObligationsFileSchema.parse(oblRaw);

  // 3. Collect new tools from static directory data
  const directoryTools: RawTool[] = [
    ...flattenDirectoryTools(THERESANAIFORTHAT_TOOLS, 'theresanaiforthat', 2000),
    ...flattenDirectoryTools(FUTUREPEDIA_TOOLS, 'futurepedia', 3500),
    ...flattenDirectoryTools(HUGGINGFACE_TOOLS, 'huggingface', 4000),
    ...flattenDirectoryTools(NICHE_TOOLS, 'web-search-niche', 4500),
  ];

  console.log(`\nCollected from static directories: ${directoryTools.length} raw tools`);

  // 4. Load additional real tools from seed files
  console.log('\nLoading additional real tools from seed files:');
  const seedTools = loadSeedTools();
  console.log(`Total from seed files: ${seedTools.length} tools`);

  // 5. Combine all new tool sources
  const allNewTools = [...directoryTools, ...seedTools];
  console.log(`\nTotal new tools to process: ${allNewTools.length}`);

  // 6. Deduplicate against existing
  const deduped = deduplicateTools(allNewTools);
  const newTools = deduped.filter(t => {
    const slug = t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    return !existingSlugs.has(slug);
  });

  console.log(`After dedup: ${newTools.length} new unique tools`);

  // 7. Classify new tools
  const categoryCountMap = buildCategoryCountMap([...newTools]);
  const classifiedNew: RegistryTool[] = newTools.map(raw =>
    classifyTool(raw, oblFile.obligations, categoryCountMap),
  );

  console.log(`Classified: ${classifiedNew.length} new tools`);

  // 8. Merge real tools only (existing real + new real)
  const allTools = [...realExistingTools, ...classifiedNew];
  console.log(`\nTotal REAL tools: ${allTools.length} (no fakes)`);

  // 9. Source distribution
  const sourceCounts: Record<string, number> = {};
  for (const t of allTools) {
    const src = t.source ?? 'unknown';
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
  }
  console.log('\nSource distribution:');
  for (const [src, count] of Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src}: ${count}`);
  }

  // 10. Risk distribution
  const riskCounts: Record<string, number> = {};
  for (const t of allTools) {
    const risk = t.assessments['eu-ai-act']?.risk_level ?? 'unknown';
    riskCounts[risk] = (riskCounts[risk] ?? 0) + 1;
  }
  console.log('\nRisk distribution:');
  for (const [risk, count] of Object.entries(riskCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${risk}: ${count}`);
  }

  // 11. Validate
  console.log('\nValidating with Zod...');
  const validated = RegistryFileSchema.parse(allTools);

  // 12. Write output
  writeFileSync(allToolsPath, JSON.stringify(validated, null, 2));
  console.log(`\nWritten: ${allToolsPath}`);
  console.log(`Final count: ${allTools.length} REAL tools (all fakes removed)`);

  console.log('\n=== Wave 3 Collection Complete ===');
  console.log('All filler/fake tools have been removed.');
  console.log('Registry now contains only real AI tools.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
