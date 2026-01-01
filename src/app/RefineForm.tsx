'use client'; // Это важно для компонентов с состоянием

import { useState } from 'react';

export default function RefineForm() {
  // Состояние компонента (переменные, которые меняются)
  const [draft, setDraft] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [goal, setGoal] = useState('click');

  // Функция при отправке формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ draft, platform, goal });
    // Здесь позже будет вызов API
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md text-gray-400">
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
          />
          <div className="text-right text-sm text-gray-500 mt-1">
            {draft.length}/2000
          </div>
        </div>

        {/* Выбор платформы */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Платформа
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="youtube">YouTube</option>
              <option value="pond5">Pond5</option>
            </select>
          </div>

          {/* Выбор цели */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Цель
            </label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="click">Сделать кликабельным</option>
              <option value="seo">Усилить для SEO</option>
              <option value="clear">Сделать чётким</option>
            </select>
          </div>
        </div>

        {/* Кнопка отправки */}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-md hover:from-blue-700 hover:to-indigo-700 transition-colors"
        >
          Оптимизировать под платформу
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-gray-500">
        Бесплатно: 2 улучшения. Осталось: 2
      </div>
    </div>
  );
}
