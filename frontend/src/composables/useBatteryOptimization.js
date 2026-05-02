import { Capacitor } from '@capacitor/core'

const STORAGE_KEY = 'battery_onboarding_shown_v1'


export async function hasShownBatteryOnboarding() {
  if (!Capacitor.isNativePlatform()) return true
  if (Capacitor.getPlatform() !== 'android') return true
  try {
    const { Preferences } = await import('@capacitor/preferences')
    const result = await Preferences.get({ key: STORAGE_KEY })
    return result?.value === 'true'
  } catch {
    return true
  }
}


export async function markBatteryOnboardingShown() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.set({ key: STORAGE_KEY, value: 'true' })
  } catch {
    // best-effort
  }
}


export async function openBatterySettings() {
  if (!Capacitor.isNativePlatform()) return false
  if (Capacitor.getPlatform() !== 'android') return false
  try {
    const { NativeSettings, AndroidSettings } = await import('capacitor-native-settings')
    await NativeSettings.openAndroid({ option: AndroidSettings.BatteryOptimization })
    return true
  } catch (err) {
    console.error('[battery] failed to open settings', err)
    return false
  }
}