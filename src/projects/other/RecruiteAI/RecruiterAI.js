import { useAuthenticator } from '@aws-amplify/ui-react';
import { Navigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';

const RecruiterAI = () => {
  const { user } = useAuthenticator();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.history.back()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">RecruiterAI</h1>
                  <p className="text-sm text-gray-500">AI-powered recruitment and candidate screening platform</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Welcome, {user?.attributes?.email || user?.username}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded RecruiterAI */}
      <div className="h-[calc(100vh-64px)]">
        <iframe
          src="https://recruiterai.operisoft.com"
          className="w-full h-full border-0"
          title="RecruiterAI"
          allow="camera; microphone; geolocation; encrypted-media"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </div>
  );
};

export default RecruiterAI;
