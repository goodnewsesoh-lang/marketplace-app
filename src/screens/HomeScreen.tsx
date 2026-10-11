import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { Button } from '../components/Button'
import { Screen } from '../components/Screen'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { colors, radius } from '../theme'

type Category = { id: string; name: string }

export function HomeScreen() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)

    if (!isSupabaseConfigured) {
      setFailed(true)
      setLoading(false)
      return
    }

    supabase
      .from('categories')
      .select('id, name')
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return
        if (error) setFailed(true)
        else setCategories((data as Category[]) ?? [])
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [attempt])

  return (
    <Screen>
      <Text style={styles.logo}>Marketplace</Text>
      <Text style={styles.tagline}>Discover products. Follow sellers. Buy direct.</Text>

      <Text style={styles.section}>Categories</Text>

      {loading ? (
        <ActivityIndicator style={styles.spinner} color={colors.text} />
      ) : failed ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            Could not load categories. Check your connection and your Supabase keys in the .env
            file.
          </Text>
          <Button title="Try again" variant="secondary" onPress={() => setAttempt((n) => n + 1)} />
        </View>
      ) : (
        <View style={styles.chips}>
          {categories.map((c) => (
            <View key={c.id} style={styles.chip}>
              <Text style={styles.chipText}>{c.name}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Trending, new and featured products will appear here once products are added.
        </Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  logo: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 8 },
  tagline: { fontSize: 15, color: colors.muted, marginTop: 4, marginBottom: 24 },
  section: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  spinner: { marginVertical: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  errorBox: { gap: 12 },
  errorText: { color: colors.danger, fontSize: 14 },
  note: {
    marginTop: 28,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteText: { color: colors.muted, fontSize: 14 },
})
