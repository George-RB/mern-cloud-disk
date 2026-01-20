'use client';

import { useState } from 'react';

interface LimitExhaustedProps {
  guestId: string;
  onActivate: (newLimit: number) => void;
}

export default function LimitExhausted({
  guestId,
  onActivate,
}: LimitExhaustedProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setError('Введите ключ активации');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: licenseKey, guestId }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setLicenseKey('');
        // Вызываем колбэк родительского компонента с новым лимитом
        setTimeout(() => onActivate(data.limitRemaining), 1500);
      } else {
        setError(data.error || 'Неизвестная ошибка');
      }
    } catch (err) {
      setError('Ошибка сети. Проверьте подключение.');
      console.error('Activation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-amber-100 to-amber-200 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            ></path>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Бесплатные улучшения закончились
        </h2>
        <p className="text-gray-600">
          Вы использовали 2 бесплатных улучшения. Разблокируйте полный доступ
          для продолжения работы.
        </p>
      </div>

      <div className="mb-8">
        <h3 className="font-semibold text-gray-700 mb-3">
          Выберите пакет улучшений:
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
            <div className="font-bold text-lg text-gray-800">20 улучшений</div>
            <div className="text-2xl font-bold text-blue-600 my-2">$3</div>
            <div className="text-sm text-gray-500">≈ $0.15 за улучшение</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center hover:border-blue-500 transition-colors  bg-blue-50">
            <div className="font-bold text-lg text-gray-800">50 улучшений</div>
            <div className="text-2xl font-bold text-blue-600 my-2">$5</div>
            <div className="text-sm text-gray-500">≈ $0.10 за улучшение</div>
            <div className="mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Выгоднее
            </div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <a
            href="https://app.gumroad.com/checkout?product_id=your-product-id"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-linear-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-md"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A5.995 5.995 0 0115 16a5.995 5.995 0 01-4-1.528A5.995 5.995 0 017 16a5.995 5.995 0 01-4.682-2.028 1 1 0 01-.285-1.05l1.715-5.349-1.195-.598a1 1 0 01.894-1.788l1.6.8L9 4.323V3a1 1 0 011-1zm-3 7.274l-.818 2.552a1 1 0 01-.122.326A3.99 3.99 0 005 14a3.99 3.99 0 003-1.357A3.99 3.99 0 0011 14a3.99 3.99 0 002.94-1.848 1 1 0 01-.122-.326L13 9.274l-2.172.868a1 1 0 01-.656 0L8 9.274z"
                clipRule="evenodd"
              />
            </svg>
            Купить ключ на Gumroad
          </a>
          <p className="text-xs text-gray-500 mt-2">
            После покупки ключ придёт на вашу почту
          </p>
        </div>
      </div>

      <div className="border-t pt-8">
        <h3 className="font-semibold text-gray-700 mb-4">
          Уже есть ключ? Активируйте его:
        </h3>

        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label
              htmlFor="licenseKey"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Ключ активации
            </label>
            <input
              id="licenseKey"
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center tracking-widest font-mono"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !licenseKey.trim()}
            className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Проверка ключа...
              </>
            ) : (
              'Активировать ключ'
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <div className="font-semibold">Ошибка:</div>
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm animate-pulse">
              <div className="font-semibold">Успешно!</div>
              Ключ активирован. Ваш лимит пополнен. Перенаправляем...
            </div>
          )}
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Если возникли проблемы с активацией, напишите на{' '}
            <a
              href="mailto:support@contentrefinery.com"
              className="text-blue-600 hover:underline"
            >
              support@contentrefinery.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
