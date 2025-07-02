import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <div className="text-center max-w-md mx-auto">
          {/* Main Title */}
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-4">
            Challenge!
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed">
            마음대로 설정하고,<br />
            기록하세요!
          </p>
          
          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-8 rounded-2xl text-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              로그인
            </button>
            
            <button
              onClick={() => navigate('/signup')}
              className="w-full bg-white hover:bg-gray-50 text-indigo-600 font-semibold py-4 px-8 rounded-2xl text-lg border-2 border-indigo-600 transition-colors duration-200"
            >
              새로 시작하기
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="pb-8 text-center">
        <p className="text-gray-500 text-sm">
          친구들과 함께하는 챌린지 플랫폼
        </p>
      </div>
    </div>
  )
} 