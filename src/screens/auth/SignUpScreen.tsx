import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Button } from '../../components/Button'
import { Screen } from '../../components/Screen'
import { TextField } from '../../components/TextField'
import { useAuth } from '../../context/AuthContext'
import { EMAIL_REGEX, USERNAME_REGEX } from '../../lib/errors'
import { leaveScreen } from '../../navigation/helpers'
import type { RootStackParamList } from '../../navigation/types'
import { colors } from '../../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>

type FieldErrors = {
  displayName?: string
  username?: string
  email?: string
  password?: string
}

export function SignUpScreen({ navigation }: Props) {
  const { signUp, isUsernameAvailable } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  const onSubmit = async () => {
    setFormError(null)
    const next: FieldErrors = {}
    const cleanUsername = username.trim().toLowerCase()

    if (displayName.trim().length < 2) next.displayName = 'Enter your name.'
    if (!USERNAME_REGEX.test(cleanUsername))
      next.username = '3-30 characters: lowercase letters, numbers and underscores.'
    if (!EMAIL_REGEX.test(email.trim())) next.email = 'Enter a valid email address.'
    if (password.length < 8) next.password = 'Use at least 8 characters.'

    setErrors(next)
    if (Object.keys(next).length > 0) return

    setLoading(true)

    if (!(await isUsernameAvailable(cleanUsername))) {
      setLoading(false)
      setErrors({ username: 'That username is already taken.' })
      return
    }

    const result = await signUp({ email, password, username: cleanUsername, displayName })
    setLoading(false)

    if (result.error) {
      setFormError(result.error)
      return
    }
    if (result.needsEmailConfirmation) {
      setCheckEmail(true)
      return
    }
    leaveScreen(navigation)
  }

  if (checkEmail) {
    return (
      <Screen>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a confirmation link to {email.trim()}. Open it, then come back and log in.
        </Text>
        <Button title="Go to log in" onPress={() => navigation.replace('Login')} />
      </Screen>
    )
  }

  return (
    <Screen>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Discover products and connect with sellers.</Text>

      <TextField
        label="Name"
        value={displayName}
        onChangeText={setDisplayName}
        autoComplete="name"
        placeholder="Your name"
        error={errors.displayName}
      />
      <TextField
        label="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="e.g. sarah_styles"
        error={errors.username}
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
        error={errors.email}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        error={errors.password}
      />

      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      <Button title="Sign up" onPress={onSubmit} loading={loading} />

      <View style={styles.links}>
        <Button
          title="I already have an account"
          variant="ghost"
          onPress={() => navigation.replace('Login')}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 12 },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 24 },
  formError: { color: colors.danger, fontSize: 14, marginBottom: 12 },
  links: { marginTop: 12 },
})
