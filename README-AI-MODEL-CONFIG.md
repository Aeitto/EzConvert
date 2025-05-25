# AI Model Configuration for EzConvert

## XML Structure Detection with Dual Provider Support

EzConvert supports two different AI providers for XML structure detection, giving users the flexibility to choose between free models and paid models based on their needs.

### Provider Selection

Users can choose between providers directly in the XML Detection modal:

1. **OpenRouter** - Free models with fallback mechanism for handling rate limits
2. **Requesty.ai** - Paid models with better accuracy and higher rate limits

### Configuration

Add one or both provider API keys to your `.env.local` file:

```
# OpenRouter for free models
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: Specify a comma-separated list of models to try in order of preference
OPENROUTER_FREE_MODELS=deepseek/deepseek-chat-v3-0324,mistralai/mistral-7b-instruct,google/gemma-7b-it,openchat/openchat-3.5,nousresearch/nous-hermes-2-yi-34b

# Optional: Specify a single default model to try first
OPENROUTER_TARGET_MODEL=deepseek/deepseek-chat-v3-0324

# Requesty.ai for paid models
REQUESTY_API_KEY=your_requesty_api_key_here
```

### OpenRouter (Free Models)

If you don't specify `OPENROUTER_FREE_MODELS`, the application will use the following models in order:

1. `deepseek/deepseek-chat-v3-0324` (Primary model)
2. `mistralai/mistral-7b-instruct` (Fallback 1)
3. `google/gemma-7b-it` (Fallback 2)
4. `openchat/openchat-3.5` (Fallback 3)
5. `nousresearch/nous-hermes-2-yi-34b` (Fallback 4)

#### OpenRouter Fallback Mechanism

1. The application will first try the model specified in `OPENROUTER_TARGET_MODEL` or the first model in the list.
2. If a model returns a 429 error (rate limited), the application automatically tries the next model in the list.
3. This process continues until a successful response is received or all models have been tried.
4. If all models are rate-limited, the application will return an appropriate error message.

### Requesty.ai (Paid Models)

Requesty.ai offers higher quality models with better rate limits. The fallback chain is configured through their web interface rather than in code, making it easier to manage model preferences.
