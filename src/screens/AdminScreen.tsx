import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
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

type Props = NativeStackScreenProps<RootStackParamList, 'Admin'>
type Tab = 'reports' | 'products' | 'sellers' | 'categories'

const TABS: { id: Tab; label: string }[] = [
  { id: 'reports', label: 'Reports' },
  { id: 'products', label: 'Products' },
  { id: 'sellers', label: 'Sellers' },
  { id: 'categories', label: 'Categories' },
]

type Report = {
  id: string
  target_type: 'product' | 'seller'
  target_id: string
  reason: string
  description: string | null
  status: string
  created_at: string
}
type ProductRow = {
  id: string
  name: string
  price: number
  status: string
  featured: boolean
  seller_profiles: { store_name: string } | null
}
type SellerRow = {
  id: string
  user_id: string
  store_name: string
  is_verified: boolean
  is_suspended: boolean
  followers_count: number
}
type CategoryRow = { id: string; name: string; slug: string; is_visible: boolean; sort_order: number }

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'category'
  )
}

function Row({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>
}

export function AdminScreen({ navigation }: Props) {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('reports')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')

  const [reports, setReports] = useState<Report[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [sellers, setSellers] = useState<SellerRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [newCategory, setNewCategory] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    let failure: { message?: string } | null = null

    if (tab === 'reports') {
      const { data, error: e } = await supabase
        .from('reports')
        .select('*')
        .in('status', ['pending', 'reviewed'])
        .order('created_at', { ascending: false })
        .limit(50)
      failure = e
      setReports((data ?? []) as Report[])
    } else if (tab === 'products') {
      let q = supabase
        .from('products')
        .select('id, name, price, status, featured, seller_profiles(store_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      const term = search.trim().replace(/[%,()]/g, ' ')
      if (term) q = q.ilike('name', `%${term}%`)
      const { data, error: e } = await q
      failure = e
      setProducts((data ?? []) as unknown as ProductRow[])
    } else if (tab === 'sellers') {
      let q = supabase
        .from('seller_profiles')
        .select('id, user_id, store_name, is_verified, is_suspended, followers_count')
        .order('created_at', { ascending: false })
        .limit(50)
      const term = search.trim().replace(/[%,()]/g, ' ')
      if (term) q = q.ilike('store_name', `%${term}%`)
      const { data, error: e } = await q
      failure = e
      setSellers((data ?? []) as SellerRow[])
    } else {
      const { data, error: e } = await supabase
        .from('categories')
        .select('id, name, slug, is_visible, sort_order')
        .order('sort_order', { ascending: true })
      failure = e
      setCategories((data ?? []) as CategoryRow[])
    }

    if (failure) setError(friendlyError(failure))
    setLoading(false)
  }, [tab, search])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  // Reload when switching tab.
  useEffect(() => {
    setSearch('')
  }, [tab])

  const run = async (action: () => PromiseLike<{ error: { message?: string } | null }>) => {
    setBusy(true)
    setError(null)
    const { error: e } = await action()
    setBusy(false)
    if (e) setError(friendlyError(e))
    else await load()
  }

  const confirm = (title: string, message: string, onYes: () => void) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: onYes },
    ])
  }

  const closeReport = (r: Report, status: 'resolved' | 'dismissed') =>
    run(() =>
      supabase
        .from('reports')
        .update({ status, resolved_at: new Date().toISOString() })
        .eq('id', r.id),
    )

  const removeReportTarget = (r: Report) => {
    const what = r.target_type === 'product' ? 'Remove this product' : 'Suspend this seller'
    confirm(what + '?', 'The report will be marked as resolved.', async () => {
      setBusy(true)
      const { error: e1 } =
        r.target_type === 'product'
          ? await supabase.from('products').update({ status: 'removed' }).eq('id', r.target_id)
          : await supabase.from('seller_profiles').update({ is_suspended: true }).eq('id', r.target_id)
      if (e1) {
        setError(friendlyError(e1))
        setBusy(false)
        return
      }
      setBusy(false)
      closeReport(r, 'resolved')
    })
  }

  const addCategory = () => {
    const name = newCategory.trim()
    if (!name) return
    run(async () => {
      const result = await supabase.from('categories').insert({
        name,
        slug: slugify(name),
        sort_order: (categories[categories.length - 1]?.sort_order ?? 0) + 1,
      })
      if (!result.error) setNewCategory('')
      return result
    })
  }

  if (!profile?.is_admin) {
    return (
      <Screen>
        <Text style={styles.empty}>This area is only for Marketplace admins.</Text>
      </Screen>
    )
  }

  return (
    <Screen>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            accessibilityRole="button"
            style={[styles.tab, tab === t.id && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'products' || tab === 'sellers' ? (
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          returnKeyType="search"
          placeholder={tab === 'products' ? 'Search products' : 'Search stores'}
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator style={styles.spinner} color={colors.text} /> : null}

      {!loading && tab === 'reports' ? (
        reports.length === 0 ? (
          <Text style={styles.empty}>No open reports.</Text>
        ) : (
          reports.map((r) => (
            <Row key={r.id}>
              <Text style={styles.name}>
                {r.target_type === 'product' ? 'Product' : 'Seller'} report: {r.reason}
              </Text>
              {r.description ? <Text style={styles.meta}>{r.description}</Text> : null}
              <Text style={styles.meta}>{formatDate(r.created_at)}</Text>
              <View style={styles.actions}>
                <Button
                  title="View"
                  variant="secondary"
                  style={styles.action}
                  onPress={() =>
                    r.target_type === 'product'
                      ? navigation.navigate('ProductDetail', { productId: r.target_id })
                      : navigation.navigate('Store', { sellerId: r.target_id })
                  }
                />
                <Button
                  title={r.target_type === 'product' ? 'Remove product' : 'Suspend seller'}
                  variant="secondary"
                  style={styles.action}
                  disabled={busy}
                  onPress={() => removeReportTarget(r)}
                />
                <Button
                  title="Dismiss"
                  variant="ghost"
                  style={styles.action}
                  disabled={busy}
                  onPress={() => closeReport(r, 'dismissed')}
                />
              </View>
            </Row>
          ))
        )
      ) : null}

      {!loading && tab === 'products'
        ? products.map((p) => (
            <Row key={p.id}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.meta}>
                {formatPrice(p.price)} · {p.seller_profiles?.store_name ?? 'Unknown store'} ·{' '}
                {p.status}
                {p.featured ? ' · Featured' : ''}
              </Text>
              <View style={styles.actions}>
                <Button
                  title="View"
                  variant="secondary"
                  style={styles.action}
                  onPress={() => navigation.navigate('ProductDetail', { productId: p.id })}
                />
                <Button
                  title={p.featured ? 'Unfeature' : 'Feature'}
                  variant="secondary"
                  style={styles.action}
                  disabled={busy}
                  onPress={() =>
                    run(() => supabase.from('products').update({ featured: !p.featured }).eq('id', p.id))
                  }
                />
                {p.status === 'removed' || p.status === 'rejected' ? (
                  <Button
                    title="Restore"
                    variant="secondary"
                    style={styles.action}
                    disabled={busy}
                    onPress={() =>
                      run(() => supabase.from('products').update({ status: 'draft' }).eq('id', p.id))
                    }
                  />
                ) : (
                  <Button
                    title="Remove"
                    variant="ghost"
                    style={styles.action}
                    disabled={busy}
                    onPress={() =>
                      confirm('Remove product?', 'It will no longer be visible to buyers.', () =>
                        run(() => supabase.from('products').update({ status: 'removed' }).eq('id', p.id)),
                      )
                    }
                  />
                )}
              </View>
            </Row>
          ))
        : null}

      {!loading && tab === 'sellers'
        ? sellers.map((s) => (
            <Row key={s.id}>
              <Text style={styles.name}>
                {s.store_name}
                {s.is_verified ? ' ✓' : ''}
              </Text>
              <Text style={styles.meta}>
                {s.followers_count} followers{s.is_suspended ? ' · Suspended' : ''}
              </Text>
              <View style={styles.actions}>
                <Button
                  title="View"
                  variant="secondary"
                  style={styles.action}
                  onPress={() => navigation.navigate('Store', { sellerId: s.id })}
                />
                <Button
                  title={s.is_verified ? 'Unverify' : 'Verify'}
                  variant="secondary"
                  style={styles.action}
                  disabled={busy}
                  onPress={() =>
                    run(() =>
                      supabase.from('seller_profiles').update({ is_verified: !s.is_verified }).eq('id', s.id),
                    )
                  }
                />
                <Button
                  title={s.is_suspended ? 'Unsuspend' : 'Suspend'}
                  variant={s.is_suspended ? 'secondary' : 'ghost'}
                  style={styles.action}
                  disabled={busy}
                  onPress={() =>
                    s.is_suspended
                      ? run(() =>
                          supabase.from('seller_profiles').update({ is_suspended: false }).eq('id', s.id),
                        )
                      : confirm('Suspend seller?', 'Their store and products will be hidden.', () =>
                          run(() =>
                            supabase.from('seller_profiles').update({ is_suspended: true }).eq('id', s.id),
                          ),
                        )
                  }
                />
              </View>
            </Row>
          ))
        : null}

      {!loading && tab === 'categories' ? (
        <>
          <View style={styles.addRow}>
            <TextInput
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="New category name"
              placeholderTextColor={colors.muted}
              style={[styles.search, styles.addInput]}
            />
            <Button title="Add" onPress={addCategory} disabled={busy} style={styles.addButton} />
          </View>
          {categories.map((c) => (
            <Row key={c.id}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.meta}>{c.is_visible ? 'Visible' : 'Hidden'}</Text>
              <View style={styles.actions}>
                <Button
                  title={c.is_visible ? 'Hide' : 'Show'}
                  variant="secondary"
                  style={styles.action}
                  disabled={busy}
                  onPress={() =>
                    run(() => supabase.from('categories').update({ is_visible: !c.is_visible }).eq('id', c.id))
                  }
                />
              </View>
            </Row>
          ))}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.text },
  tabTextOn: { color: '#fff' },
  search: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
    marginBottom: 10,
  },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  addInput: { flex: 1 },
  addButton: { minHeight: 46 },
  spinner: { marginTop: 24 },
  error: { color: colors.danger, fontSize: 14, marginBottom: 8 },
  empty: { fontSize: 15, color: colors.muted, marginTop: 16 },
  card: {
    padding: 12,
    marginTop: 10,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  action: { minHeight: 38, paddingHorizontal: 12 },
})
