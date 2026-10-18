import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Button } from '../components/Button'
import { Screen } from '../components/Screen'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { RootStackParamList } from '../navigation/types'
import { colors, radius } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>

type Row = {
  id: string
  name: string
  price: number
  status: string
  views_count: number | null
  saves_count: number | null
}

type Stats = {
  products: Row[]
  followers: number
  storeViews: number
  storeViews7: number
  productViews7: number
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export function DashboardScreen({ navigation }: Props) {
  const { seller } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useFocusEffect(
    useCallback(() => {
      if (!seller) {
        setLoading(false)
        return
      }
      let active = true
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      Promise.all([
        supabase
          .from('products')
          .select('id, name, price, status, views_count, saves_count')
          .eq('seller_id', seller.id)
          .limit(500),
        supabase
          .from('seller_profiles')
          .select('followers_count')
          .eq('id', seller.id)
          .maybeSingle(),
        supabase
          .from('store_views')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', seller.id),
        supabase
          .from('store_views')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', seller.id)
          .gte('created_at', since),
      ]).then(async ([productsRes, sellerRes, storeViewsRes, storeViews7Res]) => {
        if (!active) return
        if (productsRes.error) {
          setFailed(true)
          setLoading(false)
          return
        }
        const products = (productsRes.data ?? []) as Row[]
        let productViews7 = 0
        if (products.length > 0) {
          const { count } = await supabase
            .from('product_views')
            .select('id', { count: 'exact', head: true })
            .in(
              'product_id',
              products.map((p) => p.id),
            )
            .gte('created_at', since)
          productViews7 = count ?? 0
        }
        if (!active) return
        setFailed(false)
        setStats({
          products,
          followers: (sellerRes.data as { followers_count: number } | null)?.followers_count ?? 0,
          storeViews: storeViewsRes.count ?? 0,
          storeViews7: storeViews7Res.count ?? 0,
          productViews7,
        })
        setLoading(false)
      })

      return () => {
        active = false
      }
    }, [seller]),
  )

  if (!seller) {
    return (
      <Screen>
        <Text style={styles.empty}>Create your store first to see your dashboard.</Text>
        <Button title="Become a seller" onPress={() => navigation.replace('BecomeSeller')} />
      </Screen>
    )
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator style={styles.spinner} color={colors.text} />
      </Screen>
    )
  }

  if (failed || !stats) {
    return (
      <Screen>
        <Text style={styles.error}>Could not load your dashboard. Check your connection.</Text>
      </Screen>
    )
  }

  const count = (status: string) => stats.products.filter((p) => p.status === status).length
  const totalViews = stats.products.reduce((sum, p) => sum + (p.views_count ?? 0), 0)
  const totalSaves = stats.products.reduce((sum, p) => sum + (p.saves_count ?? 0), 0)
  const top = [...stats.products]
    .sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0))
    .slice(0, 5)

  return (
    <Screen>
      <Text style={styles.title}>{seller.store_name}</Text>
      <Text style={styles.sub}>Your store at a glance</Text>

      <Text style={styles.section}>Last 7 days</Text>
      <View style={styles.grid}>
        <Stat label="Product views" value={stats.productViews7} />
        <Stat label="Store visits" value={stats.storeViews7} />
      </View>

      <Text style={styles.section}>All time</Text>
      <View style={styles.grid}>
        <Stat label="Followers" value={stats.followers} />
        <Stat label="Product views" value={totalViews} />
        <Stat label="Saves" value={totalSaves} />
        <Stat label="Store visits" value={stats.storeViews} />
      </View>

      <Text style={styles.section}>Products</Text>
      <View style={styles.grid}>
        <Stat label="Live" value={count('published')} />
        <Stat label="Drafts" value={count('draft')} />
        <Stat label="Unavailable" value={count('unavailable')} />
        <Stat label="Rejected / removed" value={count('rejected') + count('removed')} />
      </View>

      <Text style={styles.section}>Most viewed</Text>
      {top.length === 0 ? (
        <Text style={styles.empty}>No products yet.</Text>
      ) : (
        top.map((p) => (
          <View key={p.id} style={styles.topRow}>
            <View style={styles.topInfo}>
              <Text style={styles.topName} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={styles.topMeta}>{formatPrice(p.price)}</Text>
            </View>
            <Text style={styles.topMeta}>
              {p.views_count ?? 0} views · {p.saves_count ?? 0} saves
            </Text>
          </View>
        ))
      )}

      <View style={styles.buttons}>
        <Button title="My products" onPress={() => navigation.navigate('MyProducts')} />
        <Button
          title="Add a product"
          variant="secondary"
          onPress={() => navigation.navigate('ProductForm')}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  spinner: { marginTop: 40 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 22, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    width: '48%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
  },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 13, color: colors.muted, marginTop: 2 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topInfo: { flex: 1 },
  topName: { fontSize: 15, fontWeight: '600', color: colors.text },
  topMeta: { fontSize: 12, color: colors.muted },
  empty: { fontSize: 15, color: colors.muted, marginVertical: 12 },
  error: { fontSize: 14, color: colors.danger },
  buttons: { gap: 10, marginTop: 24 },
})
