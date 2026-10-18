import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Button } from '../components/Button'
import { ContactButtons } from '../components/ContactButtons'
import { ProductGrid } from '../components/ProductGrid'
import { Screen } from '../components/Screen'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/errors'
import { PRODUCT_SELECT, type ProductListItem } from '../lib/products'
import { supabase } from '../lib/supabase'
import type { SellerProfile } from '../types'
import type { RootStackParamList } from '../navigation/types'
import { colors, radius } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Store'>

export function StoreScreen({ navigation, route }: Props) {
  const { sellerId } = route.params
  const { user, seller: mySeller } = useAuth()

  const [store, setStore] = useState<SellerProfile | null>(null)
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwn = mySeller?.id === sellerId

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('seller_profiles').select('*').eq('id', sellerId).maybeSingle(),
      supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('seller_id', sellerId)
        .in('status', ['published', 'unavailable'])
        .order('created_at', { ascending: false })
        .limit(50),
    ]).then(([storeRes, productsRes]) => {
      if (!active) return
      setStore((storeRes.data as SellerProfile | null) ?? null)
      setProducts((productsRes.data ?? []) as unknown as ProductListItem[])
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [sellerId])

  // Count one store view per visit (not for the owner).
  useEffect(() => {
    if (isOwn) return
    supabase
      .from('store_views')
      .insert({ seller_id: sellerId, viewer_id: user?.id ?? null })
      .then(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId])

  useEffect(() => {
    if (!user || isOwn) {
      setFollowing(false)
      return
    }
    let active = true
    supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('seller_id', sellerId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setFollowing(Boolean(data))
      })
    return () => {
      active = false
    }
  }, [user, sellerId, isOwn])

  const toggleFollow = async () => {
    if (!user) {
      navigation.navigate('Login')
      return
    }
    setBusy(true)
    setError(null)
    const { error: followError } = following
      ? await supabase.from('follows').delete().eq('follower_id', user.id).eq('seller_id', sellerId)
      : await supabase.from('follows').insert({ follower_id: user.id, seller_id: sellerId })
    if (followError && followError.code !== '23505') setError(friendlyError(followError))
    else {
      const next = !following
      setFollowing(next)
      setStore((s) =>
        s ? { ...s, followers_count: Math.max(0, s.followers_count + (next ? 1 : -1)) } : s,
      )
    }
    setBusy(false)
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator style={styles.spinner} color={colors.text} />
      </Screen>
    )
  }

  if (!store) {
    return (
      <Screen>
        <Text style={styles.name}>Store not found</Text>
        <Text style={styles.muted}>This store may have been removed.</Text>
      </Screen>
    )
  }

  return (
    <Screen>
      {store.cover_image_url ? (
        <Image source={{ uri: store.cover_image_url }} style={styles.cover} />
      ) : (
        <View style={styles.cover} />
      )}
      <View style={styles.header}>
        {store.profile_image_url ? (
          <Image source={{ uri: store.profile_image_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty]}>
            <Text style={styles.initial}>{store.store_name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.name}>
            {store.store_name}
            {store.is_verified ? ' ✓' : ''}
          </Text>
          <Text style={styles.muted}>
            {store.followers_count} {store.followers_count === 1 ? 'follower' : 'followers'}
            {store.location ? ` · ${store.location}` : ''}
          </Text>
        </View>
      </View>

      {store.description ? <Text style={styles.description}>{store.description}</Text> : null}

      {isOwn ? (
        <Button
          title="Edit store"
          variant="secondary"
          onPress={() => navigation.navigate('BecomeSeller')}
        />
      ) : (
        <Button
          title={following ? 'Following' : 'Follow'}
          variant={following ? 'secondary' : 'primary'}
          onPress={toggleFollow}
          loading={busy}
        />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!isOwn ? (
        <View style={styles.contact}>
          <ContactButtons phone={store.phone} whatsapp={store.whatsapp} email={store.email} />
        </View>
      ) : null}

      <Text style={styles.section}>Products ({products.length})</Text>
      {products.length === 0 ? (
        <Text style={styles.muted}>This store has no products yet.</Text>
      ) : (
        <ProductGrid items={products} />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  spinner: { marginTop: 40 },
  cover: {
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.border,
    width: '100%',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -28, paddingLeft: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: colors.bg },
  avatarEmpty: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontSize: 26, fontWeight: '700' },
  headerText: { flex: 1, marginTop: 24 },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  muted: { fontSize: 14, color: colors.muted, marginTop: 2 },
  description: { fontSize: 15, color: colors.text, lineHeight: 22, marginVertical: 14 },
  error: { color: colors.danger, fontSize: 14, marginTop: 8 },
  contact: { marginTop: 12 },
  section: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 24, marginBottom: 12 },
})
