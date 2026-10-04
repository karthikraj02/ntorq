import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ServiceItemType } from '@shared/constants';

export type MainTabParamList = {
  Home: undefined;
  Ride: undefined;
  Service: undefined;
  Diagnostics: undefined;
  Vehicle: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Settings: undefined;
  Account: undefined;
  Developer: undefined;
  OilChange: undefined;
  ServiceEdit: { reminderId: string };
  MaintenanceList: undefined;
  MaintenanceEdit: { recordId?: string; serviceType?: ServiceItemType };
};

// Lets `useNavigation()` know the app's routes without per-screen generics.
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
