import { useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { Button } from '../components/Button'
import { Screen } from '../components/Screen'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/types'
import { colors, radius } from '../theme'

export function ProfileScreen() {
  const { user, profile, seller, loading, signOut } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [signingOut, setSigningOut] = useState(false)

  if (loading) {
    return (
      <Screen>
        <Text style={styles.body}>Loading...</Text>
      </Screen>
    )
  }

  if (!user) {
    return (
      <Screen>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.body}>
          Log in to manage your profile, saved products and the sellers you follow.
        </Text>
        <View style={styles.actions}>
          <Button title="Log in" onPress={() => navigation.navigate('Login')} />
          <Button
            title="Create an account"
            variant="secondary"
            onPress={() => navigation.navigate('SignUp')}
          />
        </View>
      </Screen>
    )
  }

  const name = profile?.display_name || profile?.username || user.email || 'Your account'
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  const onSignOut = async () => {
    setSigningOut(true)
    await signOut()
    setSigningOut(false)
  }

  return (
    <Screen>
      <View style={styles.header}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
        <Text style={styles.name}>{name}</Text>
        {profile?.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Edit profile"
          variant="secondary"
          onPress={() => navigation.navigate('EditProfile')}
        />
      </View>

      <View style={styles.card}>
        {seller ? (
          <>
            <Text style={styles.cardTitle}>{seller.store_name}</Text>
            <Text style={styles.cardBody}>
              {seller.followers_count} {seller.followers_count === 1 ? 'follower' : 'followers'}
              {seller.location ? ` · ${seller.location}` : ''}
            </Text>
            <Button
              title="Edit store"
              variant="secondary"
              onPress={() => navigation.navigate('BecomeSeller')}
              style={styles.cardButton}
            />
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>Sell on Marketplace</Text>
            <Text style={styles.cardBody}>
              Open your own store and let buyers find and contact you.
            </Text>
            <Button
              title="Become a seller"
              onPress={() => navigation.navigate('BecomeSeller')}
              style={styles.cardButton}
            />
          </>
        )}
      </View>

      <View style={styles.actions}>
        <Button title="Log out" variant="secondary" onPress={onSignOut} loading={signingOut} />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8 },
  body: { fontSize: 15, color: colors.muted, marginTop: 8 },
  actions: { marginTop: 20, gap: 12 },
  header: { alignItems: 'center', marginTop: 16 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 88, height: 88, borderRadius: radius.pill },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 12 },
  username: { fontSize: 15, color: colors.muted, marginTop: 2 },
  email: { fontSize: 14, color: colors.muted, marginTop: 4 },
  card: {
    marginTop: 24,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  cardBody: { fontSize: 14, color: colors.muted, marginTop: 4 },
  cardButton: { marginTop: 14 },
})
