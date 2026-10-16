import type { NavigatorScreenParams } from '@react-navigation/native'

export type TabParamList = {
  Home: undefined
  Explore: undefined
  Add: undefined
  Saved: undefined
  Profile: undefined
}

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined
  Login: undefined
  SignUp: undefined
  ForgotPassword: undefined
  EditProfile: undefined
  BecomeSeller: undefined
}
