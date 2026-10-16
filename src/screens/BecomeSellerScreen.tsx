import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Button } from '../components/Button'
import { ImageField } from '../components/ImageField'
import { Screen } from '../components/Screen'
import { TextField } from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { EMAIL_REGEX, friendlyError } from '../lib/errors'
import { isRemoteUri, pickImage, uploadImage } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { leaveScreen } from '../navigation/helpers'
import type { RootStackParamList } from '../navigation/types'
import { colors, radius } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'BecomeSeller'>

type Errors = {
  storeName?: string
  phone?: string
  whatsapp?: string
  email?: string
  contact?: string
}

const PHONE_REGEX = /^[+0-9()\s-]{7,20}$/

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return slug || 'store'
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6)
}

function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function BecomeSellerScreen({ navigation }: Props) {
  const { user, seller, refreshSeller } = useAuth()
  const editing = Boolean(seller)

  const [storeName, setStoreName] = useState(seller?.store_name ?? '')
  const [sellerName, setSellerName] = useState(seller?.seller_name ?? '')
  const [description, setDescription] = useState(seller?.description ?? '')
  const [sellerCategory, setSellerCategory] = useState(seller?.seller_category ?? '')
  const [location, setLocation] = useState(seller?.location ?? '')
  const [phone, setPhone] = useState(seller?.phone ?? '')
  const [whatsapp, setWhatsapp] = useState(seller?.whatsapp ?? '')
  const [contactEmail, setContactEmail] = useState(seller?.email ?? user?.email ?? '')
  const [profileUri, setProfileUri] = useState<string | null>(seller?.profile_image_url ?? null)
  const [coverUri, setCoverUri] = useState<string | null>(seller?.cover_image_url ?? null)

  const [categories, setCategories] = useState<string[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    supabase
      .from('categories')
      .select('name')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (active && data) setCategories((data as { name: string }[]).map((c) => c.name))
      })
    return () => {
      active = false
    }
  }, [])

  const choosePhoto = async (setter: (uri: string) => void, aspect: [number, number]) => {
    try {
      const uri = await pickImage(aspect)
      if (uri) setter(uri)
    } catch (e) {
      setFormError(friendlyError(e))
    }
  }

  const onSave = async () => {
    if (!user) return
    setFormError(null)

    const next: Errors = {}
    if (storeName.trim().length < 2) next.storeName = 'Enter your store name.'
    if (phone.trim() && !PHONE_REGEX.test(phone.trim())) next.phone = 'Enter a valid phone number.'
    if (whatsapp.trim() && !PHONE_REGEX.test(whatsapp.trim()))
      next.whatsapp = 'Enter a valid WhatsApp number, with country code.'
    if (contactEmail.trim() && !EMAIL_REGEX.test(contactEmail.trim()))
      next.email = 'Enter a valid email address.'
    if (!phone.trim() && !whatsapp.trim() && !contactEmail.trim())
      next.contact = 'Add at least one way for buyers to contact you.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    try {
      let profileUrl = profileUri
      if (profileUri && !isRemoteUri(profileUri)) {
        profileUrl = await uploadImage('profiles', user.id, profileUri, 'store-profile')
      }
      let coverUrl = coverUri
      if (coverUri && !isRemoteUri(coverUri)) {
        coverUrl = await uploadImage('stores', user.id, coverUri, 'store-cover')
      }

      const fields = {
        store_name: storeName.trim(),
        seller_name: orNull(sellerName),
        description: orNull(description),
        seller_category: orNull(sellerCategory),
        location: orNull(location),
        phone: orNull(phone),
        whatsapp: orNull(whatsapp),
        email: orNull(contactEmail),
        profile_image_url: profileUrl,
        cover_image_url: coverUrl,
      }

      if (seller) {
        const { error } = await supabase.from('seller_profiles').update(fields).eq('id', seller.id)
        if (error) throw error
      } else {
        let lastError: { message?: string; code?: string } | null = null
        for (let attempt = 0; attempt < 2; attempt++) {
          const { error } = await supabase.from('seller_profiles').insert({
            ...fields,
            user_id: user.id,
            slug: `${slugify(storeName)}-${randomSuffix()}`,
          })
          lastError = error
          // Only retry when the generated store address was already taken.
          if (!error || error.code !== '23505') break
        }
        if (lastError) throw lastError
      }

      await refreshSeller()
      leaveScreen(navigation)
    } catch (e) {
      setFormError(friendlyError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>{editing ? 'Edit your store' : 'Become a seller'}</Text>
      <Text style={styles.subtitle}>
        {editing
          ? 'Update how your store looks to buyers.'
          : 'Set up your store in a minute. You can add products next.'}
      </Text>

      <ImageField
        label="Cover photo"
        uri={coverUri}
        wide
        onPress={() => choosePhoto(setCoverUri, [16, 9])}
      />
      <ImageField
        label="Store profile photo"
        uri={profileUri}
        onPress={() => choosePhoto(setProfileUri, [1, 1])}
      />

      <TextField
        label="Store name"
        value={storeName}
        onChangeText={setStoreName}
        placeholder="e.g. Sarah Fashion"
        error={errors.storeName}
      />
      <TextField
        label="Your name"
        value={sellerName}
        onChangeText={setSellerName}
        placeholder="Seller name"
      />
      <TextField
        label="About your store"
        value={description}
        onChangeText={setDescription}
        placeholder="What do you sell?"
        multiline
        style={styles.multiline}
      />

      {categories.length > 0 ? (
        <View style={styles.categoryBlock}>
          <Text style={styles.label}>Main category</Text>
          <View style={styles.chips}>
            {categories.map((name) => {
              const selected = sellerCategory === name
              return (
                <Pressable
                  key={name}
                  onPress={() => setSellerCategory(selected ? '' : name)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{name}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      ) : null}

      <TextField
        label="Location"
        value={location}
        onChangeText={setLocation}
        placeholder="e.g. Abuja, Nigeria"
      />

      <Text style={styles.label}>How buyers can contact you</Text>
      <TextField
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+234 800 000 0000"
        error={errors.phone}
      />
      <TextField
        label="WhatsApp number"
        value={whatsapp}
        onChangeText={setWhatsapp}
        keyboardType="phone-pad"
        placeholder="+234 800 000 0000"
        error={errors.whatsapp}
      />
      <TextField
        label="Contact email"
        value={contactEmail}
        onChangeText={setContactEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="store@example.com"
        error={errors.email}
      />
      {errors.contact ? <Text style={styles.formError}>{errors.contact}</Text> : null}

      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      <Button
        title={editing ? 'Save changes' : 'Create my store'}
        onPress={onSave}
        loading={saving}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 4 },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  multiline: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
  categoryBlock: { marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text },
  chipTextSelected: { color: '#fff' },
  formError: { color: colors.danger, fontSize: 14, marginBottom: 12 },
})
