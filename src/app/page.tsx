import RefineForm from './RefineForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <header className="pt-10 text-center">
        <h1 className="text-4xl font-bold text-gray-800">ContentRefinery</h1>
        <p className="text-gray-600 mt-2">AI-редактор для ваших черновиков</p>
      </header>

      <RefineForm />
    </div>
  );
}
