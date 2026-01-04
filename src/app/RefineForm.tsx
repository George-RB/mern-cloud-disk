'use client';

import { useState } from 'react';

export default function RefineForm() {
  const [draft, setDraft] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [goal, setGoal] = useState('click');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<'openai' | 'deepseek'>('deepseek'); // По умолчанию DeepSeek
  const [result, setResult] = useState<{
    title: string;
    description: string;
    tags: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draft,
          platform,
          goal,
          provider, // <-- Добавляем эту строку
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Что-то пошло не так');
      }
    } catch (err) {
      setError('Ошибка сети. Проверьте подключение.');
      console.error('Ошибка:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Функция копирования текста в буфер обмена
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Можно добавить уведомление об успешном копировании
    alert('Скопировано в буфер обмена!');
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md text-gray-700">
      {!result ? (
        // СОСТОЯНИЕ A: Форма ввода
        <>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            Оптимизируйте текст под платформу за 10 секунд
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Поле для черновика */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ваш черновик
              </label>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Вставьте ваш черновик (заголовок, описание, теги)..."
                className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={2000}
                disabled={isLoading}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {draft.length}/2000
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Платформа
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="youtube">YouTube</option>
                  <option value="pond5">Pond5</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цель
                </label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="click">Сделать кликабельным</option>
                  <option value="seo">Усилить для SEO</option>
                  <option value="clear">Сделать чётким</option>
                </select>
              </div>
            </div>

            {/* Поле выбора провайдера AI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Провайдер
              </label>
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="provider"
                    value="deepseek"
                    checked={provider === 'deepseek'}
                    onChange={(e) => setProvider('deepseek')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2">DeepSeek (рекомендуется)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="provider"
                    value="openai"
                    checked={provider === 'openai'}
                    onChange={(e) => setProvider('openai')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2">OpenAI (если доступен)</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || draft.length === 0}
              className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Оптимизация...' : 'Оптимизировать под платформу'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="mt-4 text-center text-sm text-gray-500">
            Бесплатно: 2 улучшения. Осталось: 2
          </div>
        </>
      ) : (
        // СОСТОЯНИЕ B: Результат
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Ваш текст усилен</h2>

          {/* Заголовок */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-700">ЗАГОЛОВОК</h3>
              <button
                onClick={() => copyToClipboard(result.title)}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-gray-800">{result.title}</p>
            <div className="text-xs text-gray-500 mt-2">
              {result.title.length}/70 символов
            </div>
          </div>

          {/* Описание */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-700">ОПИСАНИЕ</h3>
              <button
                onClick={() => copyToClipboard(result.description)}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-gray-800 whitespace-pre-line">
              {result.description}
            </p>
            <div className="text-xs text-gray-500 mt-2">
              {result.description.length}/300 символов
            </div>
          </div>

          {/* Теги */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-700">ТЕГИ</h3>
              <button
                onClick={() => copyToClipboard(result.tags)}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-gray-800">{result.tags}</p>
          </div>

          {/* Кнопки управления */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={() => setResult(null)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
            >
              Вернуться
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 bg-linear-to-r from-blue-600 to-indigo-600 text-white font-medium py-2 px-4 rounded-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-colors"
            >
              Сгенерировать другой вариант
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
