import { Bell, BellOff } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
import { type NotificationLeadTime, usePreferencesStore } from '~/store/preferences'

const LEAD_TIME_OPTIONS: { value: NotificationLeadTime; label: string }[] = [
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '7 days before' },
]

interface NotificationSettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationSettingsDialog({ isOpen, onClose }: NotificationSettingsDialogProps) {
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    notificationLeadTimes,
    setNotificationLeadTimes,
    notificationDigestMode,
    setNotificationDigestMode,
  } = usePreferencesStore()

  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default',
  )

  const handleToggleNotifications = async (checked: boolean) => {
    if (checked) {
      if (!('Notification' in window)) {
        toast.error('Your browser does not support notifications.')
        return
      }
      if (Notification.permission === 'denied') {
        toast.error('Notifications are blocked in your browser. Please allow them in site settings.')
        return
      }
      if (Notification.permission !== 'granted') {
        const result = await Notification.requestPermission()
        setPermissionState(result)
        if (result !== 'granted') {
          toast.error('Notification permission was not granted.')
          return
        }
      }
      setNotificationsEnabled(true)
      toast.success('Browser notifications enabled.')
    } else {
      setNotificationsEnabled(false)
    }
  }

  const toggleLeadTime = (value: NotificationLeadTime) => {
    if (notificationLeadTimes.includes(value)) {
      setNotificationLeadTimes(notificationLeadTimes.filter((t) => t !== value))
    } else {
      setNotificationLeadTimes([...notificationLeadTimes, value].sort((a, b) => a - b))
    }
  }

  const browserSupported = typeof window !== 'undefined' && 'Notification' in window
  const isBlocked = permissionState === 'denied'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Notification Settings</DialogTitle>
          <DialogDescription>Get browser reminders before subscriptions renew.</DialogDescription>
        </DialogHeader>

        {!browserSupported && <p className="text-sm text-destructive">Your browser does not support notifications.</p>}
        {isBlocked && (
          <p className="text-sm text-destructive">
            Notifications are blocked. Enable them in your browser site settings and reload.
          </p>
        )}

        <div className="space-y-4 mt-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-toggle" className="flex items-center gap-2 cursor-pointer">
              {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              Enable notifications
            </Label>
            <Switch
              id="notif-toggle"
              checked={notificationsEnabled}
              onCheckedChange={handleToggleNotifications}
              disabled={!browserSupported || isBlocked}
            />
          </div>

          {notificationsEnabled && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Remind me</Label>
                {LEAD_TIME_OPTIONS.map(({ value, label }) => (
                  <div key={value} className="flex items-center gap-2">
                    <Checkbox
                      id={`lead-${value}`}
                      checked={notificationLeadTimes.includes(value)}
                      onCheckedChange={() => toggleLeadTime(value)}
                    />
                    <Label htmlFor={`lead-${value}`} className="cursor-pointer text-sm font-normal">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="digest-toggle" className="text-sm cursor-pointer">
                  Daily digest (bundle all reminders)
                </Label>
                <Switch
                  id="digest-toggle"
                  checked={notificationDigestMode}
                  onCheckedChange={setNotificationDigestMode}
                />
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
