import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Button } from '../components/Button'
import { Chips } from '../components/Chips'
import { Screen } from '../components/Screen'
import { TextField } from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/errors'
import { supabase } from '../lib/supabase'
import { leaveScreen } from '../navigation/helpers'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Report'>

const REASONS = [
  { id: 'Scam or fraud', label: 'Scam or fraud' },
  { id: 'Fake or misleading', label: 'Fake or misleading' },
  { id: 'Prohibited item', label: 'Prohibited item' },
  { id: 'Offensive content', label: 'Offensive content' },
  { id: 'Other', label: 'Other' },
]

export function ReportScreen({ navigation, route }: Props) {
  const { targetType, targetId } = route.params
  const { user } = useAuth()
  const [reason, setReason] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!user) return
    if (!reason) {
      setError('Choose a reason.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: insertError } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      description: description.trim() || null,
    })
    setSaving(false)
    if (insertError) setError(friendlyError(insertError))
    else setDone(true)
  }

  if (!user) {
    return (
      <Screen>
        <Text style={styles.body}>Log in to send a report.</Text>
        <Button title="Log in" onPress={() => navigation.replace('Login')} />
      </Screen>
    )
  }

  if (done) {
    return (
      <Screen>
        <Text style={styles.title}>Thank you</Text>
        <Text style={styles.body}>
          Your report was sent. The Marketplace team will review it.
        </Text>
        <Button title="Done" onPress={() => leaveScreen(navigation)} />
      </Screen>
    )
  }

  return (
    <Screen>
      <Text style={styles.title}>Report {targetType === 'product' ? 'product' : 'seller'}</Text>
      <Text style={styles.body}>Tell us what is wrong. Reports are reviewed by the team.</Text>
      <Chips label="Reason" options={REASONS} selected={reason} onSelect={setReason} />
      <TextField
        label="Details (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        style={styles.multiline}
        placeholder="Anything that helps us understand"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Send report" onPress={submit} loading={saving} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 4 },
  body: { fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 20 },
  multiline: { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  error: { color: colors.danger, fontSize: 14, marginBottom: 12 },
})
