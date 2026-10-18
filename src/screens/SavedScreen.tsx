import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { Button } from '../components/Button'
import { ProductGrid } from '../components/ProductGrid'
import { Screen } from '../components/Screen'
import { useAuth } from '../context/AuthContext'
import { PRODUCT_SELECT, type ProductListItem } from '../lib/products'
import { supabase } from '../lib/supabase'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme'

export function SavedScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [items, setItems] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setLoading(false)
        return
      }
      let active = true
      supabase
        .from('saved_products')
        .select(`created_at, products(${PRODUCT_SELECT})`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!active) return
          if (error) setFailed(true)
          else {
            setFailed(false)
            const rows = (data ?? []) as unknown as { products: ProductListItem | null }[]
            // Products that were removed or hidden come back empty; skip them.
            setItems(rows.map((r) => r.products).filter((p): p is ProductListItem => p !== null))
          }
          setLoading(false)
        })
      return () => {
        active = false
      }
    }, [user]),
  )

  return (
    <Screen>
      <Text style={styles.title}>Saved</Text>
      {!user ? (
        <View>
          <Text style={styles.body}>Log in to save products and find them again later.</Text>
          <View style={styles.actions}>
            <Button title="Log in" onPress={() => navigation.navigate('Login')} />
            <Button
              title="Create an account"
              variant="secondary"
              onPress={() => navigation.navigate('SignUp')}
            />
          </View>
        </View>
      ) : loading ? (
        <ActivityIndicator style={styles.spinner} color={colors.text} />
      ) : failed ? (
        <Text style={styles.error}>Could not load your saved products.</Text>
      ) : items.length === 0 ? (
        <Text style={styles.body}>
          Nothing saved yet. Tap "Save" on a product to keep it here.
        </Text>
      ) : (
        <View style={styles.grid}>
          <ProductGrid items={items} />
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8 },
  body: { fontSize: 15, color: colors.muted, marginTop: 8 },
  actions: { marginTop: 24, gap: 12 },
  spinner: { marginTop: 40 },
  error: { color: colors.danger, fontSize: 14, marginTop: 12 },
  grid: { marginTop: 16 },
})
