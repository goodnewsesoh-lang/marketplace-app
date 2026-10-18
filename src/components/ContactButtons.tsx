import { Alert, Linking, StyleSheet, Text, View } from 'react-native'

import { cleanPhone } from '../lib/products'
import { Button } from './Button'
import { colors } from '../theme'

type Props = {
  phone: string | null
  whatsapp: string | null
  email: string | null
  message?: string
}

async function open(url: string, failMessage: string) {
  try {
    await Linking.openURL(url)
  } catch {
    Alert.alert('Could not open', failMessage)
  }
}

export function ContactButtons({ phone, whatsapp, email, message }: Props) {
  const wa = cleanPhone(whatsapp)
  const tel = cleanPhone(phone)
  const mail = (email ?? '').trim()

  if (!wa && !tel && !mail) {
    return <Text style={styles.none}>This seller has not added contact details yet.</Text>
  }

  return (
    <View style={styles.wrap}>
      {wa ? (
        <Button
          title="Chat on WhatsApp"
          onPress={() =>
            open(
              `https://wa.me/${wa}${message ? `?text=${encodeURIComponent(message)}` : ''}`,
              'WhatsApp could not be opened on this phone.',
            )
          }
        />
      ) : null}
      {tel ? (
        <Button
          title="Call seller"
          variant="secondary"
          onPress={() => open(`tel:${tel}`, 'Calling is not available on this device.')}
        />
      ) : null}
      {mail ? (
        <Button
          title="Email seller"
          variant="secondary"
          onPress={() => open(`mailto:${mail}`, 'No email app was found on this phone.')}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  none: { fontSize: 14, color: colors.muted },
})
