import { createRoute } from '@granite-js/react-native';
import AddMove from '../screens/AddMove';
import { SCREEN } from './screenOptions';

export const Route = createRoute('/add-move', {
  component: AddMove,
  screenOptions: SCREEN,
});
