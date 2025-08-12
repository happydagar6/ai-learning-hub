declare module '@/components/ui/focus-mode' {
  export function FocusMode(): JSX.Element
}

declare module '@/components/ui/dark-study-mode' {
  export function DarkStudyMode(): JSX.Element
}

declare module '@/components/ui/accessibility-mode' {
  export function AccessibilityMode(): JSX.Element
}

declare module '@/hooks/useImmersiveSettings' {
  interface ImmersiveSettings {
    focusMode: {
      isEnabled: boolean
      ambientSound: string
      soundVolume: number
      pomodoroEnabled: boolean
      workDuration: number
      breakDuration: number
      distractionsBlocked: boolean
    }
    darkMode: {
      isEnabled: boolean
      brightness: number
      contrast: number
      blueLight: boolean
      eyeBreakReminders: boolean
    }
    accessibility: {
      voiceNavigation: boolean
      highContrast: boolean
      fontSize: 'normal' | 'large' | 'extra-large'
      fontFamily: 'default' | 'dyslexia' | 'mono'
      reduceMotion: boolean
      screenReader: boolean
    }
  }

  interface UseImmersiveSettingsReturn {
    settings: ImmersiveSettings | null
    isLoading: boolean
    error: string | null
    updateSettings: (newSettings: Partial<ImmersiveSettings>) => Promise<void>
    resetSettings: () => Promise<void>
  }

  export function useImmersiveSettings(): UseImmersiveSettingsReturn
}

declare module '@/contexts/ImmersiveContext' {
  export interface ImmersiveSettings {
    focusMode: {
      isEnabled: boolean
      ambientSound: string
      soundVolume: number
      pomodoroEnabled: boolean
      workDuration: number
      breakDuration: number
      distractionsBlocked: boolean
    }
    darkMode: {
      isEnabled: boolean
      brightness: number
      contrast: number
      blueLight: boolean
      eyeBreakReminders: boolean
    }
    accessibility: {
      voiceNavigation: boolean
      highContrast: boolean
      fontSize: 'normal' | 'large' | 'extra-large'
      fontFamily: 'default' | 'dyslexia' | 'mono'
      reduceMotion: boolean
      screenReader: boolean
    }
  }

  export function ImmersiveProvider({ children }: { children: React.ReactNode }): JSX.Element
  export function useImmersive(): any
}
