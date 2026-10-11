import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Button } from '../../components/Button'
import { Screen } from '../../components/Screen'
import { TextField } from '../../components/TextField'
import { useAuth } from '../../context/AuthContext'
import { EMAIL_REGEX } from '../../lib/errors'
import type { RootStackParamList } from '../../navigation/types'
import { colors } from '../../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>

export function ForgotPasswordScreen({ navigation }: Props) {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const onSubmit = async () => {
    setError(null)
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    setLoading(true)
    const result = await resetPassword(email)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <Screen>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          If an account exists for {email.trim()}, we sent a link to reset your password.
        </Text>
        <Button title="Back to log in" onPress={() => navigation.goBack()} />
      </Screen>
    )
  }

  return (
    <Screen>
      <Text style={styles.title}>Reset your password</Text>
      <Text style={styles.subtitle}>
        Enter your email and we will send you a reset link.
      </Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
        error={error}
      />
      <Button title="Send reset link" onPress={onSubmit} loading={loading} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 12 },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 24 },
})
