import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HfInference } from '@huggingface/inference';
import { Mistral } from '@mistralai/mistralai';

import { decrementLimit, getUserLimit } from '@/lib/limits';

// Инициализируем OpenAI клиент
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const deepseekai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!, // Используем новый ключ
  baseURL: 'https://api.deepseek.com', // Указываем адрес DeepSeek
});

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

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
  let provider: 'openai' | 'deepseek' | 'huggingface' | 'mistral' = 'mistral';

  try {
    // Получаем или создаём guest_id
    let guestId = request.cookies.get('guest_id')?.value;
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    }

    const { draft, platform, goal, requestedProvider } = await request.json();

    if (
      ['openai', 'deepseek', 'huggingface', 'mistral'].includes(
        requestedProvider
      )
    ) {
      provider = requestedProvider;
    }

    if (!draft || draft.trim().length === 0) {
      return NextResponse.json(
        { error: 'Черновик не может быть пустым' },
        { status: 400 }
      );
    }

    // Проверяем лимит
    const updatedLimit = await decrementLimit(guestId);
    if (updatedLimit === null) {
      const currentLimit = await getUserLimit(guestId);
      return NextResponse.json(
        {
          success: false,
          error: 'Лимит исчерпан',
          limitRemaining: currentLimit.remaining,
        },
        { status: 429 }
      );
    }

    const userPrompt = `Платформа: ${platform}\nЦель: ${goal}\nЧерновик: ${draft}`;
    let result: { title: string; description: string; tags: string } = {
      title: '',
      description: '',
      tags: '',
    };

    // 🔹 ВЕТКА ДЛЯ HUGGING FACE
    if (provider === 'huggingface') {
      const modelName = 'gpt2'; //  модель, которая точно работает

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ];

      try {
        // 🔍 ЛОГИРОВАНИЕ: что отправляем
        console.log('=== HUGGING FACE DEBUG ===');
        console.log('Sending to model:', modelName);
        console.log('System prompt length:', SYSTEM_PROMPT.length);
        console.log('User prompt:', userPrompt.substring(0, 200) + '...');

        // Пробуем использовать textGeneration (самый простой метод)
        const hfResponse = await hf.textGeneration({
          model: modelName,
          inputs: `${SYSTEM_PROMPT}\n\n${userPrompt}\n\nВАЖНО: Верни ответ ТОЛЬКО в формате JSON: {"title": "...", "description": "...", "tags": "..."}`,
          parameters: {
            max_new_tokens: 300,
            temperature: 0.7,
            return_full_text: false,
          },
        });

        // 🔍 ЛОГИРОВАНИЕ: что получили
        console.log(
          'Full Hugging Face Response:',
          JSON.stringify(hfResponse, null, 2)
        );
        console.log('Generated text:', hfResponse.generated_text);

        const generatedText = hfResponse.generated_text || '';

        if (!generatedText || generatedText.trim().length === 0) {
          console.error('Hugging Face вернул пустой ответ');
          throw new Error('Модель не вернула текст.');
        }

        // УСИЛЕННЫЙ ПОИСК JSON
        let foundJson = null;

        // 1. Ищем JSON в тексте
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          foundJson = jsonMatch[0];
          console.log('Found JSON via regex:', foundJson);
        }

        // 2. Ищем в блоке кода ```json
        if (!foundJson) {
          const codeBlockMatch = generatedText.match(
            /```json\n([\s\S]*?)\n```/
          );
          if (codeBlockMatch) {
            foundJson = codeBlockMatch[1];
            console.log('Found JSON in code block:', foundJson);
          }
        }

        // 3. Ищем в блоке без указания языка ```
        if (!foundJson) {
          const simpleCodeBlock = generatedText.match(/```\n([\s\S]*?)\n```/);
          if (simpleCodeBlock) {
            foundJson = simpleCodeBlock[1];
            console.log('Found in simple code block:', foundJson);
          }
        }

        if (foundJson) {
          try {
            result = JSON.parse(foundJson);
            console.log('Successfully parsed JSON:', result);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            // Fallback: используем весь текст как описание
            result = {
              title: '',
              description: generatedText.trim(),
              tags: '',
            };
          }
        } else {
          console.warn('No JSON found. Using full text as description.');
          result = {
            title: '',
            description: generatedText.trim(),
            tags: '',
          };
        }
      } catch (hfError: any) {
        console.error('Ошибка Hugging Face API:', hfError);

        // Специфичные ошибки Hugging Face
        if (
          hfError.message?.includes('Model') &&
          hfError.message?.includes('not supported')
        ) {
          throw new Error(
            `Модель ${modelName} не поддерживается. Попробуйте 'microsoft/DialoGPT-medium'.`
          );
        }
        if (hfError.message?.includes('429')) {
          throw new Error(
            'Превышен лимит запросов к Hugging Face. Попробуйте позже.'
          );
        }
        if (
          hfError.message?.includes('401') ||
          hfError.message?.includes('API key')
        ) {
          throw new Error(
            'Проблема с API ключом Hugging Face. Проверьте .env.local.'
          );
        }

        throw new Error(
          `Hugging Face error: ${hfError.message || 'Unknown error'}`
        );
      }
      console.log('=====================');
    }
    // 🔹 ВЕТКА ДЛЯ MISTRAL AI (вставьте код выше)
    else if (provider === 'mistral') {
      {
        const modelName = 'mistral-small-latest';

        const chatResponse = await mistralClient.chat.complete({
          model: modelName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          maxTokens: 500,
        });

        // 🔍 ОТЛАДКА: что пришло от API
        console.log('=== MISTRAL DEBUG ===');
        console.log('Full Response:', JSON.stringify(chatResponse, null, 2));

        const responseContent = chatResponse.choices[0]?.message?.content;
        console.log('Response Content:', responseContent);
        console.log('Type:', typeof responseContent);

        if (!responseContent) {
          throw new Error('Mistral AI не вернул содержимого.');
        }

        let responseText: string;
        if (Array.isArray(responseContent)) {
          responseText = responseContent
            .filter((chunk) => chunk.type === 'text')
            .map((chunk) => {
              const textChunk = chunk as { type: 'text'; text: string };
              return textChunk.text;
            })
            .join('');
        } else {
          responseText = responseContent;
        }

        console.log('Text for JSON parsing:', responseText);

        // УСИЛЕННАЯ ЛОГИКА ПОИСКА JSON
        let foundJson = null;

        // 1. Пробуем найти стандартный JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          foundJson = jsonMatch[0];
          console.log('Found JSON via regex:', foundJson);
        }

        // 2. Если не нашли, пробуем найти между ```json и ```
        if (!foundJson) {
          const codeBlockMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
          if (codeBlockMatch) {
            foundJson = codeBlockMatch[1];
            console.log('Found JSON in code block:', foundJson);
          }
        }

        // 3. Если нашли JSON - парсим, иначе весь текст как описание
        if (foundJson) {
          try {
            result = JSON.parse(foundJson);
            console.log('Successfully parsed JSON:', result);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            result = {
              title: '',
              description: responseText.trim(),
              tags: '',
            };
          }
        } else {
          console.warn('No JSON found. Using full text.');
          result = {
            title: '',
            description: responseText.trim(),
            tags: '',
          };
        }
        console.log('=====================');
      }
    }
    // 🔹 ВЕТКА ДЛЯ OPENAI / DEEPSEEK
    else {
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

    // Возвращаем ответ
    const response = NextResponse.json({
      success: true,
      data: {
        title: result.title || '',
        description: result.description || '',
        tags: result.tags || '',
      },
      provider: provider,
      limitRemaining: updatedLimit.remaining,
    });

    // Устанавливаем cookie если нужно
    if (!request.cookies.get('guest_id')) {
      response.cookies.set('guest_id', guestId, {
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      });
    }

    return response;
  } catch (error) {
    console.error('Ошибка в API /refine:', error);
    let errorMessage = 'Неизвестная ошибка';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (errorMessage.includes('Лимит исчерпан')) {
        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: 402 }
        );
      }
    }
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
