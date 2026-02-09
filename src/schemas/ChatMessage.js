({
  Entity: {},

  conversation: { type: 'Conversation', delete: 'cascade' },
  role: {
    enum: ['user', 'assistant', 'system', 'tool'],
  },
  content: {
    type: 'json',
    schema: {
      text: { type: 'string', required: false },
      citations: { type: 'json', required: false, note: 'AI Act article references' },
    },
  },
  toolCalls: { type: 'json', required: false },
  tokenCount: { type: 'number', required: false },
  model: { type: 'string', required: false },
  feedbackRating: {
    enum: ['positive', 'negative'],
    required: false,
  },
});
