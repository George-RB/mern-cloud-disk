import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Инициализируем OpenAI клиент
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const deepseekai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!, // Используем новый ключ
  baseURL: 'https://api.deepseek.com', // Указываем адрес DeepSeek
});

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

// export async function POST(request: NextRequest) {
//   // Объявляем provider здесь, чтобы он был доступен во всём блоке try-catch
//   let provider: 'openai' | 'deepseek' = 'deepseek';
//   try {
//     const {
//       draft,
//       platform,
//       goal,
//       provider = 'deepseek',
//     } = await request.json(); // По умолчанию DeepSeek

//     // Проверяем наличие черновика
//     if (!draft || draft.trim().length === 0) {
//       return NextResponse.json(
//         { error: 'Черновик не может быть пустым' },
//         { status: 400 }
//       );
//     }

//     // 1. ВЫБИРАЕМ КЛИЕНТА НА ОСНОВАНИИ ПРОВАЙДЕРА
//     const aiClient = provider === 'openai' ? openai : deepseekai;
//     // 2. ВЫБИРАЕМ МОДЕЛЬ НА ОСНОВАНИИ ПРОВАЙДЕРА
//     const modelName = provider === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat';

//     // Формируем пользовательский промпт
//     const userPrompt = `Платформа: ${platform}\nЦель: ${goal}\nЧерновик: ${draft}`;

//     // Вызываем выбранный AI API
//     const completion = await aiClient.chat.completions.create({
//       model: modelName, // Используем выбранную модель
//       messages: [
//         { role: 'system', content: SYSTEM_PROMPT },
//         { role: 'user', content: userPrompt },
//       ],
//       temperature: 0.7,
//       max_tokens: 500,
//       response_format: { type: 'json_object' },
//     });

//     // Парсим результат
//     const result = JSON.parse(completion.choices[0].message.content || '{}');

//     // Возвращаем успешный ответ
//     return NextResponse.json({
//       success: true,
//       data: {
//         title: result.title || '',
//         description: result.description || '',
//         tags: result.tags || '',
//       },
//       provider: provider, // Можно вернуть для информации, какой провайдер сработал
//     });
//   } catch (error) {
//     console.error('Ошибка в API /refine:', error);

//     // Даём более информативную ошибку
//     let errorMessage = 'Неизвестная ошибка';
//     if (error instanceof Error) {
//       errorMessage = error.message;
//       // Можно добавить проверку на ошибки API ключей
//       if (errorMessage.includes('API key') || errorMessage.includes('401')) {
//         errorMessage = `Проблема с API ключом для ${provider}. Проверьте его в .env.local`;
//       }
//       if (errorMessage.includes('403') && provider === 'openai') {
//         errorMessage =
//           'OpenAI недоступен в вашем регионе. Переключитесь на DeepSeek.';
//       }
//     }

//     return NextResponse.json(
//       {
//         success: false,
//         error: errorMessage,
//       },
//       { status: 500 }
//     );
//   }
// }
export async function POST(request: NextRequest) {
  // Объявляем provider с явным типом
  let provider: 'openai' | 'deepseek' = 'deepseek';

  try {
    const { draft, platform, goal, requestedProvider } = await request.json();

    // Если провайдер указан в запросе и он корректен, используем его
    if (requestedProvider === 'openai' || requestedProvider === 'deepseek') {
      provider = requestedProvider;
    }

    // Проверяем наличие черновика
    if (!draft || draft.trim().length === 0) {
      return NextResponse.json(
        { error: 'Черновик не может быть пустым' },
        { status: 400 }
      );
    }

    // 1. ВЫБИРАЕМ КЛИЕНТА НА ОСНОВАНИИ ПРОВАЙДЕРА
    const aiClient = provider === 'openai' ? openai : deepseekai;
    // 2. ВЫБИРАЕМ МОДЕЛЬ НА ОСНОВАНИИ ПРОВАЙДЕРА
    const modelName = provider === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat';

    // Формируем пользовательский промпт
    const userPrompt = `Платформа: ${platform}\nЦель: ${goal}\nЧерновик: ${draft}`;

    // Вызываем выбранный AI API
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

    // Парсим результат
    const result = JSON.parse(completion.choices[0].message.content || '{}');

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

    // Теперь TypeScript знает, что provider имеет тип 'openai' | 'deepseek'
    let errorMessage = 'Неизвестная ошибка';
    if (error instanceof Error) {
      errorMessage = error.message;

      // Проверка на ошибки API ключей - теперь TypeScript не ругается
      if (errorMessage.includes('API key') || errorMessage.includes('401')) {
        errorMessage = `Проблема с API ключом для ${provider}. Проверьте его в .env.local`;
      }

      // Эта проверка теперь безопасна для TypeScript
      if (errorMessage.includes('403') && provider === 'openai') {
        errorMessage =
          'OpenAI недоступен в вашем регионе. Переключитесь на DeepSeek.';
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
