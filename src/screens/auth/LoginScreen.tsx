import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Button } from '../../components/Button'
import { Screen } from '../../components/Screen'
import { TextField } from '../../components/TextField'
import { useAuth } from '../../context/AuthContext'
import { EMAIL_REGEX } from '../../lib/errors'
import { leaveScreen } from '../../navigation/helpers'
import type { RootStackParamList } from '../../navigation/types'
import { colors } from '../../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  const onSubmit = async () => {
    setFormError(null)
    setEmailError(null)

    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Enter a valid email address.')
      return
    }
    if (!password) {
      setFormError('Enter your password.')
      return
    }

    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      setFormError(error)
      return
    }
    leaveScreen(navigation)
  }

  return (
    <Screen>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Log in to save products and follow sellers.</Text>

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
        error={emailError}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        placeholder="Your password"
      />

      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      <Button title="Log in" onPress={onSubmit} loading={loading} />

      <View style={styles.links}>
        <Button
          title="Forgot password?"
          variant="ghost"
          onPress={() => navigation.navigate('ForgotPassword')}
        />
        <Button
          title="Create an account"
          variant="secondary"
          onPress={() => navigation.replace('SignUp')}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 12 },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 24 },
  formError: { color: colors.danger, fontSize: 14, marginBottom: 12 },
  links: { marginTop: 16, gap: 8 },
})
