import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { formatPrice } from '../lib/format'
import { mainImage, type ProductListItem } from '../lib/products'
import type { RootStackParamList } from '../navigation/types'
import { colors, radius } from '../theme'

export function ProductCard({ item, width }: { item: ProductListItem; width: number }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const image = mainImage(item)
  const hasDiscount = item.discount_price != null && item.discount_price < item.price
  return (
    <Pressable
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      style={[styles.card, { width }]}
    >
      {image ? (
        <Image source={{ uri: image }} style={[styles.image, { height: width }]} />
      ) : (
        <View style={[styles.image, { height: width }]} />
      )}
      {item.status === 'unavailable' ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Unavailable</Text>
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatPrice(hasDiscount ? item.discount_price : item.price)}
          </Text>
          {hasDiscount ? <Text style={styles.old}>{formatPrice(item.price)}</Text> : null}
        </View>
        {item.seller_profiles ? (
          <Text style={styles.store} numberOfLines={1}>
            {item.seller_profiles.store_name}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

// Two-column grid of product cards.
export function ProductGrid({ items }: { items: ProductListItem[] }) {
  const { width } = useWindowDimensions()
  const cardWidth = Math.floor((width - 40 - 12) / 2)
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <ProductCard key={item.id} item={item} width={cardWidth} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  image: { width: '100%', backgroundColor: colors.border },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(17,24,39,0.8)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  body: { padding: 10 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  price: { fontSize: 15, fontWeight: '800', color: colors.text },
  old: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
  store: { fontSize: 12, color: colors.muted, marginTop: 2 },
})
