import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Инициализируем OpenAI клиент
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

export async function POST(request: NextRequest) {
  try {
    const { draft, platform, goal } = await request.json();

    // Проверяем наличие черновика
    if (!draft || draft.trim().length === 0) {
      return NextResponse.json(
        { error: 'Черновик не может быть пустым' },
        { status: 400 }
      );
    }

    // Формируем пользовательский промпт
    const userPrompt = `Платформа: ${platform}\nЦель: ${goal}\nЧерновик: ${draft}`;

    // Вызываем OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
    });
  } catch (error) {
    console.error('Ошибка в API /refine:', error);

    // Возвращаем понятную ошибку
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      },
      { status: 500 }
    );
  }
}
