import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, radius } from '../theme'

type Option = { id: string; label: string }

type Props = {
  label: string
  options: Option[]
  selected: string | null
  onSelect: (id: string) => void
  error?: string | null
}

export function Chips({ label, options, selected, onSelect, error }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const isSelected = option.id === selected
          return (
            <Pressable
              key={option.id}
              onPress={() => onSelect(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text },
  chipTextSelected: { color: '#fff' },
  error: { color: colors.danger, fontSize: 13, marginTop: 4 },
})
