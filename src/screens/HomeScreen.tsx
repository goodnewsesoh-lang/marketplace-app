import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { Button } from '../components/Button'
import { ProductCard, ProductGrid } from '../components/ProductGrid'
import { Screen } from '../components/Screen'
import { PRODUCT_SELECT, type ProductListItem } from '../lib/products'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { RootStackParamList } from '../navigation/types'
import { colors, radius } from '../theme'

type Category = { id: string; name: string }
type StoreItem = {
  id: string
  store_name: string
  profile_image_url: string | null
  followers_count: number
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [categories, setCategories] = useState<Category[]>([])
  const [featured, setFeatured] = useState<ProductListItem[]>([])
  const [latest, setLatest] = useState<ProductListItem[]>([])
  const [stores, setStores] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setFailed(true)
      setLoading(false)
      return
    }
    const [cats, feat, latestRes, storeRes] = await Promise.all([
      supabase.from('categories').select('id, name').order('sort_order', { ascending: true }),
      supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('status', 'published')
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('seller_profiles')
        .select('id, store_name, profile_image_url, followers_count')
        .eq('is_suspended', false)
        .order('followers_count', { ascending: false })
        .limit(10),
    ])
    if (cats.error || latestRes.error) {
      setFailed(true)
    } else {
      setFailed(false)
      setCategories((cats.data ?? []) as Category[])
      setFeatured((feat.data ?? []) as unknown as ProductListItem[])
      setLatest((latestRes.data ?? []) as unknown as ProductListItem[])
      setStores((storeRes.data ?? []) as StoreItem[])
    }
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  return (
    <Screen>
      <Text style={styles.logo}>Marketplace</Text>
      <Text style={styles.tagline}>Discover products. Follow sellers. Buy direct.</Text>

      <Pressable
        onPress={() => navigation.navigate('Tabs', { screen: 'Explore' })}
        accessibilityRole="button"
        accessibilityLabel="Search products"
        style={styles.search}
      >
        <Text style={styles.searchText}>🔍  Search products</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator style={styles.spinner} color={colors.text} />
      ) : failed ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            Could not load the marketplace. Check your connection and your Supabase keys in the
            .env file.
          </Text>
          <Button
            title="Try again"
            variant="secondary"
            onPress={() => {
              setLoading(true)
              load()
            }}
          />
        </View>
      ) : (
        <>
          {categories.length > 0 ? (
            <>
              <Text style={styles.section}>Categories</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chips}>
                  {categories.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() =>
                        navigation.navigate('Tabs', {
                          screen: 'Explore',
                          params: { categoryId: c.id },
                        })
                      }
                      accessibilityRole="button"
                      style={styles.chip}
                    >
                      <Text style={styles.chipText}>{c.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </>
          ) : null}

          {featured.length > 0 ? (
            <>
              <Text style={styles.section}>Featured</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.hRow}>
                  {featured.map((item) => (
                    <ProductCard key={item.id} item={item} width={160} />
                  ))}
                </View>
              </ScrollView>
            </>
          ) : null}

          {stores.length > 0 ? (
            <>
              <Text style={styles.section}>Popular stores</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.hRow}>
                  {stores.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => navigation.navigate('Store', { sellerId: s.id })}
                      accessibilityRole="button"
                      accessibilityLabel={s.store_name}
                      style={styles.store}
                    >
                      {s.profile_image_url ? (
                        <Image source={{ uri: s.profile_image_url }} style={styles.storeImg} />
                      ) : (
                        <View style={[styles.storeImg, styles.storeImgEmpty]}>
                          <Text style={styles.storeInitial}>
                            {s.store_name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.storeName} numberOfLines={1}>
                        {s.store_name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </>
          ) : null}

          <Text style={styles.section}>New arrivals</Text>
          {latest.length === 0 ? (
            <View style={styles.note}>
              <Text style={styles.noteText}>
                No products yet. Sellers can add the first one from the orange + button.
              </Text>
            </View>
          ) : (
            <ProductGrid items={latest} />
          )}
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  logo: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 8 },
  tagline: { fontSize: 15, color: colors.muted, marginTop: 4, marginBottom: 16 },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  searchText: { color: colors.muted, fontSize: 15 },
  section: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 24, marginBottom: 12 },
  spinner: { marginVertical: 24 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  hRow: { flexDirection: 'row', gap: 12 },
  store: { width: 84, alignItems: 'center' },
  storeImg: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.border },
  storeImgEmpty: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  storeInitial: { color: '#fff', fontSize: 24, fontWeight: '700' },
  storeName: { fontSize: 12, color: colors.text, marginTop: 6, fontWeight: '600' },
  errorBox: { gap: 12, marginTop: 24 },
  errorText: { color: colors.danger, fontSize: 14 },
  note: {
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteText: { color: colors.muted, fontSize: 14 },
})
