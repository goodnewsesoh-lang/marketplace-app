import type { NavigatorScreenParams } from '@react-navigation/native'

export type TabParamList = {
  Home: undefined
  Explore: { categoryId?: string } | undefined
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
  ProductForm: { productId?: string } | undefined
  MyProducts: undefined
  ProductDetail: { productId: string }
  Store: { sellerId: string }
  Dashboard: undefined
  Report: { targetType: 'product' | 'seller'; targetId: string }
  Admin: undefined
}
