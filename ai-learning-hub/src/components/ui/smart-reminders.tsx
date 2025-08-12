"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch' // Temporarily removed due to missing module
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell, 
  Clock, 
  CheckCircle, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3,
  Zap,
  Calendar,
  Target,
  TrendingUp
} from 'lucide-react'
import { useFlashcardStore } from '@/lib/flashcard-store'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

interface Reminder {
  id: string
  type: 'flashcard' | 'study_plan' | 'custom'
  title: string
  description: string
  time: string
  days: string[]
  enabled: boolean
  lastTriggered?: Date
  nextTrigger?: Date
}

interface NotificationSettings {
  pushNotifications: boolean
  emailNotifications: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
}

const SmartReminders: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotifications: true,
    emailNotifications: false,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  })
  const [showAddReminder, setShowAddReminder] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [addedSmartReminders, setAddedSmartReminders] = useState<string[]>([])
  const [recentlyAdded, setRecentlyAdded] = useState<string[]>([])
  const [activeNotification, setActiveNotification] = useState<Reminder | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    type: 'flashcard',
    title: '',
    description: '',
    time: '09:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    enabled: true
  })
  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null)
  const [editingSmartReminder, setEditingSmartReminder] = useState<Reminder | null>(null)

  const { flashcards, reviews } = useFlashcardStore()

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission)
        })
      }
    }
  }, [])

  // Check for due reminders every minute
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date()
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

      reminders.forEach(reminder => {
        if (reminder.enabled && 
            reminder.time === currentTime && 
            reminder.days.includes(currentDay) &&
            !isInQuietHours(now) &&
            shouldTriggerReminder(reminder, now)) {
          triggerNotification(reminder)
        }
      })
    }

    // Check immediately when component loads
    checkReminders()
    
    // Then check every minute
    const interval = setInterval(checkReminders, 60000)
    return () => clearInterval(interval)
  }, [reminders, settings])

  const isInQuietHours = (now: Date): boolean => {
    if (!settings.quietHours.enabled) return false
    
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
    const start = settings.quietHours.start
    const end = settings.quietHours.end
    
    if (start <= end) {
      return currentTime >= start && currentTime <= end
    } else {
      // Quiet hours span midnight
      return currentTime >= start || currentTime <= end
    }
  }

  const shouldTriggerReminder = (reminder: Reminder, now: Date): boolean => {
    if (!reminder.lastTriggered) {
      return true
    }
    
    const lastTriggered = new Date(reminder.lastTriggered)
    const diffInMinutes = (now.getTime() - lastTriggered.getTime()) / (1000 * 60)
    
    // Don't trigger the same reminder within 30 minutes
    return diffInMinutes >= 30
  }

  const triggerNotification = (reminder: Reminder) => {
    // Update last triggered time
    const updatedReminder = { ...reminder, lastTriggered: new Date() }
    updateReminder(reminder.id, { lastTriggered: new Date() })

    // Show in-app notification
    setActiveNotification(updatedReminder)

    // Play sound if enabled
    if (settings.soundEnabled) {
      playNotificationSound()
    }

    // Show browser notification if enabled and permitted
    if (settings.pushNotifications && notificationPermission === 'granted') {
      new Notification(`Study Reminder: ${reminder.title}`, {
        body: reminder.description,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: reminder.id,
        requireInteraction: true
      })
    }

    // Vibrate if enabled and supported
    if (settings.vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }

    // Show toast notification
    toast.info(`Reminder: ${reminder.title}`, {
      description: reminder.description,
      duration: 10000,
      action: {
        label: 'View',
        onClick: () => setActiveNotification(updatedReminder)
      }
    })
  }

  const playNotificationSound = () => {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.warn('Could not play notification sound:', error)
    }
  }

  const dismissNotification = () => {
    setActiveNotification(null)
  }

  // Load reminders from localStorage
  useEffect(() => {
    const savedReminders = localStorage.getItem('smart-reminders')
    const savedSettings = localStorage.getItem('reminder-settings')
    const savedAddedSmartReminders = localStorage.getItem('added-smart-reminders')
    
    if (savedReminders) {
      setReminders(JSON.parse(savedReminders))
    }
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
    if (savedAddedSmartReminders) {
      setAddedSmartReminders(JSON.parse(savedAddedSmartReminders))
    }
  }, [])

  // Save reminders to localStorage
  useEffect(() => {
    localStorage.setItem('smart-reminders', JSON.stringify(reminders))
  }, [reminders])

  // Save added smart reminders to localStorage
  useEffect(() => {
    localStorage.setItem('added-smart-reminders', JSON.stringify(addedSmartReminders))
  }, [addedSmartReminders])

  useEffect(() => {
    localStorage.setItem('reminder-settings', JSON.stringify(settings))
  }, [settings])

  // Generate smart reminders based on user activity
  const generateSmartReminders = () => {
    const smartReminders: Reminder[] = []
    
    // Flashcard reminders based on due cards
    const dueCards = flashcards.filter(card => {
      const cardReviews = reviews.filter(r => r.flashcard_id === card.id)
      if (cardReviews.length === 0) return true
      const lastReview = cardReviews.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
      return new Date(lastReview.next_review_date) <= new Date()
    })

    if (dueCards.length > 0) {
      smartReminders.push({
        id: 'smart-flashcards',
        type: 'flashcard',
        title: 'Flashcards Due for Review',
        description: `${dueCards.length} flashcards are ready for review`,
        time: '10:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        enabled: true
      })
    }

    // Study streak reminder
    const today = new Date().toISOString().slice(0, 10)
    const hasStudiedToday = reviews.some(r => 
      r.created_at.slice(0, 10) === today
    )

    if (!hasStudiedToday) {
      smartReminders.push({
        id: 'study-streak',
        type: 'custom',
        title: 'Maintain Your Study Streak',
        description: 'Keep your learning momentum going!',
        time: '18:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        enabled: true
      })
    }

    return smartReminders.filter(sr => !addedSmartReminders.includes(sr.id))
  }

  const addReminder = () => {
    if (!newReminder.title || !newReminder.description) return

    const reminder: Reminder = {
      id: Date.now().toString(),
      type: newReminder.type || 'custom',
      title: newReminder.title,
      description: newReminder.description,
      time: newReminder.time || '09:00',
      days: newReminder.days || ['monday'],
      enabled: newReminder.enabled || true
    }

    setReminders([...reminders, reminder])
    toast.success('Reminder added!')
    setNewReminder({
      type: 'flashcard',
      title: '',
      description: '',
      time: '09:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      enabled: true
    })
    setShowAddReminder(false)
  }

  const updateReminder = (id: string, updates: Partial<Reminder>) => {
    setReminders(reminders.map(r => 
      r.id === id ? { ...r, ...updates } : r
    ))
  }

  const deleteReminder = (id: string) => {
    setReminderToDelete(reminders.find(r => r.id === id) || null)
  }

  const confirmDeleteReminder = (id: string) => {
    setReminderToDelete(reminders.find(r => r.id === id) || null)
  }

  const handleDeleteReminder = () => {
    if (reminderToDelete) {
      setReminders(reminders.filter(r => r.id !== reminderToDelete.id))
      toast.success('Reminder deleted!')
      setReminderToDelete(null)
    }
  }

  const addSmartReminder = (smartReminder: Reminder) => {
    const newReminder = { 
      ...smartReminder, 
      id: `smart-${Date.now()}`,
      enabled: true 
    }
    setReminders([...reminders, newReminder])
    setAddedSmartReminders([...addedSmartReminders, smartReminder.id])
    setRecentlyAdded([...recentlyAdded, smartReminder.id])
    
    // Remove from recently added after 3 seconds
    setTimeout(() => {
      setRecentlyAdded(prev => prev.filter(id => id !== smartReminder.id))
    }, 3000)
    
    toast.success(`Added "${smartReminder.title}" reminder!`, {
      description: "You'll be notified according to your settings",
      duration: 3000
    })
  }

  const saveEditedSmartReminder = () => {
    if (editingSmartReminder) {
      addSmartReminder(editingSmartReminder)
      setEditingSmartReminder(null)
    }
  }

  const toggleReminder = (id: string) => {
    updateReminder(id, { enabled: !reminders.find(r => r.id === id)?.enabled })
  }

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'flashcard': return <Target className="h-4 w-4" />
      case 'study_plan': return <Calendar className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getReminderColor = (type: string) => {
    switch (type) {
      case 'flashcard': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'study_plan': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-purple-100 text-purple-700 border-purple-200'
    }
  }

  const formatDays = (days: string[]) => {
    const dayMap: Record<string, string> = {
      monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
      thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
    }
    return days.map(day => dayMap[day]).join(', ')
  }

  const smartReminders = generateSmartReminders()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            Smart Study Reminders
          </h2>
          <p className="text-gray-600 mt-1">
            Never miss a study session with intelligent reminders
          </p>
        </div>
        <Button 
          onClick={() => setShowAddReminder(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Reminder
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Reminders</TabsTrigger>
          <TabsTrigger value="smart">Smart Suggestions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {reminders.length === 0 ? (
            <Card className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Custom Reminders</h3>
              <p className="text-gray-500 mb-4">
                Create your first reminder to stay on track with your studies
              </p>
              <Button onClick={() => setShowAddReminder(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Reminder
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reminders.map((reminder) => (
                <Card key={reminder.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${getReminderColor(reminder.type)}`}>
                          {getReminderIcon(reminder.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{reminder.title}</h3>
                            <Badge variant={reminder.enabled ? "default" : "secondary"}>
                              {reminder.enabled ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{reminder.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {reminder.time}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDays(reminder.days)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={reminder.enabled}
                          onCheckedChange={() => toggleReminder(reminder.id)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingReminder(reminder)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDeleteReminder(reminder.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="smart" className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">AI-Powered Suggestions</h3>
            </div>
            <p className="text-gray-600 text-sm">
              These reminders are automatically generated based on your study patterns and progress
            </p>
          </div>

          {smartReminders.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">All Caught Up!</h3>
              <p className="text-gray-500">
                Great job! You&apos;re on track with your studies. Check back later for new suggestions.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {smartReminders.map((reminder) => (
                <Card key={reminder.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                        {getReminderIcon(reminder.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{reminder.title}</h3>
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            Smart
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{reminder.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {reminder.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDays(reminder.days)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSmartReminder(reminder)}
                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Customize
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => addSmartReminder(reminder)}
                          className={recentlyAdded.includes(reminder.id) 
                            ? "bg-green-600 hover:bg-green-700" 
                            : "bg-blue-600 hover:bg-blue-700"
                          }
                          disabled={recentlyAdded.includes(reminder.id)}
                        >
                          {recentlyAdded.includes(reminder.id) ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </>
                        )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Customize how and when you receive reminders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Push Notifications</Label>
                    <p className="text-xs text-gray-500">Receive notifications on your device</p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, pushNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Sound Alerts</Label>
                    <p className="text-xs text-gray-500">Play sound when reminders trigger</p>
                  </div>
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, soundEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Vibration</Label>
                    <p className="text-xs text-gray-500">Vibrate device for notifications</p>
                  </div>
                  <Switch
                    checked={settings.vibrationEnabled}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, vibrationEnabled: checked })
                    }
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label className="text-sm font-medium">Quiet Hours</Label>
                    <p className="text-xs text-gray-500">Pause notifications during specific hours</p>
                  </div>
                  <Switch
                    checked={settings.quietHours.enabled}
                    onCheckedChange={(checked) => 
                      setSettings({ 
                        ...settings, 
                        quietHours: { ...settings.quietHours, enabled: checked }
                      })
                    }
                  />
                </div>
                
                {settings.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Start Time</Label>
                      <Input
                        type="time"
                        value={settings.quietHours.start}
                        onChange={(e : React.ChangeEvent<HTMLInputElement>) => 
                          setSettings({ 
                            ...settings, 
                            quietHours: { ...settings.quietHours, start: e.target.value }
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">End Time</Label>
                      <Input
                        type="time"
                        value={settings.quietHours.end}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setSettings({ 
                            ...settings, 
                            quietHours: { ...settings.quietHours, end: e.target.value }
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Smart Suggestions Management
              </CardTitle>
              <CardDescription>
                Manage your AI-powered reminder suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Reset smart suggestions to see all AI-powered recommendations again.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddedSmartReminders([])
                      toast.success("Smart suggestions reset! Check the Smart Suggestions tab for new recommendations.")
                    }}
                    className="w-full"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Reset Smart Suggestions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Reminder Modal */}
      {showAddReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add New Reminder</CardTitle>
              <CardDescription>
                Create a custom study reminder
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="">Type</Label>
                <Select
                  value={newReminder.type}
                  onValueChange={(value: "flashcard" | "study_plan" | "custom") => setNewReminder({ ...newReminder, type: value })}
                >
                  <SelectTrigger className="">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="">
                    <SelectItem className="" value="flashcard">Flashcard Review</SelectItem>
                    <SelectItem className="" value="study_plan">Study Plan</SelectItem>
                    <SelectItem className="" value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="">Title</Label>
                <Input className=""
                              value={newReminder.title}
                              onChange={(e : React.ChangeEvent<HTMLInputElement>) => setNewReminder({ ...newReminder, title: e.target.value })}
                              placeholder="e.g., Review Flashcards" type={undefined}/>
              </div>

              <div>
                <Label className="">Description</Label>
                <Input
                                  value={newReminder.description}
                                  className=""
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewReminder({ ...newReminder, description: e.target.value })}
                                  placeholder="e.g., Time to review your flashcards"
                                  type="text"
                                />
                <Label className="">Time</Label>
                <Input className=""
                  type="time"
                  value={newReminder.time}
                  onChange={(e : React.ChangeEvent<HTMLInputElement>) => setNewReminder({ ...newReminder, time: e.target.value })}
                />
              </div>

              <div>
                <Label className="font-medium">Days</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { key: 'monday', label: 'Monday' },
                    { key: 'tuesday', label: 'Tuesday' },
                    { key: 'wednesday', label: 'Wednesday' },
                    { key: 'thursday', label: 'Thursday' },
                    { key: 'friday', label: 'Friday' },
                    { key: 'saturday', label: 'Saturday' },
                    { key: 'sunday', label: 'Sunday' }
                  ].map((day) => (
                    <label key={day.key} className="flex items-center space-x-2 text-sm">
                      <Checkbox
                        checked={newReminder.days?.includes(day.key) || false}
                        onCheckedChange={(checked: boolean) => {
                          const currentDays = newReminder.days || []
                          if (checked) {
                            setNewReminder({
                              ...newReminder,
                              days: [...currentDays, day.key]
                            })
                          } else {
                            setNewReminder({
                              ...newReminder,
                              days: currentDays.filter(d => d !== day.key)
                            })
                          }
                        }}
                      />
                      <span>{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={addReminder} className="flex-1">
                  Add Reminder
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddReminder(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Reminder Modal */}
      {editingReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Edit Reminder</CardTitle>
              <CardDescription>
                Update your study reminder
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="">Type</Label>
                <Select
                  value={editingReminder.type}
                  onValueChange={(value: "flashcard" | "study_plan" | "custom") => {
                    if (editingReminder) {
                      setEditingReminder({ ...editingReminder, type: value })
                    }
                  }}
                >
                  <SelectTrigger className="">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="">
                    <SelectItem className="" value="flashcard">Flashcard Review</SelectItem>
                    <SelectItem className="" value="study_plan">Study Plan</SelectItem>
                    <SelectItem className="" value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="">Title</Label>
                <Input className=""
                              value={editingReminder.title}
                              onChange={(e : React.ChangeEvent<HTMLInputElement>) => {
                                if (editingReminder) {
                                  setEditingReminder({ ...editingReminder, title: e.target.value })
                                }
                              }}
                              placeholder="e.g., Review Flashcards" type={undefined}/>
              </div>

              <div>
                <Label className="">Description</Label>
                <Input
                                  value={editingReminder.description}
                                  className=""
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    if (editingReminder) {
                                      setEditingReminder({ ...editingReminder, description: e.target.value })
                                    }
                                  }}
                                  placeholder="e.g., Time to review your flashcards"
                                  type="text"
                                />
                <Label className="">Time</Label>
                <Input className=""
                  type="time"
                  value={editingReminder.time}
                  onChange={(e : React.ChangeEvent<HTMLInputElement>) => {
                    if (editingReminder) {
                      setEditingReminder({ ...editingReminder, time: e.target.value })
                    }
                  }}
                />
              </div>

              <div>
                <Label className="font-medium">Days</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { key: 'monday', label: 'Monday' },
                    { key: 'tuesday', label: 'Tuesday' },
                    { key: 'wednesday', label: 'Wednesday' },
                    { key: 'thursday', label: 'Thursday' },
                    { key: 'friday', label: 'Friday' },
                    { key: 'saturday', label: 'Saturday' },
                    { key: 'sunday', label: 'Sunday' }
                  ].map((day) => (
                    <label key={day.key} className="flex items-center space-x-2 text-sm">
                      <Checkbox
                        checked={editingReminder.days?.includes(day.key) || false}
                        onCheckedChange={(checked: boolean) => {
                          if (editingReminder) {
                            const currentDays = editingReminder.days || []
                            if (checked) {
                              setEditingReminder({
                                ...editingReminder,
                                days: [...currentDays, day.key]
                              })
                            } else {
                              setEditingReminder({
                                ...editingReminder,
                                days: currentDays.filter(d => d !== day.key)
                              })
                            }
                          }
                        }}
                      />
                      <span>{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    if (editingReminder) {
                      updateReminder(editingReminder.id, editingReminder)
                      setEditingReminder(null)
                      toast.success('Reminder updated!')
                    }
                  }} 
                  className="flex-1"
                >
                  Update Reminder
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingReminder(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {reminderToDelete && (
        <AlertDialog open={!!reminderToDelete} onOpenChange={(open: boolean) => { if (!open) setReminderToDelete(null) }}>
          <AlertDialogContent className="">
            <AlertDialogHeader className="">
              <AlertDialogTitle className="">Delete Reminder?</AlertDialogTitle>
              <AlertDialogDescription className="">
                Are you sure you want to delete this reminder? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="">
              <AlertDialogCancel onClick={() => setReminderToDelete(null)} className="">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteReminder} className="">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Edit Smart Reminder Dialog */}
      {editingSmartReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Customize Smart Reminder
              </CardTitle>
              <CardDescription>
                Adjust the time and schedule for this AI suggestion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="font-medium text-gray-700">{editingSmartReminder.title}</Label>
                <p className="text-sm text-gray-600 mt-1">{editingSmartReminder.description}</p>
              </div>

              <div>
                <Label className="font-medium">Time</Label>
                <input
                  type="time"
                  value={editingSmartReminder.time}
                  onChange={(e) => setEditingSmartReminder({
                    ...editingSmartReminder,
                    time: e.target.value
                  })}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <Label className="font-medium">Days</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { key: 'monday', label: 'Monday' },
                    { key: 'tuesday', label: 'Tuesday' },
                    { key: 'wednesday', label: 'Wednesday' },
                    { key: 'thursday', label: 'Thursday' },
                    { key: 'friday', label: 'Friday' },
                    { key: 'saturday', label: 'Saturday' },
                    { key: 'sunday', label: 'Sunday' }
                  ].map((day) => (
                    <label key={day.key} className="flex items-center space-x-2 text-sm">
                      <Checkbox
                        checked={editingSmartReminder.days.includes(day.key)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setEditingSmartReminder({
                              ...editingSmartReminder,
                              days: [...editingSmartReminder.days, day.key]
                            })
                          } else {
                            setEditingSmartReminder({
                              ...editingSmartReminder,
                              days: editingSmartReminder.days.filter(d => d !== day.key)
                            })
                          }
                        }}
                      />
                      <span>{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardContent className="flex gap-3 pt-0">
              <Button
                variant="outline"
                onClick={() => setEditingSmartReminder(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={saveEditedSmartReminder}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Add Reminder
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Notification Popup */}
      {activeNotification && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-4 border-l-4 border-l-orange-500 shadow-2xl animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                    <Bell className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-orange-900">Study Reminder</CardTitle>
                    <CardDescription className="text-orange-700">Time to focus!</CardDescription>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={dismissNotification}
                  className="text-orange-600 hover:text-orange-800"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {activeNotification.title}
                </h3>
                <p className="text-gray-600">
                  {activeNotification.description}
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Triggered at {activeNotification.time}</span>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={dismissNotification}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Got it!
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    updateReminder(activeNotification.id, { enabled: false })
                    dismissNotification()
                    toast.success('Reminder disabled')
                  }}
                  className="flex-1"
                >
                  Stop Reminder
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default SmartReminders 