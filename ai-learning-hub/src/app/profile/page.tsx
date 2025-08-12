import { UserProfile } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProfilePage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Profile Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <UserProfile 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "border-0 shadow-none",
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
