import { NextRequest, NextResponse } from 'next/server';
import { redis, increaseLimit } from '@/lib/limits';

/**
 * Тип для данных ключа лицензии в Redis
 */
interface LicenseData {
  improvements: string;
  is_used: string;
  activated_by?: string;
  created_at: string;
  note?: string;
}

/**
 * POST /api/activate
 * Активация платёжного ключа
 */
export async function POST(request: NextRequest) {
  try {
    const { key, guestId } = await request.json();

    // Валидация входных данных
    if (!key || !guestId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Отсутствует ключ или идентификатор пользователя',
        },
        { status: 400 }
      );
    }

    // Нормализуем ключ (верхний регистр, удаляем пробелы)
    const normalizedKey = key.trim().toUpperCase().replace(/\s+/g, '');
    const licenseKey = `license:${normalizedKey}`;

    // Ищем ключ в Redis
    // hgetall возвращает Record<string, string> или null
    const licenseData = (await redis.hgetall(licenseKey)) as Record<
      string,
      string
    > | null;

    // Проверяем существование ключа
    if (!licenseData || Object.keys(licenseData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Неверный ключ активации. Проверьте правильность ввода.',
        },
        { status: 404 }
      );
    }

    // Проверяем, использован ли ключ
    if (licenseData.is_used === 'true') {
      return NextResponse.json(
        {
          success: false,
          error: 'Этот ключ уже был активирован другим пользователем.',
        },
        { status: 409 }
      );
    }

    // Парсим количество улучшений
    const improvements = parseInt(licenseData.improvements || '0');

    if (isNaN(improvements) || improvements <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Некорректное количество улучшений в ключе.',
        },
        { status: 400 }
      );
    }

    // Увеличиваем лимит пользователя
    const updatedLimit = await increaseLimit(guestId, improvements);

    // Помечаем ключ как использованный
    // Правильный синтаксис для hset с несколькими полями
    await redis.hset(licenseKey, {
      // Сохраняем существующие данные
      ...licenseData,
      // Обновляем нужные поля
      is_used: 'true',
      activated_by: guestId,
      activated_at: new Date().toISOString(),
    });

    // Устанавливаем TTL для ключа (храним 90 дней после активации)
    await redis.expire(licenseKey, 60 * 60 * 24 * 90);

    return NextResponse.json({
      success: true,
      limitRemaining: updatedLimit.remaining,
      improvementsAdded: improvements,
      message: 'Ключ успешно активирован!',
    });
  } catch (error) {
    console.error('Activation API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Внутренняя ошибка сервера. Попробуйте позже.',
      },
      { status: 500 }
    );
  }
}
