import { Redis } from '@upstash/redis';

// Инициализируем клиент Redis с использованием переменных окружения
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Тип данных для хранения лимита пользователя
 */
interface UserLimit {
  remaining: number; // Сколько попыток осталось
  totalUsed: number; // Сколько всего использовано
}

/**
 * Ключ для хранения лимитов в Redis (guest_id → UserLimit)
 */
function getLimitKey(guestId: string): string {
  return `limit:${guestId}`;
}

/**
 * Получить лимит пользователя. Если лимита нет, создаёт новый (2 попытки).
 * @param guestId Уникальный идентификатор пользователя
 * @returns Объект UserLimit
 */
export async function getUserLimit(guestId: string): Promise<UserLimit> {
  try {
    // Пытаемся получить существующий лимит из Redis
    const key = getLimitKey(guestId);
    const limit = await redis.get<UserLimit>(key);

    if (limit) {
      return limit;
    }

    // Если лимита нет, создаём новый (2 бесплатные попытки)
    const newLimit: UserLimit = {
      remaining: 2,
      totalUsed: 0,
    };

    await redis.set(key, newLimit);
    return newLimit;
  } catch (error) {
    console.error('Ошибка при получении лимита:', error);
    // В случае ошибки возвращаем дефолтные значения
    return { remaining: 2, totalUsed: 0 };
  }
}

/**
 * Уменьшить лимит пользователя на 1.
 * @param guestId Уникальный идентификатор пользователя
 * @returns Новый объект UserLimit или null, если лимит исчерпан
 */
// export async function decrementLimit(
//   guestId: string
// ): Promise<UserLimit | null> {
//   try {
//     const key = getLimitKey(guestId);

//     // Используем транзакцию для атомарного обновления
//     const result = await redis
//       .multi()
//       .get(key) // Получаем текущее значение
//       .exec();

//     if (!result || !result[0]) {
//       return null;
//     }

//     const currentLimit = result[0] as UserLimit;

//     // Проверяем, остались ли попытки
//     if (currentLimit.remaining <= 0) {
//       return null; // Лимит исчерпан
//     }

//     // Создаём обновлённый лимит
//     const updatedLimit: UserLimit = {
//       remaining: currentLimit.remaining - 1,
//       totalUsed: currentLimit.totalUsed + 1,
//     };

//     // Сохраняем обновлённый лимит
//     await redis.set(key, updatedLimit);
//     return updatedLimit;
//   } catch (error) {
//     console.error('Ошибка при уменьшении лимита:', error);
//     return null;
//   }
// }

/**
 * Уменьшить лимит пользователя на 1.
 * Сначала получает лимит, если его нет — создаёт новый (2 попытки).
 * @param guestId Уникальный идентификатор пользователя
 * @returns Новый объект UserLimit или null, если лимит исчерпан
 */
export async function decrementLimit(
  guestId: string
): Promise<UserLimit | null> {
  try {
    const key = getLimitKey(guestId);

    // 1. ПОЛУЧАЕМ ТЕКУЩИЙ ЛИМИТ ИЛИ СОЗДАЁМ НОВЫЙ
    let currentLimit = await redis.get<UserLimit>(key);

    if (!currentLimit) {
      // Если лимита нет, создаём новый с 2 попытками
      currentLimit = {
        remaining: 2,
        totalUsed: 0,
      };
      await redis.set(key, currentLimit);
    }

    // 2. ПРОВЕРЯЕМ, ОСТАЛИСЬ ЛИ ПОПЫТКИ
    if (currentLimit.remaining <= 0) {
      return null; // Лимит исчерпан
    }

    // 3. СОЗДАЁМ ОБНОВЛЁННЫЙ ЛИМИТ (уменьшаем на 1)
    const updatedLimit: UserLimit = {
      remaining: currentLimit.remaining - 1,
      totalUsed: currentLimit.totalUsed + 1,
    };

    // 4. СОХРАНЯЕМ ОБНОВЛЁННЫЙ ЛИМИТ
    await redis.set(key, updatedLimit);
    return updatedLimit;
  } catch (error) {
    console.error('Ошибка при уменьшении лимита:', error);
    return null;
  }
}

/**
 * Простая проверка, есть ли у пользователя попытки.
 * @param guestId Уникальный идентификатор пользователя
 * @returns true если есть попытки, false если нет
 */
export async function checkLimit(guestId: string): Promise<boolean> {
  try {
    const limit = await getUserLimit(guestId);
    return limit.remaining > 0;
  } catch (error) {
    console.error('Ошибка при проверке лимита:', error);
    return false;
  }
}

/**
 * Увеличить лимит пользователя (например, при активации ключа).
 * @param guestId Уникальный идентификатор пользователя
 * @param improvements Количество улучшений для добавления
 * @returns Новый объект UserLimit
 */
export async function increaseLimit(
  guestId: string,
  improvements: number
): Promise<UserLimit> {
  try {
    const key = getLimitKey(guestId);
    const currentLimit = await getUserLimit(guestId);

    const updatedLimit: UserLimit = {
      remaining: currentLimit.remaining + improvements,
      totalUsed: currentLimit.totalUsed,
    };

    await redis.set(key, updatedLimit);
    return updatedLimit;
  } catch (error) {
    console.error('Ошибка при увеличении лимита:', error);
    return { remaining: improvements, totalUsed: 0 };
  }
}

export { redis };
