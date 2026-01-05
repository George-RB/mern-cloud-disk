import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HfInference } from '@huggingface/inference';

// Инициализируем OpenAI клиент
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const deepseekai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!, // Используем новый ключ
  baseURL: 'https://api.deepseek.com', // Указываем адрес DeepSeek
});

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Системный промпт из вашего ТЗ
const SYSTEM_PROMPT = `Ты — AI-редактор. Твоя задача — переработать и улучшить черновик пользователя.

ПРАВИЛА:
1. НЕ копируй фразы из ввода. Всегда перефразируй.
2. Избегай шаблонных AI-фраз: "dive into", "unleash the power", "in the world of"
3. Оптимизируй строго под выбранную платформу и цель.
4. Выводи ТОЛЬКО валидный JSON в формате: {"title": "", "description": "", "tags": ""}
5. Ограничения длины:
   - Заголовок: ≤ 70 символов
   - Описание: ≤ 300 символов
   - Теги: через запятую, релевантные

ПЛАТФОРМНЫЕ ТРЕБОВАНИЯ:

YouTube:
- Заголовок: кликабельный, эмоциональный, с цифрами/вопросами
- Описание: структурированное (первые 2 строки — суть), с призывом к действию
- Теги: высокочастотные + низкочастотные ключевые слова

Pond5:
- Заголовок: чёткий, описательный, коммерческий
- Описание: фактологическое, с техническими деталями (разрешение, формат)
- Теги: максимально конкретные, технические`;

export async function POST(request: NextRequest) {
  let provider: 'openai' | 'deepseek' | 'huggingface' = 'huggingface';

  try {
    const { draft, platform, goal, requestedProvider } = await request.json();

    // Если провайдер указан в запросе и он корректен, используем его
    if (
      requestedProvider === 'openai' ||
      requestedProvider === 'deepseek' ||
      requestedProvider === 'huggingface'
    ) {
      provider = requestedProvider;
    }

    // Проверяем наличие черновика
    if (!draft || draft.trim().length === 0) {
      return NextResponse.json(
        { error: 'Черновик не может быть пустым' },
        { status: 400 }
      );
    }

    // Формируем пользовательский промпт
    const userPrompt = `Платформа: ${platform}\nЦель: ${goal}\nЧерновик: ${draft}`;

    let result: { title: string; description: string; tags: string };

    // 🔹 ОТДЕЛЬНАЯ ЛОГИКА ДЛЯ HUGGING FACE
    if (provider === 'huggingface') {
      // const modelName = 'mistralai/Mixtral-8x7B-Instruct-v0.1';
      const modelName = 'gpt2';

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ];

      try {
        const hfResponse = await hf.chatCompletion({
          model: modelName,
          messages: messages,
          max_tokens: 500,
          temperature: 0.7,
        });

        // 🔹 Ключевое исправление: проверяем, что ответ существует и содержит content
        const generatedText = hfResponse.choices?.[0]?.message?.content;

        // Если generatedText отсутствует или пустая строка, обрабатываем это как ошибку
        if (!generatedText || generatedText.trim().length === 0) {
          console.error('Hugging Face вернул пустой ответ:', hfResponse);
          throw new Error(
            'Модель не вернула текст. Попробуйте снова или выберите другого провайдера.'
          );
        }

        // Теперь TypeScript знает, что generatedText - строка
        try {
          const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            // Если JSON не найден, используем весь текст как описание
            console.warn(
              'JSON не найден в ответе. Использую весь текст как description.'
            );
            result = {
              title: '',
              description: generatedText.trim(),
              tags: '',
            };
          }
        } catch (parseError) {
          console.error(
            'Ошибка парсинга JSON из ответа Hugging Face:',
            generatedText
          );
          // Запасной вариант: возвращаем весь текст
          result = {
            title: '',
            description: generatedText.trim(),
            tags: '',
          };
        }
      } catch (hfError) {
        console.error('Ошибка с Hugging Face chatCompletion API:', hfError);
        // Пробрасываем ошибку дальше для обработки в основном блоке catch
        throw hfError;
      }
    } else {
      // ... остальной код для OpenAI/DeepSeek else {
      // 🔹 СУЩЕСТВУЮЩАЯ ЛОГИКА ДЛЯ OPENAI / DEEPSEEK
      const aiClient = provider === 'openai' ? openai : deepseekai;
      const modelName = provider === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat';

      const completion = await aiClient.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      result = JSON.parse(completion.choices[0].message.content || '{}');
    }

    // Возвращаем успешный ответ
    return NextResponse.json({
      success: true,
      data: {
        title: result.title || '',
        description: result.description || '',
        tags: result.tags || '',
      },
      provider: provider,
    });
  } catch (error) {
    console.error('Ошибка в API /refine:', error);

    let errorMessage = 'Неизвестная ошибка';
    if (error instanceof Error) {
      errorMessage = error.message;

      // Проверка на ошибки API ключей
      if (errorMessage.includes('API key') || errorMessage.includes('401')) {
        errorMessage = `Проблема с API ключом для ${provider}. Проверьте его в .env.local`;
      }

      if (errorMessage.includes('403') && provider === 'openai') {
        errorMessage =
          'OpenAI недоступен в вашем регионе. Переключитесь на DeepSeek или Hugging Face.';
      }

      // Добавляем обработку ошибок Hugging Face
      if (errorMessage.includes('429')) {
        errorMessage =
          'Превышен лимит запросов к Hugging Face. Попробуйте позже или выберите другого провайдера.';
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
