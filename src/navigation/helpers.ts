// Safely leave an auth screen. If there is nothing to go back to (for example the
// screen was replaced or already closed), land on the Home tab instead of erroring.
type Nav = {
  canGoBack: () => boolean
  goBack: () => void
  navigate: (...args: any[]) => void
}

export function leaveScreen(navigation: Nav) {
  if (navigation.canGoBack()) {
    navigation.goBack()
  } else {
    navigation.navigate('Tabs', { screen: 'Home' })
  }
}
