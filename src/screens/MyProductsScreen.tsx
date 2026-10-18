import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Button } from '../components/Button'
import { Screen } from '../components/Screen'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/errors'
import { formatDate, formatPrice } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { RootStackParamList } from '../navigation/types'
import { colors, radius } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'MyProducts'>

type Item = {
  id: string
  name: string
  price: number
  status: string
  views_count: number | null
  saves_count: number | null
  created_at: string
  product_images: { image_url: string; sort_order: number }[] | null
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending review',
  published: 'Live',
  rejected: 'Rejected',
  unavailable: 'Unavailable',
  removed: 'Removed',
}

const STATUS_COLORS: Record<string, string> = {
  draft: colors.muted,
  pending: colors.accent,
  published: colors.success,
  rejected: colors.danger,
  unavailable: colors.accent,
  removed: colors.danger,
}

export function MyProductsScreen({ navigation }: Props) {
  const { seller } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!seller) {
      setLoading(false)
      return
    }
    const { data, error: loadError } = await supabase
      .from('products')
      .select(
        'id, name, price, status, views_count, saves_count, created_at, product_images(image_url, sort_order)',
      )
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (loadError) setError(friendlyError(loadError))
    else {
      setError(null)
      setItems((data ?? []) as Item[])
    }
    setLoading(false)
  }, [seller])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const setStatus = async (item: Item, status: string) => {
    setBusyId(item.id)
    setError(null)
    const { error: updateError } = await supabase
      .from('products')
      .update({
        status,
        availability_status: status === 'unavailable' ? 'unavailable' : 'available',
      })
      .eq('id', item.id)
    if (updateError) setError(friendlyError(updateError))
    else setItems((current) => current.map((p) => (p.id === item.id ? { ...p, status } : p)))
    setBusyId(null)
  }

  const confirmDelete = (item: Item) => {
    Alert.alert('Delete product?', `"${item.name}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(item.id)
          const { error: deleteError } = await supabase.from('products').delete().eq('id', item.id)
          if (deleteError) setError(friendlyError(deleteError))
          else setItems((current) => current.filter((p) => p.id !== item.id))
          setBusyId(null)
        },
      },
    ])
  }

  if (!seller) {
    return (
      <Screen>
        <Text style={styles.empty}>Create your store first to add products.</Text>
        <Button title="Become a seller" onPress={() => navigation.replace('BecomeSeller')} />
      </Screen>
    )
  }

  return (
    <Screen>
      <Button title="+ Add product" onPress={() => navigation.navigate('ProductForm')} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator style={styles.spinner} color={colors.text} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>
          You have no products yet. Tap "Add product" to post your first one.
        </Text>
      ) : (
        items.map((item) => {
          const images = [...(item.product_images ?? [])].sort(
            (a, b) => a.sort_order - b.sort_order,
          )
          const locked = item.status === 'rejected' || item.status === 'removed'
          const live = item.status === 'published' || item.status === 'unavailable'
          const busy = busyId === item.id
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.top}>
                {images[0] ? (
                  <Image source={{ uri: images[0].image_url }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]} />
                )}
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.price}>{formatPrice(item.price)}</Text>
                  <Text
                    style={[styles.status, { color: STATUS_COLORS[item.status] ?? colors.muted }]}
                  >
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Text>
                  <Text style={styles.meta}>
                    {item.views_count ?? 0} views · {item.saves_count ?? 0} saves ·{' '}
                    {formatDate(item.created_at)}
                  </Text>
                </View>
              </View>

              {locked ? (
                <Text style={styles.locked}>
                  {item.status === 'rejected'
                    ? 'This product was rejected by the Marketplace team.'
                    : 'This product was removed by the Marketplace team.'}
                </Text>
              ) : (
                <View style={styles.actions}>
                  <Button
                    title="Edit"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => navigation.navigate('ProductForm', { productId: item.id })}
                    style={styles.action}
                  />
                  <Button
                    title={live ? 'Unpublish' : 'Publish'}
                    variant="secondary"
                    disabled={busy}
                    onPress={() => setStatus(item, live ? 'draft' : 'published')}
                    style={styles.action}
                  />
                  {live ? (
                    <Button
                      title={item.status === 'unavailable' ? 'Mark available' : 'Mark unavailable'}
                      variant="secondary"
                      disabled={busy}
                      onPress={() =>
                        setStatus(item, item.status === 'unavailable' ? 'published' : 'unavailable')
                      }
                      style={styles.action}
                    />
                  ) : null}
                  <Button
                    title="Delete"
                    variant="ghost"
                    disabled={busy}
                    onPress={() => confirmDelete(item)}
                    style={styles.action}
                  />
                </View>
              )}
            </View>
          )
        })
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  spinner: { marginTop: 40 },
  empty: { fontSize: 15, color: colors.muted, marginVertical: 24 },
  error: { color: colors.danger, fontSize: 14, marginTop: 12 },
  card: {
    marginTop: 14,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  top: { flexDirection: 'row', gap: 12 },
  thumb: { width: 84, height: 84, borderRadius: radius.sm, backgroundColor: colors.border },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  price: { fontSize: 15, color: colors.text, marginTop: 2 },
  status: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  locked: { fontSize: 13, color: colors.danger, marginTop: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  action: { minHeight: 40, paddingHorizontal: 14 },
})
