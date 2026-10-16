import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, radius } from '../theme'

type Props = {
  label: string
  uri: string | null
  onPress: () => void
  wide?: boolean
}

export function ImageField({ label, uri, onPress, wide }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Choose ${label}`}
        style={[styles.box, wide ? styles.wide : styles.square]}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.image} resizeMode="cover" />
        ) : (
          <Text style={styles.hint}>Tap to choose a photo</Text>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  box: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  square: { width: 110, height: 110 },
  wide: { width: '100%', height: 140 },
  image: { width: '100%', height: '100%' },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 8 },
})
