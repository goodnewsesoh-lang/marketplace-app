import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Button } from '../components/Button'
import { ContactButtons } from '../components/ContactButtons'
import { Screen } from '../components/Screen'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/errors'
import { formatDate, formatPrice } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { RootStackParamList } from '../navigation/types'
import { colors, radius } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>

type Detail = {
  id: string
  seller_id: string
  name: string
  description: string
  price: number
  discount_price: number | null
  condition: string
  location: string | null
  video_url: string | null
  status: string
  views_count: number | null
  saves_count: number | null
  created_at: string
  product_images: { image_url: string; sort_order: number }[] | null
  categories: { name: string } | null
  seller_profiles: {
    id: string
    store_name: string
    profile_image_url: string | null
    location: string | null
    phone: string | null
    whatsapp: string | null
    email: string | null
    is_verified: boolean
  } | null
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  used: 'Used',
  refurbished: 'Refurbished',
}

export function ProductDetailScreen({ navigation, route }: Props) {
  const { productId } = route.params
  const { user, seller } = useAuth()
  const { width } = useWindowDimensions()

  const [product, setProduct] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingBusy, setSavingBusy] = useState(false)
  const [page, setPage] = useState(0)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from('products')
      .select(
        '*, product_images(image_url, sort_order), categories(name), seller_profiles(id, store_name, profile_image_url, location, phone, whatsapp, email, is_verified)',
      )
      .eq('id', productId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (!data) setNotFound(true)
        else setProduct(data as unknown as Detail)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [productId])

  // Count one view per visit (not for the seller's own product).
  useEffect(() => {
    if (!product || seller?.id === product.seller_id) return
    supabase
      .from('product_views')
      .insert({ product_id: product.id, viewer_id: user?.id ?? null })
      .then(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id])

  useEffect(() => {
    if (!user) {
      setSaved(false)
      return
    }
    let active = true
    supabase
      .from('saved_products')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setSaved(Boolean(data))
      })
    return () => {
      active = false
    }
  }, [user, productId])

  const toggleSave = async () => {
    if (!user) {
      navigation.navigate('Login')
      return
    }
    setSavingBusy(true)
    setMessage(null)
    const { error } = saved
      ? await supabase
          .from('saved_products')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId)
      : await supabase.from('saved_products').insert({ user_id: user.id, product_id: productId })
    if (error && error.code !== '23505') setMessage(friendlyError(error))
    else {
      const next = !saved
      setSaved(next)
      setProduct((p) =>
        p ? { ...p, saves_count: Math.max(0, (p.saves_count ?? 0) + (next ? 1 : -1)) } : p,
      )
    }
    setSavingBusy(false)
  }

  const share = async () => {
    if (!product) return
    try {
      await Share.share({
        message: `${product.name} - ${formatPrice(product.discount_price ?? product.price)} on Marketplace`,
      })
    } catch {
      // The person closed the share sheet; nothing to do.
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator style={styles.spinner} color={colors.text} />
      </Screen>
    )
  }

  if (notFound || !product) {
    return (
      <Screen>
        <Text style={styles.title}>Product not found</Text>
        <Text style={styles.muted}>It may have been removed or is no longer available.</Text>
      </Screen>
    )
  }

  const images = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const hasDiscount = product.discount_price != null && product.discount_price < product.price
  const store = product.seller_profiles
  const ownProduct = seller?.id === product.seller_id
  const imageSize = width

  return (
    <Screen scroll={false}>
      <ScrollView>
        {images.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setPage(Math.round(e.nativeEvent.contentOffset.x / imageSize))
              }
            >
              {images.map((image) => (
                <Image
                  key={image.image_url}
                  source={{ uri: image.image_url }}
                  style={{ width: imageSize, height: imageSize, backgroundColor: colors.border }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            {images.length > 1 ? (
              <View style={styles.counter}>
                <Text style={styles.counterText}>
                  {page + 1} / {images.length}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ width: imageSize, height: imageSize, backgroundColor: colors.border }} />
        )}

        <View style={styles.content}>
          {product.status === 'unavailable' ? (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>This product is currently unavailable.</Text>
            </View>
          ) : null}

          <Text style={styles.title}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {formatPrice(hasDiscount ? product.discount_price : product.price)}
            </Text>
            {hasDiscount ? <Text style={styles.old}>{formatPrice(product.price)}</Text> : null}
          </View>

          <View style={styles.tags}>
            <Text style={styles.tag}>{CONDITION_LABELS[product.condition] ?? product.condition}</Text>
            {product.categories ? <Text style={styles.tag}>{product.categories.name}</Text> : null}
            {product.location ? <Text style={styles.tag}>{product.location}</Text> : null}
          </View>

          <View style={styles.row}>
            <Button
              title={saved ? '♥ Saved' : '♡ Save'}
              variant="secondary"
              onPress={toggleSave}
              loading={savingBusy}
              style={styles.rowButton}
            />
            <Button title="Share" variant="secondary" onPress={share} style={styles.rowButton} />
          </View>
          {message ? <Text style={styles.error}>{message}</Text> : null}

          <Text style={styles.section}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>
          <Text style={styles.meta}>
            {product.views_count ?? 0} views · {product.saves_count ?? 0} saves · Posted{' '}
            {formatDate(product.created_at)}
          </Text>

          {store ? (
            <View style={styles.storeCard}>
              <Pressable
                onPress={() => navigation.navigate('Store', { sellerId: store.id })}
                accessibilityRole="button"
                accessibilityLabel={`Open ${store.store_name}`}
                style={styles.storeTop}
              >
                {store.profile_image_url ? (
                  <Image source={{ uri: store.profile_image_url }} style={styles.storeAvatar} />
                ) : (
                  <View style={[styles.storeAvatar, styles.storeAvatarEmpty]}>
                    <Text style={styles.storeInitial}>
                      {store.store_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>
                    {store.store_name}
                    {store.is_verified ? ' ✓' : ''}
                  </Text>
                  <Text style={styles.muted}>{store.location ?? 'View store'}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>

              {ownProduct ? (
                <Button
                  title="Edit this product"
                  variant="secondary"
                  onPress={() => navigation.navigate('ProductForm', { productId: product.id })}
                />
              ) : (
                <ContactButtons
                  phone={store.phone}
                  whatsapp={store.whatsapp}
                  email={store.email}
                  message={`Hi, I'm interested in "${product.name}" on Marketplace.`}
                />
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  spinner: { marginTop: 40 },
  content: { padding: 20 },
  counter: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(17,24,39,0.7)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  banner: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 12,
  },
  bannerText: { color: '#92400E', fontSize: 14, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6 },
  price: { fontSize: 24, fontWeight: '800', color: colors.accent },
  old: { fontSize: 16, color: colors.muted, textDecorationLine: 'line-through' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: {
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  rowButton: { flex: 1 },
  error: { color: colors.danger, fontSize: 14, marginTop: 8 },
  section: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 24 },
  description: { fontSize: 15, color: colors.text, lineHeight: 22, marginTop: 8 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 12 },
  muted: { fontSize: 14, color: colors.muted, marginTop: 4 },
  storeCard: {
    marginTop: 24,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  storeTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  storeAvatar: { width: 48, height: 48, borderRadius: 24 },
  storeAvatarEmpty: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInitial: { color: '#fff', fontSize: 20, fontWeight: '700' },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 16, fontWeight: '700', color: colors.text },
  chevron: { fontSize: 28, color: colors.muted },
})
