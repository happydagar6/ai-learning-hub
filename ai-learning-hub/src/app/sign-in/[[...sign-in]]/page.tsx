import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Welcome Back
          </h1>
          <p className="text-muted-foreground">
            Sign in to access your AI Learning Hub
          </p>
        </div>
        
        <SignIn 
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "w-full shadow-xl border-0",
            }
          }}
        />
      </div>
    </div>
  )
}
