import { StyleSheet, Text } from 'react-native'

import { Screen } from '../components/Screen'
import { colors } from '../theme'

export function ExploreScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Explore</Text>
      <Text style={styles.body}>
        Search, trending, new and deals are coming in the next build step.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8 },
  body: { fontSize: 15, color: colors.muted, marginTop: 8 },
})
