import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Button } from '../components/Button'
import { Chips } from '../components/Chips'
import { Screen } from '../components/Screen'
import { TextField } from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/errors'
import { isRemoteUri, pickImages, uploadImage } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { leaveScreen } from '../navigation/helpers'
import type { RootStackParamList } from '../navigation/types'
import { colors, radius } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'ProductForm'>

type Photo = { key: string; uri: string; existingId?: string }
type Category = { id: string; name: string }
type Errors = {
  name?: string
  description?: string
  price?: string
  discountPrice?: string
  category?: string
  photos?: string
}

type ProductRow = {
  id: string
  category_id: string | null
  name: string
  description: string
  price: number
  discount_price: number | null
  condition: string
  location: string | null
  video_url: string | null
  status: string
  product_images: { id: string; image_url: string; sort_order: number }[] | null
}

const MAX_PHOTOS = 8

const CONDITIONS = [
  { id: 'new', label: 'New' },
  { id: 'used', label: 'Used' },
  { id: 'refurbished', label: 'Refurbished' },
]

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  return slug || 'product'
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7)
}

function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseMoney(value: string): number {
  return Number(value.replace(/,/g, '').trim())
}

export function ProductFormScreen({ navigation, route }: Props) {
  const { user, seller } = useAuth()
  const editingId = route.params?.productId ?? null

  const [productId, setProductId] = useState<string | null>(editingId)
  const [currentStatus, setCurrentStatus] = useState('draft')
  const [originalImageIds, setOriginalImageIds] = useState<string[]>([])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [discountPrice, setDiscountPrice] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [condition, setCondition] = useState('new')
  const [location, setLocation] = useState(seller?.location ?? '')
  const [videoUrl, setVideoUrl] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(Boolean(editingId))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from('categories')
      .select('id, name')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (active && data) setCategories(data as Category[])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!editingId) return
    let active = true

    supabase
      .from('products')
      .select('*, product_images(id, image_url, sort_order)')
      .eq('id', editingId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        const row = data as ProductRow | null
        if (error || !row) {
          setFormError('Could not load this product. Go back and try again.')
          setLoading(false)
          return
        }
        const images = [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)
        setName(row.name)
        setDescription(row.description)
        setPrice(String(row.price))
        setDiscountPrice(row.discount_price != null ? String(row.discount_price) : '')
        setCategoryId(row.category_id)
        setCondition(row.condition)
        setLocation(row.location ?? '')
        setVideoUrl(row.video_url ?? '')
        setCurrentStatus(row.status)
        setOriginalImageIds(images.map((image) => image.id))
        setPhotos(
          images.map((image) => ({ key: image.id, uri: image.image_url, existingId: image.id })),
        )
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [editingId])

  const addPhotos = async () => {
    setFormError(null)
    const room = MAX_PHOTOS - photos.length
    if (room <= 0) {
      setFormError(`You can add up to ${MAX_PHOTOS} photos.`)
      return
    }
    try {
      const uris = await pickImages(room)
      if (uris.length === 0) return
      setPhotos((current) =>
        [
          ...current,
          ...uris.map((uri, index) => ({ key: `new-${Date.now()}-${index}`, uri })),
        ].slice(0, MAX_PHOTOS),
      )
    } catch (e) {
      setFormError(friendlyError(e))
    }
  }

  const movePhoto = (index: number, direction: -1 | 1) => {
    setPhotos((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const removePhoto = (index: number) => {
    setPhotos((current) => current.filter((_, i) => i !== index))
  }

  const validate = (): boolean => {
    const next: Errors = {}
    const priceValue = parseMoney(price)
    const discountValue = parseMoney(discountPrice)

    if (name.trim().length < 2) next.name = 'Enter the product name.'
    if (description.trim().length < 5) next.description = 'Add a short description.'
    if (!price.trim() || !Number.isFinite(priceValue) || priceValue < 0)
      next.price = 'Enter a valid price.'
    if (discountPrice.trim()) {
      if (!Number.isFinite(discountValue) || discountValue < 0)
        next.discountPrice = 'Enter a valid discount price.'
      else if (Number.isFinite(priceValue) && discountValue >= priceValue)
        next.discountPrice = 'The discount price must be lower than the price.'
    }
    if (!categoryId) next.category = 'Choose a category.'
    if (photos.length === 0) next.photos = 'Add at least one photo.'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async (mode: 'draft' | 'publish' | 'keep') => {
    if (!user || !seller) return
    setFormError(null)
    if (!validate()) return

    const status = mode === 'draft' ? 'draft' : mode === 'publish' ? 'published' : currentStatus

    setSaving(true)
    try {
      const fields = {
        category_id: categoryId,
        name: name.trim(),
        description: description.trim(),
        price: parseMoney(price),
        discount_price: discountPrice.trim() ? parseMoney(discountPrice) : null,
        condition,
        location: orNull(location),
        video_url: orNull(videoUrl),
        status,
        availability_status: status === 'unavailable' ? 'unavailable' : 'available',
      }

      let id = productId
      if (id) {
        const { error } = await supabase.from('products').update(fields).eq('id', id)
        if (error) throw error
      } else {
        let lastError: { message?: string; code?: string } | null = null
        for (let attempt = 0; attempt < 2 && !id; attempt++) {
          const { data, error } = await supabase
            .from('products')
            .insert({
              ...fields,
              seller_id: seller.id,
              slug: `${slugify(name)}-${randomSuffix()}`,
            })
            .select('id')
            .single()
          lastError = error
          if (!error && data) id = (data as { id: string }).id
          // Only retry when the generated product address was already taken.
          else if (error && error.code !== '23505') break
        }
        if (!id) throw lastError ?? new Error('save_failed')
        // Remember the id so a retry after a photo problem updates instead of duplicating.
        setProductId(id)
      }

      const rows: { product_id: string; image_url: string; sort_order: number }[] = []
      for (let index = 0; index < photos.length; index++) {
        const photo = photos[index]
        const url = isRemoteUri(photo.uri)
          ? photo.uri
          : await uploadImage('products', user.id, photo.uri, `${id}/photo${index}`)
        rows.push({ product_id: id, image_url: url, sort_order: index })
      }

      const { error: insertError } = await supabase.from('product_images').insert(rows)
      if (insertError) throw insertError

      if (originalImageIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_images')
          .delete()
          .in('id', originalImageIds)
        if (deleteError) throw deleteError
      }

      if (editingId) leaveScreen(navigation)
      else navigation.replace('MyProducts')
    } catch (e) {
      setFormError(friendlyError(e))
    } finally {
      setSaving(false)
    }
  }

  if (!seller) {
    return (
      <Screen>
        <Text style={styles.title}>Create your store first</Text>
        <Text style={styles.subtitle}>You need a store before you can add products.</Text>
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

  return (
    <Screen>
      <Text style={styles.title}>{editingId ? 'Edit product' : 'Add a product'}</Text>
      <Text style={styles.subtitle}>
        The first photo is the main photo shown to buyers.
      </Text>

      <Text style={styles.label}>Photos ({photos.length}/{MAX_PHOTOS})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
        {photos.map((photo, index) => (
          <View key={photo.key} style={styles.photoTile}>
            <Image source={{ uri: photo.uri }} style={styles.photoImage} resizeMode="cover" />
            {index === 0 ? (
              <View style={styles.mainBadge}>
                <Text style={styles.mainBadgeText}>Main</Text>
              </View>
            ) : null}
            <View style={styles.photoActions}>
              <Pressable
                onPress={() => movePhoto(index, -1)}
                disabled={index === 0}
                accessibilityLabel="Move photo earlier"
                style={[styles.photoButton, index === 0 && styles.photoButtonOff]}
              >
                <Text style={styles.photoButtonText}>◀</Text>
              </Pressable>
              <Pressable
                onPress={() => removePhoto(index)}
                accessibilityLabel="Remove photo"
                style={styles.photoButton}
              >
                <Text style={styles.photoButtonText}>✕</Text>
              </Pressable>
              <Pressable
                onPress={() => movePhoto(index, 1)}
                disabled={index === photos.length - 1}
                accessibilityLabel="Move photo later"
                style={[styles.photoButton, index === photos.length - 1 && styles.photoButtonOff]}
              >
                <Text style={styles.photoButtonText}>▶</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <Pressable
            onPress={addPhotos}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
            style={styles.addTile}
          >
            <Text style={styles.addTileText}>+ Add photos</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      {errors.photos ? <Text style={styles.error}>{errors.photos}</Text> : null}

      <View style={styles.gap} />

      <TextField
        label="Product name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Wireless headphones"
        error={errors.name}
      />
      <TextField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the product, size, colour, features..."
        multiline
        style={styles.multiline}
        error={errors.description}
      />
      <TextField
        label="Price"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="0"
        error={errors.price}
      />
      <TextField
        label="Discount price (optional)"
        value={discountPrice}
        onChangeText={setDiscountPrice}
        keyboardType="decimal-pad"
        placeholder="Lower than the price"
        error={errors.discountPrice}
      />

      <Chips
        label="Category"
        options={categories.map((c) => ({ id: c.id, label: c.name }))}
        selected={categoryId}
        onSelect={setCategoryId}
        error={errors.category}
      />
      <Chips label="Condition" options={CONDITIONS} selected={condition} onSelect={setCondition} />

      <TextField
        label="Location"
        value={location}
        onChangeText={setLocation}
        placeholder="e.g. Abuja, Nigeria"
      />
      <TextField
        label="Video link (optional)"
        value={videoUrl}
        onChangeText={setVideoUrl}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="https://..."
      />

      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      {editingId ? (
        <Button title="Save changes" onPress={() => save('keep')} loading={saving} />
      ) : (
        <View style={styles.buttons}>
          <Button title="Publish now" onPress={() => save('publish')} loading={saving} />
          <Button
            title="Save as draft"
            variant="secondary"
            onPress={() => save('draft')}
            disabled={saving}
          />
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 4 },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 20 },
  spinner: { marginTop: 40 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  photoRow: { gap: 10, paddingRight: 8 },
  photoTile: {
    width: 120,
    height: 150,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoImage: { width: '100%', height: '100%' },
  mainBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mainBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  photoActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(17,24,39,0.7)',
    paddingVertical: 4,
  },
  photoButton: { paddingHorizontal: 8, paddingVertical: 4 },
  photoButtonOff: { opacity: 0.3 },
  photoButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  addTile: {
    width: 120,
    height: 150,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  gap: { height: 18 },
  multiline: { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  error: { color: colors.danger, fontSize: 13, marginTop: 6 },
  formError: { color: colors.danger, fontSize: 14, marginBottom: 12 },
  buttons: { gap: 10 },
})
