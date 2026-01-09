import { NextRequest, NextResponse } from 'next/server';
import { getUserLimit, decrementLimit } from '@/lib/limits';

export async function GET(request: NextRequest) {
  const guestId = 'test_guest_123'; // Тестовый ID

  try {
    // Получаем начальный лимит
    const initialLimit = await getUserLimit(guestId);

    // Уменьшаем лимит
    const updatedLimit = await decrementLimit(guestId);

    // Ещё раз уменьшаем
    const secondDecrement = await decrementLimit(guestId);

    return NextResponse.json({
      success: true,
      steps: {
        initial: initialLimit,
        after_first_decrement: updatedLimit,
        after_second_decrement: secondDecrement,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
