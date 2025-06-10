import './App.css'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Languages } from "lucide-react"

function App() {

  return (
    <div className="flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Languages className="h-10 w-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Hello world!</h1>
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Badge variant="secondary" className="mb-4">
              Coming Soon
            </Badge>
            <p className="text-lg text-gray-700 leading-relaxed">
              I am a placeholder for the translation app.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App