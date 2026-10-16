import * as ImagePicker from 'expo-image-picker'

import { supabase } from './supabase'

export type Bucket = 'products' | 'profiles' | 'stores'

const MAX_BYTES = 5 * 1024 * 1024

export function isRemoteUri(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://')
}

// Opens the photo library. Returns the chosen image's local uri, or null if cancelled.
export async function pickImage(aspect: [number, number] = [1, 1]): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) throw new Error('permission')

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.7,
  })
  if (result.canceled || result.assets.length === 0) return null
  return result.assets[0].uri
}

function typeFromUri(uri: string): { ext: string; contentType: string } {
  const ext = (uri.split('?')[0].split('.').pop() ?? '').toLowerCase()
  if (ext === 'png') return { ext: 'png', contentType: 'image/png' }
  if (ext === 'webp') return { ext: 'webp', contentType: 'image/webp' }
  return { ext: 'jpg', contentType: 'image/jpeg' }
}

// Uploads into the user's own folder (storage rules only allow `<user id>/...`)
// and returns the public URL.
export async function uploadImage(
  bucket: Bucket,
  userId: string,
  uri: string,
  name: string,
): Promise<string> {
  const response = await fetch(uri)
  const data = await response.arrayBuffer()
  if (data.byteLength > MAX_BYTES) throw new Error('too_large')

  const { ext, contentType } = typeFromUri(uri)
  const path = `${userId}/${name}-${Date.now()}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(path, data, {
    contentType,
    upsert: false,
  })
  if (error) throw error

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
