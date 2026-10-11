import { StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { Button } from '../components/Button'
import { Screen } from '../components/Screen'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme'

export function AddScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  if (!user) {
    return (
      <Screen>
        <Text style={styles.title}>Sell on Marketplace</Text>
        <Text style={styles.body}>Log in or create an account to become a seller.</Text>
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

  return (
    <Screen>
      <Text style={styles.title}>Sell on Marketplace</Text>
      <Text style={styles.body}>
        Seller setup and adding products are coming in the next build steps.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8 },
  body: { fontSize: 15, color: colors.muted, marginTop: 8 },
  actions: { marginTop: 24, gap: 12 },
})
