import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'

import { Chips } from '../components/Chips'
import { ProductGrid } from '../components/ProductGrid'
import { Screen } from '../components/Screen'
import { PRODUCT_SELECT, type ProductListItem } from '../lib/products'
import { supabase } from '../lib/supabase'
import type { TabParamList } from '../navigation/types'
import { colors, radius } from '../theme'

type Category = { id: string; name: string }
type Sort = 'newest' | 'price_low' | 'price_high'

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'price_low', label: 'Price: low to high' },
  { id: 'price_high', label: 'Price: high to low' },
]

export function ExploreScreen() {
  const route = useRoute<RouteProp<TabParamList, 'Explore'>>()
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('newest')
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name')
      .order('sort_order', { ascending: true })
      .then(({ data }) => setCategories((data ?? []) as Category[]))
  }, [])

  // A category tapped on the Home screen arrives as a route parameter.
  const routeCategory = route.params?.categoryId
  useEffect(() => {
    if (routeCategory) setCategoryId(routeCategory)
  }, [routeCategory])

  useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)

    let request = supabase.from('products').select(PRODUCT_SELECT).eq('status', 'published')
    const term = submitted.trim().replace(/[%,()]/g, ' ')
    if (term) request = request.ilike('name', `%${term}%`)
    if (categoryId) request = request.eq('category_id', categoryId)
    request =
      sort === 'price_low'
        ? request.order('price', { ascending: true })
        : sort === 'price_high'
          ? request.order('price', { ascending: false })
          : request.order('created_at', { ascending: false })

    request.limit(60).then(({ data, error }) => {
      if (!active) return
      if (error) setFailed(true)
      else setItems((data ?? []) as unknown as ProductListItem[])
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [submitted, categoryId, sort])

  const hasFilters = Boolean(submitted.trim() || categoryId)

  return (
    <Screen>
      <Text style={styles.title}>Explore</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => setSubmitted(query)}
        returnKeyType="search"
        placeholder="Search products"
        placeholderTextColor={colors.muted}
        style={styles.search}
      />

      <Chips
        label="Category"
        options={[{ id: 'all', label: 'All' }, ...categories.map((c) => ({ id: c.id, label: c.name }))]}
        selected={categoryId ?? 'all'}
        onSelect={(id) => setCategoryId(id === 'all' ? null : id)}
      />
      <Chips label="Sort by" options={SORTS} selected={sort} onSelect={(id) => setSort(id as Sort)} />

      {hasFilters ? (
        <Pressable
          onPress={() => {
            setQuery('')
            setSubmitted('')
            setCategoryId(null)
          }}
          accessibilityRole="button"
        >
          <Text style={styles.clear}>Clear search and filters</Text>
        </Pressable>
      ) : null}

      <View style={styles.results}>
        {loading ? (
          <ActivityIndicator style={styles.spinner} color={colors.text} />
        ) : failed ? (
          <Text style={styles.error}>Could not load products. Check your connection.</Text>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>
            {hasFilters ? 'No products match your search.' : 'No products yet.'}
          </Text>
        ) : (
          <ProductGrid items={items} />
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8, marginBottom: 12 },
  search: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  clear: { color: colors.accent, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  results: { marginTop: 12 },
  spinner: { marginTop: 24 },
  error: { color: colors.danger, fontSize: 14 },
  empty: { color: colors.muted, fontSize: 15, marginTop: 8 },
})
