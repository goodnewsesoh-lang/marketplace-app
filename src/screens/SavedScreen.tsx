import { StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { Button } from '../components/Button'
import { Screen } from '../components/Screen'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme'

export function SavedScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  return (
    <Screen>
      <Text style={styles.title}>Saved</Text>
      {user ? (
        <Text style={styles.body}>
          Products you save will show up here. Saving products is coming in a later build step.
        </Text>
      ) : (
        <View>
          <Text style={styles.body}>Log in to save products and find them again later.</Text>
          <View style={styles.actions}>
            <Button title="Log in" onPress={() => navigation.navigate('Login')} />
          </View>
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8 },
  body: { fontSize: 15, color: colors.muted, marginTop: 8 },
  actions: { marginTop: 24 },
})
