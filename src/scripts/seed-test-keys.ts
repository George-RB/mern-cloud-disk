import { redis } from '@/lib/limits';

async function seedTestKeys() {
  console.log('🎯 Создание тестовых ключей для ContentRefinery...\n');

  const testKeys = [
    {
      key: 'TEST-1234-5678-ABCD',
      improvements: 20,
      note: 'Тестовый ключ на 20 улучшений',
    },
    {
      key: 'TEST-9876-5432-DCBA',
      improvements: 50,
      note: 'Тестовый ключ на 50 улучшений',
    },
  ];

  for (const testKey of testKeys) {
    const redisKey = `license:${testKey.key}`;

    // Проверяем, не существует ли уже ключ
    const existing = await redis.exists(redisKey);

    if (existing) {
      console.log(`⚠️  Ключ ${testKey.key} уже существует, пропускаем...`);
      continue;
    }

    await redis.hset(redisKey, {
      improvements: testKey.improvements.toString(),
      is_used: 'false',
      activated_by: null,
      created_at: new Date().toISOString(),
      note: testKey.note,
    });

    // Устанавливаем TTL 30 дней для тестовых ключей
    await redis.expire(redisKey, 60 * 60 * 24 * 30);

    console.log(`✅ Создан ключ: ${testKey.key}`);
    console.log(`   Улучшений: ${testKey.improvements}`);
    console.log(`   Для активации используйте в интерфейсе\n`);
  }

  console.log('🎉 Тестовые ключи готовы к использованию!');
  console.log('\n📋 Для активации используйте:');
  console.log('1. TEST-1234-5678-ABCD (20 улучшений)');
  console.log('2. TEST-9876-5432-DCBA (50 улучшений)');
}

// Запускаем скрипт
seedTestKeys()
  .then(() => {
    console.log('\n✨ Скрипт завершён успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка при выполнении скрипта:', error);
    process.exit(1);
  });
