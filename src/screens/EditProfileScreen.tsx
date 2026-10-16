import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Button } from '../components/Button'
import { ImageField } from '../components/ImageField'
import { Screen } from '../components/Screen'
import { TextField } from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { USERNAME_REGEX, friendlyError } from '../lib/errors'
import { isRemoteUri, pickImage, uploadImage } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { leaveScreen } from '../navigation/helpers'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>

export function EditProfileScreen({ navigation }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null)
  const [errors, setErrors] = useState<{ displayName?: string; username?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const choosePhoto = async () => {
    try {
      const uri = await pickImage([1, 1])
      if (uri) setAvatarUri(uri)
    } catch (e) {
      setFormError(friendlyError(e))
    }
  }

  const onSave = async () => {
    if (!user) return
    setFormError(null)

    const cleanUsername = username.trim().toLowerCase()
    const next: { displayName?: string; username?: string } = {}
    if (displayName.trim().length < 2) next.displayName = 'Enter your name.'
    if (!USERNAME_REGEX.test(cleanUsername))
      next.username = '3-30 characters: lowercase letters, numbers and underscores.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    try {
      let avatarUrl = avatarUri
      if (avatarUri && !isRemoteUri(avatarUri)) {
        avatarUrl = await uploadImage('profiles', user.id, avatarUri, 'avatar')
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          username: cleanUsername,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id)
      if (error) throw error

      await refreshProfile()
      leaveScreen(navigation)
    } catch (e) {
      setFormError(friendlyError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <ImageField label="Profile photo" uri={avatarUri} onPress={choosePhoto} />
      <TextField
        label="Name"
        value={displayName}
        onChangeText={setDisplayName}
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

      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      <Button title="Save" onPress={onSave} loading={saving} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  formError: { color: colors.danger, fontSize: 14, marginBottom: 12 },
})
